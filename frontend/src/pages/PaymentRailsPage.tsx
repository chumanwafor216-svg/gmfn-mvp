import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { StableCtaLink, SubtleButton } from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import { getPaymentRails } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type RailItem = {
  key: string;
  name: string;
  direction: "Inbound" | "Outbound" | "General";
  status: string;
  provider: string;
  currencies: string[];
  countries: string[];
  note: string;
};

type RailReading = {
  tone: "green" | "blue" | "yellow" | "red" | "gray";
  title: string;
  detail: string;
  nowLine: string;
  nextLine: string;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.22)",
    background:
      bg === "#FFFFFF"
        ? "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.15) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.13) 0%, rgba(38,96,171,0) 30%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(240,247,255,0.985) 54%, rgba(223,234,246,0.975) 100%)"
        : bg,
    boxShadow:
      "0 28px 58px rgba(7,20,36,0.10), 0 6px 14px rgba(7,20,36,0.04), inset 0 1px 0 rgba(255,255,255,0.88)",
    padding: 22,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(20,52,83,0.19)",
    background:
      bg === "#F8FBFF"
        ? "radial-gradient(circle at 16% 12%, rgba(201,154,39,0.13) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 16%, rgba(38,96,171,0.11) 0%, rgba(38,96,171,0) 29%), linear-gradient(180deg, rgba(250,252,255,0.996) 0%, rgba(236,244,252,0.984) 60%, rgba(220,231,242,0.972) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 18px 40px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.84)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(20,52,83,0.18)",
    background:
      bg === "#FFFFFF"
        ? "radial-gradient(circle at 18% 12%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 84% 14%, rgba(38,96,171,0.09) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.999) 0%, rgba(246,249,253,0.986) 62%, rgba(232,239,246,0.972) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 16px 34px rgba(7,20,36,0.06), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function paymentRailsSoftButtonStyle(): React.CSSProperties {
  return {
    borderRadius: 13,
    border: "1px solid rgba(121,149,190,0.20)",
    background: "linear-gradient(180deg, #FCFEFF 0%, #E4EEF8 100%)",
    color: "#213D59",
    boxShadow:
      "0 12px 24px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
    fontWeight: 900,
    fontSize: 13,
  };
}

function routeTileStyle(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 100,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(29,95,212,0.22)"
      : "1px solid rgba(20,52,83,0.18)",
    background: primary
      ? "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.12) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.16) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(248,252,255,0.998) 0%, rgba(226,237,250,0.986) 100%)"
      : "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.12) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(234,243,251,0.986) 100%)",
    padding: 16,
    textDecoration: "none",
    textAlign: "left",
    boxShadow: primary
      ? "0 18px 38px rgba(29,95,212,0.12)"
      : "0 16px 32px rgba(15,23,42,0.065)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4A627A",
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
    background: primary
      ? "linear-gradient(180deg, rgba(29,95,212,0.14) 0%, rgba(29,95,212,0.09) 100%)"
      : "linear-gradient(180deg, rgba(247,250,254,0.98) 0%, rgba(228,238,248,0.80) 100%)",
    border: primary
      ? "1px solid rgba(29,95,212,0.16)"
      : "1px solid rgba(20,52,83,0.16)",
    color: primary ? "#164AAE" : "#496178",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.60)",
  };
}

function feedbackCard(success: boolean): React.CSSProperties {
  return {
    ...pageCard(success ? "#ECFDF5" : "#FEF2F2"),
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
    padding: 14,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#405A72",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function routeCommunityId(search: string): number {
  const query = new URLSearchParams(search || "");
  return positiveNumber(
    query.get("clan_id") ||
      query.get("community") ||
      query.get("community_id")
  );
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string) {
  return String(resolveCtaTarget(intent, {
    communityId,
    debugId,
  }).to);
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = safeStr(value);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

function toStringArray(...values: any[]): string[] {
  const out: string[] = [];

  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = safeStr(item);
        if (text) out.push(text);
      }
      continue;
    }

    const text = safeStr(value);
    if (!text) continue;

    if (text.includes(",") || text.includes("|")) {
      const parts = text.split(/[,|]/g).map((part) => safeStr(part));
      for (const part of parts) {
        if (part) out.push(part);
      }
      continue;
    }

    out.push(text);
  }

  return dedupeStrings(out);
}

function normalizeDirection(value: any): "Inbound" | "Outbound" | "General" {
  const raw = safeStr(value).toLowerCase();

  if (
    raw.includes("inbound") ||
    raw === "in" ||
    raw.includes("deposit") ||
    raw.includes("credit") ||
    raw.includes("receive")
  ) {
    return "Inbound";
  }

  if (
    raw.includes("outbound") ||
    raw === "out" ||
    raw.includes("withdraw") ||
    raw.includes("payout") ||
    raw.includes("debit") ||
    raw.includes("disburse")
  ) {
    return "Outbound";
  }

  return "General";
}

function normalizeStatus(rawStatus: any, enabledValue?: any): string {
  const status = safeStr(rawStatus);
  if (status) return status;

  if (enabledValue === true) return "active";
  if (enabledValue === false) return "disabled";

  return "unknown";
}

function isActiveStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();

  return (
    s.includes("active") ||
    s.includes("enabled") ||
    s.includes("available") ||
    s.includes("ready") ||
    s.includes("live") ||
    s === "ok"
  );
}

function railStatusTone(status: string) {
  const s = safeStr(status).toLowerCase();

  if (isActiveStatus(s)) {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
    };
  }

  if (
    s.includes("pending") ||
    s.includes("review") ||
    s.includes("limited") ||
    s.includes("partial")
  ) {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
    };
  }

  if (
    s.includes("disabled") ||
    s.includes("blocked") ||
    s.includes("down") ||
    s.includes("inactive") ||
    s.includes("failed")
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

function readingTone(tone: RailReading["tone"]) {
  if (tone === "green") {
    return {
      bg: "#F3FBF5",
      border: "1px solid rgba(34,197,94,0.16)",
      text: "#166534",
    };
  }

  if (tone === "blue") {
    return {
      bg: "#EFF6FF",
      border: "1px solid rgba(59,130,246,0.16)",
      text: "#1D4ED8",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FEF2F2",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#475569",
  };
}

function parseRail(raw: any, forcedDirection?: string): RailItem | null {
  if (!raw || typeof raw !== "object") return null;

  const src = raw?.item || raw?.rail || raw;

  const name = firstTruthy(
    src?.name,
    src?.title,
    src?.rail_name,
    src?.method,
    src?.channel,
    src?.bank_name,
    src?.provider_name,
    src?.provider,
    "Rail"
  );

  const provider = firstTruthy(
    src?.provider_name,
    src?.provider,
    src?.institution_name,
    src?.bank_name
  );

  const direction = normalizeDirection(
    forcedDirection ||
      src?.direction ||
      src?.type ||
      src?.kind ||
      src?.flow ||
      src?.category ||
      src?.mode
  );

  const status = normalizeStatus(
    src?.status || src?.state || src?.availability,
    src?.enabled ?? src?.active ?? src?.is_enabled ?? src?.is_active
  );

  const currencies = toStringArray(
    src?.currencies,
    src?.supported_currencies,
    src?.currency_codes,
    src?.currency,
    src?.currency_code
  );

  const countries = toStringArray(
    src?.countries,
    src?.supported_countries,
    src?.country_codes,
    src?.country,
    src?.country_code
  );

  const note = firstTruthy(src?.note, src?.description, src?.detail, src?.summary);

  const key = firstTruthy(
    String(src?.id || ""),
    `${direction}-${name}-${provider || "provider"}-${status}`
  );

  return {
    key,
    name,
    direction,
    status,
    provider,
    currencies,
    countries,
    note,
  };
}

function extractRails(payload: any): RailItem[] {
  const out: RailItem[] = [];

  function addBucket(bucket: any, forcedDirection?: string) {
    if (!bucket) return;

    if (Array.isArray(bucket)) {
      for (const row of bucket) {
        const parsed = parseRail(row, forcedDirection);
        if (parsed) out.push(parsed);
      }
      return;
    }

    if (typeof bucket === "object") {
      const direct = parseRail(bucket, forcedDirection);
      if (
        direct &&
        (safeStr(bucket?.name) ||
          safeStr(bucket?.provider_name) ||
          safeStr(bucket?.provider) ||
          safeStr(bucket?.bank_name) ||
          safeStr(bucket?.direction) ||
          safeStr(bucket?.type) ||
          safeStr(bucket?.kind))
      ) {
        out.push(direct);
      }
    }
  }

  addBucket(payload);
  addBucket(payload?.items);
  addBucket(payload?.rails);
  addBucket(payload?.payment_rails);
  addBucket(payload?.data?.items);
  addBucket(payload?.data?.rails);

  addBucket(payload?.inbound, "inbound");
  addBucket(payload?.outbound, "outbound");
  addBucket(payload?.inbound_rails, "inbound");
  addBucket(payload?.outbound_rails, "outbound");
  addBucket(payload?.deposit_rails, "inbound");
  addBucket(payload?.withdrawal_rails, "outbound");
  addBucket(payload?.payout_rails, "outbound");

  addBucket(payload?.rails?.inbound, "inbound");
  addBucket(payload?.rails?.outbound, "outbound");
  addBucket(payload?.payment_rails?.inbound, "inbound");
  addBucket(payload?.payment_rails?.outbound, "outbound");

  const seen = new Set<string>();
  const deduped: RailItem[] = [];

  for (const item of out) {
    const key = `${item.key}-${item.direction}-${item.name}-${item.provider}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export default function PaymentRailsPage() {
  const location = useLocation();
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const activeCommunityId = useMemo(
    () => routeCommunityId(location.search),
    [location.search]
  );

  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", activeCommunityId, "payment-rails.nav.dashboard"),
      loans: routeTarget("loans", activeCommunityId, "payment-rails.nav.loans"),
      moneyIn: routeTarget("moneyIn", activeCommunityId, "payment-rails.route.money-in"),
      moneyOut: routeTarget("moneyOut", activeCommunityId, "payment-rails.route.money-out"),
      loanReadiness: routeTarget(
        "loanReadiness",
        activeCommunityId,
        "payment-rails.route.readiness"
      ),
      loanWorkbench: routeTarget(
        "loanWorkbench",
        activeCommunityId,
        "payment-rails.route.workbench"
      ),
      marketplace: routeTarget(
        "marketplace",
        activeCommunityId,
        "payment-rails.route.marketplace"
      ),
      community: routeTarget(
        "communityHome",
        activeCommunityId,
        "payment-rails.route.community"
      ),
    }),
    [activeCommunityId]
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
    (async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await getPaymentRails();
        setData(res || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load payment rails."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rails = useMemo(() => extractRails(data), [data]);

  const inboundRails = useMemo(
    () => rails.filter((item) => item.direction === "Inbound"),
    [rails]
  );

  const outboundRails = useMemo(
    () => rails.filter((item) => item.direction === "Outbound"),
    [rails]
  );

  const generalRails = useMemo(
    () => rails.filter((item) => item.direction === "General"),
    [rails]
  );

  const activeInboundCount = useMemo(
    () => inboundRails.filter((item) => isActiveStatus(item.status)).length,
    [inboundRails]
  );

  const activeOutboundCount = useMemo(
    () => outboundRails.filter((item) => isActiveStatus(item.status)).length,
    [outboundRails]
  );

  const activeCount = useMemo(
    () => rails.filter((item) => isActiveStatus(item.status)).length,
    [rails]
  );

  const supportedCurrencies = useMemo(() => {
    return dedupeStrings(
      rails.flatMap((item) => item.currencies.map((currency) => safeStr(currency)))
    );
  }, [rails]);

  const activeProviders = useMemo(() => {
    return dedupeStrings(
      rails
        .filter((item) => isActiveStatus(item.status))
        .map((item) => safeStr(item.provider))
        .filter(Boolean)
    );
  }, [rails]);

  const reading = useMemo<RailReading>(() => {
    if (loading) {
      return {
        tone: "gray",
        title: "Loading payment rails reading",
        detail:
          "The page is checking what inbound and outbound rail families are visible.",
        nowLine: "Wait for the rails reading to load.",
        nextLine: "Return to the active money task after this page becomes readable.",
      };
    }

    if (rails.length === 0) {
      return {
        tone: "red",
        title: "No readable payment rail is currently shown",
        detail:
          "This view is only for reading rail visibility. If rails are missing here, treat Money In or Money Out carefully until the picture becomes clearer.",
        nowLine: "Do not rely on this page until rail visibility improves.",
        nextLine: "Use the guided pages directly.",
      };
    }

    if (activeInboundCount > 0 && activeOutboundCount > 0) {
      return {
        tone: "green",
        title: "Inbound and outbound rails are both visible",
        detail:
          "Both money directions are at least partly visible here, but action should still happen on the guided Money In and Money Out routes.",
        nowLine: "Understand rail visibility here, not act here.",
        nextLine: "Return to Money In or Money Out when you are ready to act.",
      };
    }

    if (activeInboundCount > 0) {
      return {
        tone: "blue",
        title: "Inbound rails are visible, but outbound rails look weaker",
        detail:
          "Deposit-side movement looks more available than withdrawal-side movement right now. This is useful reading, but it is not the place to act.",
        nowLine: "Money In may be clearer than Money Out at the moment.",
        nextLine: "Check Money Out carefully before assuming payout rails are ready.",
      };
    }

    if (activeOutboundCount > 0) {
      return {
        tone: "blue",
        title: "Outbound rails are visible, but inbound rails look weaker",
        detail:
          "Withdrawal-side movement looks more available than deposit-side movement right now. This remains an intelligence page, not the task execution page.",
        nowLine: "Money Out may be clearer than Money In at the moment.",
        nextLine: "Check the Money In page carefully before assuming deposit rails are ready.",
      };
    }

    return {
      tone: "yellow",
      title: "Rails are visible, but not clearly active",
      detail:
        "Some rail information is coming through, but the current statuses do not read as confidently active. Use this as a caution signal, not as a blocker by itself.",
      nowLine: "Review the visible statuses before choosing a money direction.",
      nextLine: "Return to the guided page and rely on the route shown there.",
    };
  }, [loading, rails.length, activeInboundCount, activeOutboundCount]);

  const readingToneStyle = readingTone(reading.tone);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Payment Rails"
        title="Payment Rails"
        subtitle="Read-only intelligence about inbound and outbound rails. Money actions should still happen on the guided pages."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.loans}
        backLabel="Loans & Support"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen gives you a read-only picture of which inbound and outbound rails look active, how they are labelled, and which providers and currencies are visible."
        why="It helps you understand the current payment environment without asking you to act directly inside this page."
        next="Read the current rail picture here, then return to the guided Money In or Money Out route that matches the direction you need."
        tone="light"
        style={{ marginTop: 18 }}
      />

      {err ? (
        <div style={{ ...feedbackCard(false), marginTop: 18 }}>{err}</div>
      ) : null}

      <section
        style={{
          ...pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          ),
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
            <div style={{ ...sectionLabel(), color: "#BFD2E8" }}>
              Rails intelligence
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#F8FBFF",
                lineHeight: 1.15,
              }}
            >
              Payment rails should remain readable, not buried in raw JSON
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#D7E3F1",
                lineHeight: 1.8,
              }}
            >
              Review which rail families are visible before you go
              back to Money In or Money Out.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Total rails: {loading ? "..." : rails.length}</span>
              <span style={badge(false)}>Inbound: {loading ? "..." : inboundRails.length}</span>
              <span style={badge(false)}>Outbound: {loading ? "..." : outboundRails.length}</span>
              <span style={badge(false)}>Active: {loading ? "..." : activeCount}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                color: "#D7E3F1",
                lineHeight: 1.75,
                fontWeight: 800,
              }}
            >
              Keep the route reading here. When you are ready to act again, use the
              single <span style={{ fontWeight: 1000 }}>Next routes</span> section
              below so the money direction is chosen in one clear place.
            </div>
          </div>

          <div
            style={{
              ...softCard(readingToneStyle.bg),
              border: readingToneStyle.border,
            }}
          >
            <div style={sectionLabel()}>Current reading</div>

            <div
              style={{
                marginTop: 10,
                color: readingToneStyle.text,
                fontSize: 20,
                fontWeight: 1000,
                lineHeight: 1.3,
              }}
            >
              {reading.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#0B1F33" }}>
              {reading.detail}
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div style={helperText()}>{reading.nowLine}</div>
              <div style={helperText()}>{reading.nextLine}</div>
            </div>
          </div>
        </div>

        <ExplainToggle
          label="What this does"
          what="This current reading turns the raw rail statuses into one practical interpretation so you can judge whether the rail picture looks strong, partial, or uncertain."
          why="Without that interpretation, it is easy to overreact to one status label or miss the safer next route."
          next="Read this summary before you decide whether to continue with Money In, Money Out, or a deeper rail check."
          tone="light"
          style={{ marginTop: 14 }}
        />
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Inbound active</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "..." : activeInboundCount}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Outbound active</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "..." : activeOutboundCount}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Currencies</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
              lineHeight: 1.4,
            }}
          >
            {loading
              ? "..."
              : supportedCurrencies.length > 0
              ? supportedCurrencies.join(", ")
              : "Not shown"}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Providers</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
              lineHeight: 1.4,
            }}
          >
            {loading
              ? "..."
              : activeProviders.length > 0
              ? activeProviders.join(", ")
              : "Not shown"}
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Structured rail listing</div>
            <div
              style={{
                marginTop: 8,
                color: "#6B7A88",
                lineHeight: 1.8,
              }}
            >
              Review the structured rail view here. If you need the full response,
              you can still open it below.
            </div>
          </div>

          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>How to use this page</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Use it to see whether deposit or withdrawal looks more available.
              When you are ready to act, return to the guided Money In or Money Out route.
            </div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <SubtleButton
                onClick={() => setShowRaw((prev) => !prev)}
                stableHeight={42}
                debugId="payment-rails.toggle-raw"
                style={paymentRailsSoftButtonStyle()}
              >
                {showRaw ? "Hide raw response" : "Show raw response"}
              </SubtleButton>
            </div>
          </div>
        </div>

        <ExplainToggle
          label="What this does"
          what="This structured rail listing groups the visible inbound, outbound, and general rails into a clearer operational view."
          why="It helps you see which directions look active or limited before you return to the guided money route."
          next="Use the grouped statuses here to judge whether Money In or Money Out looks clearer, then continue on the matching guided page."
          tone="light"
          style={{ marginTop: 16 }}
        />

        {loading ? (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            Loading rail visibility...
          </div>
        ) : rails.length === 0 ? (
          <div style={{ marginTop: 16, color: "#64748B", lineHeight: 1.8 }}>
            No structured rail listing is shown yet. You can still open the full
            response below.
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 18 }}>
            {[
              {
                title: "Inbound rails",
                items: inboundRails,
              },
              {
                title: "Outbound rails",
                items: outboundRails,
              },
              {
                title: "General rails",
                items: generalRails,
              },
            ]
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <div key={group.title} style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontSize: 18,
                      fontWeight: 1000,
                    }}
                  >
                    {group.title}
                  </div>

                  {group.items.map((rail) => {
                    const tone = railStatusTone(rail.status);

                    return (
                      <div key={rail.key} style={innerCard("#FCFEFF")}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color: "#0B1F33",
                                fontSize: 17,
                                fontWeight: 1000,
                                lineHeight: 1.35,
                              }}
                            >
                              {rail.name}
                            </div>

                            {rail.provider ? (
                              <div
                                style={{
                                  marginTop: 8,
                                  color: "#64748B",
                                  fontSize: 14,
                                  lineHeight: 1.7,
                                }}
                              >
                                Provider: {rail.provider}
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
                            {safeStr(rail.status || "unknown").toUpperCase()}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={badge(true)}>{rail.direction}</span>

                          {rail.currencies.length > 0 ? (
                            <span style={badge(false)}>
                              Currencies: {rail.currencies.join(", ")}
                            </span>
                          ) : null}

                          {rail.countries.length > 0 ? (
                            <span style={badge(false)}>
                              Countries: {rail.countries.join(", ")}
                            </span>
                          ) : null}
                        </div>

                        {rail.note ? (
                          <div
                            style={{
                              marginTop: 10,
                              color: "#64748B",
                              lineHeight: 1.75,
                              fontSize: 14,
                            }}
                          >
                            {rail.note}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}

        {showRaw ? (
          <div style={{ marginTop: 18 }}>
            <div style={sectionLabel()}>Raw response</div>
            <pre
              style={{
                marginTop: 12,
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.7,
                color: "#334155",
                background: "#F8FAFC",
                border: "1px solid rgba(11,31,51,0.08)",
                borderRadius: 16,
                padding: 16,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : null}
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div>
          <div style={sectionLabel()}>Next routes</div>
          <div
            style={{
              marginTop: 8,
              color: "#6B7A88",
              lineHeight: 1.8,
            }}
          >
            Move back into the page you need after reading the rail picture.
          </div>
        </div>

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
          <StableCtaLink
            to={routes.moneyIn}
            debugId="payment-rails.route.money-in"
            stableHeight={100}
            fullWidth
            style={routeTileStyle(true)}
          >
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 17,
                lineHeight: 1.3,
              }}
            >
              Money In
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
              Open this when you are actively paying into the pool.
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.moneyOut}
            debugId="payment-rails.route.money-out"
            stableHeight={100}
            fullWidth
            style={routeTileStyle(false)}
          >
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 17,
                lineHeight: 1.3,
              }}
            >
              Money Out
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
              Open this when you are actively withdrawing or checking payout route readiness.
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.loanReadiness}
            debugId="payment-rails.route.readiness"
            stableHeight={100}
            fullWidth
            style={routeTileStyle(false)}
          >
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 17,
                lineHeight: 1.3,
              }}
            >
              Loan Readiness
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
              Open this when the money question has already become a support-continuation question.
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.loanWorkbench}
            debugId="payment-rails.route.workbench"
            stableHeight={100}
            fullWidth
            style={routeTileStyle(false)}
          >
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 17,
                lineHeight: 1.3,
              }}
            >
              Loan Workbench
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
              Open this when the support flow is already deep and operational.
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.marketplace}
            debugId="payment-rails.route.marketplace"
            stableHeight={100}
            fullWidth
            style={routeTileStyle(false)}
          >
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 17,
                lineHeight: 1.3,
              }}
            >
              Marketplace
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
              Go back to your community page after the current money reading is complete.
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.community}
            debugId="payment-rails.route.community"
            stableHeight={100}
            fullWidth
            style={routeTileStyle(false)}
          >
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 17,
                lineHeight: 1.3,
              }}
            >
              Community Home
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
              Return to the wider community page.
            </div>
          </StableCtaLink>
        </div>
      </section>
    </div>
  );
}


