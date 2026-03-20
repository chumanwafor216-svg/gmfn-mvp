import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyNotifications,
  markNotificationRead,
  seedAssistantNotifications,
} from "../lib/api";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function actionBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 14,
    textDecoration: "none",
  };
}

function kindPill(kind: string): React.CSSProperties {
  const k = String(kind || "").toLowerCase();

  if (k.includes("assistant")) {
    return { padding: "5px 9px", borderRadius: 999, background: "#FFFBEB", color: "#92400E", fontSize: 12, fontWeight: 1000 };
  }
  if (k.includes("loan")) {
    return { padding: "5px 9px", borderRadius: 999, background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 1000 };
  }
  if (k.includes("pool")) {
    return { padding: "5px 9px", borderRadius: 999, background: "#ECFDF5", color: "#065F46", fontSize: 12, fontWeight: 1000 };
  }

  return { padding: "5px 9px", borderRadius: 999, background: "#F8FAFC", color: "#475569", fontSize: 12, fontWeight: 1000 };
}

export default function NotificationsPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  async function load(flag = unreadOnly) {
    setErr("");
    try {
      const res = await getMyNotifications(100, flag);
      setData(res || null);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load notifications."));
    }
  }

  useEffect(() => {
    load(unreadOnly);
  }, [unreadOnly]);

  async function seed() {
    setErr("");
    setMsg("");
    try {
      await seedAssistantNotifications();
      setMsg("Assistant notifications created.");
      await load(unreadOnly);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to seed notifications."));
    }
  }

  async function markRead(id: number) {
    setErr("");
    try {
      await markNotificationRead(id);
      await load(unreadOnly);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to mark notification as read."));
    }
  }

  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
          Notifications
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Reminders, trust prompts, pending actions, and supportive guidance.
        </div>

        {err ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontWeight: 900,
            }}
          >
            {err}
          </div>
        ) : null}

        {msg ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontWeight: 900,
            }}
          >
            {msg}
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={seed} style={actionBtn(true)}>
            Seed Assistant Prompts
          </button>

          <button
            onClick={() => setUnreadOnly((v) => !v)}
            style={actionBtn(false)}
          >
            {unreadOnly ? "Show All" : "Show Unread Only"}
          </button>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          {items.length === 0 ? <div style={{ color: "#7A8D9F" }}>No notifications yet.</div> : null}

          {items.map((row: any) => (
            <div
              key={row.id}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(11,31,51,0.08)",
                background: row.is_read ? "#FFFFFF" : "#F8FBFF",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{row.title}</div>
                    <span style={kindPill(row.kind)}>{row.kind}</span>
                    {!row.is_read ? (
                      <span style={{ padding: "5px 9px", borderRadius: 999, background: "#DBEAFE", color: "#1E40AF", fontSize: 12, fontWeight: 1000 }}>
                        New
                      </span>
                    ) : null}
                  </div>

                  <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.7 }}>{row.message}</div>
                  <div style={{ marginTop: 8, color: "#94A3B8", fontSize: 12 }}>
                    {row.created_at}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {row.action_url ? (
                    <Link to={row.action_url} style={actionBtn(false)}>
                      {row.action_label || "Open"}
                    </Link>
                  ) : null}

                  {!row.is_read ? (
                    <button onClick={() => markRead(Number(row.id))} style={actionBtn(true)}>
                      Mark Read
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}