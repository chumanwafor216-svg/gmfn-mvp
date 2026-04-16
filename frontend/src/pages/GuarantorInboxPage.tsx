import React, { useEffect, useMemo, useState } from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getCurrentClan,
  getLoanGuarantorInbox,
  getMe,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

type FilterKey = "pending" | "approved" | "declined" | "all";

type InboxRow = {
  id?: number;
  loanId?: number;
  clanId?: number;
  borrowerDisplay?: string | null;
  borrowerEmail?: string | null;
  borrowerUserId?: number | null;
  amount?: string | number | null;
  pledgeAmount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  purpose?: string | null;
  guarantorUserId?: number | null;
  lockedAmount?: string | number | null;
  releasedAmount?: string | number | null;
  isLocked?: boolean | null;
  note?: string | null;
};

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
  community_code?: string | null;
  role?: string | null;
  member_role?: string | null;
  membership_role?: string | null;
  participant_role?: string | null;
};

type MeLite = {
  gmfn_id?: string | null;
  display_name?: string | null;
  nickname?: string | null;
  name?: string | null;
  first_name?: string | null;
  email?: string | null;
};

type CollapseState = {
  overview: boolean;
  queue: boolean;
  guidance: boolean;
  routes: boolean;
};

const GUARANTOR_INBOX_UI_STORAGE_KEY = "gmfn.guarantorInbox.sections.v1";

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

function positiveNumber(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function moneyNumber(x: any): number {
  const raw = safeStr(x).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  return moneyNumber(x).toFixed(2);
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
  if (!raw) return "Not available yet";
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

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 104,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(11,99,209,0.18)"
      : "1px solid rgba(11,31,51,0.08)",
    background: primary ? "#F7FAFF" : "#FFFFFF",
    padding: 16,
    textDecoration: "none",
    boxShadow: primary ? "0 10px 24px rgba(11,99,209,0.05)" : "none",
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
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
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
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
  };
}

function filterBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: active ? "1px solid #BFDBFE" : "1px solid rgba(11,31,51,0.10)",
    background: active ? "#EFF6FF" : "#FFFFFF",
    color: active ? "#1D4ED8" : "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 14,
    whiteSpace: "nowrap",
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
    queue: false,
    guidance: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    queue: Boolean(raw?.queue ?? base.queue),
    guidance: Boolean(raw?.guidance ?? base.guidance),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function getCommunityName(clan: CommunityLite | null): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function getCommunityId(clan: CommunityLite | null): string {
  return safeStr(clan?.community_code || "");
}

function getCommunityRole(clan: CommunityLite | null): string {
  return firstTruthy(
    clan?.role,
    clan?.member_role,
    clan?.membership_role,
    clan?.participant_role
  );
}

function getMemberName(me: MeLite | null): string {
  return (
    firstTruthy(
      me?.display_name,
      me?.nickname,
      me?.name,
      me?.first_name,
      me?.email
    ) || "Member"
  );
}

function normalizeInboxRow(raw: any): InboxRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.request || raw?.guarantor_request || raw;

  const id = positiveNumber(src?.id);
  const loanId = positiveNumber(src?.loan_id);

  if (!id && !loanId) return null;

  return {
    id: id || undefined,
    loanId: loanId || undefined,
    clanId: positiveNumber(src?.clan_id || src?.community_id) || undefined,
    borrowerDisplay: firstTruthy(
      src?.borrower_display,
      src?.borrower_name,
      src?.member_name,
      src?.requester_name,
      src?.display_name
    ) || null,
    borrowerEmail: firstTruthy(src?.borrower_email, src?.email) || null,
    borrowerUserId: positiveNumber(src?.borrower_user_id) || null,
    amount:
      src?.amount ??
      src?.loan_amount ??
      src?.requested_amount ??
      src?.outstanding_amount ??
      null,
    pledgeAmount: src?.pledge_amount ?? null,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN") || null,
    status: firstTruthy(src?.status, "pending") || null,
    createdAt: firstTruthy(src?.created_at, src?.requested_at) || null,
    expiresAt: firstTruthy(src?.expires_at, src?.deadline_at) || null,
    purpose: firstTruthy(src?.purpose, src?.note, src?.description) || null,
    guarantorUserId: positiveNumber(src?.guarantor_user_id) || null,
    lockedAmount:
      src?.locked_amount ??
      src?.weight_amount ??
      null,
    releasedAmount: src?.released_amount ?? null,
    isLocked:
      typeof src?.is_locked === "boolean" ? Boolean(src.is_locked) : null,
    note: firstTruthy(src?.note, src?.detail) || null,
  };
}

function statusPill(status: string): React.CSSProperties {
  const s = safeStr(status).toLowerCase();

  if (s.includes("approved")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      fontWeight: 1000,
      fontSize: 12,
      whiteSpace: "nowrap",
    };
  }

  if (s.includes("declined")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      fontWeight: 1000,
      fontSize: 12,
      whiteSpace: "nowrap",
    };
  }

  return {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    color: "#92400E",
    fontWeight: 1000,
    fontSize: 12,
    whiteSpace: "nowrap",
  };
}

export default function GuarantorInboxPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(GUARANTOR_INBOX_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [filter, setFilter] = useState<FilterKey>("pending");
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [me, setMe] = useState<MeLite | null>(null);

  const [pendingRows, setPendingRows] = useState<InboxRow[]>([]);
  const [approvedRows, setApprovedRows] = useState<InboxRow[]>([]);
  const [declinedRows, setDeclinedRows] = useState<InboxRow[]>([]);

  async function loadInbox() {
    setLoading(true);

    try {
      const [pendingRes, approvedRes, declinedRes, clanRes, meRes] = await Promise.all([
        getLoanGuarantorInbox({
          clan_id: selectedClanId || undefined,
          status: "pending",
          limit: 50,
        }).catch(() => ({ items: [] })),
        getLoanGuarantorInbox({
          clan_id: selectedClanId || undefined,
          status: "approved",
          limit: 50,
        }).catch(() => ({ items: [] })),
        getLoanGuarantorInbox({
          clan_id: selectedClanId || undefined,
          status: "declined",
          limit: 50,
        }).catch(() => ({ items: [] })),
        getCurrentClan().catch(() => null),
        getMe().catch(() => null),
      ]);

      setPendingRows(
        rowsOf<any>(pendingRes)
          .map((row) => normalizeInboxRow(row))
          .filter(Boolean) as InboxRow[]
      );
      setApprovedRows(
        rowsOf<any>(approvedRes)
          .map((row) => normalizeInboxRow(row))
          .filter(Boolean) as InboxRow[]
      );
      setDeclinedRows(
        rowsOf<any>(declinedRes)
          .map((row) => normalizeInboxRow(row))
          .filter(Boolean) as InboxRow[]
      );

      setCommunity(clanRes || null);
      setMe(meRes || null);
    } finally {
      setLoading(false);
    }
  }

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
    writeLocalJSON(GUARANTOR_INBOX_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    void loadInbox();
  }, [selectedClanId]);

  const allRows = useMemo(() => {
    const rows = [...pendingRows, ...approvedRows, ...declinedRows];
    rows.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    return rows;
  }, [pendingRows, approvedRows, declinedRows]);

  const visibleRows = useMemo(() => {
    if (filter === "pending") return pendingRows;
    if (filter === "approved") return approvedRows;
    if (filter === "declined") return declinedRows;
    return allRows;
  }, [filter, pendingRows, approvedRows, declinedRows, allRows]);

  const counts = useMemo(
    () => ({
      pending: pendingRows.length,
      approved: approvedRows.length,
      declined: declinedRows.length,
      all: allRows.length,
    }),
    [pendingRows.length, approvedRows.length, declinedRows.length, allRows.length]
  );

  const memberName = useMemo(() => getMemberName(me), [me]);
  const gmfnId = useMemo(() => firstTruthy(me?.gmfn_id, "Not available yet"), [me]);

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const communityPublicId = useMemo(() => {
    return getCommunityId(community) || "Not available yet";
  }, [community]);

  const memberRole = useMemo(() => {
    return getCommunityRole(community);
  }, [community]);

  const nextStep = useMemo<{
    title: string;
    detail: string;
    ctaLabel: string;
    ctaTo: string;
  }>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first.",
        detail:
          "Incoming guarantor requests make more sense when they stay tied to your current community.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    if (counts.pending > 0) {
      return {
        title:
          counts.pending === 1
            ? "One guarantor request is waiting on you."
            : `${counts.pending} guarantor requests are waiting on you.`,
        detail:
          "This queue is only the intake page. Once you choose to continue, the deeper workbench should take over instead of leaving you halfway between routes.",
        ctaLabel: "Open Loan Workbench",
        ctaTo: "/app/loan-workbench",
      };
    }

    if (counts.approved > 0) {
      return {
        title: "Approved guarantor responses are visible.",
        detail:
          "The next move is usually to continue the broader support flow rather than staying only in the queue.",
        ctaLabel: "Return to Loans & Support",
        ctaTo: "/app/loans",
      };
    }

    return {
      title: "No pending guarantor request is currently shown.",
      detail:
        "That means nothing is directly waiting on your guarantor response inside this current queue view.",
      ctaLabel: "Open Loans & Support",
      ctaTo: "/app/loans",
    };
  }, [selectedClanId, counts.pending, counts.approved]);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function copyQueueSummary() {
    const text = [
      `Community: ${selectedCommunityLabel}`,
      `Community ID: ${communityPublicId}`,
      `Member: ${memberName}`,
      `GMFN ID: ${gmfnId}`,
      memberRole ? `Role: ${memberRole}` : "",
      `Pending: ${counts.pending}`,
      `Approved: ${counts.approved}`,
      `Declined: ${counts.declined}`,
      `Visible: ${counts.all}`,
      `Filter: ${filter}`,
    ]
      .filter(Boolean)
      .join("\n");

    safeCopy(text);
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40 }}>
      <PageTopNav
        sectionLabel="Incoming Guarantor Requests"
        title="Incoming Guarantor Requests"
        subtitle="Review requests that need your guarantor response in your current community."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
        nextLinks={[
          { label: "Loan Workbench", to: "/app/loan-workbench" },
          { label: "Loan Suggestions", to: "/app/loan-suggestions" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Money Out", to: "/app/withdrawal-instructions" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
      />

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
            <div style={sectionLabel()}>Fixed queue context</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#F8FBFF",
                lineHeight: 1.12,
              }}
            >
              {nextStep.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
              This incoming queue gathers guarantor requests. Once
              a request is chosen, the deeper support workbench should take over
              instead of leaving the person inside a loose queue.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>Community</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  {selectedCommunityLabel}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Community ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {communityPublicId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>GMFN ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {gmfnId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Current step</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  Incoming guarantor requests
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Pending: {counts.pending}</span>
              <span style={badge(false)}>Approved: {counts.approved}</span>
              <span style={badge(false)}>Declined: {counts.declined}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <OriginLink to={nextStep.ctaTo} style={primaryBtn(false)}>
                {nextStep.ctaLabel}
              </OriginLink>

              <button type="button" onClick={copyQueueSummary} style={secondaryBtn(false)}>
                Copy Queue Summary
              </button>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current reading</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.35,
              }}
            >
              {nextStep.detail}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Pending now: {counts.pending}</span>
              <span style={badge(false)}>Visible now: {visibleRows.length}</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
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
            <div style={sectionLabel()}>Queue overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of the visible guarantor queue.
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
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Pending</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {counts.pending}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Approved</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {counts.approved}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Declined</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {counts.declined}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Visible total</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {counts.all}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
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
            <div style={sectionLabel()}>Filter and queue</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Filter the queue, then continue into the page you need.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("queue")}
            style={collapseToggle()}
          >
            {collapsed.queue ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.queue ? (
          <>
            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["pending", "approved", "declined", "all"] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setFilter(x)}
                  style={filterBtn(filter === x)}
                >
                  {x[0].toUpperCase() + x.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {loading ? (
                <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                  Loading queue...
                </div>
              ) : visibleRows.length === 0 ? (
                <div style={innerCard("#FFFFFF")}>
                  <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
                    No requests are visible for this filter.
                  </div>
                </div>
              ) : (
                visibleRows.map((row, i) => {
                  const status = safeStr(row.status || "pending");
                  const amountText = safeStr(row.amount)
                    ? `${fmtMoney(row.amount)} ${safeStr(row.currency || "NGN")}`
                    : "";
                  const pledgeText = safeStr(row.pledgeAmount)
                    ? `${fmtMoney(row.pledgeAmount)} ${safeStr(row.currency || "NGN")}`
                    : "";

                  return (
                    <div key={`${row.id || row.loanId || i}`} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 1000,
                              color: "#0B1F33",
                              fontSize: 18,
                            }}
                          >
                            {firstTruthy(
                              row.borrowerDisplay,
                              row.borrowerEmail,
                              row.borrowerUserId ? `Borrower ${row.borrowerUserId}` : "",
                              "Member request"
                            )}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              color: "#6B7A88",
                              fontSize: 13,
                              lineHeight: 1.7,
                            }}
                          >
                            {[
                              row.loanId ? `Loan #${row.loanId}` : "",
                              row.createdAt ? safeDateTime(row.createdAt) : "",
                            ]
                              .filter(Boolean)
                              .join(" | ")}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <span style={statusPill(status)}>{status}</span>
                          {pledgeText ? (
                            <span style={badge(true)}>Pledge: {pledgeText}</span>
                          ) : null}
                          {amountText ? (
                            <span style={badge(false)}>Amount: {amountText}</span>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ marginTop: 12, ...helperText() }}>
                        Purpose: {safeStr(row.purpose || row.note || "Not available yet")}
                      </div>

                      <div style={{ marginTop: 8, ...helperText() }}>
                        Response window: {safeStr(row.expiresAt || "Not visible yet")}
                      </div>

                      {(Boolean(row.isLocked) || safeStr(row.lockedAmount) || safeStr(row.releasedAmount)) ? (
                        <div style={{ marginTop: 8, ...helperText() }}>
                          {[
                            `Locked: ${String(Boolean(row.isLocked))}`,
                            safeStr(row.lockedAmount) ? `Locked amount: ${safeStr(row.lockedAmount)}` : "",
                            safeStr(row.releasedAmount) ? `Released amount: ${safeStr(row.releasedAmount)}` : "",
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </div>
                      ) : null}

                      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <OriginLink to="/app/loan-workbench" style={secondaryBtn(false)}>
                          Open workbench
                        </OriginLink>
                        <OriginLink to="/app/loans" style={secondaryBtn(false)}>
                          Loans & Support
                        </OriginLink>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : null}
      </section>

      <section style={{ ...pageCard("#F8FBFF"), marginTop: 18 }}>
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
            <div style={sectionLabel()}>Guidance</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the meaning of this queue clear.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("guidance")}
            style={collapseToggle()}
          >
            {collapsed.guidance ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.guidance ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                What this queue is for
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>
                This queue is where incoming guarantor decisions first become visible.
                It is not the final step. Once you choose a request,
                the deeper workbench should take over.
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                What to avoid
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>
                Do not leave the person stuck only in the queue. The queue
                should lead into the right support flow, then return to the broader
                app only after the current decision is properly handled.
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
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
            <div style={sectionLabel()}>Next routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from queue reading into the next page you need.
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
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <OriginLink to={nextStep.ctaTo} style={routeTile(true)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {nextStep.ctaLabel}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {nextStep.detail}
              </div>
            </OriginLink>

            <OriginLink to="/app/loan-workbench" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loan Workbench
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when you are continuing the deeper support decision.
              </div>
            </OriginLink>

            <OriginLink to="/app/loan-suggestions" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loan Suggestions
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the next question is candidate fit rather than queue state.
              </div>
            </OriginLink>

            <OriginLink to="/app/loans" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loans & Support
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the broader support overview.
              </div>
            </OriginLink>

            <OriginLink to="/app/marketplace" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Marketplace
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to Marketplace only after the current queue reading is complete.
              </div>
            </OriginLink>

            <OriginLink to="/app/notifications" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Action Inbox
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the broader notification picture matters around the support decision.
              </div>
            </OriginLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}


