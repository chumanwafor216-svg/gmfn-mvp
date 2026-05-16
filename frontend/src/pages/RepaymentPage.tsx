import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  createLoanInstruction,
  getCurrentClan,
  getLoanSummary,
  getMe,
  getSelectedClanId,
  listExpectedPayments,
  safeCopy,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type NoticeTone = "success" | "error";

type LoanInstruction = {
  expected_payment_id?: number;
  reference?: string | null;
  reference_display?: string | null;
  reference_normalized?: string | null;
  loan_id?: number;
  amount?: string | number | null;
  currency?: string | null;
  due_at?: string | null;
  settlement?: {
    railName?: string | null;
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    sortCode?: string | null;
  } | null;
};

type ExpectedPaymentRow = {
  id?: number | string | null;
  expected_type?: string | null;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  reference_display?: string | null;
  reference_normalized?: string | null;
  confirmed_at?: string | null;
  due_at?: string | null;
  status_reason?: string | null;
  matched_bank_event_id?: number | string | null;
  meta?: any;
  meta_json?: any;
  loan_id?: number | string | null;
};

type CollapseState = {
  overview: boolean;
  instruction: boolean;
  result: boolean;
  routes: boolean;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function n(value: unknown): number {
  const raw = safeStr(value).replace(/,/g, "");
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function fmtMoney(value: unknown, currency: string): string {
  return `${n(value).toFixed(2)} ${currency}`;
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "Not set";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

function lc(value: unknown): string {
  return safeStr(value).toLowerCase();
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#C8D8EA",
    fontSize: 14.5,
    lineHeight: 1.75,
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
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...pageCard(tone === "error" ? "#FEF2F2" : "#F3FBF5"),
    border:
      tone === "error"
        ? "1px solid rgba(239,68,68,0.16)"
        : "1px solid rgba(34,197,94,0.16)",
    color: tone === "error" ? "#991B1B" : "#166534",
    fontWeight: 800,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 120,
    padding: "9px 13px",
    borderRadius: 12,
    border: "1px solid rgba(121,149,190,0.20)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: "#E6EEF8",
    fontWeight: 800,
    fontSize: 13,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    boxShadow: "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function communityName(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || "Selected community"
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

function communityImageSrc(currentClan: any): string {
  return firstTruthy(
    currentClan?.community_image_url,
    currentClan?.profile_image_url,
    currentClan?.marketplace_image_url,
    currentClan?.cover_image_url,
    currentClan?.banner_url,
    currentClan?.image_url,
    currentClan?.logo_url
  );
}

function defaultCollapseState(): CollapseState {
  return {
    overview: false,
    instruction: false,
    result: false,
    routes: false,
  };
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { loanId?: number | string } = {}
): string {
  return resolveCtaTarget(intent, { communityId, debugId, ...extra }).to as string;
}

export default function RepaymentPage() {
  const { loanId } = useParams<{ loanId?: string }>();
  const numericLoanId = Number(loanId || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(defaultCollapseState());
  const [loading, setLoading] = useState(true);
  const [generatingInstruction, setGeneratingInstruction] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [instruction, setInstruction] = useState<LoanInstruction | null>(null);
  const [paymentConfirmedAt, setPaymentConfirmedAt] = useState<string | null>(null);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRow[]>([]);
  const selectedClanId = Number(getSelectedClanId() || 0);
  const activeCommunityId = Number(summary?.clan_id || currentClan?.id || currentClan?.clan_id || selectedClanId || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", activeCommunityId, "repayment.route.dashboard"),
      loans: routeTarget("loans", activeCommunityId, "repayment.route.loans"),
      finance: routeTarget("finance", activeCommunityId, "repayment.route.finance"),
      loanSummary:
        numericLoanId > 0
          ? routeTarget("loanSummary", activeCommunityId, "repayment.route.loan-summary", {
              loanId: numericLoanId,
            })
          : routeTarget("loans", activeCommunityId, "repayment.route.loan-summary-fallback"),
    }),
    [activeCommunityId, numericLoanId]
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
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    async function loadPage() {
      setLoading(true);
      try {
        const [meRes, clanRes, summaryRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          numericLoanId > 0 ? getLoanSummary(numericLoanId).catch(() => null) : Promise.resolve(null),
        ]);

        if (!alive) return;
        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setSummary(summaryRes || null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      alive = false;
    };
  }, [numericLoanId]);

  useEffect(() => {
    let alive = true;

    async function loadExpected() {
      const clanId = Number(summary?.clan_id || currentClan?.id || currentClan?.clan_id || 0);
      if (clanId <= 0 || numericLoanId <= 0) {
        if (alive) setExpectedPayments([]);
        return;
      }

      try {
        const res = await listExpectedPayments({
          clan_id: clanId,
          expected_type: "repayment",
          limit: 100,
        }).catch(() => null);

        if (!alive) return;
        const items = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.items)
          ? (res as any).items
          : Array.isArray((res as any)?.data?.items)
          ? (res as any).data.items
          : [];
        setExpectedPayments(items as ExpectedPaymentRow[]);
      } catch {
        if (alive) setExpectedPayments([]);
      }
    }

    void loadExpected();
    return () => {
      alive = false;
    };
  }, [summary, currentClan, numericLoanId, instruction, paymentConfirmedAt]);

  const currency = firstTruthy(summary?.currency, "NGN");
  const loanStatus = lc(summary?.status);
  const canRepay =
    loanStatus === "approved" || loanStatus === "disbursed" || loanStatus === "active";
  const repaymentTaskActive = canRepay && !paymentConfirmedAt;

  const memberName =
    firstTruthy(
      me?.display_name,
      me?.nickname,
      me?.name,
      me?.first_name,
      me?.email
    ) || "Member";

  const gmfnId = firstTruthy(me?.gmfn_id, "Awaiting issue");
  const communityLabel = communityName(currentClan);
  const communityCode = communityPublicId(currentClan);
  const memberRole = communityRole(currentClan);
  const pictureSrc = communityImageSrc(currentClan);

  const outstandingAmount = useMemo(() => {
    const remaining = n(summary?.remaining_amount);
    if (remaining > 0) return remaining;
    return n(summary?.amount);
  }, [summary]);

  const currentExpectedPayment = useMemo(() => {
    const instructionExpectedId = Number(instruction?.expected_payment_id || 0);
    const instructionReference = firstTruthy(
      instruction?.reference_normalized,
      instruction?.reference_display,
      instruction?.reference
    ).toUpperCase();

    return (
      expectedPayments.find((item) => {
        const itemId = Number(item?.id || 0);
        const itemLoanId =
          Number(item?.loan_id || item?.meta?.loan_id || item?.meta_json?.loan_id || 0);
        const itemReference = firstTruthy(
          item?.reference_normalized,
          item?.reference_display
        ).toUpperCase();

        if (instructionExpectedId > 0 && itemId === instructionExpectedId) return true;
        if (instructionReference && itemReference && itemReference === instructionReference) return true;
        if (itemLoanId > 0 && itemLoanId === numericLoanId) return true;
        return false;
      }) || null
    );
  }, [expectedPayments, instruction, numericLoanId]);

  const routeState = useMemo(() => {
    if (!numericLoanId || !summary) {
      return {
        toneBg: "#FEF2F2",
        toneBorder: "1px solid rgba(239,68,68,0.16)",
        toneText: "#991B1B",
        step: "Context",
        title: "Loan repayment context is not ready.",
        detail: "Open a visible support item first so repayment can stay tied to the correct loan.",
      };
    }

    if (!canRepay) {
      return {
        toneBg: "#FFFBEF",
        toneBorder: "1px solid rgba(245,158,11,0.16)",
        toneText: "#92400E",
        step: "Eligibility",
        title: "Repayment opens after approval or disbursement.",
        detail: "This support item is not yet in a repayment-ready state.",
      };
    }

    if (!instruction) {
      return {
        toneBg: "#F8FBFF",
        toneBorder: "1px solid rgba(11,99,209,0.12)",
        toneText: "#0B63D1",
        step: "Instruction",
        title: "Generate the repayment instruction.",
        detail: "Use the exact loan repayment reference so the money trail can be reconciled to the correct support item.",
      };
    }

    if (!paymentConfirmedAt) {
      return {
        toneBg: "#F8FBFF",
        toneBorder: "1px solid rgba(11,99,209,0.12)",
        toneText: "#0B63D1",
        step: "Payment",
        title: "Pay using the exact repayment reference.",
        detail: "Once payment is made, keep this route focused until the repayment is clearly awaiting reconciliation.",
      };
    }

    return {
      toneBg: "#FFFBEF",
      toneBorder: "1px solid rgba(245,158,11,0.16)",
      toneText: "#92400E",
      step: "Awaiting reconciliation",
      title: "Repayment is waiting for reconciliation.",
      detail: "The payment has been declared on this route and should now remain visible until finance or admin reconciliation confirms it.",
    };
  }, [numericLoanId, summary, canRepay, instruction, paymentConfirmedAt]);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleGenerateInstruction() {
    if (!numericLoanId || !summary) {
      setNotice({ tone: "error", text: "Loan repayment context is not ready." });
      return;
    }

    const clanId = Number(summary?.clan_id || currentClan?.id || currentClan?.clan_id || 0);
    if (clanId <= 0) {
      setNotice({ tone: "error", text: "Community context is not ready." });
      return;
    }

    if (!canRepay) {
      setNotice({
        tone: "error",
        text: "Repayment instructions open only after approval or disbursement.",
      });
      return;
    }

    if (outstandingAmount <= 0) {
      setNotice({
        tone: "error",
        text: "No outstanding repayment amount is visible for this support item.",
      });
      return;
    }

    setGeneratingInstruction(true);
    try {
      const generated = await createLoanInstruction({
        clan_id: clanId,
        loan_id: numericLoanId,
        amount: String(outstandingAmount.toFixed(2)),
        currency,
      });

      setInstruction((generated || null) as LoanInstruction | null);
      setPaymentConfirmedAt(null);
      setNotice({ tone: "success", text: "Repayment instruction generated." });
    } catch (error: any) {
      setNotice({
        tone: "error",
        text:
          safeStr(error?.message) ||
          "Repayment instruction could not be generated.",
      });
    } finally {
      setGeneratingInstruction(false);
    }
  }

  function handleConfirmPaymentMade() {
    if (!instruction) {
      setNotice({ tone: "error", text: "Generate the repayment instruction first." });
      return;
    }

    setPaymentConfirmedAt(new Date().toISOString());
    setNotice({
      tone: "success",
      text: "Repayment marked as made. Waiting for reconciliation.",
    });
  }

  function handleCopyReference() {
    const reference = firstTruthy(
      instruction?.reference_display,
      instruction?.reference
    );
    if (!reference) {
      setNotice({ tone: "error", text: "No repayment reference is visible yet." });
      return;
    }

    safeCopy(reference);
    setNotice({ tone: "success", text: "Repayment reference copied." });
  }

  function handleCopyInstruction() {
    if (!instruction) {
      setNotice({ tone: "error", text: "Generate the repayment instruction first." });
      return;
    }

    const settlement = instruction?.settlement || {};
    const text = [
      `Community: ${communityLabel}`,
      `Community ID: ${communityCode}`,
      `GSN ID: ${gmfnId}`,
      `Member: ${memberName}`,
      memberRole ? `Role: ${memberRole}` : "",
      `Loan ID: ${numericLoanId}`,
      `Current step: ${routeState.step}`,
      `Outstanding amount: ${fmtMoney(outstandingAmount, currency)}`,
      firstTruthy(instruction?.reference_display, instruction?.reference)
        ? `Reference: ${firstTruthy(instruction?.reference_display, instruction?.reference)}`
        : "",
      settlement?.bankName ? `Bank: ${settlement.bankName}` : "",
      settlement?.accountName ? `Account name: ${settlement.accountName}` : "",
      settlement?.accountNumber ? `Account number: ${settlement.accountNumber}` : "",
      settlement?.sortCode ? `Sort code: ${settlement.sortCode}` : "",
      instruction?.due_at ? `Due at: ${safeDateTime(instruction.due_at)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    safeCopy(text);
    setNotice({ tone: "success", text: "Repayment instruction copied." });
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40, display: "grid", gap: 18 }}>
        <PageTopNav
          sectionLabel="Repayment"
          title="Loan Repayment"
          subtitle="Loading the repayment route..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.loans}
          backLabel="Loans & Support"
        />
        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "rgba(230,238,248,0.76)", lineHeight: 1.8 }}>Loading repayment route...</div>
        </section>
      </div>
    );
  }

  if (!numericLoanId || !summary) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40, display: "grid", gap: 18 }}>
        <PageTopNav
          sectionLabel="Repayment"
          title="Loan Repayment"
          subtitle="Repayment needs one visible support item."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.loans}
          backLabel="Loans & Support"
        />
        <section style={pageCard("#FEF2F2")}>
          <div style={{ color: "#991B1B", fontWeight: 900 }}>Loan repayment could not be opened.</div>
          <div style={{ marginTop: 8, color: "#991B1B", lineHeight: 1.8 }}>
            Open the correct support item first, then continue into repayment from its loan summary.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: isCompact ? 40 : 60, display: "grid", gap: 18 }}>
      <PageTopNav
        sectionLabel="Repayment"
        title={`Loan Repayment #${numericLoanId}`}
        subtitle="Repayment is its own guided money stage. It stays tied to one support item from exact amount and reference through payment and reconciliation."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.loanSummary}
        backLabel="Loan Summary"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page is one step inside Loans & Support. It handles one repayment from exact amount and reference through payment instruction, result, and reconciliation."
        why="It keeps repayment tied to the correct support item so you do not lose the amount, reference, or status that the support flow depends on. Finance records the outcome after the money move is done."
        next="Start with the repayment overview, follow the instruction exactly, then confirm the result and reconciliation state before moving away."
        tone="blue"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}>
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
                background: "linear-gradient(180deg, rgba(8,17,31,0.88) 0%, rgba(16,42,67,0.96) 100%)",
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
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ color: "#F8FBFF", fontWeight: 900, fontSize: 20, textAlign: "center", padding: 12, lineHeight: 1.3 }}>
                  {communityLabel}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Fixed repayment context</div>
            <div style={{ marginTop: 10, color: "#F8FBFF", fontWeight: 900, fontSize: isCompact ? 28 : 34, lineHeight: 1.1 }}>
              Repay loan #{numericLoanId}
            </div>
            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              This route stays tied to one approved support item. The exact amount,
              exact reference, and next step should remain visible until repayment
              is clearly waiting for confirmation.
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Community ID: {communityCode}</span>
              <span style={badge(false)}>GSN ID: {gmfnId}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Current page: Repayment</span>
              <span style={badge(false)}>Current step: {routeState.step}</span>
            </div>
          </div>

          <div style={{ ...softCard(routeState.toneBg), border: routeState.toneBorder }}>
            <div style={sectionLabel()}>Current route state</div>
            <div style={{ marginTop: 10, color: routeState.toneText, fontWeight: 900, fontSize: 20, lineHeight: 1.25 }}>
              {routeState.title}
            </div>
            <div style={{ marginTop: 10, ...helperText(), color: "#F8FBFF" }}>
              {routeState.detail}
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>Repayment overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The core repayment facts stay visible in one place.
            </div>
          </div>
          <SubtleButton
            type="button"
            onClick={() => toggleSection("overview")}
            stableHeight={46}
            debugId="repayment.toggle-overview"
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="What this does"
          what="This overview keeps the core repayment facts visible: loan status, outstanding amount, paid total, and due timing."
          why="You need these facts together before you act, otherwise it is easy to pay the wrong amount or lose the repayment context."
          next="Open this overview first, confirm the facts, and then continue into the repayment instruction below."
          tone="light"
          style={{ marginTop: 14 }}
        />

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Loan status</div>
              <div style={{ marginTop: 8, color: "#F8FBFF", fontSize: 18, fontWeight: 900 }}>
                {safeStr(summary?.status || "Awaiting issue")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Outstanding amount</div>
              <div style={{ marginTop: 8, color: "#F8FBFF", fontSize: 18, fontWeight: 900 }}>
                {fmtMoney(outstandingAmount, currency)}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Paid total</div>
              <div style={{ marginTop: 8, color: "#0B63D1", fontSize: 18, fontWeight: 900 }}>
                {fmtMoney(summary?.paid_total, currency)}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Due at</div>
              <div style={{ marginTop: 8, color: "#92400E", fontSize: 15, fontWeight: 900, lineHeight: 1.35 }}>
                {safeDateTime(summary?.due_at)}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>Repayment instruction</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Generate the exact repayment reference for this support item.
            </div>
          </div>
          <SubtleButton
            type="button"
            onClick={() => toggleSection("instruction")}
            stableHeight={46}
            debugId="repayment.toggle-instruction"
            style={collapseToggle()}
          >
            {collapsed.instruction ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.instruction ? (
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

              {!instruction ? (
                <div style={{ marginTop: 10, ...helperText() }}>
                  Generate the repayment instruction to reveal the exact reference and settlement details for this loan.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Exact amount</div>
                    <div style={{ marginTop: 8, color: "#F8FBFF", fontWeight: 1000, fontSize: 18 }}>
                      {fmtMoney(instruction.amount || outstandingAmount, currency)}
                    </div>
                  </div>

                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Reference</div>
                    <div style={{ marginTop: 8, color: "#0B63D1", fontWeight: 1000, fontSize: 18, wordBreak: "break-word" }}>
                      {firstTruthy(instruction.reference_display, instruction.reference, "Awaiting reference")}
                    </div>
                  </div>

                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Settlement details</div>
                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      <div style={helperText()}>
                        Bank: {firstTruthy(instruction?.settlement?.bankName, "Not returned yet")}
                      </div>
                      <div style={helperText()}>
                        Account name: {firstTruthy(instruction?.settlement?.accountName, "Not returned yet")}
                      </div>
                      <div style={helperText()}>
                        Account number: {firstTruthy(instruction?.settlement?.accountNumber, "Not returned yet")}
                      </div>
                      <div style={helperText()}>
                        Sort code: {firstTruthy(instruction?.settlement?.sortCode, "Not returned yet")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Instruction actions</div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <PrimaryButton
                  type="button"
                  onClick={() => void handleGenerateInstruction()}
                  disabled={generatingInstruction || !canRepay}
                  busy={generatingInstruction}
                  busyLabel="Generating..."
                  stableHeight={54}
                  debugId="repayment.generate-instruction"
                >
                  Generate Repayment Instruction
                </PrimaryButton>

                  <SecondaryButton
                    type="button"
                    onClick={handleCopyReference}
                    disabled={!instruction}
                    stableHeight={54}
                    debugId="repayment.copy-reference"
                  >
                    Copy Reference
                  </SecondaryButton>

                  <SecondaryButton
                    type="button"
                    onClick={handleCopyInstruction}
                    disabled={!instruction}
                    stableHeight={54}
                    debugId="repayment.copy-full-instruction"
                  >
                    Copy Full Instruction
                </SecondaryButton>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>Result and reconciliation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Stay on this route until repayment is clearly awaiting reconciliation or visibly confirmed elsewhere.
            </div>
          </div>
          <SubtleButton
            type="button"
            onClick={() => toggleSection("result")}
            stableHeight={46}
            debugId="repayment.toggle-result"
            style={collapseToggle()}
          >
            {collapsed.result ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

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
                  <div style={{ marginTop: 8, color: routeState.toneText, fontWeight: 900, fontSize: 16, lineHeight: 1.35 }}>
                    {routeState.title}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                    {routeState.detail}
                  </div>
                </div>

                {paymentConfirmedAt ? (
                  <div style={innerCard("#FFFBEF")}>
                    <div style={sectionLabel()}>Payment declared at</div>
                    <div style={{ marginTop: 8, color: "#F8FBFF", fontWeight: 900, fontSize: 14, lineHeight: 1.35 }}>
                      {safeDateTime(paymentConfirmedAt)}
                    </div>
                  </div>
                ) : null}

                {currentExpectedPayment ? (
                  <div
                    style={innerCard(
                      currentExpectedPayment.matched_bank_event_id ? "#F3FBF5" : "#F8FBFF"
                    )}
                  >
                    <div style={sectionLabel()}>Expected payment visibility</div>
                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      <div style={helperText()}>
                        Status: {safeStr(currentExpectedPayment.status || "expected")}
                      </div>
                      <div style={helperText()}>
                        Reference: {firstTruthy(
                          currentExpectedPayment.reference_display,
                          currentExpectedPayment.reference_normalized,
                          "Awaiting reference"
                        )}
                      </div>
                      <div style={helperText()}>
                        Amount: {safeStr(currentExpectedPayment.amount || "0.00")}{" "}
                        {safeStr(currentExpectedPayment.currency || currency)}
                      </div>
                      <div style={helperText()}>
                        {currentExpectedPayment.matched_bank_event_id
                          ? `Matched bank event visible: ${safeStr(currentExpectedPayment.matched_bank_event_id)}`
                          : currentExpectedPayment.confirmed_at
                          ? `Confirmed at: ${safeDateTime(currentExpectedPayment.confirmed_at)}`
                          : currentExpectedPayment.due_at
                          ? `Due at: ${safeDateTime(currentExpectedPayment.due_at)}`
                          : "Awaiting reconciliation visibility in Finance"}
                      </div>
                      {safeStr(currentExpectedPayment.status_reason) ? (
                        <div style={helperText()}>
                          Reason: {safeStr(currentExpectedPayment.status_reason)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : instruction ? (
                  <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Expected payment visibility</div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      Finance has not yet shown a matching repayment expectation for this
                      generated reference.
                  </div>
                </div>
                ) : null}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>
                {repaymentTaskActive ? "Current route actions" : "Completion actions"}
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <PrimaryButton
                  type="button"
                  onClick={handleConfirmPaymentMade}
                  disabled={!instruction || Boolean(paymentConfirmedAt)}
                  stableHeight={54}
                  debugId="repayment.confirm-paid"
                >
                  {paymentConfirmedAt ? "Payment Declared" : "I Have Paid Using This Reference"}
                </PrimaryButton>

                {repaymentTaskActive ? (
                  <div style={innerCard("#F8FBFF")}>
                    <div style={sectionLabel()}>Keep the route focused</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      This repayment is still active. Confirm payment here when
                      you have used the exact reference, then keep the route open
                      until repayment is clearly awaiting reconciliation.
                    </div>
                  </div>
                ) : (
                  <div style={innerCard("#F8FBFF")}>
                    <div style={sectionLabel()}>Move on from here</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      This repayment has reached a visible conclusion. Use the
                      next-routes section below to reopen Loan Summary, Finance,
                      or Loans &amp; Support from one place.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>
              {repaymentTaskActive ? "Route focus" : "Next routes"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {repaymentTaskActive
                ? "This repayment is still active. Keep the route focused on the exact loan, exact amount, exact reference, and reconciliation state."
                : "Related routes reopen after repayment has reached a visible conclusion."}
            </div>
          </div>
          <SubtleButton
            type="button"
            onClick={() => toggleSection("routes")}
            stableHeight={46}
            debugId="repayment.toggle-routes"
            style={collapseToggle()}
          >
            {collapsed.routes ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.routes ? (
          repaymentTaskActive ? (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>One-task mode</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                  Stay inside this repayment path until the instruction is generated,
                  payment is made with the exact reference, and the route is clearly
                  awaiting reconciliation.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <StableCtaLink
                to={routes.loanSummary}
                kind="primary"
                stableHeight={54}
                debugId="repayment.route.loan-summary"
              >
                Loan Summary
              </StableCtaLink>
              <StableCtaLink
                to={routes.finance}
                kind="secondary"
                stableHeight={54}
                debugId="repayment.route.finance"
              >
                Finance
              </StableCtaLink>
              <StableCtaLink
                to={routes.loans}
                kind="secondary"
                stableHeight={54}
                debugId="repayment.route.loans"
              >
                Loans & Support
              </StableCtaLink>
            </div>
          )
        ) : null}
      </section>

    </div>
  );
}


