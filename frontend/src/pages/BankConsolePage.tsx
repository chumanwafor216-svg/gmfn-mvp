import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink } from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  bankIngestEvent,
  getCurrentClan,
  getPublicConfig,
  getSelectedClanId,
  listBankCredits,
  listExpectedPayments,
  listRecentBankEvents,
  listUnmatchedBankEvents,
  runBankReconciliation,
  safeCopy,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildGsnSnapshotPaper } from "../lib/gsnSnapshotPaper";

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
};

type BankConsoleRow = {
  id?: number | string;
  reference?: string | null;
  reference_raw?: string | null;
  bank_txn_id?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  description?: string | null;
  direction?: string | null;
  created_at?: string | null;
};

type BankConsoleLoadResult = {
  cfg: any;
  community: CommunityLite | null;
  recent: BankConsoleRow[];
  unmatched: BankConsoleRow[];
  credits: BankConsoleRow[];
  expected: BankConsoleRow[];
  expectedDetail: string;
};

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
  ctaTo: string;
};

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

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "Not stated";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.24)",
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.12), 0 8px 18px rgba(7,20,36,0.045), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
    padding: 22,
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
    padding: 16,
  };
}

function bankConsolePrimaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
    transition: "none",
  };
}

function bankConsoleSecondaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid rgba(122,152,195,0.20)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
    transition: "none",
  };
}

function actionText(name: GsnIconName, label: string): React.ReactNode {
  return (
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
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          color: "#EAF3FF",
          background:
            "linear-gradient(180deg, rgba(28,76,122,0.98) 0%, rgba(7,28,47,0.98) 100%)",
          border: "1px solid rgba(196,216,238,0.22)",
          boxShadow:
            "0 9px 18px rgba(2,6,23,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        <GsnLegacyIcon name={name} size={26} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function nextStepActionText(step: NextStepState): React.ReactNode {
  if (step.ctaLabel.toLowerCase().includes("reconcile")) {
    return actionText("refresh", "Match records");
  }

  if (step.ctaLabel.toLowerCase().includes("community")) {
    return actionText("community", "Community Home");
  }

  return actionText("briefcase", "Loans & Support");
}

function inputStyle(): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    background: "#FFFFFF",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontSize: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(29,95,212,0.12)" : "rgba(160,178,201,0.18)",
    color: primary ? "#0B63D1" : "#31506D",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
  };
}

function feedbackCard(success = false): React.CSSProperties {
  return {
    ...pageCard(success ? "#ECFDF5" : "#FEF2F2"),
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
    padding: 14,
  };
}

function getCommunityName(clan: CommunityLite | null): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function extractRows(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeRow(raw: any): BankConsoleRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.event || raw?.payment || raw;

  return {
    id: src?.id ?? src?.bank_event_id ?? src?.payment_id,
    reference:
      firstTruthy(
        src?.reference,
        src?.payment_reference,
        src?.expected_reference
      ) || null,
    reference_raw: firstTruthy(src?.reference_raw) || null,
    bank_txn_id: firstTruthy(src?.bank_txn_id, src?.transaction_id) || null,
    amount: src?.amount ?? src?.expected_amount ?? null,
    currency: firstTruthy(src?.currency, src?.currency_code) || null,
    status: firstTruthy(src?.status, src?.state, "Not stated") || null,
    description: firstTruthy(src?.description, src?.detail, src?.note) || null,
    direction: firstTruthy(src?.direction, src?.flow) || null,
    created_at:
      firstTruthy(src?.created_at, src?.recorded_at, src?.updated_at) || null,
  };
}

function buildBankEventReviewPaper(row: BankConsoleRow, displayReference: string): string {
  return buildGsnSnapshotPaper({
    title: "GSN Bank Console Event Review",
    purpose:
      "Internal reconciliation review for one bank-console event or expected payment row.",
    reference: firstTruthy(displayReference, row.id, row.bank_txn_id, "bank-row"),
    context: [
      { label: "Reference", value: displayReference },
      {
        label: "Amount",
        value: `${safeStr(row.amount || "Not stated")} ${safeStr(row.currency || "")}`.trim(),
      },
      { label: "Status", value: safeStr(row.status || "Not stated") },
      { label: "Direction", value: safeStr(row.direction || "Not stated") },
      { label: "Recorded", value: safeDateTime(row.created_at) },
    ],
    bodyLines: [
      `Description: ${safeStr(row.description || "Not stated")}`,
      "Reader boundary: this is reconciliation review evidence only. It does not prove settlement, confirm money moved, approve payout, or authorize release of goods or credit.",
    ],
    privacyNote:
      "Privacy: copied bank-console summaries exclude raw bank payloads, full account details, private contacts, and complete configuration secrets.",
    limitationNote:
      "Limitation: internal finance review only. Not a receipt, bank guarantee, payment confirmation, payout approval, or release authority.",
  });
}

function buildBankSettingsReviewPaper(cfg: any): string {
  const enabledText = cfg ? "Configuration visible to this admin surface" : "No configuration visible";
  return buildGsnSnapshotPaper({
    title: "GSN Bank Console Settings Review",
    purpose:
      "Internal settings summary for bank-console reconciliation behavior.",
    reference: "bank-console-settings",
    context: [
      { label: "Configuration state", value: enabledText },
      { label: "Provider", value: firstTruthy(cfg?.provider, cfg?.bank_provider, "not shown") },
      { label: "Expected payment detail", value: firstTruthy(cfg?.detail, "not shown") },
      { label: "Public mode", value: firstTruthy(cfg?.mode, cfg?.status, "not shown") },
    ],
    bodyLines: [
      "Reader boundary: this settings paper is for internal reconciliation review. It deliberately avoids raw JSON and secrets.",
      "Use the live admin console for complete protected configuration review.",
    ],
    privacyNote:
      "Privacy: API keys, webhook secrets, raw provider payloads, account secrets, and private contacts are not included in this copied settings paper.",
    limitationNote:
      "Limitation: internal settings summary only. Not a payment instruction, bank guarantee, receipt, payout approval, or release authority.",
  });
}

function statusTone(status?: string | null) {
  const s = safeStr(status).toLowerCase();

  if (
    s.includes("confirmed") ||
    s.includes("matched") ||
    s.includes("settled") ||
    s.includes("success")
  ) {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
    };
  }

  if (
    s.includes("pending") ||
    s.includes("review") ||
    s.includes("waiting") ||
    s.includes("open")
  ) {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
    };
  }

  if (
    s.includes("unmatched") ||
    s.includes("failed") ||
    s.includes("rejected") ||
    s.includes("error")
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

function reconciliationMessage(res: any): string {
  const seen = safeStr(res?.seen || 0);
  const confirmed = safeStr(res?.confirmed || 0);
  const partial = safeStr(res?.partial || 0);
  const pending = safeStr(res?.pending_match || 0);
  const mismatch = safeStr(res?.mismatch_flagged || 0);
  const duplicate = safeStr(res?.duplicate || 0);

  const needsReview = Number(pending) > 0 || Number(mismatch) > 0;
  const resultLine = [
    `Seen ${seen}`,
    `finance-confirmed ${confirmed}`,
    `partial ${partial}`,
    `pending ${pending}`,
    `mismatch ${mismatch}`,
    `duplicate ${duplicate}`,
  ].join(", ");

  return needsReview
    ? `Reconciliation run recorded: ${resultLine}. Review unmatched or mismatched items before treating the rail as settlement-ready.`
    : `Reconciliation run recorded: ${resultLine}. No unmatched review item is visible from this run; this is not settlement or evidence that money moved.`;
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function renderStepAction(step: NextStepState) {
  return (
    <StableCtaLink
      to={step.ctaTo}
      debugId="bank-console.next-step"
      minWidth={156}
      stableHeight={52}
      style={bankConsolePrimaryButtonStyle(false)}
    >
      {nextStepActionText(step)}
    </StableCtaLink>
  );
}

export default function BankConsolePage() {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [cfg, setCfg] = useState<any>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [recent, setRecent] = useState<BankConsoleRow[]>([]);
  const [unmatched, setUnmatched] = useState<BankConsoleRow[]>([]);
  const [credits, setCredits] = useState<BankConsoleRow[]>([]);
  const [expected, setExpected] = useState<BankConsoleRow[]>([]);
  const [expectedDetail, setExpectedDetail] = useState("");

  const [loading, setLoading] = useState(true);
  const [busyIngest, setBusyIngest] = useState(false);
  const [busyReconcile, setBusyReconcile] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [amount, setAmount] = useState("1000.00");
  const [currency, setCurrency] = useState("NGN");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const bankConsoleContextRef = useRef("");
  const bankConsoleLoadSeqRef = useRef(0);

  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "bank-console.route.dashboard"),
      commandCenter: routeTarget("adminCommand", selectedClanId, "bank-console.route.command-center"),
      community: routeTarget("communityHome", selectedClanId, "bank-console.route.community"),
      loans: routeTarget("loans", selectedClanId, "bank-console.route.loans"),
      bankConsole: routeTarget("bankConsole", selectedClanId, "bank-console.route.self"),
      paymentRails: routeTarget("paymentRails", selectedClanId, "bank-console.route.payment-rails"),
      marketplace: routeTarget("marketplace", selectedClanId, "bank-console.route.marketplace"),
      trust: routeTarget("trust", selectedClanId, "bank-console.route.trust"),
    }),
    [selectedClanId]
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
    if (!err && !msg) return;

    const timer = window.setTimeout(() => {
      setErr("");
      setMsg("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [err, msg]);

  const normalizeRows = useCallback((input: any): BankConsoleRow[] => {
    return extractRows(input)
      .map((row: any) => normalizeRow(row))
      .filter(Boolean) as BankConsoleRow[];
  }, []);

  const clearBankConsoleState = useCallback(() => {
    setCfg(null);
    setCommunity(null);
    setRecent([]);
    setUnmatched([]);
    setCredits([]);
    setExpected([]);
    setExpectedDetail("");
  }, []);

  const fetchBankConsole = useCallback(async (): Promise<BankConsoleLoadResult> => {
    const clanId = selectedClanId;

    const [cfgRes, clanRes] = await Promise.all([
      getPublicConfig().catch(() => null),
      getCurrentClan().catch(() => null),
    ]);

    if (!clanId) {
      return {
        cfg: cfgRes || null,
        community: clanRes || null,
        recent: [],
        unmatched: [],
        credits: [],
        expected: [],
        expectedDetail: "",
      };
    }

    const [recentRes, unmatchedRes, creditsRes, expectedRes] =
      await Promise.all([
        listRecentBankEvents(clanId).catch(() => []),
        listUnmatchedBankEvents(clanId).catch(() => []),
        listBankCredits({ clan_id: clanId, currency }).catch(() => []),
        listExpectedPayments({ clan_id: clanId }).catch(() => ({ items: [] })),
      ]);

    return {
      cfg: cfgRes || null,
      community: clanRes || null,
      recent: normalizeRows(recentRes),
      unmatched: normalizeRows(unmatchedRes),
      credits: normalizeRows(creditsRes),
      expected: normalizeRows(expectedRes),
      expectedDetail: safeStr(expectedRes?.detail || ""),
    };
  }, [currency, normalizeRows, selectedClanId]);

  const loadAll = useCallback(async () => {
    const contextKey = `${selectedClanId || 0}:${safeStr(currency || "NGN")}`;
    const loadSeq = bankConsoleLoadSeqRef.current + 1;
    bankConsoleLoadSeqRef.current = loadSeq;
    bankConsoleContextRef.current = contextKey;
    setLoading(true);
    setErr("");
    clearBankConsoleState();

    try {
      const result = await fetchBankConsole();

      if (
        bankConsoleContextRef.current !== contextKey ||
        bankConsoleLoadSeqRef.current !== loadSeq
      ) {
        return;
      }

      setCfg(result.cfg);
      setCommunity(result.community);
      setRecent(result.recent);
      setUnmatched(result.unmatched);
      setCredits(result.credits);
      setExpected(result.expected);
      setExpectedDetail(result.expectedDetail);
    } catch (e: any) {
      if (
        bankConsoleContextRef.current !== contextKey ||
        bankConsoleLoadSeqRef.current !== loadSeq
      ) {
        return;
      }

      setErr(String(e?.message || e || "Unable to load bank console."));
    } finally {
      if (
        bankConsoleContextRef.current === contextKey &&
        bankConsoleLoadSeqRef.current === loadSeq
      ) {
        setLoading(false);
      }
    }
  }, [clearBankConsoleState, currency, fetchBankConsole, selectedClanId]);

  useEffect(() => {
    void loadAll();
  }, [currency, loadAll, selectedClanId]);

  async function ingestNow() {
    const operationContextKey =
      bankConsoleContextRef.current || `${selectedClanId || 0}:${safeStr(currency || "NGN")}`;
    setErr("");
    setMsg("");
    setBusyIngest(true);

    try {
      const clanId = selectedClanId;
      if (!clanId) throw new Error("Select a community first.");

      if (!amount || Number(amount) <= 0) {
        throw new Error("Enter a valid amount.");
      }

      const res = await bankIngestEvent({
        clan_id: clanId,
        amount,
        currency,
        direction,
        reference: reference || null,
        description: description || null,
      });

      const visibleReference = firstTruthy(res?.reference, reference, "no reference");
      const visibleStatus = firstTruthy(res?.status, "detected");
      const visibleReason = firstTruthy(res?.status_reason);

      if (bankConsoleContextRef.current !== operationContextKey) return;

      setMsg(
        `Bank event ingested${
          res?.bank_event_id ? ` (#${res.bank_event_id})` : ""
        }. Status: ${visibleStatus}. Reference: ${visibleReference}.${
          visibleReason ? ` Reason: ${visibleReason}.` : ""
        } Next step: run reconciliation so GSN can match it against expected payments.`
      );
      await loadAll();
    } catch (e: any) {
      if (bankConsoleContextRef.current !== operationContextKey) return;

      setErr(String(e?.message || e || "Unable to ingest bank event."));
    } finally {
      setBusyIngest(false);
    }
  }

  async function reconcileNow() {
    const operationContextKey =
      bankConsoleContextRef.current || `${selectedClanId || 0}:${safeStr(currency || "NGN")}`;
    setErr("");
    setMsg("");
    setBusyReconcile(true);

    try {
      const clanId = selectedClanId;
      if (!clanId) throw new Error("Select a community first.");

      const res = await runBankReconciliation({ clan_id: clanId, limit: 200 });
      if (bankConsoleContextRef.current !== operationContextKey) return;

      setMsg(reconciliationMessage(res));
      await loadAll();
    } catch (e: any) {
      if (bankConsoleContextRef.current !== operationContextKey) return;

      setErr(String(e?.message || e || "Unable to run reconciliation."));
    } finally {
      setBusyReconcile(false);
    }
  }

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first",
        detail:
          "Bank operations are clearer once your current community is in place.",
        today: "Open Community Home and confirm the community first.",
        tomorrow:
          "A clear community keeps operations disciplined and traceable.",
        ctaLabel: "Open Community Home",
        ctaTo: routes.community,
      };
    }

    if (unmatched.length > 0) {
      return {
        title:
          unmatched.length === 1
            ? "One bank event is still unmatched"
            : `${unmatched.length} bank events are still unmatched`,
        detail:
          "Match records first, then review the unmatched queue.",
        today: "Match records now, then open the item still needing review.",
        tomorrow:
          "Clean matched records make later settlement review easier to defend.",
        ctaLabel: "Match records",
        ctaTo: routes.bankConsole,
      };
    }

    return {
      title: "Operations path is calmer right now",
      detail:
        "Only ingest a real event that needs review now.",
      today: "Check recent events before adding anything manually.",
      tomorrow:
        "Fewer manual entries keeps the money record cleaner.",
      ctaLabel: "Return to Loans & Support",
      ctaTo: routes.loans,
    };
  }, [routes.bankConsole, routes.community, routes.loans, selectedClanId, unmatched.length]);

  function renderList(
    title: string,
    hint: string,
    rows: BankConsoleRow[],
    emptyText: string
  ) {
    return (
      <div style={pageCard("#FFFFFF")}>
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
            <div
              style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}
            >
              {title}
            </div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.45 }}>
              {hint}
            </div>
          </div>

          <span style={badge(false)}>{rows.length} records</span>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {rows.length === 0 ? (
            <div style={{ color: "#6B7A88", lineHeight: 1.45 }}>{emptyText}</div>
          ) : null}

          {rows.map((row: BankConsoleRow, i: number) => {
            const tone = statusTone(row.status);
            const displayReference = firstTruthy(
              row.reference,
              row.reference_raw,
              row.bank_txn_id,
              `Item ${i + 1}`
            );

            return (
              <div
                key={safeStr(row.id || displayReference || i)}
                style={innerCard("#FCFEFF")}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 1000,
                        color: "#0B1F33",
                        fontSize: 16,
                      }}
                    >
                      {displayReference}
                    </div>

                    {safeStr(row.description) ? (
                      <div
                        style={{
                          marginTop: 6,
                          color: "#6B7A88",
                          lineHeight: 1.7,
                          fontSize: 14,
                        }}
                      >
                        {safeStr(row.description)}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: tone.bg,
                      border: tone.border,
                      color: tone.text,
                      fontSize: 12,
                      fontWeight: 1000,
                      whiteSpace: "normal",
                      textAlign: "center",
                    }}
                  >
                    {safeStr(row.status || "Not stated")}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={sectionLabel()}>Amount</div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "#0B1F33",
                        fontWeight: 900,
                      }}
                    >
                      {safeStr(row.amount)
                        ? `${safeStr(row.amount)} ${safeStr(row.currency)}`
                        : "Not stated"}
                    </div>
                  </div>

                  <div>
                    <div style={sectionLabel()}>Direction</div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "#0B1F33",
                        fontWeight: 900,
                      }}
                    >
                      {safeStr(row.direction || "Not stated")}
                    </div>
                  </div>

                  <div>
                    <div style={sectionLabel()}>Recorded</div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "#0B1F33",
                        fontWeight: 900,
                      }}
                    >
                      {safeDateTime(row.created_at)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(132px, max-content)",
                    gap: 10,
                  }}
                >
                  <SecondaryButton
                    onClick={() =>
                      safeCopy(buildBankEventReviewPaper(row, displayReference))
                    }
                    fullWidth={isCompact}
                    minWidth={isCompact ? undefined : 132}
                    stableHeight={52}
                    debugId={`bank-console.row.${safeStr(row.id || displayReference || i)}.copy`}
                    style={bankConsoleSecondaryButtonStyle(false)}
                  >
                    {actionText("copy", "Copy summary")}
                  </SecondaryButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Bank Console"
        title="Bank Console"
        subtitle="Match bank events and review what is still open."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.commandCenter}
        backLabel="Command Center"
        nextLinks={[
          { label: "Community Home", to: routes.community },
          { label: "Loans & Support", to: routes.loans },
          { label: "Payment Rails", to: routes.paymentRails },
        ]}
        utilityLinks={[
          { label: "Marketplace", to: routes.marketplace },
          { label: "Trust", to: routes.trust },
        ]}
      />

      <ExplainToggle
        label="What this screen does"
        what="See bank events, matches, and items still needing review."
        why="It keeps community money records traceable."
        next="Match records first. Add manually only when a real event is missing."
        tone="light"
        style={{ marginTop: 18 }}
      />

      {err ? (
        <div style={{ ...feedbackCard(false), marginTop: 18 }}>{err}</div>
      ) : null}

      {msg ? (
        <div style={{ ...feedbackCard(true), marginTop: 18 }}>{msg}</div>
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
            <div style={sectionLabel()}>Operations page</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#F8FBFF",
                lineHeight: 1.15,
              }}
            >
              {nextStep.title}
            </div>

            <div style={{ marginTop: 10, color: "#D7E3F1", lineHeight: 1.45 }}>
              Check incoming bank events, review matched records, and investigate
              anything still unmatched.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Context: {selectedCommunityLabel}</span>
              <span style={badge(false)}>Recent: {recent.length}</span>
              <span style={badge(false)}>Unmatched: {unmatched.length}</span>
              <span style={badge(false)}>Credits: {credits.length}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(2, minmax(142px, max-content))",
                gap: 10,
                alignItems: "center",
              }}
            >
              {renderStepAction(nextStep)}
              <SecondaryButton
                onClick={() => void loadAll()}
                disabled={loading}
                fullWidth={isCompact}
                minWidth={isCompact ? undefined : 142}
                stableHeight={52}
                debugId="bank-console.refresh"
                style={bankConsoleSecondaryButtonStyle(loading)}
              >
                {actionText("refresh", loading ? "Refreshing" : "Refresh")}
              </SecondaryButton>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
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
                  color: "#0B1F33",
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

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <ExplainToggle
            label="What this does"
            what="This summary shows the current bank-console reading across recent events, unmatched items, credits, and expected payments."
            why="It helps you see where the money path is calm and where review is still needed before you act."
            next="Use the unmatched and expected counts to decide whether to reconcile, investigate, or continue into the detailed event lists below."
            tone="light"
          />
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Recent events</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "..." : recent.length}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Unmatched</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "..." : unmatched.length}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Credits</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "..." : credits.length}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Expected items</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "..." : expected.length}
          </div>
        </div>
      </section>

      <section id="bank-manual-ingest" style={{ ...pageCard(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Record Missing Bank Event
        </div>

        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.45 }}>
          Add one real bank event only when it is missing from the bank feed.
        </div>

        <ExplainToggle
          label="How to use this"
          what="Record one missing real bank event."
          why="This avoids duplicate or speculative entries."
          next="Save it, refresh, then check whether a matched record is visible."
          tone="light"
          style={{ marginTop: 14 }}
        />

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
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            style={inputStyle()}
          />

          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="Currency"
            style={inputStyle()}
          />

          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "credit" | "debit")}
            style={inputStyle()}
          >
            <option value="credit">credit</option>
            <option value="debit">debit</option>
          </select>

          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference"
            style={inputStyle()}
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            style={{
              ...inputStyle(),
              gridColumn: isCompact ? "auto" : "span 2",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(2, minmax(152px, max-content))",
            gap: 10,
            alignItems: "center",
          }}
        >
          <PrimaryButton
            onClick={() => void ingestNow()}
            disabled={busyIngest}
            fullWidth={isCompact}
            minWidth={isCompact ? undefined : 152}
            stableHeight={52}
            debugId="bank-console.ingest"
            style={bankConsolePrimaryButtonStyle(busyIngest)}
          >
            {actionText("document", busyIngest ? "Recording" : "Record event")}
          </PrimaryButton>

          <SecondaryButton
            onClick={() => void reconcileNow()}
            disabled={busyReconcile}
            fullWidth={isCompact}
            minWidth={isCompact ? undefined : 152}
            stableHeight={52}
            debugId="bank-console.reconcile"
            style={bankConsoleSecondaryButtonStyle(busyReconcile)}
          >
            {actionText("refresh", busyReconcile ? "Matching" : "Match records")}
          </SecondaryButton>
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
          gap: 18,
        }}
      >
        {renderList(
          "Recent Events",
          "Newest bank-side items visible in this community.",
          recent,
          "No recent bank event is currently shown."
        )}

        {renderList(
          "Unmatched Events",
          "Events that still need review or matching.",
          unmatched,
          "No unmatched bank event is currently shown."
        )}

        {renderList(
          "Credits",
          "Visible credit-side bank records for this currency context.",
          credits,
          "No credit record is currently shown."
        )}

        <div style={pageCard("#FFFFFF")}>
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
              <div
                style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}
              >
                Expected Payments / Setup
              </div>
              <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.45 }}>
                Expected payment rows, or setup visibility when rows are not
                ready.
              </div>
            </div>

            <span style={badge(false)}>
              {expected.length > 0
                ? `${expected.length} records`
                : "Not stated"}
            </span>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {expected.length > 0 ? (
              expected.map((row: BankConsoleRow, i: number) => {
                const tone = statusTone(row.status);
                const displayReference = firstTruthy(
                  row.reference,
                  row.reference_raw,
                  row.bank_txn_id,
                  `Expected ${i + 1}`
                );

                return (
                  <div
                    key={safeStr(row.id || displayReference || i)}
                    style={innerCard("#FCFEFF")}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 1000,
                            color: "#0B1F33",
                            fontSize: 16,
                          }}
                        >
                          {displayReference}
                        </div>

                        {safeStr(row.description) ? (
                          <div
                            style={{
                              marginTop: 6,
                              color: "#6B7A88",
                              lineHeight: 1.7,
                              fontSize: 14,
                            }}
                          >
                            {safeStr(row.description)}
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: tone.bg,
                          border: tone.border,
                          color: tone.text,
                          fontSize: 12,
                          fontWeight: 1000,
                          whiteSpace: "normal",
                          textAlign: "center",
                        }}
                      >
                        {safeStr(row.status || "Not stated")}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={sectionLabel()}>Amount</div>
                        <div
                          style={{
                            marginTop: 6,
                            color: "#0B1F33",
                            fontWeight: 900,
                          }}
                        >
                          {safeStr(row.amount)
                            ? `${safeStr(row.amount)} ${safeStr(row.currency)}`
                            : "Not stated"}
                        </div>
                      </div>

                      <div>
                        <div style={sectionLabel()}>Recorded</div>
                        <div
                          style={{
                            marginTop: 6,
                            color: "#0B1F33",
                            fontWeight: 900,
                          }}
                        >
                          {safeDateTime(row.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>Expected payments visibility</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#475569",
                    lineHeight: 1.45,
                  }}
                >
                  {expectedDetail ||
                    safeStr(cfg?.detail) ||
                    "Expected payments appear when this community has matching bank data."}
                </div>

                {cfg ? (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <SecondaryButton
                      onClick={() => safeCopy(buildBankSettingsReviewPaper(cfg))}
                      minWidth={150}
                      stableHeight={52}
                      debugId="bank-console.copy-config"
                      style={bankConsoleSecondaryButtonStyle(false)}
                    >
                      {actionText("copy", "Copy settings")}
                    </SecondaryButton>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
