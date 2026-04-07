import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createMarketplaceRequest,
  getCurrentClan,
  getMe,
  getSelectedClanId,
  listMarketplaceRequests,
  type MarketplaceRequestItem,
  updateMarketplaceRequestStatus,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceNotice,
  type GuidanceSnapshot,
} from "../lib/guidance";

type ClanItem = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  clan_name?: string | null;
  description?: string | null;
  clan_description?: string | null;
};

type BalanceState = {
  label: string;
  amountText: string;
  noteText: string;
};

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
  ctaTo: string;
};

type NoticeTone = "success" | "error";

const FOLLOW_UP_DAYS = 4;
const STALE_DAYS = 8;

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
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

function primaryBtn(disabled = false): React.CSSProperties {
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
    opacity: disabled ? 0.9 : 1,
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 13,
    color: "#24415C",
    fontWeight: 800,
  };
}

function textInput(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "#FFFFFF",
    color: "#0B1F33",
    fontSize: 14,
    boxSizing: "border-box",
  };
}

function textArea(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 110,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "#FFFFFF",
    color: "#0B1F33",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical" as const,
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

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function getClanIdValue(clan: ClanItem | null | undefined): number {
  return Number(clan?.id || clan?.clan_id || 0);
}

function getClanName(clan: ClanItem | null | undefined): string {
  return safeStr(clan?.name || clan?.clan_name || "Community");
}

function urgencyLabel(value?: string | null): string {
  const v = String(value || "").toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

function getVisibleBalanceState(me: any): BalanceState {
  const candidates: Array<{ value: any; label: string }> = [
    { value: me?.marketplace_balance, label: "Marketplace balance" },
    { value: me?.available_balance, label: "Available balance" },
    { value: me?.wallet_balance, label: "Wallet balance" },
    { value: me?.pool_balance, label: "Pool balance" },
    { value: me?.balance, label: "Balance" },
  ];

  const currency = safeStr(
    me?.marketplace_balance_currency ||
      me?.balance_currency ||
      me?.wallet_currency ||
      me?.currency
  );

  for (const item of candidates) {
    const raw = String(item.value ?? "").trim();
    if (!raw) continue;

    return {
      label: item.label,
      amountText: currency ? `${currency} ${raw}` : raw,
      noteText:
        "This is your personal balance view only. It is tied to your global GMFN ID and shown only to you.",
    };
  }

  return {
    label: "Visible balance",
    amountText: "Pending",
    noteText:
      "A personal balance view will appear here when available. It is tied to your global GMFN ID and shown only to you.",
  };
}

function toArrayRows(raw: any): MarketplaceRequestItem[] {
  if (Array.isArray(raw)) return raw as MarketplaceRequestItem[];
  if (Array.isArray((raw as any)?.items)) {
    return (raw as any).items as MarketplaceRequestItem[];
  }
  return [];
}

function parseDateValue(value: any): number {
  const raw = safeStr(value);
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function getAgeDays(value: any): number {
  const ms = parseDateValue(value);
  if (!ms) return 0;
  return Math.max(0, Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)));
}

function isMineRequest(item: MarketplaceRequestItem, myGmfnId: string): boolean {
  if (item?.mine === true || item?.is_mine === true) return true;
  return safeStr(item?.requester_gmfn_id || "").toUpperCase() === myGmfnId;
}

function sortNewest<T extends MarketplaceRequestItem>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const at = parseDateValue(a?.created_at);
    const bt = parseDateValue(b?.created_at);
    return bt - at;
  });
}

function sortOldest<T extends MarketplaceRequestItem>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const at = parseDateValue(a?.created_at);
    const bt = parseDateValue(b?.created_at);
    return at - bt;
  });
}

function completionLabel(status?: string | null): string {
  const value = safeStr(status).toLowerCase();
  if (value === "fulfilled") return "Fulfilled";
  if (value === "cancelled") return "Cancelled";
  return value ? value : "Closed";
}

function renderNextStepButton(step: NextStepState) {
  if (step.ctaTo.startsWith("#")) {
    return (
      <a href={step.ctaTo} style={primaryBtn(false)}>
        {step.ctaLabel}
      </a>
    );
  }

  return (
    <Link to={step.ctaTo} style={primaryBtn(false)}>
      {step.ctaLabel}
    </Link>
  );
}

function flattenDemandNotices(guidance: GuidanceSnapshot | null): GuidanceNotice[] {
  if (!guidance?.actionInboxSummary) return [];

  const rows = [
    ...(guidance.actionInboxSummary.actNow || []),
    ...(guidance.actionInboxSummary.dueSoon || []),
    ...(guidance.actionInboxSummary.watchAndWait || []),
    ...(guidance.actionInboxSummary.generalUpdates || []),
  ];

  return rows.filter((item) => {
    const kind = safeStr(item.kind).toLowerCase();
    const ctaTo = safeStr(item.ctaTo).toLowerCase();
    const title = safeStr(item.title).toLowerCase();
    const detail = safeStr(item.detail).toLowerCase();

    return (
      ctaTo.includes("/app/demand-box") ||
      kind.includes("demand") ||
      title.includes("demand") ||
      detail.includes("demand")
    );
  });
}

function noticeToneFromKind(
  item: GuidanceNotice
): { bg: string; border: string; text: string } {
  const bucket = safeStr(item.bucket).toLowerCase();

  if (bucket === "actnow") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  if (bucket === "duesoon") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (bucket === "watchandwait") {
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

export default function DemandBoxPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [clan, setClan] = useState<ClanItem | null>(null);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);

  const [openItems, setOpenItems] = useState<MarketplaceRequestItem[]>([]);
  const [fulfilledItems, setFulfilledItems] = useState<MarketplaceRequestItem[]>([]);
  const [cancelledItems, setCancelledItems] = useState<MarketplaceRequestItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [allowTrustCredit, setAllowTrustCredit] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
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
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [notice]);

  async function refreshDemand() {
    setLoading(true);

    try {
      const [
        meRes,
        clanRes,
        openRes,
        fulfilledRes,
        cancelledRes,
        guidanceRes,
      ] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMarketplaceRequests({
          status: "open",
          clan_id: selectedClanId || undefined,
          mine_only: false,
          limit: 60,
        }).catch(() => []),
        listMarketplaceRequests({
          status: "fulfilled",
          clan_id: selectedClanId || undefined,
          mine_only: true,
          limit: 30,
        }).catch(() => []),
        listMarketplaceRequests({
          status: "cancelled",
          clan_id: selectedClanId || undefined,
          mine_only: true,
          limit: 30,
        }).catch(() => []),
        buildGuidanceSnapshot().catch(() => null),
      ]);

      setMe(meRes);
      setClan(clanRes);
      setGuidance(guidanceRes);
      setOpenItems(toArrayRows(openRes));
      setFulfilledItems(toArrayRows(fulfilledRes));
      setCancelledItems(toArrayRows(cancelledRes));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshDemand();
  }, [selectedClanId]);

  const effectiveClanId = useMemo(
    () => Number(selectedClanId || getClanIdValue(clan) || 0),
    [selectedClanId, clan]
  );

  const clanName = useMemo(() => getClanName(clan), [clan]);
  const gmfnId = useMemo(() => safeStr(me?.gmfn_id || "Pending"), [me]);
  const normalizedMyGmfnId = useMemo(
    () => safeStr(me?.gmfn_id || "").toUpperCase(),
    [me]
  );

  const visibleBalance = useMemo(() => getVisibleBalanceState(me), [me]);

  const myOpenItems = useMemo(() => {
    return sortNewest(
      openItems.filter((item) => isMineRequest(item, normalizedMyGmfnId))
    );
  }, [openItems, normalizedMyGmfnId]);

  const communityOpenItems = useMemo(() => {
    const mineIds = new Set(myOpenItems.map((item) => Number(item.id || 0)));
    return sortNewest(
      openItems.filter((item) => !mineIds.has(Number(item.id || 0)))
    );
  }, [openItems, myOpenItems]);

  const activeNeedItems = useMemo(() => {
    return myOpenItems.filter(
      (item) => getAgeDays(item?.created_at) < FOLLOW_UP_DAYS
    );
  }, [myOpenItems]);

  const followUpItems = useMemo(() => {
    return myOpenItems.filter((item) => {
      const age = getAgeDays(item?.created_at);
      return age >= FOLLOW_UP_DAYS && age < STALE_DAYS;
    });
  }, [myOpenItems]);

  const staleItems = useMemo(() => {
    return sortOldest(
      myOpenItems.filter((item) => getAgeDays(item?.created_at) >= STALE_DAYS)
    );
  }, [myOpenItems]);

  const completedItems = useMemo(() => {
    return sortNewest([...fulfilledItems, ...cancelledItems]);
  }, [fulfilledItems, cancelledItems]);

  const demandSignalItems = useMemo(
    () => flattenDemandNotices(guidance),
    [guidance]
  );

  const unreadDemandSignals = useMemo(
    () => demandSignalItems.filter((item) => item.unread).length,
    [demandSignalItems]
  );

  const topDemandSignal = demandSignalItems[0] || null;

  const nextBestStep = useMemo<NextStepState>(() => {
    if (!effectiveClanId) {
      return {
        title: "Select a community before starting demand work",
        detail:
          "Demand Box is still identity-based, but the visible working surface stays tied to the selected community.",
        today: "Choose the community you want to work in.",
        tomorrow:
          "A selected community keeps your demand activity visible and properly placed.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    if (staleItems.length > 0) {
      return {
        title: "Review stale demand first",
        detail:
          staleItems.length === 1
            ? "One of your open demand posts has been sitting too long without clean follow-up."
            : `${staleItems.length} of your open demand posts have gone stale and need a clean decision.`,
        today: "Review the stale demand, update it, fulfill it, or cancel it.",
        tomorrow:
          "Clean follow-up protects trust more than leaving old demand unresolved.",
        ctaLabel: "Open stale demand",
        ctaTo: "#demand-stale",
      };
    }

    if (followUpItems.length > 0) {
      return {
        title: "A demand follow-up is due soon",
        detail:
          followUpItems.length === 1
            ? "One open demand is old enough that it now needs visible follow-up."
            : `${followUpItems.length} open demands now need visible follow-up.`,
        today:
          "Review the open demand and decide whether to keep it active, fulfill it, or close it.",
        tomorrow:
          "Timely follow-up keeps your requests credible and easier to support.",
        ctaLabel: "Review follow-up",
        ctaTo: "#demand-follow-up",
      };
    }

    if (myOpenItems.length === 0) {
      return {
        title: "Create a structured demand post",
        detail:
          "You do not currently have an active demand in this selected community surface.",
        today: "Post only what is real, current, and clear.",
        tomorrow:
          "Clear demand posts make your identity easier to understand and support.",
        ctaLabel: "Create demand",
        ctaTo: "#demand-create",
      };
    }

    return {
      title: "Keep your active demand clean and current",
      detail:
        "Your current open demand is visible. Keep it updated and close it properly when it is fulfilled.",
      today: "Review the active demand and keep the description current.",
      tomorrow:
        "A clear and well-closed demand history protects credibility over time.",
      ctaLabel: "Review active need",
      ctaTo: "#demand-active",
    };
  }, [effectiveClanId, staleItems, followUpItems, myOpenItems]);

  async function handleCreateDemand(event: React.FormEvent) {
    event.preventDefault();

    if (!safeStr(title) || !effectiveClanId) return;

    setSubmitting(true);

    try {
      await createMarketplaceRequest({
        title: safeStr(title),
        description: safeStr(description),
        urgency: safeStr(urgency) || "normal",
        allow_trust_credit: allowTrustCredit,
        clan_id: effectiveClanId,
      });

      setTitle("");
      setDescription("");
      setUrgency("normal");
      setAllowTrustCredit(false);

      await refreshDemand();

      setNotice({
        tone: "success",
        text: "Demand post created successfully.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: safeStr(err?.message) || "Demand post could not be created.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatus(
    requestId: number,
    status: "fulfilled" | "cancelled"
  ) {
    if (!requestId) return;

    setWorkingId(requestId);

    try {
      await updateMarketplaceRequestStatus(requestId, status);
      await refreshDemand();

      setNotice({
        tone: "success",
        text:
          status === "fulfilled"
            ? "Demand marked as fulfilled."
            : "Demand cancelled successfully.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: safeStr(err?.message) || "Demand status could not be updated.",
      });
    } finally {
      setWorkingId(null);
    }
  }

  function renderMyOpenCard(item: MarketplaceRequestItem) {
    const itemId = Number(item.id || 0);
    const working = workingId === itemId;
    const ageDays = getAgeDays(item.created_at);

    return (
      <div key={itemId} style={innerCard("#FCFEFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#0B1F33", fontWeight: 900 }}>
            {safeStr(item.title || "Need")}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>{urgencyLabel(item.urgency)}</span>
            <span style={badge(false)}>
              {ageDays === 0
                ? "Posted today"
                : `${ageDays} day${ageDays === 1 ? "" : "s"} open`}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#5F7287",
            fontSize: 14,
            lineHeight: 1.75,
          }}
        >
          {safeStr(item.description || "No extra detail yet.")}
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={badge(true)}>
            GMFN ID: {safeStr(item.requester_gmfn_id || gmfnId)}
          </span>
          <span style={badge(false)}>
            Community ID: {effectiveClanId || "Not selected"}
          </span>
          {item.allow_trust_credit ? (
            <span style={badge(false)}>Trust credit allowed</span>
          ) : null}
        </div>

        {item.created_at ? (
          <div
            style={{
              marginTop: 8,
              color: "#64748B",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {safeDateTime(item.created_at)}
          </div>
        ) : null}

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
            onClick={() => void handleUpdateStatus(itemId, "fulfilled")}
            style={secondaryBtn(working)}
            disabled={working}
          >
            {working ? "Working..." : "Mark fulfilled"}
          </button>

          <button
            type="button"
            onClick={() => void handleUpdateStatus(itemId, "cancelled")}
            style={secondaryBtn(working)}
            disabled={working}
          >
            {working ? "Working..." : "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  function renderDemandSignalCard(item: GuidanceNotice) {
    const tone = noticeToneFromKind(item);

    return (
      <div
        key={`${item.bucket}-${item.id}`}
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
            {safeStr(item.title || "Demand signal")}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                ...badge(true),
                background: tone.bg,
                color: tone.text,
              }}
            >
              {safeStr(item.bucket)}
            </span>
            {item.unread ? <span style={badge(false)}>Unread</span> : null}
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#5F7287",
            fontSize: 14,
            lineHeight: 1.75,
          }}
        >
          {safeStr(item.detail || "Review this demand signal and continue cleanly.")}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to={item.ctaTo} style={primaryBtn(false)}>
            {safeStr(item.ctaLabel || "Open")}
          </Link>

          <Link to="/app/notifications" style={secondaryBtn(false)}>
            Action Inbox
          </Link>
        </div>
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
        sectionLabel="Demand Box"
        title="Demand Box"
        subtitle="Demand is identity-based. This page belongs to the person making the request, not to an anonymous separate surface."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Community", to: "/app/community" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "My Shop", to: "/app/shop-control" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.15fr) minmax(340px, 0.85fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={sectionLabel()}>Identity-based demand</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              Demand belongs to the individual who is asking.
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.82,
                maxWidth: 820,
              }}
            >
              Demand Box is not Dashboard. It is the working page for identity-based
              requests. Each post stays tied to the person’s global GMFN ID while
              still sitting within the selected community surface.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>
                Community ID: {effectiveClanId || "Not selected"}
              </span>
              <span style={badge(false)}>Your open posts: {myOpenItems.length}</span>
              <span style={badge(false)}>
                Demand signals: {demandSignalItems.length}
              </span>
              {unreadDemandSignals > 0 ? (
                <span style={badge(false)}>Unread signals: {unreadDemandSignals}</span>
              ) : null}
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Your personal view</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  {visibleBalance.label}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {visibleBalance.amountText}
                </div>
              </div>

              <div style={statTile()}>
                <div
                  style={{
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  {visibleBalance.noteText}
                </div>
              </div>

              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Selected surface
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  {effectiveClanId
                    ? `${clanName} (ID ${effectiveClanId})`
                    : "No community selected"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Next best demand step</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 24 : 30,
                lineHeight: 1.15,
              }}
            >
              {nextBestStep.title}
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 820,
              }}
            >
              {nextBestStep.detail}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Today</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 800,
                    lineHeight: 1.65,
                  }}
                >
                  {nextBestStep.today}
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Tomorrow</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 800,
                    lineHeight: 1.65,
                  }}
                >
                  {nextBestStep.tomorrow}
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
              {renderNextStepButton(nextBestStep)}
              <Link to="/app/marketplace" style={secondaryBtn(false)}>
                Marketplace
              </Link>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Demand summary</div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Active need
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {loading ? "…" : activeNeedItems.length}
                </div>
              </div>

              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Needs follow-up
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {loading ? "…" : followUpItems.length}
                </div>
              </div>

              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Stale demand
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {loading ? "…" : staleItems.length}
                </div>
              </div>

              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Completed / closed
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {loading ? "…" : completedItems.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {topDemandSignal ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Demand action signals</div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            These demand-related signals are flowing in from the same guidance and
            action inbox system used by the dashboard and notifications page.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {demandSignalItems.slice(0, 3).map(renderDemandSignalCard)}
          </div>
        </section>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1fr) minmax(320px, 0.92fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section id="demand-create" style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Create a demand post</div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            This post will stay attached to your GMFN ID. It is not anonymous.
          </div>

          {!effectiveClanId ? (
            <div
              style={{
                marginTop: 14,
                color: "#64748B",
                lineHeight: 1.75,
              }}
            >
              Select a community before creating a demand post.
            </div>
          ) : (
            <form
              onSubmit={handleCreateDemand}
              style={{ marginTop: 14, display: "grid", gap: 14 }}
            >
              <div>
                <div style={fieldLabel()}>Title</div>
                <div style={{ marginTop: 6 }}>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What do you need?"
                    style={textInput()}
                  />
                </div>
              </div>

              <div>
                <div style={fieldLabel()}>Description</div>
                <div style={{ marginTop: 6 }}>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Add a clearer explanation of the need"
                    style={textArea()}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <div style={fieldLabel()}>Urgency</div>
                  <div style={{ marginTop: 6 }}>
                    <select
                      value={urgency}
                      onChange={(event) => setUrgency(event.target.value)}
                      style={textInput()}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div style={fieldLabel()}>Trust credit</div>
                  <div style={{ marginTop: 10 }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        color: "#24415C",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allowTrustCredit}
                        onChange={(event) =>
                          setAllowTrustCredit(event.target.checked)
                        }
                      />
                      Allow trust credit for this post
                    </label>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  style={primaryBtn(submitting || !safeStr(title))}
                  disabled={submitting || !safeStr(title)}
                >
                  {submitting ? "Posting..." : "Post demand"}
                </button>

                <Link to="/app/marketplace" style={secondaryBtn(false)}>
                  Marketplace
                </Link>
              </div>
            </form>
          )}
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Demand and trust</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Clear requests help trust
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                A clear title and clean description make your need easier to
                understand and easier to support.
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Follow-up protects credibility
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Leaving old demand open without follow-up weakens clarity. Review
                it, update it, or close it properly.
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Clean closure matters
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                A fulfilled or cancelled demand that is closed cleanly is better
                than an old post that just sits unresolved.
              </div>
            </div>
          </div>
        </section>
      </section>

      <section id="demand-active" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Active need</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              These are your active demand posts that are still fresh and visible.
            </div>
          </div>

          <span style={badge(false)}>
            {loading ? "…" : activeNeedItems.length}
          </span>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {loading ? (
            <div style={{ color: "#64748B" }}>Loading your active demand...</div>
          ) : activeNeedItems.length === 0 ? (
            <div style={{ color: "#64748B", lineHeight: 1.75 }}>
              You do not have a fresh active demand post right now.
            </div>
          ) : (
            activeNeedItems.map((item) => renderMyOpenCard(item))
          )}
        </div>
      </section>

      <section id="demand-follow-up" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Needs follow-up</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              These posts are still open, but they now need visible review before
              they drift.
            </div>
          </div>

          <span style={badge(false)}>
            {loading ? "…" : followUpItems.length}
          </span>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {loading ? (
            <div style={{ color: "#64748B" }}>Loading follow-up demand...</div>
          ) : followUpItems.length === 0 ? (
            <div style={{ color: "#64748B", lineHeight: 1.75 }}>
              No open demand is currently in the follow-up window.
            </div>
          ) : (
            followUpItems.map((item) => renderMyOpenCard(item))
          )}
        </div>
      </section>

      <section id="demand-stale" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Stale demand</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              These open posts have sat too long. Clean follow-up is now the main
              task.
            </div>
          </div>

          <span style={badge(false)}>
            {loading ? "…" : staleItems.length}
          </span>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {loading ? (
            <div style={{ color: "#64748B" }}>Loading stale demand...</div>
          ) : staleItems.length === 0 ? (
            <div style={{ color: "#64748B", lineHeight: 1.75 }}>
              No stale demand is open right now.
            </div>
          ) : (
            staleItems.map((item) => renderMyOpenCard(item))
          )}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1fr) minmax(320px, 0.95fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
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
              <div style={sectionLabel()}>Completed / closed</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                These are your fulfilled or cancelled demand posts.
              </div>
            </div>

            <span style={badge(false)}>
              {loading ? "…" : completedItems.length}
            </span>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ color: "#64748B" }}>
                Loading completed demand...
              </div>
            ) : completedItems.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                No completed or closed demand is listed right now.
              </div>
            ) : (
              completedItems.slice(0, 12).map((item) => (
                <div key={Number(item.id || 0)} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {safeStr(item.title || "Need")}
                    </div>

                    <span style={badge(false)}>
                      {completionLabel(item.status)}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#5F7287",
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}
                  >
                    {safeStr(item.description || "No extra detail yet.")}
                  </div>

                  {item.created_at ? (
                    <div
                      style={{
                        marginTop: 8,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {safeDateTime(item.created_at)}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Visible community demand</div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            This is the lighter preview of other visible demand in the selected
            community surface.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ color: "#64748B" }}>Loading visible demand...</div>
            ) : communityOpenItems.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                No visible community demand is open right now.
              </div>
            ) : (
              communityOpenItems.slice(0, 8).map((item) => (
                <div key={Number(item.id || 0)} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {safeStr(item.title || "Need")}
                    </div>

                    <span style={badge(false)}>
                      {urgencyLabel(item.urgency)}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#5F7287",
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}
                  >
                    {safeStr(item.description || "No extra detail yet.")}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(true)}>
                      GMFN ID: {safeStr(item.requester_gmfn_id || "Not shown")}
                    </span>
                    <span style={badge(false)}>
                      Community ID: {effectiveClanId || "Not selected"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/app/marketplace" style={secondaryBtn(false)}>
              Marketplace
            </Link>
            <Link to="/app/community" style={secondaryBtn(false)}>
              Community Home
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}