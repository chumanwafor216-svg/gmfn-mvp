import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  decideLoanGuarantor,
  getCommunityJoinRequests,
  getLoanGuarantorInbox,
  getMe,
  getMyNotifications,
  getSelectedClanId,
  listMarketplaceRequests,
  markNotificationRead,
} from "../lib/api";

type NoticeItem = {
  id?: number;
  kind?: string;
  title?: string;
  message?: string;
  action_url?: string | null;
  action_label?: string | null;
  is_read?: boolean;
  created_at?: string | null;
};

type JoinRequestItem = {
  id?: number;
  clan_id?: number;
  clan_name?: string | null;
  applicant_email?: string | null;
  status?: string | null;
  approvals?: number;
  required_approvals?: number;
};

type DemandItem = {
  id?: number;
  title?: string;
  description?: string | null;
  status?: string;
  urgency?: string | null;
  requester_name?: string | null;
  requester_nickname?: string | null;
  requester_email?: string | null;
  requester_gmfn_id?: string | null;
  created_at?: string | null;
  allow_trust_credit?: boolean;
};

type LoanGuarantorInboxItem = {
  id?: number;
  loan_id?: number;
  clan_id?: number;
  guarantor_user_id?: number;
  pledge_amount?: string | number | null;
  status?: string | null;
  responded_at?: string | null;
  is_locked?: boolean;
  locked_amount?: string | number | null;
  released_amount?: string | number | null;
};

type FeedbackTone = "success" | "error";

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

function subtleBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
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

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
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

function notificationSourceLabel(kind?: string | null): string {
  const k = String(kind || "").toLowerCase();

  if (k.includes("demand") || k.includes("request")) return "Demand";
  if (k.includes("trust")) return "Trust";
  if (k.includes("approval") || k.includes("join")) return "Approval";
  if (k.includes("spotlight") || k.includes("marketplace")) return "Spotlight";
  if (k.includes("assistant")) return "Assistant";
  if (k.includes("money") || k.includes("pool") || k.includes("loan")) {
    return "Money";
  }

  return "Update";
}

function urgencyLabel(value?: string | null): string {
  const v = String(value || "").toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

function formatPledge(value: any): string {
  const text = safeStr(value);
  return text || "Pledge pending";
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [busyNoticeId, setBusyNoticeId] = useState<number | null>(null);

  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);

  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);
  const [loadingDemand, setLoadingDemand] = useState(false);

  const [loanInboxItems, setLoanInboxItems] = useState<LoanGuarantorInboxItem[]>(
    []
  );
  const [loadingLoanInbox, setLoadingLoanInbox] = useState(false);
  const [busyLoanDecisionKey, setBusyLoanDecisionKey] = useState<string>("");

  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    text: string;
  } | null>(null);

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
    if (!feedback) return;

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function loadLoanInbox() {
    setLoadingLoanInbox(true);
    try {
      const res = await getLoanGuarantorInbox({
        clan_id: selectedClanId || undefined,
        status: "pending",
        limit: 50,
      }).catch(() => ({ items: [] }));

      const rows: LoanGuarantorInboxItem[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.items)
        ? (res as any).items
        : [];

      setLoanInboxItems(rows);
    } finally {
      setLoadingLoanInbox(false);
    }
  }

  useEffect(() => {
    (async () => {
      const meRes = await getMe().catch(() => null);
      setMe(meRes);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingNotices(true);
      try {
        const res = await getMyNotifications(50, false).catch(() => ({
          items: [],
        }));

        const rows: NoticeItem[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : [];

        setNotices(rows);
      } finally {
        setLoadingNotices(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedClanId) {
        setPendingRequests([]);
        return;
      }

      setLoadingJoinRequests(true);
      try {
        const res = await getCommunityJoinRequests(selectedClanId).catch(() => ({
          items: [],
        }));

        const rows: JoinRequestItem[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : [];

        setPendingRequests(
          rows.filter(
            (item) => String(item?.status || "").toLowerCase() === "pending"
          )
        );
      } finally {
        setLoadingJoinRequests(false);
      }
    })();
  }, [selectedClanId]);

  useEffect(() => {
    (async () => {
      setLoadingDemand(true);
      try {
        const rows = await listMarketplaceRequests({
          status: "open",
          mine_only: false,
          limit: 30,
        }).catch(() => []);

        setDemandItems(Array.isArray(rows) ? rows : []);
      } finally {
        setLoadingDemand(false);
      }
    })();
  }, []);

  useEffect(() => {
    void loadLoanInbox();
  }, [selectedClanId]);

  const myGmfnId = safeStr(me?.gmfn_id || "");
  const unreadCount = useMemo(
    () => notices.filter((item) => !item?.is_read).length,
    [notices]
  );

  const filteredNotices = useMemo(() => {
    if (!showUnreadOnly) return notices;
    return notices.filter((item) => !item?.is_read);
  }, [notices, showUnreadOnly]);

  const myDemandItems = useMemo(() => {
    if (!myGmfnId) return [];

    return demandItems.filter(
      (item) => safeStr(item.requester_gmfn_id || "") === myGmfnId
    );
  }, [demandItems, myGmfnId]);

  const joinRequestsLink = selectedClanId
    ? `/app/community/${selectedClanId}/join-requests`
    : "/app/community";

  const actNowCount = loanInboxItems.length + pendingRequests.length;
  const dueSoonCount = unreadCount;
  const watchCount = myDemandItems.length;
  const generalCount = Math.max(notices.length - unreadCount, 0);

  const leadAction = useMemo(() => {
    if (loanInboxItems.length > 0) {
      return {
        title: "Guarantor decisions are waiting",
        text: `${loanInboxItems.length} guarantor request${
          loanInboxItems.length === 1 ? "" : "s"
        } need your response now.`,
        to: "/app/notifications",
        label: "Handle guarantor requests",
      };
    }

    if (pendingRequests.length > 0) {
      return {
        title: "Join approvals are waiting",
        text: `${pendingRequests.length} community join request${
          pendingRequests.length === 1 ? "" : "s"
        } still need review.`,
        to: joinRequestsLink,
        label: "Open join requests",
      };
    }

    if (unreadCount > 0) {
      return {
        title: "Unread updates need review",
        text: `${unreadCount} unread notification${
          unreadCount === 1 ? "" : "s"
        } still waiting.`,
        to: "/app/notifications",
        label: "Review notifications",
      };
    }

    if (myDemandItems.length > 0) {
      return {
        title: "Demand follow-up is visible",
        text: `${myDemandItems.length} of your demand post${
          myDemandItems.length === 1 ? "" : "s"
        } still visible now.`,
        to: "/app/demand-box",
        label: "Open Demand Box",
      };
    }

    return {
      title: "Action inbox is calm",
      text: "No urgent decision is waiting right now. Review updates only as needed.",
      to: "/app/dashboard",
      label: "Back to Dashboard",
    };
  }, [
    loanInboxItems.length,
    pendingRequests.length,
    unreadCount,
    myDemandItems.length,
    joinRequestsLink,
  ]);

  async function handleMarkRead(notice: NoticeItem) {
    const id = Number(notice?.id || 0);
    if (!id) return;

    setBusyNoticeId(id);
    try {
      await markNotificationRead(id).catch(() => null);

      setNotices((prev) =>
        prev.map((item) =>
          Number(item?.id || 0) === id ? { ...item, is_read: true } : item
        )
      );
    } finally {
      setBusyNoticeId(null);
    }
  }

  function handleOpenAction(notice: NoticeItem) {
    const actionUrl = safeStr(notice?.action_url || "");
    if (actionUrl) {
      navigate(actionUrl);
      return;
    }

    const kind = safeStr(notice?.kind || "").toLowerCase();

    if (kind.includes("join") || kind.includes("approval")) {
      navigate(joinRequestsLink);
      return;
    }

    if (kind.includes("demand") || kind.includes("request")) {
      navigate("/app/demand-box");
      return;
    }

    if (kind.includes("trust")) {
      navigate("/app/trust");
      return;
    }

    if (kind.includes("spotlight") || kind.includes("marketplace")) {
      navigate("/app/marketplace");
      return;
    }

    if (kind.includes("loan") || kind.includes("money")) {
      navigate("/app/loans");
      return;
    }

    navigate("/app/dashboard");
  }

  async function handleLoanDecision(
    item: LoanGuarantorInboxItem,
    status: "approved" | "declined"
  ) {
    const loanId = Number(item?.loan_id || 0);
    const guarantorId = Number(item?.id || 0);

    if (!loanId || !guarantorId) {
      setFeedback({
        tone: "error",
        text: "This loan request is missing the IDs needed to continue.",
      });
      return;
    }

    const key = `${loanId}-${guarantorId}-${status}`;
    setBusyLoanDecisionKey(key);

    try {
      await decideLoanGuarantor(loanId, guarantorId, {
        status,
        clan_id: selectedClanId || undefined,
      });

      await loadLoanInbox();

      setFeedback({
        tone: "success",
        text:
          status === "approved"
            ? "Loan guarantor request approved successfully."
            : "Loan guarantor request declined successfully.",
      });
    } catch (err: any) {
      setFeedback({
        tone: "error",
        text:
          safeStr(err?.message) ||
          "Loan guarantor decision could not be completed.",
      });
    } finally {
      setBusyLoanDecisionKey("");
    }
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
        title="Notifications"
        subtitle="This is the detail action surface behind the dashboard summaries. Work from here when a decision, response, or follow-up is needed."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Loans & Support", to: "/app/loans" },
          { label: "Community", to: "/app/community" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {feedback ? (
        <div
          style={{
            ...softCard(feedback.tone === "success" ? "#F3FBF5" : "#FEF2F2"),
            color: feedback.tone === "success" ? "#166534" : "#991B1B",
            border:
              feedback.tone === "success"
                ? "1px solid rgba(34,197,94,0.16)"
                : "1px solid rgba(239,68,68,0.16)",
            fontWeight: 800,
          }}
        >
          {feedback.text}
        </div>
      ) : null}

      <section style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={sectionLabel()}>Action inbox summary</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              {leadAction.title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.82,
                maxWidth: 780,
              }}
            >
              {leadAction.text}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Act now: {actNowCount}</span>
              <span style={badge(false)}>Due soon: {dueSoonCount}</span>
              <span style={badge(false)}>Watch: {watchCount}</span>
              <span style={badge(false)}>General: {generalCount}</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <Link to={leadAction.to} style={primaryBtn(false)}>
                {leadAction.label}
              </Link>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Related action pages</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Guarantor decisions
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {loadingLoanInbox ? "…" : loanInboxItems.length}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Link to="/app/notifications" style={secondaryBtn()}>
                    Stay on this page
                  </Link>
                </div>
              </div>

              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Join requests
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {loadingJoinRequests ? "…" : pendingRequests.length}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Link to={joinRequestsLink} style={secondaryBtn()}>
                    Open join requests
                  </Link>
                </div>
              </div>

              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Demand follow-up
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {loadingDemand ? "…" : myDemandItems.length}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Link to="/app/demand-box" style={secondaryBtn()}>
                    Open Demand Box
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Guarantor requests waiting for you</div>

          <div style={{ marginTop: 10, ...helperText() }}>
            Approve or decline here so the borrower’s loan path can continue
            without confusion.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {loadingLoanInbox ? (
              <div style={{ color: "#64748B" }}>
                Loading loan guarantor requests...
              </div>
            ) : loanInboxItems.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                No guarantor request is waiting for your response right now.
              </div>
            ) : (
              loanInboxItems.map((item, index) => {
                const itemId = Number(item?.id || 0);
                const loanId = Number(item?.loan_id || 0);
                const approveKey = `${loanId}-${itemId}-approved`;
                const declineKey = `${loanId}-${itemId}-declined`;
                const busyApprove = busyLoanDecisionKey === approveKey;
                const busyDecline = busyLoanDecisionKey === declineKey;

                return (
                  <div key={itemId || index} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                        Loan #{loanId || "—"}
                      </div>

                      <span style={badge(true)}>
                        Pledge: {formatPledge(item?.pledge_amount)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(false)}>
                        Status: {safeStr(item?.status || "pending")}
                      </span>

                      {item?.is_locked ? (
                        <span style={badge(false)}>
                          Locked: {formatPledge(item?.locked_amount)}
                        </span>
                      ) : null}

                      {item?.responded_at ? (
                        <span style={badge(false)}>
                          Responded: {safeDateTime(item.responded_at)}
                        </span>
                      ) : null}
                    </div>

                    <div style={{ marginTop: 14, ...helperText() }}>
                      Respond clearly. Approve only when you want to stand behind
                      this request. Decline cleanly when you do not.
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
                        type="button"
                        onClick={() => handleLoanDecision(item, "approved")}
                        disabled={busyApprove || busyDecline}
                        style={primaryBtn(busyApprove || busyDecline)}
                      >
                        {busyApprove ? "Approving..." : "Approve"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoanDecision(item, "declined")}
                        disabled={busyApprove || busyDecline}
                        style={subtleBtn(busyApprove || busyDecline)}
                      >
                        {busyDecline ? "Declining..." : "Decline"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
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
                <div style={sectionLabel()}>Notification list</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Review general updates in a calmer list without mixing them
                  into urgent guarantor work.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowUnreadOnly((prev) => !prev)}
                style={secondaryBtn()}
              >
                {showUnreadOnly ? "Show all" : "Show unread only"}
              </button>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {loadingNotices ? (
                <div style={{ color: "#64748B" }}>Loading notifications...</div>
              ) : filteredNotices.length === 0 ? (
                <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                  {showUnreadOnly
                    ? "No unread notification is waiting right now."
                    : "No notification is available right now."}
                </div>
              ) : (
                filteredNotices.map((notice, index) => {
                  const noticeId = Number(notice?.id || 0);
                  const isBusy = busyNoticeId === noticeId;
                  const unread = !notice?.is_read;

                  return (
                    <div
                      key={noticeId || index}
                      style={{
                        ...innerCard(unread ? "#F8FBFF" : "#FFFFFF"),
                        border: unread
                          ? "1px solid rgba(11,99,209,0.14)"
                          : "1px solid rgba(11,31,51,0.08)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badge(unread)}>
                            {notificationSourceLabel(notice.kind)}
                          </span>
                          {unread ? <span style={badge(false)}>Unread</span> : null}
                        </div>

                        {notice?.created_at ? (
                          <div
                            style={{
                              color: "#64748B",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {safeDateTime(notice.created_at)}
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          color: "#0B1F33",
                          fontSize: 17,
                          fontWeight: 900,
                          lineHeight: 1.4,
                        }}
                      >
                        {safeStr(notice.title || "Update")}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#5F7287",
                          fontSize: 14,
                          lineHeight: 1.75,
                        }}
                      >
                        {safeStr(notice.message || "No extra detail is available.")}
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
                          type="button"
                          onClick={() => handleOpenAction(notice)}
                          style={primaryBtn(false)}
                        >
                          {safeStr(notice.action_label || "Open")}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMarkRead(notice)}
                          style={subtleBtn(!unread || isBusy || !noticeId)}
                          disabled={!unread || isBusy || !noticeId}
                        >
                          {isBusy ? "Working..." : "Mark as read"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Demand preview</div>

            <div style={{ marginTop: 10, ...helperText() }}>
              These are your own open demand posts. The full work continues
              inside Demand Box.
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Your demand posts: {myDemandItems.length}</span>
              <span style={badge(false)}>Visible in follow-up</span>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {loadingDemand ? (
                <div style={{ color: "#64748B" }}>Loading demand preview...</div>
              ) : myDemandItems.length === 0 ? (
                <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                  You do not have any open demand post right now.
                </div>
              ) : (
                myDemandItems.slice(0, 3).map((item, index) => (
                  <div key={item.id || index} style={innerCard("#FCFEFF")}>
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

                      <span style={badge(false)}>{urgencyLabel(item.urgency)}</span>
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
              <Link to="/app/demand-box" style={primaryBtn(false)}>
                Open Demand Box
              </Link>
              <Link to="/app/marketplace" style={secondaryBtn()}>
                Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}