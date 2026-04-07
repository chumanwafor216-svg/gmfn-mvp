import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getMyNotifications,
  getMySettings,
  markNotificationRead,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceInboxBucketKey,
  type GuidanceNotice,
  type GuidanceSnapshot,
} from "../lib/guidance";

type RawNotificationRow = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  ctaLabel: string;
  ctaTo: string;
  unread: boolean;
  createdAt: string;
};

type SettingsState = {
  notificationsMode: "summary" | "detailed";
  unreadFirst: boolean;
  openActionsDirectly: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  notificationsMode: "summary",
  unreadFirst: true,
  openActionsDirectly: true,
};

const BUCKET_ORDER: GuidanceInboxBucketKey[] = [
  "actNow",
  "dueSoon",
  "watchAndWait",
  "generalUpdates",
];

const PUBLIC_ROUTE_PREFIXES = [
  "cover",
  "welcome",
  "guide",
  "login",
  "create",
  "join",
  "pending-approval",
  "join-request",
  "join-approval",
  "approved",
  "activate",
  "activate-membership",
  "existing",
  "founder",
  "public-create",
  "register",
];

const APP_ROUTE_PREFIXES = [
  "dashboard",
  "home",
  "clans",
  "create-community",
  "new-community",
  "community",
  "community-home",
  "marketplace",
  "market",
  "demand-box",
  "shop",
  "shop-gallery",
  "shop-control",
  "my-shop",
  "trust",
  "trust-passport",
  "trust-slip",
  "trustslip",
  "identity",
  "notifications",
  "my-gmfn-and-i",
  "settings",
  "loans",
  "money",
  "payment",
  "withdrawal-instructions",
  "loan-readiness",
  "loan-suggestions",
  "loan-workbench",
  "guarantor-earnings",
  "build-first-circle",
  "command-center",
  "trust-command-centre",
  "trust-analytics",
  "system-operations",
  "admin",
];

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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function containsAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function splitPathSuffix(raw: string): { path: string; suffix: string } {
  const match = raw.match(/^([^?#]*)(.*)$/);
  return {
    path: safeStr(match?.[1] || ""),
    suffix: String(match?.[2] || ""),
  };
}

function matchesRoutePrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`) ||
      path.startsWith(`${prefix}#`)
  );
}

function normalizeActionTargetPath(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "";

  if (/^(https?:|mailto:|tel:)/i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("#")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  if (raw.startsWith("?")) {
    return `/app/notifications${raw}`;
  }

  const { path, suffix } = splitPathSuffix(raw);
  if (!path) return raw;

  if (path === "app" || path.startsWith("app/")) {
    return `/${path}${suffix}`;
  }

  if (matchesRoutePrefix(path, PUBLIC_ROUTE_PREFIXES)) {
    return `/${path}${suffix}`;
  }

  if (matchesRoutePrefix(path, APP_ROUTE_PREFIXES)) {
    return `/app/${path}${suffix}`;
  }

  return `/app/${path}${suffix}`;
}

function resolveNoticeTarget(raw: any): string {
  const explicit = normalizeActionTargetPath(
    raw?.action_url || raw?.cta_to || raw?.ctaTo || raw?.to
  );
  if (explicit) return explicit;

  const text = [
    safeStr(raw?.kind),
    safeStr(raw?.title),
    safeStr(raw?.message),
    safeStr(raw?.detail),
    safeStr(raw?.description),
    safeStr(raw?.action_label),
  ]
    .join(" ")
    .toLowerCase();

  if (
    containsAny(text, [
      "build first circle",
      "first circle",
      "grow your circle",
      "circle invite",
    ])
  ) {
    return "/app/build-first-circle";
  }

  if (
    containsAny(text, [
      "merchant verify",
      "trustslip",
      "trust slip",
      "verify qr",
      "scan qr",
      "qr verify",
    ])
  ) {
    return "/app/trust-slip";
  }

  if (
    containsAny(text, [
      "guarantor",
      "loan",
      "support path",
      "support request",
      "repay",
      "repayment",
      "payment",
      "withdrawal",
      "pool",
      "readiness",
      "workbench",
      "suggestion",
    ])
  ) {
    return "/app/loans";
  }

  if (
    containsAny(text, [
      "join request",
      "join approval",
      "approval vote",
      "member approval",
      "community approval",
      "pending approval",
      "activate membership",
      "activation",
    ])
  ) {
    return "/app/community";
  }

  if (
    containsAny(text, [
      "demand",
      "buyer need",
      "market need",
      "open need",
      "request for goods",
      "request for item",
      "sourcing",
    ])
  ) {
    return "/app/demand-box";
  }

  if (
    containsAny(text, [
      "identity",
      "integrity",
      "cci",
      "cross-community",
    ])
  ) {
    return "/app/identity";
  }

  if (containsAny(text, ["trust", "trust passport", "trust score"])) {
    return "/app/trust";
  }

  if (
    containsAny(text, [
      "community picture",
      "community profile",
      "marketplace profile",
    ])
  ) {
    return "/app/marketplace";
  }

  if (
    containsAny(text, [
      "marketplace",
      "shop gallery",
      "shop",
      "spotlight",
      "product",
      "seller",
      "repost",
    ])
  ) {
    return "/app/marketplace";
  }

  if (
    containsAny(text, [
      "settings",
      "preference",
      "notifications mode",
      "quiet notifications",
    ])
  ) {
    return "/app/my-gmfn-and-i?tab=settings";
  }

  if (containsAny(text, ["my gmfn and i", "guide"])) {
    return "/app/my-gmfn-and-i";
  }

  if (containsAny(text, ["community"])) {
    return "/app/community";
  }

  return "/app/notifications";
}

function normalizeSettings(raw: any): SettingsState {
  return {
    notificationsMode:
      safeStr(raw?.notificationsMode || raw?.notifications_mode) === "detailed"
        ? "detailed"
        : "summary",
    unreadFirst: Boolean(raw?.unreadFirst ?? raw?.unread_first ?? true),
    openActionsDirectly: Boolean(
      raw?.openActionsDirectly ?? raw?.open_actions_directly ?? true
    ),
  };
}

function normalizeRawNotificationRow(raw: any): RawNotificationRow {
  return {
    id: firstTruthy(raw?.id, raw?.notification_id, raw?.title, raw?.message),
    kind: firstTruthy(raw?.kind, raw?.title, "update"),
    title: firstTruthy(raw?.title, raw?.kind, "Update"),
    detail: firstTruthy(
      raw?.message,
      raw?.detail,
      "Review this update and continue from the right page."
    ),
    ctaLabel: firstTruthy(raw?.action_label, "Open"),
    ctaTo: resolveNoticeTarget(raw),
    unread: !raw?.is_read,
    createdAt: firstTruthy(raw?.created_at),
  };
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function bucketTitle(bucket: GuidanceInboxBucketKey): string {
  if (bucket === "actNow") return "Act now";
  if (bucket === "dueSoon") return "Due soon";
  if (bucket === "watchAndWait") return "Watch and wait";
  return "General updates";
}

function bucketDescription(bucket: GuidanceInboxBucketKey): string {
  if (bucket === "actNow") {
    return "These are the live steps that need immediate decision or visible response.";
  }
  if (bucket === "dueSoon") {
    return "These are not yet urgent, but they should be handled before they drift.";
  }
  if (bucket === "watchAndWait") {
    return "These items are already moving. Keep an eye on them without overreacting.";
  }
  return "These are general updates that do not currently block movement.";
}

function bucketTone(
  bucket: GuidanceInboxBucketKey
): { bg: string; border: string; text: string } {
  if (bucket === "actNow") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  if (bucket === "dueSoon") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (bucket === "watchAndWait") {
    return {
      bg: "#F8FBFF",
      border: "1px solid rgba(11,99,209,0.12)",
      text: "#0B63D1",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#334155",
  };
}

function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}…`;
}

function sortGuidanceNotices(
  rows: GuidanceNotice[],
  unreadFirst: boolean
): GuidanceNotice[] {
  const next = [...rows];

  if (unreadFirst) {
    next.sort((a, b) => {
      const aUnread = a.unread ? 1 : 0;
      const bUnread = b.unread ? 1 : 0;
      return bUnread - aUnread;
    });
  }

  return next;
}

function sortRawNotifications(
  rows: RawNotificationRow[],
  unreadFirst: boolean
): RawNotificationRow[] {
  const next = [...rows];

  next.sort((a, b) => {
    if (unreadFirst) {
      const aUnread = a.unread ? 1 : 0;
      const bUnread = b.unread ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
    }

    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  return next;
}

function markGuidanceSnapshotReadLocally(
  snapshot: GuidanceSnapshot | null,
  id: string
): GuidanceSnapshot | null {
  if (!snapshot) return snapshot;

  const patch = (rows: GuidanceNotice[]) =>
    rows.map((item) =>
      safeStr(item.id) === id ? { ...item, unread: false } : item
    );

  const nextActionInboxSummary = {
    ...snapshot.actionInboxSummary,
    actNow: patch(snapshot.actionInboxSummary.actNow || []),
    dueSoon: patch(snapshot.actionInboxSummary.dueSoon || []),
    watchAndWait: patch(snapshot.actionInboxSummary.watchAndWait || []),
    generalUpdates: patch(snapshot.actionInboxSummary.generalUpdates || []),
  };

  const unreadCount = [
    ...nextActionInboxSummary.actNow,
    ...nextActionInboxSummary.dueSoon,
    ...nextActionInboxSummary.watchAndWait,
    ...nextActionInboxSummary.generalUpdates,
  ].filter((item) => item.unread).length;

  return {
    ...snapshot,
    actionInboxSummary: {
      ...nextActionInboxSummary,
      unreadCount,
    },
  };
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [guidanceSnapshot, setGuidanceSnapshot] = useState<GuidanceSnapshot | null>(
    null
  );
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [rawNotifications, setRawNotifications] = useState<RawNotificationRow[]>(
    []
  );
  const [rawLoading, setRawLoading] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<GuidanceNotice | null>(null);

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
    let alive = true;

    async function loadAll() {
      setGuidanceLoading(true);
      setRawLoading(true);

      try {
        const [settingsRes, guidanceRes, rawRes] = await Promise.all([
          getMySettings().catch(() => null),
          buildGuidanceSnapshot().catch(() => null),
          getMyNotifications(100, false).catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        setSettings(normalizeSettings(settingsRes || {}));
        setGuidanceSnapshot(guidanceRes);

        const rows = (
          Array.isArray(rawRes?.items)
            ? rawRes.items
            : Array.isArray(rawRes)
            ? rawRes
            : []
        ).map((item: any) => normalizeRawNotificationRow(item));

        setRawNotifications(rows);
      } finally {
        if (alive) {
          setGuidanceLoading(false);
          setRawLoading(false);
        }
      }
    }

    void loadAll();

    const intervalId = window.setInterval(() => {
      void loadAll();
    }, 60000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const bucketRows = useMemo(() => {
    const summary = guidanceSnapshot?.actionInboxSummary;

    return {
      actNow: sortGuidanceNotices(summary?.actNow || [], settings.unreadFirst),
      dueSoon: sortGuidanceNotices(summary?.dueSoon || [], settings.unreadFirst),
      watchAndWait: sortGuidanceNotices(
        summary?.watchAndWait || [],
        settings.unreadFirst
      ),
      generalUpdates: sortGuidanceNotices(
        summary?.generalUpdates || [],
        settings.unreadFirst
      ),
    };
  }, [guidanceSnapshot, settings.unreadFirst]);

  const unreadCount = guidanceSnapshot?.actionInboxSummary?.unreadCount || 0;
  const rawFeed = useMemo(
    () => sortRawNotifications(rawNotifications, settings.unreadFirst).slice(0, 10),
    [rawNotifications, settings.unreadFirst]
  );

  const operationalFocus = useMemo(() => {
    if (bucketRows.actNow.length > 0) return bucketRows.actNow[0];
    if (bucketRows.dueSoon.length > 0) return bucketRows.dueSoon[0];
    if (guidanceSnapshot?.recoveryPath) {
      return {
        id: "recovery-focus",
        kind: guidanceSnapshot.recoveryPath.kind,
        title: guidanceSnapshot.recoveryPath.title,
        detail: guidanceSnapshot.recoveryPath.detail,
        ctaLabel: guidanceSnapshot.recoveryPath.ctaLabel,
        ctaTo: guidanceSnapshot.recoveryPath.ctaTo,
        bucket: "actNow" as GuidanceInboxBucketKey,
        unread: true,
      };
    }
    return null;
  }, [bucketRows, guidanceSnapshot]);

  async function markAsRead(id: string) {
    if (!/^\d+$/.test(id)) return;

    await markNotificationRead(Number(id)).catch(() => null);

    setGuidanceSnapshot((prev) => markGuidanceSnapshotReadLocally(prev, id));
    setRawNotifications((prev) =>
      prev.map((item) =>
        safeStr(item.id) === id ? { ...item, unread: false } : item
      )
    );
    setSelectedNotice((prev) =>
      prev && safeStr(prev.id) === id ? { ...prev, unread: false } : prev
    );
  }

  async function handlePrimaryNoticeAction(notice: GuidanceNotice) {
    if (safeStr(notice.id)) {
      await markAsRead(safeStr(notice.id));
    }

    if (settings.openActionsDirectly) {
      navigate(notice.ctaTo);
      return;
    }

    setSelectedNotice(notice);
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
        sectionLabel="Notifications"
        title="Action Inbox"
        subtitle="This page now follows the same guidance system as the dashboard: act now, due soon, watch and wait, then general updates."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Trust", to: "/app/trust" },
          { label: "Demand Box", to: "/app/demand-box" },
        ]}
        utilityLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      <section style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}>
        <div style={sectionLabel()}>Action inbox summary</div>

        <div
          style={{
            marginTop: 12,
            color: "#0B1F33",
            fontSize: isCompact ? 28 : 34,
            fontWeight: 900,
            lineHeight: 1.08,
            maxWidth: 860,
          }}
        >
          See what needs response now, what is due soon, and what can simply be watched.
        </div>

        <div
          style={{
            marginTop: 12,
            ...helperText(),
            maxWidth: 880,
          }}
        >
          This page is intentionally calmer than a raw notification stream. It groups your updates by urgency and next action so the companion engine, dashboard guidance, and action inbox all speak the same language.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div style={statTile()}>
            <div style={sectionLabel()}>Unread</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B63D1",
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {unreadCount}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Act now</div>
            <div
              style={{
                marginTop: 8,
                color: "#991B1B",
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {bucketRows.actNow.length}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Due soon</div>
            <div
              style={{
                marginTop: 8,
                color: "#92400E",
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {bucketRows.dueSoon.length}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Watch</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B63D1",
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {bucketRows.watchAndWait.length}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={badge(true)}>
            Mode: {settings.notificationsMode === "detailed" ? "Detailed" : "Summary"}
          </span>
          <span style={badge(false)}>
            Order: {settings.unreadFirst ? "Unread first" : "Latest first"}
          </span>
          <span style={badge(false)}>
            Primary action: {settings.openActionsDirectly ? "Open directly" : "Review first"}
          </span>
        </div>
      </section>

      {operationalFocus ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Current operational focus</div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>What matters now</span>
                {operationalFocus.unread ? (
                  <span style={badge(false)}>Unread</span>
                ) : (
                  <span style={badge(false)}>Reviewed</span>
                )}
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#0B1F33",
                  fontSize: isCompact ? 22 : 28,
                  fontWeight: 900,
                  lineHeight: 1.15,
                }}
              >
                {operationalFocus.title}
              </div>

              <div
                style={{
                  marginTop: 12,
                  ...helperText(),
                }}
              >
                {operationalFocus.detail}
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => void handlePrimaryNoticeAction(operationalFocus)}
                  style={actionBtn("primary")}
                >
                  {settings.openActionsDirectly ? operationalFocus.ctaLabel : "Review here"}
                </button>

                <Link to={operationalFocus.ctaTo} style={actionBtn("secondary")}>
                  Open page
                </Link>
              </div>
            </div>

            <div style={softCard("#F8FBFF")}>
              <div style={sectionLabel()}>How this page behaves</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={helperText()}>
                  The companion system uses the same action buckets you see here, so the dashboard, toast reminders, and inbox now reinforce the same guidance instead of competing with each other.
                </div>

                <div style={helperText()}>
                  When “Open directly” is enabled, the primary button takes you straight to the working page. When it is off, the same action first opens a local review panel here.
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {selectedNotice ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Review panel</div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: isCompact ? 22 : 26,
                    fontWeight: 900,
                    lineHeight: 1.2,
                  }}
                >
                  {selectedNotice.title}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badge(true)}>{bucketTitle(selectedNotice.bucket)}</span>
                  {selectedNotice.unread ? (
                    <span style={badge(false)}>Unread</span>
                  ) : (
                    <span style={badge(false)}>Reviewed</span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  ...helperText(),
                  color: "#0B1F33",
                }}
              >
                {selectedNotice.detail}
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Link to={selectedNotice.ctaTo} style={actionBtn("primary")}>
                  {selectedNotice.ctaLabel}
                </Link>

                {selectedNotice.unread && /^\d+$/.test(safeStr(selectedNotice.id)) ? (
                  <button
                    type="button"
                    onClick={() => void markAsRead(safeStr(selectedNotice.id))}
                    style={actionBtn("secondary")}
                  >
                    Mark as read
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSelectedNotice(null)}
                  style={actionBtn("soft")}
                >
                  Close review
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Structured buckets</div>

          {guidanceLoading ? (
            <div style={{ marginTop: 14, color: "#64748B", lineHeight: 1.8 }}>
              Preparing your action inbox...
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
              {BUCKET_ORDER.map((bucket) => {
                const rows = bucketRows[bucket];
                const tone = bucketTone(bucket);

                return (
                  <div
                    key={bucket}
                    style={{
                      ...innerCard(tone.bg),
                      border: tone.border,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: tone.text,
                            fontSize: 18,
                            fontWeight: 900,
                            lineHeight: 1.25,
                          }}
                        >
                          {bucketTitle(bucket)}
                        </div>

                        <div style={{ marginTop: 8, ...helperText() }}>
                          {bucketDescription(bucket)}
                        </div>
                      </div>

                      <span style={badge(bucket === "actNow")}>{rows.length}</span>
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                      {rows.length === 0 ? (
                        <div style={innerCard("#FFFFFF")}>
                          <div style={helperText()}>
                            Nothing is currently sitting in this bucket.
                          </div>
                        </div>
                      ) : (
                        rows.map((notice) => (
                          <div key={`${bucket}-${notice.id}`} style={innerCard("#FFFFFF")}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  color: "#0B1F33",
                                  fontWeight: 900,
                                  lineHeight: 1.35,
                                }}
                              >
                                {notice.title}
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {notice.unread ? (
                                  <span style={badge(true)}>Unread</span>
                                ) : (
                                  <span style={badge(false)}>Reviewed</span>
                                )}
                              </div>
                            </div>

                            <div style={{ marginTop: 8, ...helperText() }}>
                              {settings.notificationsMode === "detailed"
                                ? notice.detail
                                : truncateText(notice.detail, 150)}
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
                                type="button"
                                onClick={() => void handlePrimaryNoticeAction(notice)}
                                style={actionBtn("primary")}
                              >
                                {settings.openActionsDirectly ? notice.ctaLabel : "Review here"}
                              </button>

                              <Link to={notice.ctaTo} style={actionBtn("secondary")}>
                                Open page
                              </Link>

                              {notice.unread && /^\d+$/.test(safeStr(notice.id)) ? (
                                <button
                                  type="button"
                                  onClick={() => void markAsRead(safeStr(notice.id))}
                                  style={actionBtn("soft")}
                                >
                                  Mark as read
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <section style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Recent system feed</div>

            <div
              style={{
                marginTop: 10,
                ...helperText(),
              }}
            >
              This is the raw chronological stream under the structured action buckets.
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {rawLoading ? (
                <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                  Loading recent notifications...
                </div>
              ) : rawFeed.length === 0 ? (
                <div style={innerCard("#FCFEFF")}>
                  <div style={helperText()}>
                    No recent system notification is visible right now.
                  </div>
                </div>
              ) : (
                rawFeed.map((item) => (
                  <div key={`feed-${item.id}-${item.createdAt}`} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.title}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={badge(false)}>{item.kind}</span>
                        {item.unread ? (
                          <span style={badge(true)}>Unread</span>
                        ) : (
                          <span style={badge(false)}>Reviewed</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, ...helperText() }}>
                      {settings.notificationsMode === "detailed"
                        ? item.detail
                        : truncateText(item.detail, 120)}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {safeDateTime(item.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section style={pageCard("#F8FBFF")}>
            <div style={sectionLabel()}>Operational reading</div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={softCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Act now
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Someone is waiting directly on your response or decision.
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Due soon
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  This is not yet urgent, but early action prevents drift and repair.
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Watch and wait
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  The step is already moving. Stay aware without overworking it.
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}