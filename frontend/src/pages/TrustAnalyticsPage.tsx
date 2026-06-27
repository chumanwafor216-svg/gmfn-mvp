import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { SecondaryButton, StableCtaLink } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  getCurrentClan,
  getMe,
  getSelectedClanId,
  listTrustEvents,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type TrustEventRow = {
  id?: number | string;
  title?: string | null;
  message?: string | null;
  detail?: string | null;
  description?: string | null;
  kind?: string | null;
  type?: string | null;
  event_type?: string | null;
  created_at?: string | null;
};

type EventCategory = "built" | "protected" | "weakened" | "repair";

type CollapseState = {
  overview: boolean;
  mix: boolean;
  timeline: boolean;
  notes: boolean;
};

const TRUST_ANALYTICS_UI_STORAGE_KEY = "gmfn.trustAnalytics.sections.v1";

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

function supportDisplayText(value: any, fallback = ""): string {
  const text = safeStr(value);
  if (!text) return fallback;
  return text
    .replace(/Guarantors/g, "Supporters")
    .replace(/Guarantor/g, "Supporter")
    .replace(/guarantors/g, "supporters")
    .replace(/guarantor/g, "supporter");
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
  if (!raw) return "Not stated";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function daysSince(value: any): number {
  const raw = safeStr(value);
  if (!raw) return 9999;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function classifyTrustEvent(row: TrustEventRow): EventCategory {
  const text = [
    safeStr(row?.event_type),
    safeStr(row?.kind),
    safeStr(row?.type),
    safeStr(row?.title),
    safeStr(row?.message),
    safeStr(row?.detail),
    safeStr(row?.description),
  ]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("paid") ||
    text.includes("repaid") ||
    text.includes("verified") ||
    text.includes("completed") ||
    text.includes("approved") ||
    text.includes("contributed") ||
    text.includes("delivered") ||
    text.includes("fulfilled") ||
    text.includes("successful")
  ) {
    return "built";
  }

  if (
    text.includes("responded") ||
    text.includes("active") ||
    text.includes("consistent") ||
    text.includes("participation") ||
    text.includes("updated") ||
    text.includes("maintained")
  ) {
    return "protected";
  }

  if (
    text.includes("late") ||
    text.includes("overdue") ||
    text.includes("default") ||
    text.includes("missed") ||
    text.includes("declined") ||
    text.includes("cancelled") ||
    text.includes("unpaid") ||
    text.includes("negative")
  ) {
    return "weakened";
  }

  if (
    text.includes("risk") ||
    text.includes("warning") ||
    text.includes("repair") ||
    text.includes("flag") ||
    text.includes("dispute") ||
    text.includes("attention")
  ) {
    return "repair";
  }

  return "protected";
}

function eventTone(category: EventCategory) {
  if (category === "built") {
    return {
      dot: "#16A34A",
      bg: "#F3FBF5",
      label: "Built",
    };
  }

  if (category === "weakened") {
    return {
      dot: "#DC2626",
      bg: "#FFF5F5",
      label: "Weakened",
    };
  }

  if (category === "repair") {
    return {
      dot: "#D97706",
      bg: "#FFFBEF",
      label: "Repair",
    };
  }

  return {
    dot: "#0B63D1",
    bg: "#F8FBFF",
    label: "Protected",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.22)",
    background:
      bg === "#FFFFFF"
        ? "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.15) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.13) 0%, rgba(38,96,171,0) 30%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(240,247,255,0.985) 54%, rgba(223,234,246,0.975) 100%)"
        : bg,
    boxShadow:
      "0 28px 58px rgba(7,20,36,0.10), 0 6px 14px rgba(7,20,36,0.04), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -12px 26px rgba(18,52,86,0.05)",
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
    boxShadow:
      "0 16px 34px rgba(7,20,36,0.06), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    border: "1px solid rgba(20,52,83,0.17)",
    background:
      bg === "#FFFFFF"
        ? "radial-gradient(circle at 16% 10%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 84% 14%, rgba(38,96,171,0.10) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(240,246,252,0.984) 100%)"
        : bg,
    boxShadow:
      "0 14px 28px rgba(7,20,36,0.055), inset 0 1px 0 rgba(255,255,255,0.80)",
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
    gap: 6,
    minHeight: 32,
    borderRadius: 999,
    padding: "7px 12px",
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
  };
}

function analyticsIconBadge(
  icon: GsnIconName,
  children: React.ReactNode,
  primary = false
) {
  return (
    <span style={badge(primary)}>
      <GsnLegacyIcon
        name={icon}
        size={15}
      />
      <span>{children}</span>
    </span>
  );
}

function sectionLabelWithIcon(
  icon: GsnIconName,
  label: React.ReactNode,
  dark = false
) {
  return (
    <span
      style={{
        ...sectionLabel(),
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: dark ? "#D8E7F6" : "#4A627A",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: dark
            ? "linear-gradient(180deg, rgba(242,199,102,0.22) 0%, rgba(242,199,102,0.10) 100%)"
            : "linear-gradient(180deg, #08233A 0%, #061827 100%)",
          border: dark
            ? "1px solid rgba(242,199,102,0.34)"
            : "1px solid rgba(8,35,58,0.16)",
          color: dark ? "#F2C766" : "#FFFFFF",
          boxShadow: "0 10px 20px rgba(7,20,36,0.10)",
          flex: "0 0 auto",
        }}
      >
        <GsnLegacyIcon name={icon} size={15} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function labelWithIcon(icon: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
      }}
    >
      <GsnLegacyIcon name={icon} size={18} />
      <span>{label}</span>
    </span>
  );
}

function eventIcon(category: EventCategory): GsnIconName {
  if (category === "built") return "check";
  if (category === "weakened") return "alert";
  if (category === "repair") return "refresh";
  return "shield";
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "9px 13px",
    borderRadius: 13,
    border: "1px solid rgba(121,149,190,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EAF2FB 100%)",
    color: "#213D59",
    boxShadow: "0 12px 24px rgba(7,20,36,0.07)",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "normal",
    textAlign: "center",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#425C73",
    fontSize: 14.5,
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
    mix: false,
    timeline: true,
    notes: true,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    mix: Boolean(raw?.mix ?? base.mix),
    timeline: Boolean(raw?.timeline ?? base.timeline),
    notes: Boolean(raw?.notes ?? base.notes),
  };
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

export default function TrustAnalyticsPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "trust-analytics.nav.dashboard"),
      commandCenter: routeTarget(
        "adminCommand",
        selectedClanId,
        "trust-analytics.route.command-center"
      ),
      systemOperations: routeTarget(
        "systemOperations",
        selectedClanId,
        "trust-analytics.route.system-operations"
      ),
      exposure: routeTarget("exposureAdmin", selectedClanId, "trust-analytics.route.exposure"),
      trustGraph: routeTarget("trustGraph", selectedClanId, "trust-analytics.route.trust-graph"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(TRUST_ANALYTICS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [events, setEvents] = useState<TrustEventRow[]>([]);

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
    writeLocalJSON(TRUST_ANALYTICS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, eventsRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          listTrustEvents({
            clan_id: selectedClanId || undefined,
            limit: 120,
          }).catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setEvents(rowsOf<TrustEventRow>(eventsRes));
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

  const normalizedRows = useMemo(() => {
    return events
      .map((row, index) => {
        const category = classifyTrustEvent(row);

        return {
          id: firstTruthy(row.id, `event-${index}`),
          label: supportDisplayText(
            firstTruthy(
              row.title,
              row.message,
              row.detail,
              row.description,
              row.kind,
              row.type,
              row.event_type,
              "Trust event"
            )
          ),
          kind: supportDisplayText(firstTruthy(row.kind, row.type, row.event_type)),
          category,
          createdAt: safeStr(row.created_at),
          ageDays: daysSince(row.created_at),
        };
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [events]);

  const summary = useMemo(() => {
    let built = 0;
    let protectedCount = 0;
    let weakened = 0;
    let repair = 0;
    let last7Days = 0;
    let last30Days = 0;

    for (const row of normalizedRows) {
      if (row.category === "built") built += 1;
      if (row.category === "protected") protectedCount += 1;
      if (row.category === "weakened") weakened += 1;
      if (row.category === "repair") repair += 1;

      if (row.ageDays <= 7) last7Days += 1;
      if (row.ageDays <= 30) last30Days += 1;
    }

    let trendTitle = "The trust pattern looks steady.";
    let trendDetail =
      "Recent signals do not suggest that weakening pressure is dominating the visible pattern right now.";

    if (weakened + repair > built + protectedCount) {
      trendTitle = "The trust pattern shows weakening pressure.";
      trendDetail =
        "Recent weakening and repair signals are heavier than the building and protecting signals in the visible event mix.";
    } else if (built + protectedCount > 0) {
      trendTitle = "The trust pattern is building more than weakening.";
      trendDetail =
        "Recent built and protected signals are outweighing the weakening side of the visible event mix.";
    }

    return {
      total: normalizedRows.length,
      built,
      protectedCount,
      weakened,
      repair,
      last7Days,
      last30Days,
      trendTitle,
      trendDetail,
    };
  }, [normalizedRows]);

  const recentRows = useMemo(() => normalizedRows.slice(0, 10), [normalizedRows]);

  const builtRows = useMemo(
    () => normalizedRows.filter((row) => row.category === "built").slice(0, 4),
    [normalizedRows]
  );
  const weakenedRows = useMemo(
    () =>
      normalizedRows
        .filter((row) => row.category === "weakened" || row.category === "repair")
        .slice(0, 4),
    [normalizedRows]
  );

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
          sectionLabel="Trust Analytics"
          title="Trust Analytics"
          subtitle="Loading the trust analytics page..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.commandCenter}
          backLabel="Command Center"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading trust analytics...
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
        sectionLabel="Trust Analytics"
        title="Trust Analytics"
        subtitle="Read the trust pattern, signal mix, and recent movement before taking deeper admin action."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.commandCenter}
        backLabel="Command Center"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen shows whether trust is building, protected, weakening, or needing repair."
        why="It helps you act from the record instead of guessing."
        next="Start with the current reading, then check the overview, mix, and timeline."
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
            <div>{sectionLabelWithIcon("chart", "Analytics overview", true)}</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Trust pattern view for {operatorName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              Read the trust pattern before opening deeper intervention pages.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {analyticsIconBadge("user", <>Role: {roleLabel}</>, true)}
              {analyticsIconBadge("community", <>Community: {communityLabel}</>)}
              {analyticsIconBadge("document", <>Recent events: {summary.total}</>)}
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div>{sectionLabelWithIcon("shield", "Current reading")}</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {summary.trendTitle}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {summary.trendDetail}
            </div>
          </div>
        </div>

        <ExplainToggle
          label="What this does"
          what="This reading turns the trust signals into one practical direction."
          why="It helps you avoid heavier action before you understand the pattern."
          next="Use the sections below to see why the pattern looks this way."
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
            <div>{sectionLabelWithIcon("chart", "Signal overview")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick count of what the visible record is saying.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("overview")}
            stableHeight={52}
            debugId="trust-analytics.toggle.overview"
            style={collapseToggle()}
          >
            {labelWithIcon(collapsed.overview ? "chevronDown" : "chevronUp", collapsed.overview ? "Open" : "Hide")}
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
              <div>{sectionLabelWithIcon("document", "Total")}</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.total}
              </div>
            </div>

            <div style={statTile("#F3FBF5")}>
              <div>{sectionLabelWithIcon("check", "Built")}</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#166534",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.built}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div>{sectionLabelWithIcon("shield", "Protected")}</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.protectedCount}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div>{sectionLabelWithIcon("alert", "Weakened")}</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.weakened}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div>{sectionLabelWithIcon("refresh", "Repair")}</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.repair}
              </div>
            </div>

            <div style={statTile()}>
              <div>{sectionLabelWithIcon("calendar", "Last 7 days")}</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.last7Days}
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
            <div>{sectionLabelWithIcon("spark", "Signal mix")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The strongest building and repair signals in view.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("mix")}
            stableHeight={52}
            debugId="trust-analytics.toggle.mix"
            style={collapseToggle()}
          >
            {labelWithIcon(collapsed.mix ? "chevronDown" : "chevronUp", collapsed.mix ? "Open" : "Hide")}
          </SecondaryButton>
        </div>

        {!collapsed.mix ? (
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
                {labelWithIcon("check", "Stronger positive side")}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {builtRows.length === 0 ? (
                  <div style={helperText()}>
                    No strong built-side event is shown yet.
                  </div>
                ) : (
                  builtRows.map((row) => (
                    <div key={row.id} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {row.label}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {safeDateTime(row.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                {labelWithIcon("alert", "Weakened or repair side")}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {weakenedRows.length === 0 ? (
                  <div style={helperText()}>
                    No weakened or repair-side event is shown yet.
                  </div>
                ) : (
                  weakenedRows.map((row) => (
                    <div key={row.id} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {row.label}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {safeDateTime(row.createdAt)}
                      </div>
                    </div>
                  ))
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
            <div>{sectionLabelWithIcon("calendar", "Recent trust timeline")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The latest visible trust movement, newest first.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("timeline")}
            stableHeight={52}
            debugId="trust-analytics.toggle.timeline"
            style={collapseToggle()}
          >
            {labelWithIcon(collapsed.timeline ? "chevronDown" : "chevronUp", collapsed.timeline ? "Open" : "Hide")}
          </SecondaryButton>
        </div>

        {!collapsed.timeline ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {recentRows.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No recent trust event is currently shown.
              </div>
            ) : (
              recentRows.map((row) => {
                const tone = eventTone(row.category);

                return (
                  <div
                    key={row.id}
                    style={{
                      ...innerCard(tone.bg),
                      display: "grid",
                      gridTemplateColumns: "38px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(180deg, #08233A 0%, #061827 100%)",
                        color: "#FFFFFF",
                        border: "1px solid rgba(8,35,58,0.16)",
                        boxShadow: "0 10px 20px rgba(7,20,36,0.10)",
                        marginTop: 2,
                      }}
                    >
                      <GsnLegacyIcon
                        name={eventIcon(row.category)}
                        size={18}
                      />
                    </div>

                    <div>
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
                          {row.label}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {analyticsIconBadge(eventIcon(row.category), tone.label, true)}
                          {row.createdAt ? (
                            analyticsIconBadge(
                              "calendar",
                              safeDateTime(row.createdAt)
                            )
                          ) : null}
                        </div>
                      </div>
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
            <div>{sectionLabelWithIcon("document", "Reading notes")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              What to read here, and where to take action.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("notes")}
            stableHeight={52}
            debugId="trust-analytics.toggle.notes"
            style={collapseToggle()}
          >
            {labelWithIcon(collapsed.notes ? "chevronDown" : "chevronUp", collapsed.notes ? "Open" : "Hide")}
          </SecondaryButton>
        </div>

        {!collapsed.notes ? (
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
                {labelWithIcon("chart", "Read patterns here")}
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Read trust trends before moving into deeper intervention pages.
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
                {labelWithIcon("navigation", "Use action pages for action")}
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Move to System Operations, Exposure, or Trust Graph for live handling, risk review, or relationship checks.
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div>{sectionLabelWithIcon("navigation", "Where next")}</div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <StableCtaLink
            to={routes.systemOperations}
            kind="primary"
            debugId="trust-analytics.route.system-operations"
          >
            {labelWithIcon("shield", "System Operations")}
          </StableCtaLink>
          <StableCtaLink
            to={routes.exposure}
            kind="secondary"
            debugId="trust-analytics.route.exposure"
          >
            {labelWithIcon("alert", "Exposure")}
          </StableCtaLink>
          <StableCtaLink
            to={routes.trustGraph}
            kind="secondary"
            debugId="trust-analytics.route.trust-graph"
          >
            {labelWithIcon("chart", "Trust Graph")}
          </StableCtaLink>
          <StableCtaLink
            to={routes.commandCenter}
            kind="soft"
            debugId="trust-analytics.route.command-center"
          >
            {labelWithIcon("navigation", "Command Center")}
          </StableCtaLink>
        </div>
      </section>
    </div>
  );
}
