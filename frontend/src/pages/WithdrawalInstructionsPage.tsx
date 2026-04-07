import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  getCommunityMoneySurface,
  loadCommunityWithdrawalRoute,
  saveCommunitySettlementDestination,
  type CommunityMoneySurface,
  type CommunityMoneyRoute,
  type CommunitySettlementDestination,
} from "../lib/communityMoney";

type NoticeTone = "success" | "error";

type CollapseState = {
  overview: boolean;
  request: boolean;
  destination: boolean;
  routes: boolean;
};

const WITHDRAWAL_UI_STORAGE_KEY = "gmfn.withdrawal.sections.v2";

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

function defaultDestination(): CommunitySettlementDestination {
  return {
    destinationName: "",
    bankName: "",
    accountNumber: "",
    phoneNumber: "",
    note: "",
  };
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
    request: false,
    destination: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    request: Boolean(raw?.request ?? base.request),
    destination: Boolean(raw?.destination ?? base.destination),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
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

function buildRequestText(params: {
  memberName: string;
  gmfnId: string;
  communityName: string;
  destination: CommunitySettlementDestination;
}): string {
  const lines = [
    "Withdrawal instruction request",
    params.memberName ? `Member: ${params.memberName}` : "",
    params.gmfnId ? `GMFN ID: ${params.gmfnId}` : "",
    params.communityName ? `Community: ${params.communityName}` : "",
    "",
    "Settlement destination",
    params.destination.destinationName
      ? `Account name: ${params.destination.destinationName}`
      : "",
    params.destination.bankName ? `Bank: ${params.destination.bankName}` : "",
    params.destination.accountNumber
      ? `Account number: ${params.destination.accountNumber}`
      : "",
    params.destination.phoneNumber
      ? `Phone: ${params.destination.phoneNumber}`
      : "",
    params.destination.note ? `Note: ${params.destination.note}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export default function WithdrawalInstructionsPage() {
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);

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
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [savingDestination, setSavingDestination] = useState(false);

  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(null);
  const [withdrawalRoute, setWithdrawalRoute] = useState<CommunityMoneyRoute | null>(null);
  const [destination, setDestination] = useState<CommunitySettlementDestination>(
    defaultDestination()
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
    writeLocalJSON(WITHDRAWAL_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const meRes =
          typeof (api as any).getMe === "function"
            ? await (api as any).getMe().catch(() => null)
            : null;

        const clanRes =
          typeof (api as any).getCurrentClan === "function"
            ? await (api as any).getCurrentClan().catch(() => null)
            : null;

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);

        const resolvedGmfnId = firstTruthy(meRes?.gmfn_id);

        if (selectedClanId && resolvedGmfnId) {
          const surface = await getCommunityMoneySurface(
            selectedClanId,
            resolvedGmfnId
          ).catch(() => null);

          if (!alive) return;

          setMoneySurface(surface);
          setWithdrawalRoute(surface?.withdrawalRoute || null);
          setDestination(surface?.settlementDestination || defaultDestination());
        } else {
          setMoneySurface(null);
          setWithdrawalRoute(null);
          setDestination(defaultDestination());
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

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

  const currentGmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id);
  }, [me]);

  const communityName = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No selected community")
    );
  }, [currentClan, selectedClanId]);

  const poolAmount = safeStr(moneySurface?.poolAmount || "—");
  const poolCurrency = safeStr(moneySurface?.poolCurrency || "NGN");

  const activeWithdrawalRoute = withdrawalRoute || moneySurface?.withdrawalRoute || null;

  const requestText = useMemo(() => {
    return buildRequestText({
      memberName,
      gmfnId: currentGmfnId,
      communityName,
      destination,
    });
  }, [memberName, currentGmfnId, communityName, destination]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleLoadWithdrawalRoute() {
    if (!selectedClanId || !currentGmfnId) {
      showNotice("error", "Community or GMFN ID is not ready yet.");
      return;
    }

    setLoadingRoute(true);

    try {
      const route = await loadCommunityWithdrawalRoute(
        selectedClanId,
        currentGmfnId
      ).catch(() => null);

      if (route) {
        setWithdrawalRoute(route);
        setMoneySurface((prev) =>
          prev
            ? {
                ...prev,
                withdrawalRoute: route,
              }
            : prev
        );
        showNotice("success", "Withdrawal route loaded.");
      } else {
        showNotice(
          "error",
          "Withdrawal route is not yet returned by the backend."
        );
      }
    } finally {
      setLoadingRoute(false);
    }
  }

  async function handleSaveDestination() {
    if (!selectedClanId || !currentGmfnId) {
      showNotice("error", "Community or GMFN ID is not ready yet.");
      return;
    }

    setSavingDestination(true);

    try {
      const saved = await saveCommunitySettlementDestination(
        selectedClanId,
        currentGmfnId,
        destination
      );

      setDestination(saved);
      setMoneySurface((prev) =>
        prev
          ? {
              ...prev,
              settlementDestination: saved,
            }
          : prev
      );

      showNotice("success", "Settlement destination saved.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) ||
          "Settlement destination could not be saved right now."
      );
    } finally {
      setSavingDestination(false);
    }
  }

  function handleCopyRequestText() {
    copyText(requestText);
    showNotice("success", "Withdrawal instruction request copied.");
  }

  function handleCopyDestination() {
    const text = [
      destination.destinationName
        ? `Account name: ${destination.destinationName}`
        : "",
      destination.bankName ? `Bank: ${destination.bankName}` : "",
      destination.accountNumber
        ? `Account number: ${destination.accountNumber}`
        : "",
      destination.phoneNumber ? `Phone: ${destination.phoneNumber}` : "",
      destination.note ? `Note: ${destination.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (!text) {
      showNotice("error", "Settlement destination is still empty.");
      return;
    }

    copyText(text);
    showNotice("success", "Settlement destination copied.");
  }

  function handleCopyRoute() {
    if (!activeWithdrawalRoute) {
      showNotice("error", "Withdrawal route is not loaded yet.");
      return;
    }

    const text = [
      activeWithdrawalRoute.title,
      activeWithdrawalRoute.detail,
      activeWithdrawalRoute.reference
        ? `Reference: ${activeWithdrawalRoute.reference}`
        : "",
      activeWithdrawalRoute.status
        ? `Status: ${activeWithdrawalRoute.status}`
        : "",
      activeWithdrawalRoute.updatedAt
        ? `Updated: ${activeWithdrawalRoute.updatedAt}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    copyText(text);
    showNotice("success", "Withdrawal route copied.");
  }

  function handleResetDestination() {
    setDestination(defaultDestination());
    setMoneySurface((prev) =>
      prev
        ? {
            ...prev,
            settlementDestination: defaultDestination(),
          }
        : prev
    );
    showNotice("success", "Settlement destination cleared.");
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
          sectionLabel="Money Out"
          title="Withdrawal Instructions"
          subtitle="Preparing the withdrawal route and settlement destination..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
          nextLinks={[
            { label: "Money In", to: "/app/payment/pool" },
            { label: "Loans", to: "/app/loans" },
          ]}
          utilityLinks={[
            { label: "Notifications", to: "/app/notifications" },
            { label: "Trust", to: "/app/trust" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading withdrawal page...
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
        sectionLabel="Money Out"
        title="Withdrawal Instructions"
        subtitle="This page keeps both the withdrawal instruction request and the settlement destination visible, even before the final withdrawal route returns."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[
          { label: "Money In", to: "/app/payment/pool" },
          { label: "Loans", to: "/app/loans" },
        ]}
        utilityLinks={[
          { label: "Notifications", to: "/app/notifications" },
          { label: "Trust", to: "/app/trust" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.08fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Money-out overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Withdrawal route for {memberName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              The page no longer stops at “load the withdrawal route first.”
              You can now prepare the settlement destination first, then load or
              refresh the final withdrawal route when it becomes available.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community: {communityName}</span>
              <span style={badge(false)}>GMFN ID: {currentGmfnId || "Pending"}</span>
              <span style={badge(false)}>
                Pool: {poolAmount} {poolCurrency}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current route state</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {activeWithdrawalRoute
                ? safeStr(activeWithdrawalRoute.title || "Withdrawal route loaded")
                : "No withdrawal route loaded yet"}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {activeWithdrawalRoute
                ? safeStr(activeWithdrawalRoute.detail)
                : "You can still fill the settlement destination below before the final route appears."}
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
            <div style={sectionLabel()}>Withdrawal summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The core money-out readings stay together here.
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
              <div style={sectionLabel()}>Pool</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {poolAmount} {poolCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Route status</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {activeWithdrawalRoute
                  ? safeStr(activeWithdrawalRoute.status || "ready")
                  : "not loaded"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Reference</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                }}
              >
                {safeStr(activeWithdrawalRoute?.reference || "Pending")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Destination</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(
                  destination.destinationName ||
                    destination.bankName ||
                    "Not set"
                )}
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
            <div style={sectionLabel()}>Withdrawal instruction request</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This block stays visible whether the final route has loaded or not.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("request")}
            style={collapseToggle()}
          >
            {collapsed.request ? "Open" : "Collapse"}
          </button>
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
              <div style={sectionLabel()}>Request preview</div>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background: "#FFFFFF",
                  padding: 14,
                  color: "#0B1F33",
                  fontSize: 13,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {requestText}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Actions</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => void handleLoadWithdrawalRoute()}
                  disabled={loadingRoute}
                  style={actionBtn("primary", loadingRoute)}
                >
                  {loadingRoute ? "Loading..." : "Load Withdrawal Route"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyRequestText}
                  style={actionBtn("secondary")}
                >
                  Copy Request Text
                </button>

                <button
                  type="button"
                  onClick={handleCopyRoute}
                  disabled={!activeWithdrawalRoute}
                  style={actionBtn("secondary", !activeWithdrawalRoute)}
                >
                  Copy Route
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
            <div style={sectionLabel()}>Settlement destination</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Put the payout details here so withdrawal has somewhere to go.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("destination")}
            style={collapseToggle()}
          >
            {collapsed.destination ? "Open" : "Collapse"}
          </button>
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
                      setDestination((prev) => ({
                        ...prev,
                        destinationName: e.target.value,
                      }))
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
                      setDestination((prev) => ({
                        ...prev,
                        bankName: e.target.value,
                      }))
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
                      setDestination((prev) => ({
                        ...prev,
                        accountNumber: e.target.value,
                      }))
                    }
                    placeholder="Account number"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Phone number</div>
                  <input
                    value={destination.phoneNumber}
                    onChange={(e) =>
                      setDestination((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
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
                      setDestination((prev) => ({
                        ...prev,
                        note: e.target.value,
                      }))
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
                  <button
                    type="button"
                    onClick={() => void handleSaveDestination()}
                    disabled={savingDestination}
                    style={actionBtn("primary", savingDestination)}
                  >
                    {savingDestination ? "Saving..." : "Save Destination"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyDestination}
                    style={actionBtn("secondary")}
                  >
                    Copy Destination
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDestination}
                    style={actionBtn("secondary")}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Destination preview</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={statTile()}>
                  <div style={sectionLabel()}>Account name</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {safeStr(destination.destinationName || "Pending")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Bank</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {safeStr(destination.bankName || "Pending")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Account number</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                      wordBreak: "break-word",
                    }}
                  >
                    {safeStr(destination.accountNumber || "Pending")}
                  </div>
                </div>
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
              Move from money-out preparation into the next page you need.
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
            <Link to="/app/payment/pool" style={actionBtn("primary")}>
              Money In
            </Link>

            <Link to="/app/loans" style={actionBtn("secondary")}>
              Loans
            </Link>

            <Link to="/app/marketplace" style={actionBtn("secondary")}>
              Marketplace
            </Link>

            <Link to="/app/notifications" style={actionBtn("secondary")}>
              Action Inbox
            </Link>

            <Link to="/app/trust" style={actionBtn("secondary")}>
              Trust
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}