import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import OriginLink from "../components/OriginLink";
import * as api from "../lib/api";
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
  instruction: CommunityMoneyRoute | null;
  paymentConfirmed: boolean;
  paymentConfirmedAt?: string | null;
  updatedAt?: string | null;
};

const APP_TARGETS = {
  DASHBOARD: "/app/dashboard",
  MARKETPLACE: "/app/marketplace",
  COMMUNITY: "/app/community",
  FINANCE: "/app/finance",
  MONEY_OUT: "/app/withdrawal-instructions",
  LOANS: "/app/loans",
  NOTIFICATIONS: "/app/notifications",
} as const;

const MONEY_IN_UI_STORAGE_KEY = "gmfn.moneyin.sections.v1";
const MONEY_IN_TASK_STORAGE_KEY_PREFIX = "gmfn.moneyin.task.v1";

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
  if (!raw) return "—";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "";
    }
  }

  if (typeof window !== "undefined") {
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  }

  return "";
}

function resolveMediaUrl(src: string): string {
  const raw = safeStr(src);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  const origin = apiOrigin();
  if (!origin) return raw;

  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\/+/, "")}`;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
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
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
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
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
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
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box" as const,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
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
    instruction: false,
    result: false,
    routes: false,
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

function taskStorageKey(clanId: number, gmfnId: string): string {
  return `${MONEY_IN_TASK_STORAGE_KEY_PREFIX}.${gmfnId || "me"}.${clanId || 0}`;
}

function copyText(text: string) {
  const value = safeStr(text);
  if (!value) return;

  if (typeof (api as any).safeCopy === "function") {
    (api as any).safeCopy(value);
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(value);
  }
}

function getCommunityName(currentClan: any, clanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (clanId ? `Community ${clanId}` : "No selected community")
  );
}

function getCommunityPublicId(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.community_code,
      currentClan?.community?.community_code,
      currentClan?.profile?.community_code,
      currentClan?.marketplace?.community_code
    ) || "Pending"
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

function getCommunityImageSrc(currentClan: any): string {
  const raw = firstTruthy(
    currentClan?.community_image_url,
    currentClan?.profile_image_url,
    currentClan?.marketplace_image_url,
    currentClan?.cover_image_url,
    currentClan?.banner_url,
    currentClan?.image_url,
    currentClan?.logo_url,
    currentClan?.community?.community_image_url,
    currentClan?.community?.image_url,
    currentClan?.profile?.profile_image_url
  );

  return resolveMediaUrl(raw);
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

export default function PaymentInstructionsPage() {
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);

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
  const [instruction, setInstruction] = useState<CommunityMoneyRoute | null>(
    null
  );
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);
  const [paymentConfirmedAt, setPaymentConfirmedAt] = useState<string | null>(
    null
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
          getCommunityMoneySurface(selectedClanId, gmfnId, "NGN").catch(() => null),
          loadCommunityDepositRoute(selectedClanId, gmfnId, "NGN").catch(() => null),
        ]);

        if (!alive) return;

        setMoneySurface(surface);
        setDepositRoute(route || surface?.depositRoute || null);

        const stored = readLocalJSON<PersistedDepositTask | null>(
          taskStorageKey(selectedClanId, gmfnId),
          null
        );

        setAmountInput(safeStr(stored?.amountInput));
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
  }, [selectedClanId]);

  useEffect(() => {
    if (!selectedClanId || !currentGmfnId) return;

    writeLocalJSON(taskStorageKey(selectedClanId, currentGmfnId), {
      amountInput,
      instruction,
      paymentConfirmed,
      paymentConfirmedAt,
      updatedAt: new Date().toISOString(),
    } as PersistedDepositTask);
  }, [
    selectedClanId,
    currentGmfnId,
    amountInput,
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

  const pictureSrc = useMemo(() => {
    return getCommunityImageSrc(currentClan);
  }, [currentClan]);

  const poolCurrency = useMemo(() => {
    return firstTruthy(
      instruction?.currency,
      depositRoute?.currency,
      moneySurface?.poolCurrency,
      "NGN"
    );
  }, [instruction, depositRoute, moneySurface]);

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
          "Money In should not continue without a real matching reference and settlement detail.",
      };
    }

    if (!paymentConfirmed) {
      return {
        tone: "blue" as const,
        step: "Payment",
        title: "Pay using the exact generated reference.",
        detail:
          "Once the member pays, they should confirm that payment has been made so the route can move into reconciliation.",
      };
    }

    if (matchedEvent) {
      return {
        tone: "green" as const,
        step: "Result",
        title: "A matching payment event is visible.",
        detail:
          "The recent money surface appears to show a payment event that matches this generated reference.",
      };
    }

    return {
      tone: "gold" as const,
      step: "Awaiting reconciliation",
      title: "Payment is waiting for reconciliation.",
      detail:
        "The member has confirmed payment, but the recent money surface does not yet show a visible matched event for this reference.",
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

  async function handleRefreshRoute() {
    if (!selectedClanId || !currentGmfnId) {
      setNotice({
        tone: "error",
        text: "Community or GMFN context is not ready.",
      });
      return;
    }

    setRefreshingRoute(true);

    try {
      const [surface, route] = await Promise.all([
        getCommunityMoneySurface(selectedClanId, currentGmfnId, "NGN").catch(() => null),
        loadCommunityDepositRoute(selectedClanId, currentGmfnId, "NGN").catch(() => null),
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
        text: "Community or GMFN context is not ready.",
      });
      return;
    }

    if (!communityRailReady) {
      setNotice({
        tone: "error",
        text: "Community pay-in rail is not ready yet.",
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
        currency: poolCurrency,
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
      writeLocalJSON(taskStorageKey(selectedClanId, currentGmfnId), null);
    }

    setNotice({
      tone: "success",
      text: "Money In task reset.",
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
      `GMFN ID: ${currentGmfnId || "Pending"}`,
      `Member: ${memberName}`,
      memberRole ? `Role: ${memberRole}` : "",
      `Current step: ${inferredResult.step}`,
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
        text: "No payment reference is visible yet.",
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
          subtitle="Preparing the guided pay-in route..."
          homeTo={APP_TARGETS.DASHBOARD}
          homeLabel="Dashboard"
          backTo={APP_TARGETS.MARKETPLACE}
          backLabel="Marketplace"
          nextLinks={[
            { label: "Finance", to: APP_TARGETS.FINANCE },
            { label: "Money Out", to: APP_TARGETS.MONEY_OUT },
          ]}
          utilityLinks={[
            { label: "Loans", to: APP_TARGETS.LOANS },
            { label: "Notifications", to: APP_TARGETS.NOTIFICATIONS },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading Money In route...
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
        sectionLabel="Money In"
        title="Payment Instructions"
        subtitle="Money In should remain a guided route from context to instruction, payment confirmation, and reconciliation. Once the member chooses pay-in, unrelated surfaces should stay out of the way until the route is complete."
        homeTo={APP_TARGETS.DASHBOARD}
        homeLabel="Dashboard"
        backTo={APP_TARGETS.MARKETPLACE}
        backLabel="Marketplace"
        nextLinks={[
          { label: "Finance", to: APP_TARGETS.FINANCE },
          { label: "Money Out", to: APP_TARGETS.MONEY_OUT },
        ]}
        utilityLinks={[
          { label: "Loans", to: APP_TARGETS.LOANS },
          { label: "Notifications", to: APP_TARGETS.NOTIFICATIONS },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
      >
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
                border: "1px solid rgba(11,31,51,0.08)",
                overflow: "hidden",
                background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pictureSrc ? (
                <img
                  src={pictureSrc}
                  alt={communityLabel}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "#37506A",
                    fontWeight: 900,
                    fontSize: 20,
                    textAlign: "center",
                    padding: 12,
                    lineHeight: 1.3,
                  }}
                >
                  {communityLabel}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Fixed pay-in context</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Pay into {communityLabel}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              GMFN is not the custodian of the money. This route generates the exact
              matching reference so payment into the official community account can
              later be matched and reflected correctly.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community ID: {publicCommunityCode}</span>
              <span style={badge(false)}>GMFN ID: {currentGmfnId || "Pending"}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Current step: {inferredResult.step}</span>
            </div>
          </div>

          <div
            style={{
              ...softCard(resultTone.bg),
              border: resultTone.border,
            }}
          >
            <div style={sectionLabel()}>Current route state</div>

            <div
              style={{
                marginTop: 10,
                color: resultTone.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {inferredResult.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#0B1F33" }}>
              {inferredResult.detail}
            </div>
          </div>
        </div>
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
            <div style={sectionLabel()}>Money In overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The core pay-in facts stay visible in one place.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("overview")}
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Pay-in amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {formattedInputAmount ? `${formattedInputAmount} ${poolCurrency}` : "Pending"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Route status</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {communityRailReady ? "Community pay-in rail ready" : "Community pay-in rail pending"}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Reference</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 16,
                  fontWeight: 900,
                  wordBreak: "break-word",
                }}
              >
                {firstTruthy(instruction?.reference, "Pending")}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Reconciliation state</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {matchedEvent
                  ? "Matched event visible"
                  : paymentConfirmed
                  ? "Waiting for reconciliation"
                  : "Not yet confirmed"}
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
            <div style={sectionLabel()}>Non-custodial warning</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This warning should stay explicit before the member pays.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("warning")}
            style={collapseToggle()}
          >
            {collapsed.warning ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.warning ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>Pay-in rule</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                GMFN is not a custodian of funds. The member must pay into the official
                community account using the exact generated reference.
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>Matching rule</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                A wrong reference or wrong amount may delay reconciliation and leave the payment unmatched.
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>Critical rule</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Money In does not use guarantor logic. It is a pay-in route, not a support route.
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
            <div style={sectionLabel()}>Amount and code generation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Enter the amount, then generate the exact matching instruction.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("amount")}
            style={collapseToggle()}
          >
            {collapsed.amount ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.amount ? (
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
              <div style={sectionLabel()}>Pay-in amount</div>

              <div style={{ marginTop: 14, display: "grid", gap: 12, maxWidth: 420 }}>
                <div>
                  <div
                    style={{
                      marginBottom: 8,
                      color: "#475569",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    How much do you want to pay in?
                  </div>

                  <input
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setInstruction(null);
                      setPaymentConfirmed(false);
                      setPaymentConfirmedAt(null);
                    }}
                    placeholder="Enter amount"
                    style={inputStyle()}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void handleGenerateInstruction()}
                    disabled={generatingInstruction}
                    style={actionBtn("primary", generatingInstruction)}
                  >
                    {generatingInstruction ? "Generating..." : "Generate Instruction"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleRefreshRoute()}
                    disabled={refreshingRoute}
                    style={actionBtn("secondary", refreshingRoute)}
                  >
                    {refreshingRoute ? "Refreshing..." : "Refresh Route"}
                  </button>
                </div>
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>What generation does</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                The generated code/reference is the matching identity for the payment event.
                It binds together the selected community, your GMFN identity, the amount, and the currency.
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
            <div style={sectionLabel()}>Payment instruction</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The official settlement rail and exact reference.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("instruction")}
            style={collapseToggle()}
          >
            {collapsed.instruction ? "Open" : "Collapse"}
          </button>
        </div>

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
                        color: "#0B1F33",
                        fontWeight: 1000,
                        fontSize: 18,
                      }}
                    >
                      {formattedInputAmount || "Pending"} {instruction.currency}
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
                      {firstTruthy(instruction.reference, "Pending")}
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
                  <button
                    type="button"
                    onClick={handleCopyReference}
                    style={actionBtn("primary")}
                  >
                    Copy Reference
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyInstruction}
                    style={actionBtn("secondary")}
                  >
                    Copy Full Instruction
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmPaymentMade}
                    style={actionBtn("secondary")}
                  >
                    I Have Paid Using This Reference
                  </button>
                </div>
              </div>
            </div>
          )
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
            <div style={sectionLabel()}>Result and reconciliation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The route should not drift away after payment. It should stay here until reconciliation is visible or explicitly pending.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("result")}
            style={collapseToggle()}
          >
            {collapsed.result ? "Open" : "Collapse"}
          </button>
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
                  <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                    {inferredResult.detail}
                  </div>
                </div>

                {paymentConfirmedAt ? (
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Member confirmation time</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
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
              <div style={sectionLabel()}>Next routes</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <OriginLink to={APP_TARGETS.FINANCE} style={actionBtn("primary")}>
                  Open Finance
                </OriginLink>

                <OriginLink to={APP_TARGETS.MARKETPLACE} style={actionBtn("secondary")}>
                  Return To Marketplace
                </OriginLink>

                <OriginLink to={APP_TARGETS.NOTIFICATIONS} style={actionBtn("secondary")}>
                  Action Inbox
                </OriginLink>

                <button
                  type="button"
                  onClick={handleResetTask}
                  style={actionBtn("soft")}
                >
                  Reset Money In Task
                </button>
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
            <div style={sectionLabel()}>Working routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep related routes visible but secondary.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("routes")}
            style={collapseToggle()}
          >
            {collapsed.routes ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.routes ? (
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
            <OriginLink to={APP_TARGETS.FINANCE} style={actionBtn("primary")}>
              Finance
            </OriginLink>

            <OriginLink to={APP_TARGETS.MONEY_OUT} style={actionBtn("secondary")}>
              Money Out
            </OriginLink>

            <OriginLink to={APP_TARGETS.LOANS} style={actionBtn("secondary")}>
              Loans
            </OriginLink>

            <OriginLink to={APP_TARGETS.MARKETPLACE} style={actionBtn("secondary")}>
              Marketplace
            </OriginLink>

            <OriginLink to={APP_TARGETS.COMMUNITY} style={actionBtn("secondary")}>
              Community Home
            </OriginLink>

            <OriginLink to={APP_TARGETS.NOTIFICATIONS} style={actionBtn("secondary")}>
              Action Inbox
            </OriginLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}