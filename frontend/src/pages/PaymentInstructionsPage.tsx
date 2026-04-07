import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  getCommunityMoneySurface,
  loadCommunityDepositRoute,
  type CommunityMoneySurface,
  type CommunityMoneyRoute,
} from "../lib/communityMoney";

type NoticeTone = "success" | "error";

type CollapseState = {
  overview: boolean;
  request: boolean;
  destination: boolean;
  routes: boolean;
};

const PAYMENT_UI_STORAGE_KEY = "gmfn.payment.sections.v2";

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
}): string {
  const lines = [
    "Payment instruction request",
    params.memberName ? `Member: ${params.memberName}` : "",
    params.gmfnId ? `GMFN ID: ${params.gmfnId}` : "",
    params.communityName ? `Community: ${params.communityName}` : "",
    "",
    "Please load the current community payment route for deposit.",
  ].filter(Boolean);

  return lines.join("\n");
}

function splitRouteLines(route: CommunityMoneyRoute | null): string[] {
  if (!route) return [];
  return safeStr(route.detail)
    .split("\n")
    .map((line) => safeStr(line))
    .filter(Boolean);
}

export default function PaymentInstructionsPage() {
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(PAYMENT_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(null);
  const [depositRoute, setDepositRoute] = useState<CommunityMoneyRoute | null>(null);

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
    writeLocalJSON(PAYMENT_UI_STORAGE_KEY, collapsed);
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
          setDepositRoute(surface?.depositRoute || null);
        } else {
          setMoneySurface(null);
          setDepositRoute(null);
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

  const activeDepositRoute = depositRoute || moneySurface?.depositRoute || null;

  const requestText = useMemo(() => {
    return buildRequestText({
      memberName,
      gmfnId: currentGmfnId,
      communityName,
    });
  }, [memberName, currentGmfnId, communityName]);

  const destinationLines = useMemo(() => {
    return splitRouteLines(activeDepositRoute);
  }, [activeDepositRoute]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleLoadDepositRoute() {
    if (!selectedClanId || !currentGmfnId) {
      showNotice("error", "Community or GMFN ID is not ready yet.");
      return;
    }

    setLoadingRoute(true);

    try {
      const route = await loadCommunityDepositRoute(
        selectedClanId,
        currentGmfnId
      ).catch(() => null);

      if (route) {
        setDepositRoute(route);
        setMoneySurface((prev) =>
          prev
            ? {
                ...prev,
                depositRoute: route,
              }
            : prev
        );
        showNotice("success", "Payment route loaded.");
      } else {
        showNotice(
          "error",
          "Payment route is not yet returned by the backend."
        );
      }
    } finally {
      setLoadingRoute(false);
    }
  }

  function handleCopyRequestText() {
    copyText(requestText);
    showNotice("success", "Payment instruction request copied.");
  }

  function handleCopyRoute() {
    if (!activeDepositRoute) {
      showNotice("error", "Payment route is not loaded yet.");
      return;
    }

    const text = [
      activeDepositRoute.title,
      activeDepositRoute.detail,
      activeDepositRoute.reference
        ? `Reference: ${activeDepositRoute.reference}`
        : "",
      activeDepositRoute.status ? `Status: ${activeDepositRoute.status}` : "",
      activeDepositRoute.updatedAt
        ? `Updated: ${activeDepositRoute.updatedAt}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    copyText(text);
    showNotice("success", "Payment route copied.");
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
          subtitle="Preparing the community payment route..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
          nextLinks={[
            { label: "Money Out", to: "/app/withdrawal-instructions" },
            { label: "Loans", to: "/app/loans" },
          ]}
          utilityLinks={[
            { label: "Notifications", to: "/app/notifications" },
            { label: "Trust", to: "/app/trust" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading payment page...
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
        subtitle="This page now reads the community-level money surface so payment routes stay tied to the selected community and GMFN identity."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[
          { label: "Money Out", to: "/app/withdrawal-instructions" },
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
            <div style={sectionLabel()}>Money-in overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Payment route for {memberName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              This page now reads from the shared community money layer. That means the payment route can be reused for every community using the same community ID and GMFN identity structure.
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
              {activeDepositRoute
                ? safeStr(activeDepositRoute.title || "Payment route loaded")
                : "No payment route loaded yet"}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {activeDepositRoute
                ? safeStr(activeDepositRoute.detail)
                : "The page is connected. Load or refresh the payment route when the current community route becomes available."}
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
            <div style={sectionLabel()}>Payment summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The core money-in readings stay together here.
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
                {activeDepositRoute
                  ? safeStr(activeDepositRoute.status || "ready")
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
                {safeStr(activeDepositRoute?.reference || "Pending")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Currency</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(activeDepositRoute?.currency || poolCurrency || "NGN")}
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
            <div style={sectionLabel()}>Payment instruction request</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This request block stays visible whether the deposit route has loaded or not.
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
                  onClick={() => void handleLoadDepositRoute()}
                  disabled={loadingRoute}
                  style={actionBtn("primary", loadingRoute)}
                >
                  {loadingRoute ? "Loading..." : "Load Payment Route"}
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
                  disabled={!activeDepositRoute}
                  style={actionBtn("secondary", !activeDepositRoute)}
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
              This block shows where the current community payment route is directing deposits.
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

              {!activeDepositRoute ? (
                <div style={{ marginTop: 10, ...helperText() }}>
                  Payment destination is not yet returned by the backend. Load the current community payment route and the destination details will appear here.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {destinationLines.length > 0 ? (
                    destinationLines.map((line, index) => (
                      <div key={`route-line-${index}`} style={innerCard("#FFFFFF")}>
                        <div style={{ ...helperText(), color: "#0B1F33" }}>{line}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ ...helperText(), color: "#0B1F33" }}>
                      Deposit route is loaded, but no extra destination line is visible yet.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Route extras</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={statTile()}>
                  <div style={sectionLabel()}>Reference</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                      wordBreak: "break-word",
                    }}
                  >
                    {safeStr(activeDepositRoute?.reference || "Pending")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Minimum amount</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {safeStr(activeDepositRoute?.minAmount || "Not stated")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Maximum amount</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {safeStr(activeDepositRoute?.maxAmount || "Not stated")}
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
              Move from money-in preparation into the next page you need.
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
            <Link to="/app/withdrawal-instructions" style={actionBtn("primary")}>
              Money Out
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