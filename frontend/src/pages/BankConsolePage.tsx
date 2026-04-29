import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
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
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "translateZ(0)",
    outlineOffset: 4,
  };
}

function stopBankTap(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function bankButtonGuardProps() {
  return {
    onPointerDown: stopBankTap,
    onTouchStart: stopBankTap,
    onMouseDown: stopBankTap,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "normal",
    ...stableTapStyle(),
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "normal",
    ...stableTapStyle(),
  };
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
    color: "#4F6B8A",
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
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
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
    status: firstTruthy(src?.status, src?.state, "—") || null,
    description: firstTruthy(src?.description, src?.detail, src?.note) || null,
    direction: firstTruthy(src?.direction, src?.flow) || null,
    created_at:
      firstTruthy(src?.created_at, src?.recorded_at, src?.updated_at) || null,
  };
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
    `confirmed ${confirmed}`,
    `partial ${partial}`,
    `pending ${pending}`,
    `mismatch ${mismatch}`,
    `duplicate ${duplicate}`,
  ].join(", ");

  return needsReview
    ? `Reconciliation complete: ${resultLine}. Review unmatched or mismatched items before treating the rail as settled.`
    : `Reconciliation complete: ${resultLine}. No unmatched review item is visible from this run.`;
}

function renderStepAction(step: NextStepState) {
  return (
    <OriginLink to={step.ctaTo} style={primaryBtn(false)}>
      {step.ctaLabel}
    </OriginLink>
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

  const selectedClanId = Number(getSelectedClanId() || 0);

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

  async function loadAll() {
    setLoading(true);
    setErr("");

    try {
      const clanId = getSelectedClanId();

      const [cfgRes, clanRes] = await Promise.all([
        getPublicConfig().catch(() => null),
        getCurrentClan().catch(() => null),
      ]);

      setCfg(cfgRes || null);
      setCommunity(clanRes || null);

      if (!clanId) {
        setRecent([]);
        setUnmatched([]);
        setCredits([]);
        setExpected([]);
        setExpectedDetail("");
        return;
      }

      const [recentRes, unmatchedRes, creditsRes, expectedRes] =
        await Promise.all([
          listRecentBankEvents(clanId).catch(() => []),
          listUnmatchedBankEvents(clanId).catch(() => []),
          listBankCredits({ clan_id: clanId, currency }).catch(() => []),
          listExpectedPayments({ clan_id: clanId }).catch(() => ({ items: [] })),
        ]);

      setRecent(
        extractRows(recentRes)
          .map((row: any) => normalizeRow(row))
          .filter(Boolean) as BankConsoleRow[]
      );

      setUnmatched(
        extractRows(unmatchedRes)
          .map((row: any) => normalizeRow(row))
          .filter(Boolean) as BankConsoleRow[]
      );

      setCredits(
        extractRows(creditsRes)
          .map((row: any) => normalizeRow(row))
          .filter(Boolean) as BankConsoleRow[]
      );

      setExpected(
        extractRows(expectedRes)
          .map((row: any) => normalizeRow(row))
          .filter(Boolean) as BankConsoleRow[]
      );

      setExpectedDetail(safeStr(expectedRes?.detail || ""));
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load bank console."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [currency, selectedClanId]);

  async function ingestNow() {
    setErr("");
    setMsg("");
    setBusyIngest(true);

    try {
      const clanId = getSelectedClanId();
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

      setMsg(
        `Bank event ingested${
          res?.bank_event_id ? ` (#${res.bank_event_id})` : ""
        }. Status: ${visibleStatus}. Reference: ${visibleReference}.${
          visibleReason ? ` Reason: ${visibleReason}.` : ""
        } Next step: run reconciliation so GSN can match it against expected payments.`
      );
      await loadAll();
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to ingest bank event."));
    } finally {
      setBusyIngest(false);
    }
  }

  async function reconcileNow() {
    setErr("");
    setMsg("");
    setBusyReconcile(true);

    try {
      const clanId = getSelectedClanId();
      if (!clanId) throw new Error("Select a community first.");

      const res = await runBankReconciliation({ clan_id: clanId, limit: 200 });
      setMsg(reconciliationMessage(res));
      await loadAll();
    } catch (e: any) {
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
        ctaTo: "/app/community",
      };
    }

    if (unmatched.length > 0) {
      return {
        title:
          unmatched.length === 1
            ? "One bank event is still unmatched"
            : `${unmatched.length} bank events are still unmatched`,
        detail:
          "After ingestion, the next valid step is reconciliation and review of unmatched items, not guesswork.",
        today: "Run reconciliation and review the unmatched queue carefully.",
        tomorrow:
          "Resolving unmatched events makes settlement cleaner and more defensible.",
        ctaLabel: "Run reconciliation below",
        ctaTo: "/app/command-center/bank-console",
      };
    }

    return {
      title: "Operations path is calmer right now",
      detail:
        "Use manual ingest only when a real event needs to enter the reconciliation path, then review what matched and what did not.",
      today: "Review the recent events and only ingest what is truly needed.",
      tomorrow:
        "Controlled ingest and reconciliation keeps the money path institutional.",
      ctaLabel: "Return to Loans & Support",
      ctaTo: "/app/loans",
    };
  }, [selectedClanId, unmatched.length]);

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
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              {hint}
            </div>
          </div>

          <span style={badge(false)}>{rows.length} records</span>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {rows.length === 0 ? (
            <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>{emptyText}</div>
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
                    {safeStr(row.status || "—")}
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
                        : "—"}
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
                      {safeStr(row.direction || "—")}
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
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() =>
                      safeCopy(
                        [
                          `Reference: ${displayReference}`,
                          `Amount: ${safeStr(row.amount || "—")} ${safeStr(
                            row.currency || ""
                          )}`.trim(),
                          `Status: ${safeStr(row.status || "—")}`,
                          `Direction: ${safeStr(row.direction || "—")}`,
                        ].join(" | ")
                      )
                    }
                    style={secondaryBtn(false)}
                    {...bankButtonGuardProps()}
                  >
                    Copy summary
                  </button>
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
        subtitle="Review bank events here, run reconciliation, and see what has matched or remained unmatched."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/command-center"
        backLabel="Command Center"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Loans & Support", to: "/app/loans" },
          { label: "Payment Rails", to: "/app/payment-rails" },
        ]}
        utilityLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Trust", to: "/app/trust" },
        ]}
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen brings together recent bank events, unmatched items, expected payments, and reconciliation actions in one banking review desk."
        why="It helps you understand what has arrived, what has already matched, and which money events still need careful review."
        next="Read the top summary first, then move into recent events, expected items, or manual ingest depending on what needs to be matched next."
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

            <div style={{ marginTop: 10, color: "#D7E3F1", lineHeight: 1.8 }}>
              Review incoming bank events, match
              them against expected references, and see which items are
              confirmed and which still need review.
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
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {renderStepAction(nextStep)}
              <button
                onClick={() => void loadAll()}
                disabled={loading}
                style={secondaryBtn(loading)}
                {...bankButtonGuardProps()}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
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
            {loading ? "…" : recent.length}
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
            {loading ? "…" : unmatched.length}
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
            {loading ? "…" : credits.length}
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
            {loading ? "…" : expected.length}
          </div>
        </div>
      </section>

      <section id="bank-manual-ingest" style={{ ...pageCard(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Manual Ingest
        </div>

        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          Enter a real bank event only when it should enter the reconciliation
          path.
        </div>

        <ExplainToggle
          label="How to use this"
          what="Manual ingest is the place for entering a real bank event when it needs to enter the reconciliation path and does not already appear in the recent feed."
          why="It prevents the reconciliation desk from becoming noisy with duplicate or speculative entries."
          next="Use this only for a real event that should be tracked now, then refresh and confirm whether it matched or stayed unmatched."
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
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => void ingestNow()}
            disabled={busyIngest}
            style={primaryBtn(busyIngest)}
            {...bankButtonGuardProps()}
          >
            {busyIngest ? "Ingesting..." : "Ingest Event"}
          </button>

          <button
            onClick={() => void reconcileNow()}
            disabled={busyReconcile}
            style={secondaryBtn(busyReconcile)}
            {...bankButtonGuardProps()}
          >
            {busyReconcile ? "Reconciling..." : "Run Reconciliation"}
          </button>
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
                Expected Payments / Config
              </div>
              <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
                Expected payment rows when available, or config visibility when
                not.
              </div>
            </div>

            <span style={badge(false)}>
              {expected.length > 0
                ? `${expected.length} records`
                : "Config / placeholder"}
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
                        {safeStr(row.status || "—")}
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
                            : "—"}
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
                    lineHeight: 1.8,
                  }}
                >
                  {expectedDetail ||
                    safeStr(cfg?.detail) ||
                    "Expected payment visibility is available when the current community has matching bank and reconciliation data."}
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
                    <button
                      onClick={() => safeCopy(JSON.stringify(cfg, null, 2))}
                      style={secondaryBtn(false)}
                      {...bankButtonGuardProps()}
                    >
                      Copy config snapshot
                    </button>
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
