import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { SecondaryButton, StableCtaLink } from "../components/StableButton";
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
  listAdminPoolPending,
  listExpectedPayments,
  listRecentBankEvents,
  listUnmatchedBankEvents,
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
    contain: "layout paint",
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
    minHeight: 38,
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
      return "Some creators have phone proof ready and only need bank or wallet details recorded.";
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
          "Choose the current community first so the admin queues can load the bank, pool, and incomplete-loan signals for the right place.",
      };
    }

    if (bankUnmatched.length > 0) {
      return {
        detail:
          bankUnmatched.length === 1
            ? "One bank event is still unmatched. Reconcile it before treating the finance reading as settled."
            : `${bankUnmatched.length} bank events are still unmatched. Reconcile them before treating the finance reading as settled.`,
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
            ? "One incomplete loan is close to auto-cancel. Review approval progress and coverage now."
            : `${urgentIncomplete} incomplete loans are close to auto-cancel. Review approval progress and coverage now.`,
      };
    }

    if (pendingPool.length > 0) {
      return {
        detail:
          pendingPool.length === 1
            ? "One pool event is waiting for confirmation. Confirm it before the money queue drifts."
            : `${pendingPool.length} pool events are waiting for confirmation. Confirm them before the money queue drifts.`,
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
          "Expected payment items are still open. Keep the money path readable until those expectations settle.",
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
          title: "Incomplete loan queue item",
          detail: [
            `Approved ${toNum(row?.approved_guarantors)}/${toNum(
              row?.guarantors_required
            )}`,
            row?.required_gap != null ? `Gap ${row.required_gap}` : "",
            remaining > 0 ? `${remaining}s remaining` : "Waiting for decisions",
          ]
            .filter(Boolean)
            .join(" | "),
          createdAt: safeStr(row?.decision_at),
          ctaTo: routes.incompleteLoans,
          ctaLabel: "Open Incomplete Loans",
          level: remaining > 0 && remaining <= 60 ? "high" : "medium",
        })
      );
    });

    pendingPool.slice(0, 4).forEach((row, index) => {
      rows.push(
        makeSystemRow({
          id: `pool-pending-${row?.id || index}`,
          kind: "pool.pending",
          title: "Pool confirmation pending",
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
        subtitle="Review live operational reading, handle alerts, and move into the right admin or member page."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.commandCenter}
        backLabel="Command Center"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen gathers the live operational reading, immediate signals, and queue pressure so you can decide which admin or member page needs attention next."
        why="It helps you see operational focus clearly instead of scanning multiple tools with no shared priority view."
        next="Read what matters now first, then move into the operational overview, live signals, or operational queues depending on the pressure you see."
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
            <div style={sectionLabel()}>Operator overview</div>

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
              Review live operational awareness here when you need to see what is happening now, what needs follow-up, and where to move next.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Role: {roleLabel}</span>
              <span style={badge(false)}>Community: {communityLabel}</span>
              <span style={badge(false)}>Operational page</span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>What matters now</div>

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
                : "No immediate admin queue is currently dominating the visible operational feed."}
            </div>
          </div>
        </div>

        <ExplainToggle
          label="What this does"
          what="This block surfaces the strongest operational focus right now so you can see whether the system is calm or whether one signal should take priority."
          why="It keeps you from treating every queue or alert as equally urgent when the product already has a clearer dominant signal."
          next="Read this first, then use the operational sections below to confirm the queues and routes behind that focus."
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
            <div style={sectionLabel()}>Operational overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of live operational pressure.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("overview")}
            stableHeight={38}
            debugId="system-operations.toggle.overview"
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
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
              <div style={sectionLabel()}>Pending pool</div>
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
              <div style={sectionLabel()}>Unmatched bank</div>
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
              <div style={sectionLabel()}>Expected payments</div>
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
              <div style={sectionLabel()}>Recent bank</div>
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
              <div style={sectionLabel()}>Incomplete loans</div>
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
              <div style={sectionLabel()}>Identity cases</div>
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
            <div style={sectionLabel()}>Entry support monitor</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Follow public create-entry and join-request applicants from the admin side during verification.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("intake")}
            stableHeight={38}
            debugId="system-operations.toggle.intake"
            style={collapseToggle()}
          >
            {collapsed.intake ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        <ExplainToggle
          label="What this monitor does"
          what="This monitor shows whether applicants are still at phone proof, bank or wallet details, community setup, completed account creation, or join-request activation."
          why="It stops entry support from becoming guesswork. If someone says they are stuck, the admin can see the last known backend stage and the safest next action."
          next="Look first at records needing help, then use the next-action text to decide whether the applicant should continue, sign in, start again, or receive an activation link."
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
              <div style={sectionLabel()}>First support action</div>
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
                <div style={sectionLabel()}>Create records</div>
                <div style={{ marginTop: 8, color: "#0B63D1", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.createTotal}
                </div>
              </div>

              <div style={statTile("#ECFDF5")}>
                <div style={sectionLabel()}>Completed</div>
                <div style={{ marginTop: 8, color: "#065F46", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.createCompleted}
                </div>
              </div>

              <div style={statTile("#FFFBEF")}>
                <div style={sectionLabel()}>Ready community</div>
                <div style={{ marginTop: 8, color: "#92400E", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.createReady}
                </div>
              </div>

              <div style={statTile("#FFFBEF")}>
                <div style={sectionLabel()}>Bank/wallet</div>
                <div style={{ marginTop: 8, color: "#92400E", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.createAwaitingBank}
                </div>
              </div>

              <div style={statTile("#FFF5F5")}>
                <div style={sectionLabel()}>Needs help</div>
                <div style={{ marginTop: 8, color: "#991B1B", fontSize: 24, fontWeight: 900 }}>
                  {pilotIntakeSummary.needsAttention}
                </div>
              </div>

              <div style={statTile("#F8FBFF")}>
                <div style={sectionLabel()}>Join requests</div>
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
                <div style={sectionLabel()}>Create-entry applicants</div>
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
                            <span style={badge(false)}>
                              Bank: {firstTruthy(row?.bank_country, "not recorded")}
                            </span>
                            <span style={badge(false)}>
                              Region: {firstTruthy(row?.region_consistency_status, "unknown")}
                            </span>
                            <span style={badge(false)}>
                              Checks: {rowsOf<any>(row?.verification_checks).length}
                            </span>
                          </div>

                          {communityNames.length > 0 ? (
                            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                              Community: {communityNames.join(", ")}
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
                <div style={sectionLabel()}>Join-request applicants</div>
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
            <div style={sectionLabel()}>Live operational signals</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The latest visible operational feed, ordered for reading.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("signals")}
            stableHeight={38}
            debugId="system-operations.toggle.signals"
            style={collapseToggle()}
          >
            {collapsed.signals ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        {!collapsed.signals ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {recentSignals.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No live operational signal is currently shown.
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
                        <span style={badge(true)}>{tone.label}</span>
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
                        {row.ctaLabel}
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
            <div style={sectionLabel()}>Operational queues</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Read queue pressure before choosing intervention.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("queues")}
            stableHeight={38}
            debugId="system-operations.toggle.queues"
            style={collapseToggle()}
          >
            {collapsed.queues ? "Open" : "Collapse"}
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
                This queue is for signals that should not wait long: unmatched bank events, incomplete loans nearing auto-cancel, and identity or pool items that need intervention now.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Pending pool: {summary.pendingPool}</span>
                <span style={badge(false)}>Unmatched bank: {summary.unmatchedBank}</span>
                <span style={badge(false)}>Incomplete loans: {summary.incompleteLoans}</span>
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
                This queue is for items that are not yet critical but should be handled before the money path or admin reading drifts further.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Expected payments: {summary.expectedPayments}</span>
                <span style={badge(false)}>Pending pool: {summary.pendingPool}</span>
                <span style={badge(false)}>Identity cases: {summary.identityInterventions}</span>
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
            <div style={sectionLabel()}>Next routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from live reading into the admin page you need next.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("routes")}
            stableHeight={38}
            debugId="system-operations.toggle.routes"
            style={collapseToggle()}
          >
            {collapsed.routes ? "Open" : "Collapse"}
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
                Bank Console
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the work is about reconciliation, unmatched bank events, pending pool confirmation, or expected payments.
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
                Incomplete Loans
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when approval progress, locked coverage, or auto-cancel timing is driving the work.
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
                Identity Risk
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the work is about risky identity overlap, repeated device matches, or account integrity intervention.
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
                Trust Analytics
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the work is about trend reading after the urgent admin queues are under control.
              </div>
            </StableCtaLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}


