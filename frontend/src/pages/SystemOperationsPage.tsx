import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import PageTopNav from "../components/PageTopNav";
import { SecondaryButton, StableButton, StableCtaLink } from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  getAdminPilotIntake,
  getAdminIdentityRisk,
  getAdminIncompleteLoans,
  getCurrentClan,
  getMe,
  getSelectedClanId,
  getSystemDiagnostics,
  correctIdentityVerificationCheck,
  fetchIdentityVerificationEvidenceBlob,
  listAdminPoolPending,
  listExpectedPayments,
  listRecentBankEvents,
  listUnmatchedBankEvents,
  reviewIdentityVerificationCheck,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type RawSystemRow = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  createdAt: string;
  ctaTo: string;
  ctaLabel: string;
  level: "high" | "medium" | "low";
};

type CollapseState = {
  overview: boolean;
  intake: boolean;
  signals: boolean;
  queues: boolean;
  routes: boolean;
};

const SYSTEM_OPERATIONS_UI_STORAGE_KEY = "gmfn.systemOperations.sections.v1";

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
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.24)",
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.12), 0 8px 18px rgba(7,20,36,0.045), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(20,52,83,0.20)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(20,52,83,0.18)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    border: "1px solid rgba(20,52,83,0.16)",
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 104,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(29,95,212,0.24)"
      : "1px solid rgba(122,152,195,0.20)",
    background: primary
      ? "linear-gradient(180deg, #F8FCFF 0%, #E5F0FF 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    padding: 16,
    textDecoration: "none",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflowAnchor: "none",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 18px 38px rgba(29,95,212,0.12)"
      : "0 16px 32px rgba(15,23,42,0.065)",
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
    background: primary ? "rgba(29,95,212,0.12)" : "rgba(160,178,201,0.18)",
    color: primary ? "#0B63D1" : "#31506D",
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
    minHeight: 52,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(122,152,195,0.20)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "normal",
    textAlign: "center",
  };
}

function iconBadge(tone: "navy" | "blue" | "gold" | "green" | "red" = "navy"): React.CSSProperties {
  const palette = {
    navy: {
      color: "#EAF3FF",
      bg: "linear-gradient(180deg, rgba(28,76,122,0.98) 0%, rgba(7,28,47,0.98) 100%)",
      border: "1px solid rgba(196,216,238,0.22)",
      shadow: "0 9px 18px rgba(2,6,23,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
    },
    blue: {
      color: "#0B63D1",
      bg: "linear-gradient(180deg, #F8FCFF 0%, #E4F0FF 100%)",
      border: "1px solid rgba(29,95,212,0.18)",
      shadow: "0 9px 18px rgba(29,95,212,0.10)",
    },
    gold: {
      color: "#7A4A00",
      bg: "linear-gradient(180deg, #FFF8D9 0%, #F5D88A 100%)",
      border: "1px solid rgba(214,170,69,0.32)",
      shadow: "0 9px 18px rgba(146,96,12,0.12)",
    },
    green: {
      color: "#065F46",
      bg: "linear-gradient(180deg, #ECFDF5 0%, #D6F4E4 100%)",
      border: "1px solid rgba(34,197,94,0.18)",
      shadow: "0 9px 18px rgba(34,197,94,0.10)",
    },
    red: {
      color: "#991B1B",
      bg: "linear-gradient(180deg, #FFF5F5 0%, #FEE2E2 100%)",
      border: "1px solid rgba(239,68,68,0.18)",
      shadow: "0 9px 18px rgba(239,68,68,0.10)",
    },
  }[tone];

  return {
    width: 30,
    height: 30,
    borderRadius: 12,
    display: "inline-grid",
    placeItems: "center",
    flex: "0 0 auto",
    color: palette.color,
    background: palette.bg,
    border: palette.border,
    boxShadow: palette.shadow,
  };
}

function iconNode(name: GsnIconName, tone: "navy" | "blue" | "gold" | "green" | "red" = "navy", size = 17) {
  return (
    <span aria-hidden="true" style={iconBadge(tone)}>
      <GsnLegacyIcon name={name} size={Math.max(24, Math.round(size * 1.55))} />
    </span>
  );
}

function sectionLabelWithIcon(name: GsnIconName, label: string, tone: "navy" | "blue" | "gold" | "green" | "red" = "blue") {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {iconNode(name, tone, 16)}
      <span style={sectionLabel()}>{label}</span>
    </div>
  );
}

function badgeWithIcon(name: GsnIconName, label: React.ReactNode, primary = false, tone: "navy" | "blue" | "gold" | "green" | "red" = primary ? "blue" : "navy") {
  return (
    <span style={{ ...badge(primary), minHeight: 36, gap: 8 }}>
      {iconNode(name, tone, 15)}
      <span>{label}</span>
    </span>
  );
}

function actionLabel(name: GsnIconName, label: string, tone: "navy" | "blue" | "gold" | "green" | "red" = "navy") {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 0 }}>
      {iconNode(name, tone, 16)}
      <span>{label}</span>
    </span>
  );
}

function helperText(): React.CSSProperties {
  return {
    color: "#4E6680",
    fontSize: 14,
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
    intake: false,
    signals: false,
    queues: true,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    intake: Boolean(raw?.intake ?? base.intake),
    signals: Boolean(raw?.signals ?? base.signals),
    queues: Boolean(raw?.queues ?? base.queues),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function toNum(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function signalTone(row: RawSystemRow): {
  bg: string;
  text: string;
  label: string;
} {
  if (row.level === "high") {
    return {
      bg: "#FFF5F5",
      text: "#991B1B",
      label: "Immediate attention",
    };
  }

  if (row.level === "medium") {
    return {
      bg: "#FFFBEF",
      text: "#92400E",
      label: "Needs follow-up",
    };
  }

  return {
    bg: "#F8FBFF",
    text: "#0B63D1",
    label: "Informational",
  };
}

function stageTone(stage: string): {
  bg: string;
  text: string;
  label: string;
} {
  const normalized = safeStr(stage).toLowerCase();

  if (
    normalized.includes("expired") ||
    normalized.includes("missing") ||
    normalized.includes("account_exists")
  ) {
    return { bg: "#FFF5F5", text: "#991B1B", label: "Needs help" };
  }

  if (
    normalized.includes("awaiting") ||
    normalized.includes("pending") ||
    normalized.includes("ready_for_community")
  ) {
    return { bg: "#FFFBEF", text: "#92400E", label: "In progress" };
  }

  if (
    normalized.includes("completed") ||
    normalized.includes("approved") ||
    normalized.includes("ready")
  ) {
    return { bg: "#ECFDF5", text: "#065F46", label: "Good signal" };
  }

  return { bg: "#F8FBFF", text: "#0B63D1", label: "Visible" };
}

function normalizedStage(stage: any): string {
  return safeStr(stage).toLowerCase();
}

function pilotStageLabel(stage: any): string {
  const normalized = normalizedStage(stage);

  if (normalized === "awaiting_phone") return "Awaiting phone";
  if (normalized === "awaiting_bank") return "Bank/wallet needed";
  if (normalized === "ready_for_community") return "Ready for community";
  if (normalized === "account_exists") return "Sign in instead";
  if (normalized === "expired") return "Expired session";
  if (normalized === "completed") return "Completed";
  if (normalized === "approved_activation_ready") return "Activation ready";
  if (normalized === "approved_missing_activation") return "Activation missing";
  if (normalized === "pending") return "Pending review";
  if (normalized === "rejected") return "Rejected";

  return safeStr(stage || "Visible").replace(/_/g, " ");
}

function pilotCreatePriority(row: any): number {
  const stage = normalizedStage(row?.stage);

  if (stage === "account_exists" || stage === "expired") return 0;
  if (stage === "ready_for_community") return 1;
  if (stage === "awaiting_bank") return 2;
  if (stage === "awaiting_phone") return 3;
  if (stage === "completed") return 8;

  return 4;
}

function pilotJoinPriority(row: any): number {
  const stage = normalizedStage(row?.stage);

  if (stage === "approved_missing_activation") return 0;
  if (stage === "pending") return 1;
  if (stage === "approved_activation_ready") return 2;
  if (stage === "rejected") return 7;

  return 4;
}

function identitySignalLevel(row: any): "high" | "medium" | "low" {
  const severity = toNum(row?.severity);
  if (severity >= 6) return "high";
  if (severity >= 4) return "medium";
  return "low";
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

function makeSystemRow(input: Partial<RawSystemRow> & { id: string; title: string }): RawSystemRow {
  return {
    id: input.id,
    kind: safeStr(input.kind || "admin"),
    title: safeStr(input.title || "Admin signal"),
    detail: safeStr(input.detail || "Review this admin signal and move into the right admin page."),
    createdAt: safeStr(input.createdAt),
    ctaTo: safeStr(input.ctaTo || ""),
    ctaLabel: safeStr(input.ctaLabel || "Open Command Center"),
    level: input.level || "low",
  };
}

export default function SystemOperationsPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "system-operations.nav.dashboard"),
      commandCenter: routeTarget(
        "adminCommand",
        selectedClanId,
        "system-operations.nav.command-center"
      ),
      bankConsole: routeTarget(
        "bankConsole",
        selectedClanId,
        "system-operations.route.bank-console"
      ),
      incompleteLoans: routeTarget(
        "incompleteLoans",
        selectedClanId,
        "system-operations.route.incomplete-loans"
      ),
      identityRisk: routeTarget(
        "identityRisk",
        selectedClanId,
        "system-operations.route.identity-risk"
      ),
      trustAnalytics: routeTarget(
        "trustAnalytics",
        selectedClanId,
        "system-operations.route.trust-analytics"
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
      readLocalJSON(SYSTEM_OPERATIONS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [identityRisk, setIdentityRisk] = useState<any[]>([]);
  const [incompleteLoans, setIncompleteLoans] = useState<any[]>([]);
  const [pendingPool, setPendingPool] = useState<any[]>([]);
  const [bankRecent, setBankRecent] = useState<any[]>([]);
  const [bankUnmatched, setBankUnmatched] = useState<any[]>([]);
  const [expectedPayments, setExpectedPayments] = useState<any[]>([]);
  const [pilotIntake, setPilotIntake] = useState<any>(null);
  const [reviewingCheckId, setReviewingCheckId] = useState<number | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string>("");

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
    writeLocalJSON(SYSTEM_OPERATIONS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [
          meRes,
          clanRes,
          diagnosticsRes,
          identityRiskRes,
          pilotIntakeRes,
          clanOpsRes,
        ] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getSystemDiagnostics().catch(() => null),
          getAdminIdentityRisk(100).catch(() => ({ items: [] })),
          getAdminPilotIntake(80).catch(() => null),
          selectedClanId > 0
            ? Promise.all([
                getAdminIncompleteLoans(selectedClanId, 100).catch(() => ({ items: [] })),
                listAdminPoolPending(selectedClanId, 50).catch(() => ({ items: [] })),
                listRecentBankEvents(selectedClanId).catch(() => ({ items: [] })),
                listUnmatchedBankEvents(selectedClanId).catch(() => ({ items: [] })),
                listExpectedPayments({ clan_id: selectedClanId, limit: 100 }).catch(() => ({ items: [] })),
              ])
            : Promise.resolve([
                { items: [] },
                { items: [] },
                { items: [] },
                { items: [] },
                { items: [] },
              ]),
        ]);

        if (!alive) return;

        const [
          incompleteLoansRes,
          pendingPoolRes,
          bankRecentRes,
          bankUnmatchedRes,
          expectedPaymentsRes,
        ] = clanOpsRes;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setDiagnostics(diagnosticsRes || null);
        setIdentityRisk(rowsOf<any>(identityRiskRes));
        setPilotIntake(pilotIntakeRes || null);
        setIncompleteLoans(rowsOf<any>(incompleteLoansRes));
        setPendingPool(rowsOf<any>(pendingPoolRes));
        setBankRecent(rowsOf<any>(bankRecentRes));
        setBankUnmatched(rowsOf<any>(bankUnmatchedRes));
        setExpectedPayments(rowsOf<any>(expectedPaymentsRes));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const operatorName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Operator"
    );
  }, [me]);

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

  const roleLabel = useMemo(() => {
    return (
      firstTruthy(me?.role, me?.account_role, me?.user_role) || "admin"
    );
  }, [me]);

  async function handleIdentityPhotoDecision(
    checkId: number,
    decision: "verify" | "reject" | "needs_more"
  ) {
    if (!checkId || reviewingCheckId) return;

    const note =
      decision === "verify"
        ? "Accepted from System Operations entry-support review."
        : decision === "reject"
          ? "Rejected from System Operations entry-support review."
          : "Clearer evidence requested from System Operations entry-support review.";

    setReviewingCheckId(checkId);
    setReviewMessage("");

    try {
      await reviewIdentityVerificationCheck(checkId, {
        decision,
        reviewer_note: note,
      });
      const refreshed = await getAdminPilotIntake(80).catch(() => null);
      setPilotIntake(refreshed || null);
      setReviewMessage(
        decision === "verify"
          ? "Manual photo review accepted and recorded in the Trust Event trail. This is not provider KYC."
          : decision === "reject"
            ? "Manual photo review rejected and recorded for follow-up."
            : "Photo evidence marked as needing clearer evidence before trust can use it."
      );
    } catch (err: any) {
      setReviewMessage(
        firstTruthy(
          err?.message,
          "GSN could not update this identity photo review. Confirm platform-admin access."
        )
      );
    } finally {
      setReviewingCheckId(null);
    }
  }

  async function handleIdentityPhotoCorrection(checkId: number) {
    if (!checkId || reviewingCheckId) return;

    const reason =
      typeof window === "undefined"
        ? ""
        : window.prompt(
            "Reopen this manual photo review only if the previous decision was wrong or incomplete. Type the factual reason for the audit trail."
          );
    const cleanReason = safeStr(reason);
    if (!cleanReason) {
      setReviewMessage("Reopen cancelled. A factual correction reason is required.");
      return;
    }

    setReviewingCheckId(checkId);
    setReviewMessage("");

    try {
      await correctIdentityVerificationCheck(checkId, {
        reason: cleanReason,
      });
      const refreshed = await getAdminPilotIntake(80).catch(() => null);
      setPilotIntake(refreshed || null);
      setReviewMessage(
        "Photo review reopened. Any previous accepted-photo trust effect was corrected in the Trust Event trail."
      );
    } catch (err: any) {
      setReviewMessage(
        firstTruthy(
          err?.message,
          "GSN could not reopen this identity photo review. Confirm platform-admin access."
        )
      );
    } finally {
      setReviewingCheckId(null);
    }
  }

  async function handleOpenIdentityPhotoEvidence(checkId: number) {
    if (!checkId || reviewingCheckId) return;

    setReviewingCheckId(checkId);
    setReviewMessage("");

    try {
      const blob = await fetchIdentityVerificationEvidenceBlob(checkId);
      const objectUrl = URL.createObjectURL(blob);
      const opened =
        typeof window !== "undefined"
          ? window.open(objectUrl, "_blank", "noopener,noreferrer")
          : null;
      if (!opened) {
        URL.revokeObjectURL(objectUrl);
        setReviewMessage("Photo opened only after browser pop-ups are allowed for this admin page.");
      } else {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch (err: any) {
      setReviewMessage(
        firstTruthy(
          err?.message,
          "GSN could not open this private photo evidence. Confirm platform-admin access."
        )
      );
    } finally {
      setReviewingCheckId(null);
    }
  }

  const summary = useMemo(() => {
    return {
      pendingPool: pendingPool.length,
      unmatchedBank: bankUnmatched.length,
      recentBank: bankRecent.length,
      expectedPayments: expectedPayments.length,
      incompleteLoans: incompleteLoans.length,
      identityInterventions: identityRisk.filter(
        (row) => identitySignalLevel(row) === "high"
      ).length,
    };
  }, [bankRecent, bankUnmatched, expectedPayments, identityRisk, incompleteLoans, pendingPool]);

  const pilotCreateRows = useMemo(
    () =>
      rowsOf<any>(pilotIntake?.create_entries)
        .slice()
        .sort((a, b) => pilotCreatePriority(a) - pilotCreatePriority(b))
        .slice(0, 8),
    [pilotIntake]
  );

  const pilotJoinRows = useMemo(
    () =>
      rowsOf<any>(pilotIntake?.join_requests)
        .slice()
        .sort((a, b) => pilotJoinPriority(a) - pilotJoinPriority(b))
        .slice(0, 6),
    [pilotIntake]
  );

  const pilotIntakeSummary = useMemo(() => {
    const src = pilotIntake?.summary || {};
    const createByStage = src.create_by_stage || {};
    const joinByStage = src.join_by_stage || {};

    return {
      createTotal: toNum(src.create_total),
      joinTotal: toNum(src.join_total),
      needsAttention: toNum(src.needs_attention),
      createCompleted: toNum(createByStage.completed),
      createReady: toNum(createByStage.ready_for_community),
      createAwaitingBank: toNum(createByStage.awaiting_bank),
      createExpired: toNum(createByStage.expired),
      joinPending: toNum(joinByStage.pending),
      joinApproved: toNum(joinByStage.approved_activation_ready),
      joinActivationMissing: toNum(joinByStage.approved_missing_activation),
    };
  }, [pilotIntake]);

  const pilotTriageMessage = useMemo(() => {
    if (!pilotIntake) {
      return "When applicants begin, this monitor will show who is still entering, who is ready to finish, and who needs admin help.";
    }

    if (pilotIntakeSummary.needsAttention > 0) {
      return "Start with Needs help. Those rows usually mean sign in instead, expired session, or missing activation link.";
    }

    if (pilotIntakeSummary.createReady > 0) {
      return "Some creators are ready for community setup. Guide them to finish the community name and first-circle path.";
    }

    if (pilotIntakeSummary.createAwaitingBank > 0) {
      return "Some creators have phone evidence ready and only need bank or wallet details recorded.";
    }

    if (pilotIntakeSummary.joinPending > 0) {
      return "Some invited people are waiting for community review. Check join requests before asking them to start again.";
    }

    if (pilotIntakeSummary.joinApproved > 0) {
      return "Some join requests are approved. Confirm the applicant received and opened the activation link.";
    }

    return "No urgent entry-support problem is visible now. Keep watching new create and join rows as applicants continue.";
  }, [pilotIntake, pilotIntakeSummary]);

  const operationalFocus = useMemo(() => {
    if (pilotIntakeSummary.needsAttention > 0) {
      return {
        detail:
          pilotIntakeSummary.needsAttention === 1
            ? "One entry-support record needs help. Check whether the applicant should continue, sign in, or receive an activation link."
            : `${pilotIntakeSummary.needsAttention} entry-support records need help. Check whether applicants should continue, sign in, or receive activation links.`,
      };
    }

    if (!selectedClanId) {
      return {
        detail:
          "Choose the current community first so the admin queues can load the bank, pool, and incomplete-support signals for the right place.",
      };
    }

    if (bankUnmatched.length > 0) {
      return {
        detail:
          bankUnmatched.length === 1
            ? "One bank event is still unmatched. Reconcile it before treating the finance reading as settlement-ready."
            : `${bankUnmatched.length} bank events are still unmatched. Reconcile them before treating the finance reading as settlement-ready.`,
      };
    }

    const urgentIncomplete = incompleteLoans.filter((row) => {
      const remaining = toNum(row?.auto_cancel_remaining_seconds);
      return remaining > 0 && remaining <= 60;
    }).length;

    if (urgentIncomplete > 0) {
      return {
        detail:
          urgentIncomplete === 1
            ? "One incomplete support item is close to auto-cancel. Review support decisions and coverage now."
            : `${urgentIncomplete} incomplete support items are close to auto-cancel. Review support decisions and coverage now.`,
      };
    }

    if (pendingPool.length > 0) {
      return {
        detail:
          pendingPool.length === 1
            ? "One pool event is waiting for finance review. Record its review before the money queue drifts."
            : `${pendingPool.length} pool events are waiting for finance review. Record their review before the money queue drifts.`,
      };
    }

    const highIdentity = identityRisk.filter(
      (row) => identitySignalLevel(row) === "high"
    ).length;

    if (highIdentity > 0) {
      return {
        detail:
          highIdentity === 1
            ? "One identity-risk case needs intervention before it becomes a trust or access problem."
            : `${highIdentity} identity-risk cases need intervention before they become trust or access problems.`,
      };
    }

    if (expectedPayments.length > 0) {
      return {
        detail:
          "Expected payment items are still open. Keep the money path readable until those expectations clear through finance evidence.",
      };
    }

    if (diagnostics?.ok === false) {
      return {
        detail:
          "System diagnostics are not healthy yet. Confirm runtime and database state before trusting the calmer queues.",
      };
    }

    if (bankRecent.length > 0) {
      return {
        detail:
          "The live admin queues look calm right now. Use the route cards below only if you need deeper investigation.",
      };
    }

    return null;
  }, [
    bankRecent.length,
    bankUnmatched.length,
    diagnostics?.ok,
    expectedPayments.length,
    identityRisk,
    incompleteLoans,
    pilotIntakeSummary.needsAttention,
    pendingPool.length,
    selectedClanId,
  ]);

  const recentSignals = useMemo(() => {
    const rows: RawSystemRow[] = [];

    bankUnmatched.slice(0, 4).forEach((row, index) => {
      rows.push(
        makeSystemRow({
          id: `bank-unmatched-${row?.id || index}`,
          kind: "bank.unmatched",
          title: "Unmatched bank event",
          detail: [
            firstTruthy(row?.reference, row?.reference_raw, "No reference"),
            firstTruthy(
              row?.amount && row?.currency
                ? `${row.amount} ${row.currency}`
                : "",
              row?.status_reason,
              row?.status
            ),
          ]
            .filter(Boolean)
            .join(" | "),
          createdAt: firstTruthy(row?.posted_at, row?.ingested_at),
          ctaTo: routes.bankConsole,
          ctaLabel: "Open Bank Console",
          level: "high",
        })
      );
    });

    incompleteLoans.slice(0, 4).forEach((row, index) => {
      const remaining = toNum(row?.auto_cancel_remaining_seconds);
      rows.push(
        makeSystemRow({
          id: `incomplete-loan-${row?.loan_id || index}`,
          kind: "loan.incomplete",
          title: "Incomplete support queue item",
          detail: [
            `Support decisions ${toNum(row?.approved_guarantors)}/${toNum(
              row?.guarantors_required
            )}`,
            row?.required_gap != null ? `Gap ${row.required_gap}` : "",
            remaining > 0 ? `${remaining}s remaining` : "Waiting for decisions",
          ]
            .filter(Boolean)
            .join(" | "),
          createdAt: safeStr(row?.decision_at),
          ctaTo: routes.incompleteLoans,
          ctaLabel: "Open Incomplete Support",
          level: remaining > 0 && remaining <= 60 ? "high" : "medium",
        })
      );
    });

    pendingPool.slice(0, 4).forEach((row, index) => {
      rows.push(
        makeSystemRow({
          id: `pool-pending-${row?.id || index}`,
          kind: "pool.pending",
          title: "Pool finance review pending",
          detail: [
            firstTruthy(row?.event_type, "Pool event"),
            row?.amount && row?.currency ? `${row.amount} ${row.currency}` : "",
            firstTruthy(row?.reference, row?.note),
          ]
            .filter(Boolean)
            .join(" | "),
          createdAt: safeStr(row?.created_at),
          ctaTo: routes.bankConsole,
          ctaLabel: "Open Bank Console",
          level: "medium",
        })
      );
    });

    identityRisk.slice(0, 4).forEach((row, index) => {
      rows.push(
        makeSystemRow({
          id: `identity-risk-${row?.id || index}`,
          kind: "identity.risk",
          title: "Identity-risk signal",
          detail: [
            row?.user_id ? `User ${row.user_id}` : "",
            firstTruthy(row?.signal_type, row?.description),
            toNum(row?.severity) > 0 ? `Severity ${toNum(row?.severity)}` : "",
          ]
            .filter(Boolean)
            .join(" | "),
          createdAt: safeStr(row?.created_at),
          ctaTo: routes.identityRisk,
          ctaLabel: "Open Identity Risk",
          level: identitySignalLevel(row),
        })
      );
    });

    expectedPayments.slice(0, 4).forEach((row, index) => {
      rows.push(
        makeSystemRow({
          id: `expected-payment-${row?.id || index}`,
          kind: "bank.expected",
          title: "Expected payment still open",
          detail: [
            firstTruthy(row?.expected_type, "Expected payment"),
            row?.remaining_amount && row?.currency
              ? `${row.remaining_amount} ${row.currency} remaining`
              : "",
            firstTruthy(row?.status, row?.reference_display),
          ]
            .filter(Boolean)
            .join(" | "),
          createdAt: firstTruthy(row?.due_at, row?.created_at),
          ctaTo: routes.bankConsole,
          ctaLabel: "Open Bank Console",
          level: "medium",
        })
      );
    });

    bankRecent.slice(0, 4).forEach((row, index) => {
      rows.push(
        makeSystemRow({
          id: `bank-recent-${row?.id || index}`,
          kind: "bank.recent",
          title: "Recent bank event",
          detail: [
            firstTruthy(row?.status, row?.direction),
            firstTruthy(row?.reference, row?.reference_raw),
            row?.amount && row?.currency ? `${row.amount} ${row.currency}` : "",
          ]
            .filter(Boolean)
            .join(" | "),
          createdAt: firstTruthy(row?.posted_at, row?.ingested_at),
          ctaTo: routes.bankConsole,
          ctaLabel: "Open Bank Console",
          level: "low",
        })
      );
    });

    return rows
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [bankRecent, bankUnmatched, expectedPayments, identityRisk, incompleteLoans, pendingPool, routes]);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
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
          sectionLabel="System Operations"
          title="System Operations"
          subtitle="Loading system operations..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.commandCenter}
          backLabel="Command Center"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading system operations...
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
        sectionLabel="System Operations"
        title="System Operations"
        subtitle="See the live pressure, then open the right admin task."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.commandCenter}
        backLabel="Command Center"
      />

      <ExplainToggle
        label="How to use this"
        what="This page gathers the live admin pressure in one place."
        why="It helps you act on the strongest signal first."
        next="Read what matters now, then open the route that matches the work."
        tone="light"
      />

      <section
        style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            {sectionLabelWithIcon("navigation", "Operator overview", "gold")}

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Live operational reading for {operatorName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              See what is happening now, what needs follow-up, and where to move next.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {badgeWithIcon("user", <>Role: {roleLabel}</>, true, "blue")}
              {badgeWithIcon("community", <>Community: {communityLabel}</>)}
              {badgeWithIcon("chart", "Operations")}
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            {sectionLabelWithIcon("alert", "What matters now", operationalFocus ? "gold" : "green")}

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {operationalFocus
                ? "There is a visible operational focus."
                : "No immediate operational focus is visible."}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {operationalFocus
                ? safeStr((operationalFocus as any).detail || "Review the top signal and move into the right admin page.")
                : "No admin queue is dominating the live feed right now."}
            </div>
          </div>
        </div>

        <ExplainToggle
          label="Focus"
          what="The strongest signal is shown first."
          why="Not every queue deserves the same urgency."
          next="Confirm the numbers below, then move into the matching route."
          tone="light"
          style={{ marginTop: 14 }}
        />
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
            {sectionLabelWithIcon("chart", "Operational overview", "blue")}
            <div style={{ marginTop: 8, ...helperText() }}>
              Live pressure in six short facts.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("overview")}
            stableHeight={52}
            debugId="system-operations.toggle.overview"
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Hide"}
          </SecondaryButton>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(6, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              {sectionLabelWithIcon("wallet", "Pending pool", "blue")}
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.pendingPool}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              {sectionLabelWithIcon("bank", "Unmatched bank", "red")}
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.unmatchedBank}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              {sectionLabelWithIcon("calendar", "Expected payments", "gold")}
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.expectedPayments}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              {sectionLabelWithIcon("refresh", "Recent bank", "blue")}
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.recentBank}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              {sectionLabelWithIcon("document", "Incomplete support", "red")}
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.incompleteLoans}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              {sectionLabelWithIcon("id", "Identity cases", "gold")}
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.identityInterventions}
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
            {sectionLabelWithIcon("user", "Entry support monitor", "blue")}
            <div style={{ marginTop: 8, ...helperText() }}>
              Help applicants finish phone, bank, community, or activation steps.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("intake")}
            stableHeight={52}
            debugId="system-operations.toggle.intake"
            style={collapseToggle()}
          >
            {collapsed.intake ? "Open" : "Hide"}
          </SecondaryButton>
        </div>

        <ExplainToggle
          label="Entry help"
          what="This monitor shows the last known entry stage."
          why="A stuck applicant needs the next step, not a long explanation."
          next="Use the stage and next action to guide the person."
          tone="light"
          style={{ marginTop: 14 }}
        />

        {!collapsed.intake ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div
              style={{
                ...innerCard("linear-gradient(135deg, #F8FBFF 0%, #EEF6FF 55%, #FFFBEF 100%)"),
                border: "1px solid rgba(11,99,209,0.14)",
              }}
            >
              {sectionLabelWithIcon("alert", "First support action", "gold")}
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.45,
                }}
              >
                {pilotTriageMessage}
              </div>
            </div>

            {reviewMessage ? (
              <div
                style={{
                  ...innerCard(
                    reviewMessage.toLowerCase().includes("could not")
                      ? "#FFF5F5"
                      : "#ECFDF5"
                  ),
                  color: reviewMessage.toLowerCase().includes("could not")
                    ? "#991B1B"
                    : "#065F46",
                  fontWeight: 900,
                }}
              >
                {reviewMessage}
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(6, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={statTile("#F8FBFF")}>
                {sectionLabelWithIcon("document", "Create records", "blue")}
                <div style={{ marginTop: 8, color: "#0B63D1", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.createTotal}
                </div>
              </div>

              <div style={statTile("#ECFDF5")}>
                {sectionLabelWithIcon("check", "Completed", "green")}
                <div style={{ marginTop: 8, color: "#065F46", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.createCompleted}
                </div>
              </div>

              <div style={statTile("#FFFBEF")}>
                {sectionLabelWithIcon("community", "Ready community", "gold")}
                <div style={{ marginTop: 8, color: "#92400E", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.createReady}
                </div>
              </div>

              <div style={statTile("#FFFBEF")}>
                {sectionLabelWithIcon("bank", "Bank/wallet", "gold")}
                <div style={{ marginTop: 8, color: "#92400E", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.createAwaitingBank}
                </div>
              </div>

              <div style={statTile("#FFF5F5")}>
                {sectionLabelWithIcon("alert", "Needs help", "red")}
                <div style={{ marginTop: 8, color: "#991B1B", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.needsAttention}
                </div>
              </div>

              <div style={statTile("#F8FBFF")}>
                {sectionLabelWithIcon("user", "Join requests", "blue")}
                <div style={{ marginTop: 8, color: "#0B63D1", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.joinTotal}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1.1fr 0.9fr",
                gap: 12,
              }}
            >
              <div style={innerCard("#FCFEFF")}>
                {sectionLabelWithIcon("user", "Create-entry applicants", "blue")}
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {pilotCreateRows.length === 0 ? (
                    <div style={helperText()}>
                      No public create-entry intake records are visible yet.
                    </div>
                  ) : (
                    pilotCreateRows.map((row) => {
                      const tone = stageTone(row?.stage);
                      const communityNames = rowsOf<any>(row?.communities)
                        .map((community) =>
                          firstTruthy(
                            community?.marketplace_name,
                            community?.name,
                            community?.clan_id ? `Community ${community.clan_id}` : ""
                          )
                        )
                        .filter(Boolean);
                      const verificationChecks = rowsOf<any>(row?.verification_checks);
                      const identityPhotoChecks = verificationChecks.filter(
                        (check) => safeStr(check?.type) === "identity_photo"
                      );

                      return (
                        <div
                          key={`pilot-create-${row?.verification_id || row?.created_at}`}
                          style={innerCard(tone.bg)}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color: "#0B1F33",
                                  fontWeight: 900,
                                  lineHeight: 1.35,
                                }}
                              >
                                {firstTruthy(row?.display_name, row?.user?.display_name, "Unnamed applicant")}
                              </div>
                              <div style={{ marginTop: 4, ...helperText(), fontSize: 13 }}>
                                {firstTruthy(row?.phone_e164, "No phone")} | {firstTruthy(row?.email, "No email")}
                              </div>
                            </div>

                            <span
                              style={{
                                ...badge(false),
                                color: tone.text,
                                background:
                                  "linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%)",
                              }}
                            >
                              {pilotStageLabel(row?.stage)}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              color: "#0B1F33",
                              fontWeight: 900,
                              lineHeight: 1.45,
                            }}
                          >
                            {firstTruthy(row?.next_action, "Review this applicant record.")}
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {badgeWithIcon("bank", <>Bank: {firstTruthy(row?.bank_country, "not recorded")}</>)}
                            {badgeWithIcon("globe", <>Region: {firstTruthy(row?.region_consistency_status, "unknown")}</>)}
                            {badgeWithIcon("shield", <>Checks: {verificationChecks.length}</>)}
                          </div>

                          {communityNames.length > 0 ? (
                            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                              Community: {communityNames.join(", ")}
                            </div>
                          ) : null}

                          {identityPhotoChecks.length > 0 ? (
                            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                              {identityPhotoChecks.map((check) => {
                                const checkId = Number(check?.id || 0);
                                const checkStatus = safeStr(check?.status);
                                const hasAttachedUser = Boolean(check?.has_user || check?.user_id || row?.user?.id);
                                const terminal =
                                  checkStatus === "matched" || checkStatus === "failed";

                                return (
                                  <div
                                    key={`identity-photo-check-${checkId}`}
                                    style={innerCard(
                                      checkStatus === "matched"
                                        ? "#ECFDF5"
                                        : checkStatus === "failed"
                                          ? "#FFF5F5"
                                          : "#FFFBEF"
                                    )}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 8,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                                        {actionLabel("image", "Photo evidence", "blue")}
                                      </div>
                                      <span style={badge(checkStatus === "matched")}>
                                        {pilotStageLabel(checkStatus || "review")}
                                      </span>
                                    </div>

                                    <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                                      {firstTruthy(
                                        check?.explanation,
                                        "Manual admin review only. This is not provider KYC, passport OCR, or liveness verification."
                                      )}
                                    </div>
                                    {!hasAttachedUser ? (
                                      <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                                        Review unlocks after account creation attaches this photo to a user.
                                      </div>
                                    ) : null}

                                    <div
                                      style={{
                                        marginTop: 10,
                                        display: "grid",
                                        gridTemplateColumns: isCompact
                                          ? "1fr"
                                          : "repeat(5, minmax(126px, max-content))",
                                        gap: 8,
                                        alignItems: "stretch",
                                      }}
                                    >
                                      {check?.evidence_url ? (
                                        <StableButton
                                          kind="soft"
                                          stableHeight={50}
                                          minWidth={126}
                                          debugId={`system-operations.identity-photo.${checkId}.open`}
                                          disabled={reviewingCheckId === checkId}
                                          busy={reviewingCheckId === checkId}
                                        onClick={() => handleOpenIdentityPhotoEvidence(checkId)}
                                      >
                                          {actionLabel("eye", "Open photo", "blue")}
                                      </StableButton>
                                      ) : null}

                                      <StableButton
                                        kind="primary"
                                        stableHeight={50}
                                        minWidth={104}
                                        disabled={!hasAttachedUser || terminal || reviewingCheckId === checkId}
                                        busy={reviewingCheckId === checkId}
                                        debugId={`system-operations.identity-photo.${checkId}.verify`}
                                        onClick={() =>
                                          handleIdentityPhotoDecision(checkId, "verify")
                                        }
                                      >
                                        {actionLabel("check", "Accept", "green")}
                                      </StableButton>

                                      <StableButton
                                        kind="secondary"
                                        stableHeight={50}
                                        minWidth={126}
                                        disabled={!hasAttachedUser || terminal || reviewingCheckId === checkId}
                                        busy={reviewingCheckId === checkId}
                                        debugId={`system-operations.identity-photo.${checkId}.needs-more`}
                                        onClick={() =>
                                          handleIdentityPhotoDecision(checkId, "needs_more")
                                        }
                                      >
                                        {actionLabel("image", "Clearer evidence", "gold")}
                                      </StableButton>

                                      <StableButton
                                        kind="danger"
                                        stableHeight={50}
                                        minWidth={96}
                                        disabled={!hasAttachedUser || terminal || reviewingCheckId === checkId}
                                        busy={reviewingCheckId === checkId}
                                        debugId={`system-operations.identity-photo.${checkId}.reject`}
                                        onClick={() =>
                                          handleIdentityPhotoDecision(checkId, "reject")
                                        }
                                      >
                                        {actionLabel("alert", "Reject", "red")}
                                      </StableButton>

                                      {terminal ? (
                                        <StableButton
                                          kind="secondary"
                                          stableHeight={50}
                                          minWidth={128}
                                          disabled={!hasAttachedUser || reviewingCheckId === checkId}
                                          busy={reviewingCheckId === checkId}
                                          debugId={`system-operations.identity-photo.${checkId}.reopen`}
                                        onClick={() => handleIdentityPhotoCorrection(checkId)}
                                      >
                                          {actionLabel("refresh", "Reopen", "blue")}
                                        </StableButton>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          <div style={{ marginTop: 8, color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                            Started {safeDateTime(row?.created_at)} | Expires {safeDateTime(row?.expires_at)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                {sectionLabelWithIcon("community", "Join-request applicants", "blue")}
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {pilotJoinRows.length === 0 ? (
                    <div style={helperText()}>
                      No public join requests are visible yet.
                    </div>
                  ) : (
                    pilotJoinRows.map((row) => {
                      const tone = stageTone(row?.stage);
                      return (
                        <div
                          key={`pilot-join-${row?.id || row?.created_at}`}
                          style={innerCard(tone.bg)}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
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
                              {firstTruthy(row?.applicant?.display_name, row?.applicant?.email, "Join applicant")}
                            </div>

                            <span
                              style={{
                                ...badge(false),
                                color: tone.text,
                                background:
                                  "linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%)",
                              }}
                            >
                              {pilotStageLabel(row?.stage || row?.status)}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              color: "#0B1F33",
                              fontWeight: 900,
                              lineHeight: 1.45,
                            }}
                          >
                            {firstTruthy(row?.next_action, "Review this join request.")}
                          </div>

                          <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                            Community:{" "}
                            {firstTruthy(
                              row?.clan?.marketplace_name,
                              row?.clan?.name,
                              row?.clan?.id ? `Community ${row.clan.id}` : "Unknown"
                            )}
                          </div>

                          <div style={{ marginTop: 8, color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                            Requested {safeDateTime(row?.created_at)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div style={{ ...helperText(), fontSize: 12 }}>
              Last generated: {safeDateTime(pilotIntake?.generated_at) || "not loaded"}
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
            {sectionLabelWithIcon("spark", "Live operational signals", "gold")}
            <div style={{ marginTop: 8, ...helperText() }}>
              Newest visible signals, ordered for action.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("signals")}
            stableHeight={52}
            debugId="system-operations.toggle.signals"
            style={collapseToggle()}
          >
            {collapsed.signals ? "Open" : "Hide"}
          </SecondaryButton>
        </div>

        {!collapsed.signals ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {recentSignals.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No live operational signal is shown right now.
              </div>
            ) : (
              recentSignals.map((row) => {
                const tone = signalTone(row);

                return (
                  <div key={`${row.id}-${row.createdAt}`} style={innerCard(tone.bg)}>
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
                        {row.title}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {badgeWithIcon(row.level === "high" ? "alert" : "spark", tone.label, true, row.level === "high" ? "red" : "blue")}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, ...helperText() }}>{row.detail}</div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          color: "#64748B",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {safeDateTime(row.createdAt)}
                      </div>

                      <StableCtaLink
                        to={row.ctaTo}
                        kind="secondary"
                        debugId={`system-operations.signal.${row.id}.route`}
                      >
                        {actionLabel("navigation", row.ctaLabel, "blue")}
                      </StableCtaLink>
                    </div>
                  </div>
                );
              })
            )}
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
            {sectionLabelWithIcon("briefcase", "Operational queues", "blue")}
            <div style={{ marginTop: 8, ...helperText() }}>
              Choose the queue that needs intervention.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("queues")}
            stableHeight={52}
            debugId="system-operations.toggle.queues"
            style={collapseToggle()}
          >
            {collapsed.queues ? "Open" : "Hide"}
          </SecondaryButton>
        </div>

        {!collapsed.queues ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
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
                Immediate queue
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Items that should not wait: bank matches, support decision deadlines, identity review, or pool confirmation.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {badgeWithIcon("wallet", <>Pending pool: {summary.pendingPool}</>, true)}
                {badgeWithIcon("bank", <>Unmatched bank: {summary.unmatchedBank}</>)}
                {badgeWithIcon("document", <>Incomplete support: {summary.incompleteLoans}</>)}
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
                Follow-up queue
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Items that are not critical yet, but should be cleaned before they grow.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {badgeWithIcon("calendar", <>Expected payments: {summary.expectedPayments}</>, true)}
                {badgeWithIcon("wallet", <>Pending pool: {summary.pendingPool}</>)}
                {badgeWithIcon("id", <>Identity cases: {summary.identityInterventions}</>)}
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
            {sectionLabelWithIcon("navigation", "Next routes", "blue")}
            <div style={{ marginTop: 8, ...helperText() }}>
              Open the page that matches the active work.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("routes")}
            stableHeight={52}
            debugId="system-operations.toggle.routes"
            style={collapseToggle()}
          >
            {collapsed.routes ? "Open" : "Hide"}
          </SecondaryButton>
        </div>

        {!collapsed.routes ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <StableCtaLink
              to={routes.bankConsole}
              kind="primary"
              debugId="system-operations.route.bank-console"
              style={routeTile(true)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {actionLabel("bank", "Bank Console", "blue")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Reconcile money, bank events, pool confirmation, and expected payments.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.incompleteLoans}
              debugId="system-operations.route.incomplete-loans"
              style={routeTile(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {actionLabel("document", "Incomplete Support", "gold")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Check support progress, locked cover, and auto-cancel timing.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.identityRisk}
              debugId="system-operations.route.identity-risk"
              style={routeTile(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {actionLabel("id", "Identity Risk", "red")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Review identity overlap, repeated devices, and account integrity.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.trustAnalytics}
              debugId="system-operations.route.trust-analytics"
              style={routeTile(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {actionLabel("chart", "Trust Analytics", "blue")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Read trends after urgent queues are under control.
              </div>
            </StableCtaLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}
