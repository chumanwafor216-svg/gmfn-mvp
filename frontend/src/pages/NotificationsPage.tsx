import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyNotifications } from "../lib/api";

type NoticeItem = {
  id?: number;
  kind?: string | null;
  title?: string | null;
  message?: string | null;
  action_url?: string | null;
  action_label?: string | null;
  is_read?: boolean;
  created_at?: string | null;
};

type NotificationGroup = {
  key: string;
  title: string;
  items: NoticeItem[];
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 26,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow: "0 16px 36px rgba(15,23,42,0.045)",
    position: "relative",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 18,
    boxShadow: "0 12px 28px rgba(15,23,42,0.04)",
    position: "relative",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(15,23,42,0.06)",
    background: bg,
    padding: 16,
    boxShadow: "0 8px 18px rgba(15,23,42,0.035)",
    position: "relative",
  };
}

function smallBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary
      ? "linear-gradient(180deg, #1677E6 0%, #0B63D1 100%)"
      : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textDecoration: "none",
    cursor: "pointer",
    boxShadow: primary ? "0 10px 22px rgba(11,99,209,0.14)" : "none",
  };
}

function topStrip(): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FBFF",
    padding: "14px 18px",
    boxShadow: "0 10px 24px rgba(15,23,42,0.035)",
    position: "relative",
    overflow: "hidden",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
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

function safeDate(x: any): Date | null {
  const raw = String(x || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function notificationSourceLabel(kind?: string | null): string {
  const k = String(kind || "").toLowerCase();

  if (k.includes("approval") || k.includes("join")) return "Approval";
  if (k.includes("demand") || k.includes("request")) return "Demand";
  if (k.includes("trust")) return "Trust";
  if (k.includes("spotlight") || k.includes("marketplace")) return "Marketplace";
  if (k.includes("assistant")) return "Assistant";
  if (k.includes("money") || k.includes("pool") || k.includes("loan")) {
    return "Money";
  }

  return "Update";
}

function fallbackActionUrl(kind?: string | null): string {
  const k = String(kind || "").toLowerCase();

  if (k.includes("approval") || k.includes("join")) return "/app/community";
  if (k.includes("demand") || k.includes("request")) return "/app/demand-box";
  if (k.includes("trust")) return "/app/trust";
  if (k.includes("money") || k.includes("pool") || k.includes("loan")) {
    return "/app/loans";
  }
  if (k.includes("spotlight") || k.includes("marketplace")) {
    return "/app/marketplace";
  }
  if (k.includes("assistant")) return "/app/dashboard";

  return "/app/dashboard";
}

function fallbackActionLabel(kind?: string | null): string {
  const k = String(kind || "").toLowerCase();

  if (k.includes("approval") || k.includes("join")) return "Open Community Home";
  if (k.includes("demand") || k.includes("request")) return "Open Demand Box";
  if (k.includes("trust")) return "Open Trust";
  if (k.includes("money") || k.includes("pool") || k.includes("loan")) {
    return "Open Loans & Support";
  }
  if (k.includes("spotlight") || k.includes("marketplace")) {
    return "Open Marketplace";
  }
  if (k.includes("assistant")) return "Open Dashboard";

  return "Open";
}

function sourceTone(label: string) {
  if (label === "Demand") {
    return {
      bg: "rgba(11,99,209,0.08)",
      border: "1px solid rgba(11,99,209,0.18)",
      text: "#1D4ED8",
    };
  }
  if (label === "Trust") {
    return {
      bg: "rgba(5,150,105,0.08)",
      border: "1px solid rgba(5,150,105,0.18)",
      text: "#047857",
    };
  }
  if (label === "Approval") {
    return {
      bg: "rgba(234,88,12,0.08)",
      border: "1px solid rgba(234,88,12,0.18)",
      text: "#C2410C",
    };
  }
  if (label === "Money") {
    return {
      bg: "rgba(202,138,4,0.08)",
      border: "1px solid rgba(202,138,4,0.18)",
      text: "#A16207",
    };
  }
  if (label === "Marketplace") {
    return {
      bg: "rgba(109,40,217,0.08)",
      border: "1px solid rgba(109,40,217,0.18)",
      text: "#6D28D9",
    };
  }
  if (label === "Assistant") {
    return {
      bg: "rgba(6,182,212,0.08)",
      border: "1px solid rgba(6,182,212,0.18)",
      text: "#0E7490",
    };
  }
  return {
    bg: "rgba(71,85,105,0.08)",
    border: "1px solid rgba(71,85,105,0.16)",
    text: "#334155",
  };
}

function groupNotifications(items: NoticeItem[]): NotificationGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  const groups: NotificationGroup[] = [
    { key: "today", title: "Today", items: [] },
    { key: "yesterday", title: "Yesterday", items: [] },
    { key: "earlier", title: "Earlier", items: [] },
  ];

  items.forEach((item) => {
    const d = safeDate(item.created_at);

    if (!d) {
      groups[2].items.push(item);
      return;
    }

    if (d >= todayStart) {
      groups[0].items.push(item);
      return;
    }

    if (d >= yesterdayStart) {
      groups[1].items.push(item);
      return;
    }

    groups[2].items.push(item);
  });

  return groups.filter((group) => group.items.length > 0);
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getMyNotifications(100, showUnreadOnly).catch(() => ({
          items: [],
        }));
        const rows: NoticeItem[] = Array.isArray(res?.items) ? res.items : [];
        setItems(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [showUnreadOnly, refreshTick]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item?.is_read).length,
    [items]
  );

  const todayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      const d = safeDate(item.created_at);
      return !!d && d >= todayStart;
    }).length;
  }, [items]);

  const grouped = useMemo(() => groupNotifications(items), [items]);

  function openDestination(destination: string) {
    if (!destination) return;

    if (isExternalUrl(destination)) {
      window.open(destination, "_blank", "noreferrer");
      return;
    }

    navigate(destination);
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 30,
        display: "grid",
        gap: 18,
      }}
    >
      <div
        style={{
          ...topStrip(),
          marginTop: 18,
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -26,
            top: -24,
            width: 110,
            height: 110,
            borderRadius: 999,
            background: "rgba(11,99,209,0.05)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={sectionLabel()}>Notifications centre</div>

          <div
            style={{
              marginTop: 8,
              color: "#0B1F33",
              fontWeight: 1000,
              fontSize: 24,
              lineHeight: 1.2,
            }}
          >
            Actionable updates in one place
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#5A6B7C",
              fontSize: 14,
              lineHeight: 1.8,
              maxWidth: 760,
            }}
          >
            Every notification should help you understand what happened and move
            you directly to the next useful step.
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 2 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div>
            <div style={sectionLabel()}>Summary</div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  minWidth: 150,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    color: "#5A6B7C",
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: 0.35,
                  }}
                >
                  Total
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 1000,
                    lineHeight: 1,
                  }}
                >
                  {items.length}
                </div>
              </div>

              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  minWidth: 150,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    color: "#5A6B7C",
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: 0.35,
                  }}
                >
                  Unread
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 1000,
                    lineHeight: 1,
                  }}
                >
                  {unreadCount}
                </div>
              </div>

              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  minWidth: 150,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    color: "#5A6B7C",
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: 0.35,
                  }}
                >
                  Today
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 1000,
                    lineHeight: 1,
                  }}
                >
                  {todayCount}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              style={showUnreadOnly ? smallBtn(true) : smallBtn(false)}
              onClick={() => setShowUnreadOnly((v) => !v)}
            >
              {showUnreadOnly ? "Showing unread only" : "Show unread only"}
            </button>

            <button
              type="button"
              style={smallBtn(false)}
              onClick={() => setRefreshTick((v) => v + 1)}
            >
              Refresh
            </button>

            <Link to="/app/dashboard" style={smallBtn(false)}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 2 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/community" style={smallBtn(false)}>
            Community Home
          </Link>
          <Link to="/app/demand-box" style={smallBtn(false)}>
            Demand Box
          </Link>
          <Link to="/app/trust" style={smallBtn(false)}>
            Trust
          </Link>
          <Link to="/app/marketplace" style={smallBtn(false)}>
            Marketplace
          </Link>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 2 }}>
        <div style={sectionLabel()}>Recent notifications</div>

        {loading ? (
          <div style={{ marginTop: 16, color: "#5A6B7C", lineHeight: 1.8 }}>
            Loading your notifications...
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                ...softCard("#FFFFFF"),
                maxWidth: 760,
              }}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 20,
                }}
              >
                No notifications right now
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#5A6B7C",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                When trust changes, approvals, demand activity, money updates,
                or marketplace activity happen, they will appear here.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Link to="/app/dashboard" style={smallBtn(true)}>
                  Open Dashboard
                </Link>

                <Link to="/app/demand-box" style={smallBtn(false)}>
                  Open Demand Box
                </Link>

                <Link to="/app/community" style={smallBtn(false)}>
                  Open Community Home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 18 }}>
            {grouped.map((group) => (
              <div key={group.key} style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 1000,
                    fontSize: 16,
                  }}
                >
                  {group.title}
                </div>

                {group.items.map((item, idx) => {
                  const source = notificationSourceLabel(item.kind);
                  const tone = sourceTone(source);
                  const destination =
                    safeStr(item.action_url) || fallbackActionUrl(item.kind);
                  const actionLabel =
                    safeStr(item.action_label) || fallbackActionLabel(item.kind);

                  return (
                    <div
                      key={`${item.id || "notice"}-${idx}`}
                      style={{
                        ...innerCard("#FFFFFF"),
                        border: item.is_read
                          ? "1px solid rgba(15,23,42,0.06)"
                          : "1px solid rgba(11,99,209,0.28)",
                        boxShadow: item.is_read
                          ? "0 8px 18px rgba(15,23,42,0.035)"
                          : "0 10px 22px rgba(11,99,209,0.10)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: tone.bg,
                                border: tone.border,
                                color: tone.text,
                                fontSize: 12,
                                fontWeight: 1000,
                              }}
                            >
                              {source}
                            </div>

                            {!item?.is_read ? (
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "5px 10px",
                                  borderRadius: 999,
                                  background: "rgba(11,99,209,0.08)",
                                  border: "1px solid rgba(11,99,209,0.18)",
                                  color: "#0B63D1",
                                  fontSize: 12,
                                  fontWeight: 1000,
                                }}
                              >
                                New
                              </div>
                            ) : null}
                          </div>

                          <div
                            style={{
                              marginTop: 12,
                              color: "#0B1F33",
                              fontWeight: 1000,
                              fontSize: 18,
                              lineHeight: 1.5,
                            }}
                          >
                            {safeStr(item.title || item.message || "Notification")}
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              color: "#5A6B7C",
                              fontSize: 14,
                              lineHeight: 1.8,
                            }}
                          >
                            {safeStr(item.message || item.title || "Open to continue.")}
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              color: "#7D8DA1",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {safeDateTime(item.created_at) || "Time unavailable"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            style={smallBtn(true)}
                            onClick={() => openDestination(destination)}
                          >
                            {actionLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}