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
  reviewExpectedPaymentProof,
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
  expected_type?: string | null;
  status?: string | null;
  status_reason?: string | null;
  bank_event_id?: number | string | null;
  description?: string | null;
  direction?: string | null;
  created_at?: string | null;
  proof_status?: string | null;
  proof_status_text?: string | null;
  proof_filename?: string | null;
  proof_submitted_at?: string | null;
  meta?: any;
  meta_json?: any;
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

  return actionText("briefcase", "Loan Support");
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
  const meta = safeMeta(src?.meta ?? src?.meta_json);
  const latestProof =
    meta.latest_payment_proof && typeof meta.latest_payment_proof === "object"
      ? meta.latest_payment_proof
      : {};

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
    expected_type: firstTruthy(src?.expected_type, meta.expected_type) || null,
    status: firstTruthy(src?.status, src?.state, "Not stated") || null,
    status_reason: firstTruthy(src?.status_reason, meta.status_reason) || null,
    bank_event_id: src?.bank_event_id ?? meta.bank_event_id ?? null,
    description: firstTruthy(src?.description, src?.detail, src?.note) || null,
    direction: firstTruthy(src?.direction, src?.flow) || null,
    created_at:
      firstTruthy(src?.created_at, src?.recorded_at, src?.updated_at) || null,
    proof_status: firstTruthy(src?.proof_status, meta.proof_status) || null,
    proof_status_text: firstTruthy(src?.proof_status_text, meta.proof_status_text) || null,
    proof_filename:
      firstTruthy(
        src?.proof_filename,
        latestProof.original_filename,
        latestProof.stored_filename
      ) || null,
    proof_submitted_at:
      firstTruthy(src?.proof_submitted_at, latestProof.submitted_at, meta.proof_submitted_at) || null,
    meta,
    meta_json: meta,
  };
}

function safeMeta(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function isCommunityDomainSubscription(row: BankConsoleRow): boolean {
  return safeStr(row.expected_type).toLowerCase() === "community_domain_subscription";
}

function expectedPaymentTypeLabel(row: BankConsoleRow): string {
  const expectedType = safeStr(row.expected_type).toLowerCase();
  if (expectedType === "community_domain_subscription") {
    return "Community Domain subscription";
  }
  if (expectedType === "community_package_subscription") {
    return "Community package";
  }
  if (!expectedType) return "Expected payment";
  return expectedType
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function communityDomainPaymentInfo(row: BankConsoleRow): {
  domainName: string;
  domainCode: string;
  communityName: string;
  payer: string;
  settlementCountry: string;
} {
  const meta = safeMeta(row.meta ?? row.meta_json);
  const intent = safeMeta(meta.payment_intent);
  return {
    domainName: firstTruthy(
      intent.domain_display_name,
      meta.domain_display_name,
      meta.display_name
    ),
    domainCode: firstTruthy(intent.domain_name, meta.domain_name),
    communityName: firstTruthy(intent.community_name, meta.community_name),
    payer: firstTruthy(
      intent.payer_display_name,
      meta.payer_display_name,
      intent.payer_gmfn_id,
      meta.payer_gmfn_id,
      intent.payer_email,
      meta.payer_email
    ),
    settlementCountry: firstTruthy(intent.settlement_country, meta.settlement_country),
  };
}

function buildBankEventReviewPaper(row: BankConsoleRow, displayReference: string): string {
  return buildGsnSnapshotPaper({
    title: "GSN Bank Console Event Review",
    purpose:
      "Protected reconciliation review for one bank-console event or expected payment row.",
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
      "Privacy: copied bank-console summaries exclude protected bank event details, full account details, private contacts, and complete setup secrets.",
    limitationNote:
      "Limitation: protected finance review only. Not a receipt, bank guarantee, payment confirmation, payout approval, or release authority.",
  });
}

function buildBankSettingsReviewPaper(cfg: any): string {
  const enabledText = cfg ? "Bank setup visible to this admin page" : "No bank setup visible";
  return buildGsnSnapshotPaper({
    title: "GSN Bank Console Settings Review",
    purpose:
      "Protected settings summary for bank-console reconciliation behavior.",
    reference: "bank-console-settings",
    context: [
      { label: "Setup state", value: enabledText },
      { label: "Provider", value: firstTruthy(cfg?.provider, cfg?.bank_provider, "not shown") },
      { label: "Expected payment detail", value: firstTruthy(cfg?.detail, "not shown") },
      { label: "Public mode", value: firstTruthy(cfg?.mode, cfg?.status, "not shown") },
    ],
    bodyLines: [
      "Reader boundary: this settings paper is for protected reconciliation review. It deliberately avoids protected technical details and secrets.",
      "Use the live admin console for complete protected setup review.",
    ],
    privacyNote:
      "Privacy: API keys, webhook secrets, protected provider details, account secrets, and private contacts are not included in this copied settings paper.",
    limitationNote:
      "Limitation: protected settings summary only. Not a payment instruction, bank guarantee, receipt, payout approval, or release authority.",
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
  const [busyReviewKey, setBusyReviewKey] = useState("");
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

  async function reviewExpectedProof(row: BankConsoleRow, decision: "approve" | "reject") {
    const operationContextKey =
      bankConsoleContextRef.current || `${selectedClanId || 0}:${safeStr(currency || "NGN")}`;
    const expectedPaymentId = Number(row.id || 0);
    const reviewKey = `${expectedPaymentId}:${decision}`;
    setErr("");
    setMsg("");
    setBusyReviewKey(reviewKey);

    try {
      const clanId = selectedClanId;
      if (!clanId) throw new Error("Select a community first.");
      if (!expectedPaymentId) {
        throw new Error("This expected payment is missing its record id.");
      }

      const res = await reviewExpectedPaymentProof({
        expected_payment_id: expectedPaymentId,
        clan_id: clanId,
        decision,
        note:
          decision === "approve"
            ? "Admin manually checked submitted proof against bank or receipt evidence."
            : "Admin rejected submitted proof; payment not confirmed.",
      });

      if (bankConsoleContextRef.current !== operationContextKey) return;

      const updated = res?.expected_payment || {};
      const status = firstTruthy(updated?.status, row.status, "not stated");
      const reason = firstTruthy(updated?.status_reason, res?.bank_event_status_reason);
      setMsg(
        decision === "approve"
          ? `Finance review approved. Expected payment is now ${status}${
              reason ? ` (${reason})` : ""
            }. If this was a Community Domain subscription, the normal activation path has now run.`
          : "Proof rejected. The expected payment remains unconfirmed and no Community Domain activation was triggered."
      );
      await loadAll();
    } catch (e: any) {
      if (bankConsoleContextRef.current !== operationContextKey) return;

      setErr(String(e?.message || e || "Unable to record finance review."));
    } finally {
      setBusyReviewKey("");
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
      ctaLabel: "Return to Loan Support",
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
          { label: "Loan Support", to: routes.loans },
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

          <div
            style={{
              marginTop: 14,
              borderRadius: 16,
              border: "1px solid rgba(12,79,168,0.18)",
              background:
                "linear-gradient(180deg, #F1F7FF 0%, #F8FBFF 100%)",
              padding: "12px 14px",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={sectionLabel()}>Manual proof decision</div>
            <div
              style={{
                color: "#25415F",
                fontSize: 13,
                lineHeight: 1.5,
                fontWeight: 820,
              }}
            >
              For Community Domain subscription rows with submitted proof, open
              the matching row and use Approve after check or Reject proof.
              Approve only after bank, receipt, or finance review. Other
              expected payments may be listed here, but this panel does not
              manually activate donations, event fees, ROSCA, Spotlight, Shop
              Diary, or ordinary marketplace payments.
            </div>
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
                const hasProof = Boolean(
                  safeStr(row.proof_status || row.proof_status_text || row.proof_filename)
                );
                const isConfirmed = ["confirmed", "applied"].includes(
                  safeStr(row.status).toLowerCase()
                );
                const isCommunityDomainPayment = isCommunityDomainSubscription(row);
                const domainPaymentInfo = isCommunityDomainPayment
                  ? communityDomainPaymentInfo(row)
                  : null;
                const canReviewProof = hasProof && !isConfirmed && isCommunityDomainPayment;
                const approveBusy =
                  busyReviewKey === `${Number(row.id || 0)}:approve`;
                const rejectBusy = busyReviewKey === `${Number(row.id || 0)}:reject`;

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

                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={badge(isCommunityDomainPayment)}>
                            {expectedPaymentTypeLabel(row)}
                          </span>
                          {domainPaymentInfo?.domainName ? (
                            <span style={badge(false)}>
                              {domainPaymentInfo.domainName}
                            </span>
                          ) : null}
                        </div>
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

                      {hasProof ? (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "rgba(46,155,98,0.12)",
                            border: "1px solid rgba(46,155,98,0.22)",
                            color: "#166534",
                            fontSize: 12,
                            fontWeight: 1000,
                            whiteSpace: "normal",
                            textAlign: "center",
                          }}
                        >
                          Proof submitted
                        </div>
                      ) : null}
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

                      <div>
                        <div style={sectionLabel()}>Payment proof</div>
                        <div
                          style={{
                            marginTop: 6,
                            color: hasProof ? "#166534" : "#64748B",
                            fontWeight: 900,
                            lineHeight: 1.45,
                          }}
                        >
                          {safeStr(row.proof_status_text) ||
                            (safeStr(row.proof_filename)
                              ? `Submitted: ${safeStr(row.proof_filename)}`
                              : "No proof uploaded")}
                          {safeStr(row.proof_submitted_at)
                            ? ` at ${safeDateTime(row.proof_submitted_at)}`
                            : ""}
                        </div>
                        </div>
                      </div>

                      {isCommunityDomainPayment ? (
                        <div
                          style={{
                            marginTop: 12,
                            borderRadius: 16,
                            border: "1px solid rgba(12,79,168,0.18)",
                            background: "#F1F7FF",
                            padding: "12px",
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <div style={sectionLabel()}>Community Domain finance handoff</div>
                          <div
                            style={{
                              color: "#25415F",
                              fontSize: 13,
                              lineHeight: 1.45,
                              fontWeight: 820,
                            }}
                          >
                            This row is the Community Domain subscription activation
                            payment. Approve only after manual finance or bank review.
                            Approval can activate the domain subscription; it does not
                            approve donations, registrations, event fees, ROSCA,
                            Spotlight, Shop Diary, or other domain activity payments.
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(150px, 1fr))",
                              gap: 8,
                            }}
                          >
                            {[
                              ["Domain", domainPaymentInfo?.domainName],
                              ["Domain code", domainPaymentInfo?.domainCode],
                              ["Community", domainPaymentInfo?.communityName],
                              ["Payer", domainPaymentInfo?.payer],
                              ["Settlement area", domainPaymentInfo?.settlementCountry],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                style={{
                                  borderRadius: 12,
                                  background: "rgba(255,255,255,0.82)",
                                  border: "1px solid rgba(9,27,46,0.10)",
                                  padding: "8px 10px",
                                  minWidth: 0,
                                }}
                              >
                                <div style={{ ...sectionLabel(), fontSize: 11 }}>
                                  {label}
                                </div>
                                <div
                                  style={{
                                    color: "#0B1F33",
                                    fontSize: 13,
                                    fontWeight: 900,
                                    marginTop: 3,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {safeStr(value) || "Not stated"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                    {canReviewProof ? (
                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gridTemplateColumns: isCompact
                            ? "1fr"
                            : "repeat(2, minmax(170px, max-content))",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <PrimaryButton
                          onClick={() => void reviewExpectedProof(row, "approve")}
                          disabled={Boolean(busyReviewKey)}
                          fullWidth={isCompact}
                          minWidth={isCompact ? undefined : 170}
                          stableHeight={52}
                          debugId={`bank-console.expected.${safeStr(row.id)}.approve-proof`}
                          style={bankConsolePrimaryButtonStyle(Boolean(busyReviewKey))}
                        >
                          {actionText(
                            "shield",
                            approveBusy ? "Approving" : "Approve after check"
                          )}
                        </PrimaryButton>

                        <SecondaryButton
                          onClick={() => void reviewExpectedProof(row, "reject")}
                          disabled={Boolean(busyReviewKey)}
                          fullWidth={isCompact}
                          minWidth={isCompact ? undefined : 170}
                          stableHeight={52}
                          debugId={`bank-console.expected.${safeStr(row.id)}.reject-proof`}
                          style={bankConsoleSecondaryButtonStyle(Boolean(busyReviewKey))}
                        >
                          {actionText(
                            "document",
                            rejectBusy ? "Rejecting" : "Reject proof"
                          )}
                        </SecondaryButton>
                      </div>
                    ) : null}

                    {hasProof && isCommunityDomainPayment && !canReviewProof ? (
                      <div
                        style={{
                          marginTop: 12,
                          color: "#475569",
                          fontSize: 13,
                          lineHeight: 1.45,
                          fontWeight: 800,
                        }}
                      >
                        Finance review action is hidden once the payment is
                        already confirmed/applied. Submitted paper is evidence
                        for review, not automatic proof of money movement.
                      </div>
                    ) : null}
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
