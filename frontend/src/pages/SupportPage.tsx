import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { StableButton, StableCtaLink } from "../components/StableButton";
import {
  addSupportCaseMessage,
  createSupportCase,
  getMySupportCases,
  getSelectedClanId,
  getSupportCase,
  uploadSupportCaseAttachment,
  type SupportCaseIssueType,
  type SupportCaseStatus,
} from "../lib/api";

type SupportCaseRow = {
  id: number;
  public_id?: string;
  issue_type?: string;
  subject?: string;
  status?: SupportCaseStatus | string;
  last_message_preview?: string | null;
  last_activity_at?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  community?: { name?: string | null } | null;
  messages?: SupportMessageRow[];
  attachments?: SupportAttachmentRow[];
};

type SupportMessageRow = {
  id: number;
  author_role?: string;
  body?: string;
  created_at?: string | null;
  author?: { label?: string | null } | null;
  attachments?: SupportAttachmentRow[];
};

type SupportAttachmentRow = {
  id: number;
  file_name?: string;
  content_type?: string;
  url?: string;
};

const ISSUE_TYPES: { value: SupportCaseIssueType; label: string }[] = [
  { value: "technical", label: "App problem" },
  { value: "sign_in", label: "Sign in or access" },
  { value: "community", label: "Community help" },
  { value: "payment", label: "Payment or money path" },
  { value: "shop", label: "Shop help" },
  { value: "marketplace", label: "Marketplace help" },
  { value: "trust", label: "Trust record help" },
  { value: "other", label: "Something else" },
];

function safeStr(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function rowsFrom(input: any): SupportCaseRow[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.items)) return input.items;
  if (Array.isArray(input?.cases)) return input.cases;
  if (Array.isArray(input?.data?.items)) return input.data.items;
  return [];
}

function statusLabel(status: unknown): string {
  const raw = safeStr(status, "waiting_admin");
  if (raw === "waiting_user") return "Waiting for you";
  if (raw === "resolved") return "Resolved";
  return "Waiting for admin";
}

function issueLabel(issueType: unknown): string {
  const raw = safeStr(issueType, "other") as SupportCaseIssueType;
  return ISSUE_TYPES.find((item) => item.value === raw)?.label || "Something else";
}

function formatWhen(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "No date yet";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100%",
    padding: "24px clamp(16px, 3vw, 32px) 44px",
    background: "linear-gradient(180deg, #F7FAFD 0%, #EDF4FB 100%)",
  };
}

function contentWrap(): React.CSSProperties {
  return {
    width: "min(1180px, 100%)",
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(17,42,68,0.10)",
    background: bg,
    padding: 18,
    boxShadow: "0 16px 36px rgba(15,23,42,0.06)",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    display: "grid",
    gap: 7,
    color: "#253B53",
    fontSize: 13,
    fontWeight: 900,
  };
}

function inputStyle(tall = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: tall ? 116 : 46,
    borderRadius: 14,
    border: "1px solid rgba(17,42,68,0.14)",
    background: "#FFFFFF",
    color: "#0B1F33",
    padding: "11px 12px",
    fontSize: 15,
    lineHeight: 1.5,
    outlineColor: "#0B63D1",
    boxSizing: "border-box",
  };
}

function badgeStyle(status: unknown): React.CSSProperties {
  const raw = safeStr(status, "waiting_admin");
  const resolved = raw === "resolved";
  const waitingUser = raw === "waiting_user";
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(17,42,68,0.10)",
    background: resolved ? "#ECFDF3" : waitingUser ? "#FFF7E0" : "#EFF6FF",
    color: resolved ? "#167447" : waitingUser ? "#8A5A00" : "#0B63D1",
    fontSize: 12,
    fontWeight: 900,
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(17,42,68,0.10)",
    background: "#FFFFFF",
    padding: 14,
    display: "grid",
    gap: 4,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function SupportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryCaseId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return Number(params.get("case_id") || "") || null;
  }, [location.search]);

  const [cases, setCases] = useState<SupportCaseRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(queryCaseId);
  const [selectedCase, setSelectedCase] = useState<SupportCaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [issueType, setIssueType] = useState<SupportCaseIssueType>("technical");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [reply, setReply] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(Boolean(queryCaseId));

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const out = await getMySupportCases({ limit: 60 });
      const items = rowsFrom(out);
      setCases(items);
      setSelectedId((current) => current || queryCaseId || null);
    } catch (err: any) {
      setError(err?.message || "Support cases could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [queryCaseId]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedCase(null);
      return;
    }

    let cancelled = false;
    setThreadLoading(true);
    getSupportCase(selectedId)
      .then((out) => {
        if (cancelled) return;
        setSelectedCase(out?.case || out);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || "This support thread could not be opened.");
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const stats = useMemo(() => {
    const waitingAdmin = cases.filter((item) => item.status === "waiting_admin").length;
    const waitingUser = cases.filter((item) => item.status === "waiting_user").length;
    const resolved = cases.filter((item) => item.status === "resolved").length;
    return {
      open: cases.length - resolved,
      waitingAdmin,
      waitingUser,
      resolved,
    };
  }, [cases]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanSubject = safeStr(subject);
    const cleanMessage = safeStr(message);
    if (!cleanSubject || !cleanMessage) {
      setError("Add a short subject and explain what is difficult.");
      return;
    }

    setBusy(true);
    try {
      const clanId = getSelectedClanId();
      const out = await createSupportCase({
        issue_type: issueType,
        subject: cleanSubject,
        message: cleanMessage,
        clan_id: clanId,
        source_path: `${location.pathname}${location.search || ""}`,
      });
      const created = out?.case || out;
      if (newAttachment && created?.id) {
        await uploadSupportCaseAttachment(created.id, newAttachment);
      }
      setSubject("");
      setMessage("");
      setNewAttachment(null);
      setSelectedId(created?.id || null);
      setThreadsOpen(true);
      navigate(created?.id ? `/app/help?case_id=${created.id}` : "/app/help", { replace: true });
      await loadCases();
      setNotice("Support request sent. Admin can now reply from the queue.");
    } catch (err: any) {
      setError(err?.message || "Support request could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    const cleanReply = safeStr(reply);
    if (!cleanReply && !replyAttachment) {
      setError("Write a reply or attach a picture/PDF first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (cleanReply) {
        await addSupportCaseMessage(selectedId, { body: cleanReply });
      }
      if (replyAttachment) {
        await uploadSupportCaseAttachment(selectedId, replyAttachment);
      }
      setReply("");
      setReplyAttachment(null);
      const refreshed = await getSupportCase(selectedId);
      setSelectedCase(refreshed?.case || refreshed);
      await loadCases();
      setNotice("Reply sent.");
    } catch (err: any) {
      setError(err?.message || "Reply could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const messages = Array.isArray(selectedCase?.messages) ? selectedCase?.messages || [] : [];

  return (
    <main style={pageShell()}>
      <div style={contentWrap()}>
        <PageTopNav
          sectionLabel="Identity & settings"
          title="Help Desk"
          subtitle="Ask GSN admin for app help, attach a picture, and keep the conversation in one place."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          nextLinks={[{ label: "Action Inbox", to: "/app/notifications" }]}
        />

        <section style={card("#0B1F33")}> 
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ ...sectionLabel(), color: "#C9D7E5" }}>Support state</div>
              <h1 style={{ margin: "6px 0 0", color: "#FFFFFF", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.05 }}>
                Tell admin what is difficult.
              </h1>
              <p style={{ margin: "10px 0 0", color: "#D9E4EF", maxWidth: 760, lineHeight: 1.7 }}>
                This is for app problems and user help. Loan support, announcements, and governance reviews still stay in their own places.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 10 }}>
              {[
                ["Open", stats.open],
                ["Waiting admin", stats.waitingAdmin],
                ["Waiting you", stats.waitingUser],
                ["Resolved", stats.resolved],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ ...statTile(), background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)" }}>
                  <div style={{ color: "#AFC3D7", fontSize: 12, fontWeight: 900 }}>{label}</div>
                  <div style={{ color: "#FFFFFF", fontSize: 26, fontWeight: 1000 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error ? <div style={{ ...card("#FEF2F2"), color: "#991B1B", fontWeight: 800 }}>{error}</div> : null}
        {notice ? <div style={{ ...card("#ECFDF3"), color: "#167447", fontWeight: 800 }}>{notice}</div> : null}

        <section style={{ display: "grid", gap: 14 }}>
          <form onSubmit={handleCreate} style={{ ...card(), display: "grid", gap: 14 }}>
            <div>
              <div style={sectionLabel()}>Ask for help</div>
              <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 24 }}>New support request</h2>
            </div>
            <label style={labelStyle()}>
              What kind of help?
              <select value={issueType} onChange={(event) => setIssueType(event.target.value as SupportCaseIssueType)} style={inputStyle()}>
                {ISSUE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle()}>
              Subject
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} style={inputStyle()} placeholder="Example: I cannot upload my shop picture" />
            </label>
            <label style={labelStyle()}>
              Message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} style={inputStyle(true)} placeholder="Say what you tried, what happened, and what you need admin to resolve." />
            </label>
            <label style={labelStyle()}>
              Picture or PDF
              <input type="file" accept="image/*,.pdf,application/pdf" data-gmfn-action-root="true" data-cta-id="support-page.create-attachment" onChange={(event) => setNewAttachment(event.target.files?.[0] || null)} />
            </label>
            <StableButton type="submit" kind="primary" busy={busy} busyLabel="Sending" debugId="support-page.create" fullWidth>
              Ask for help
            </StableButton>
          </form>

          <StableButton
            type="button"
            kind="secondary"
            debugId="support-page.threads-toggle"
            aria-expanded={threadsOpen}
            aria-controls="support-page-thread-drawer"
            fullWidth
            onClick={() => setThreadsOpen((current) => !current)}
          >
            {threadsOpen ? "Hide previous requests" : "View previous requests"}
          </StableButton>

          {threadsOpen ? (
            <div id="support-page-thread-drawer" data-debug-id="support-page.thread-drawer" style={{ display: "grid", gap: 18 }}>
              <div style={{ ...card(), display: "grid", gap: 14 }}>
            <div>
              <div style={sectionLabel()}>Recent cases</div>
              <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 24 }}>Your support threads</h2>
            </div>
            {loading ? <div style={{ color: "#526579" }}>Loading support cases...</div> : null}
            {!loading && cases.length === 0 ? (
              <div style={{ color: "#526579", lineHeight: 1.7 }}>No support cases yet. Use the form when the app is difficult or something needs admin help.</div>
            ) : null}
            <div style={{ display: "grid", gap: 10 }}>
              {cases.map((item) => (
                <StableButton
                  key={item.id}
                  type="button"
                  kind="secondary"
                  debugId={`support-page.case-row-${item.id}`}
                  fullWidth
                  onClick={() => {
                    setSelectedId(item.id);
                    setThreadsOpen(true);
                    navigate(`/app/help?case_id=${item.id}`, { replace: true });
                  }}
                  style={{
                    ...card(selectedId === item.id ? "#EFF6FF" : "#FFFFFF"),
                    padding: 14,
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: "none",
                    display: "grid",
                    alignItems: "stretch",
                    justifyContent: "stretch",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#0B1F33", fontWeight: 1000 }}>{safeStr(item.subject, "Support request")}</div>
                      <div style={{ color: "#526579", fontSize: 13, marginTop: 4 }}>{issueLabel(item.issue_type)} | {formatWhen(item.last_activity_at || item.created_at)}</div>
                    </div>
                    <span style={badgeStyle(item.status)}>{statusLabel(item.status)}</span>
                  </div>
                  {item.last_message_preview ? <div style={{ color: "#526579", fontSize: 13, marginTop: 8 }}>{item.last_message_preview}</div> : null}
                </StableButton>
              ))}
            </div>
              </div>
            </div>
          ) : null}
        </section>

        {threadsOpen ? (
          <section style={{ ...card(), display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabel()}>Thread</div>
              <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 24 }}>
                {selectedCase ? safeStr(selectedCase.subject, "Support request") : "Select a support case"}
              </h2>
              {selectedCase ? <div style={{ marginTop: 7, color: "#526579" }}>{selectedCase.public_id} | {issueLabel(selectedCase.issue_type)}</div> : null}
            </div>
            {selectedCase ? <span style={badgeStyle(selectedCase.status)}>{statusLabel(selectedCase.status)}</span> : null}
          </div>

          {threadLoading ? <div style={{ color: "#526579" }}>Opening thread...</div> : null}
          {!selectedCase && !threadLoading ? <div style={{ color: "#526579" }}>Choose a case above to see the conversation.</div> : null}

          {selectedCase ? (
            <>
              <div style={{ display: "grid", gap: 10 }}>
                {messages.length === 0 ? <div style={{ color: "#526579" }}>No messages yet.</div> : null}
                {messages.map((item) => {
                  const admin = safeStr(item.author_role) === "admin";
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: admin ? "flex-start" : "flex-end" }}>
                      <div style={{ maxWidth: 760, borderRadius: 18, border: "1px solid rgba(17,42,68,0.10)", background: admin ? "#F8FBFF" : "#0B63D1", color: admin ? "#0B1F33" : "#FFFFFF", padding: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.78 }}>{admin ? "Admin" : "You"} | {formatWhen(item.created_at)}</div>
                        <div style={{ marginTop: 7, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{safeStr(item.body)}</div>
                        {Array.isArray(item.attachments) && item.attachments.length ? (
                          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                            {item.attachments.map((attachment) => (
                              <StableCtaLink key={attachment.id} to={attachment.url || "#"} target="_blank" rel="noreferrer" kind="secondary" debugId={`support-page.message-attachment-${attachment.id}`} style={{ color: admin ? "#0B63D1" : "#FFFFFF", fontWeight: 900, justifyContent: "flex-start" }}>
                                {safeStr(attachment.file_name, "Attachment")}
                              </StableCtaLink>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedCase.status === "resolved" ? (
                <div style={{ color: "#526579", lineHeight: 1.7 }}>This case is resolved. Start a new request if a new problem appears.</div>
              ) : (
                <form onSubmit={handleReply} style={{ display: "grid", gap: 10 }}>
                  <label style={labelStyle()}>
                    Reply
                    <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} style={inputStyle(true)} placeholder="Add more detail for admin." />
                  </label>
                  <label style={labelStyle()}>
                    Add picture or PDF
                    <input type="file" accept="image/*,.pdf,application/pdf" data-gmfn-action-root="true" data-cta-id="support-page.reply-attachment" onChange={(event) => setReplyAttachment(event.target.files?.[0] || null)} />
                  </label>
                  <StableButton type="submit" kind="primary" busy={busy} busyLabel="Sending" debugId="support-page.reply" minWidth={140}>
                    Send reply
                  </StableButton>
                </form>
              )}
            </>
          ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default SupportPage;

