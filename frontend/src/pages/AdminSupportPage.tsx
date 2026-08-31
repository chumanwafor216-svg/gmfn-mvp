import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { StableButton, StableCtaLink } from "../components/StableButton";
import { structuredErrorMessage } from "../lib/structuredErrors";
import {
  addSupportCaseMessage,
  getAdminSupportCases,
  getSupportCase,
  updateAdminSupportCaseStatus,
  uploadSupportCaseAttachment,
  type SupportCaseStatus,
} from "../lib/api";

type SupportCaseRow = {
  id: number;
  public_id?: string;
  requester?: { label?: string | null; gmfn_id?: string | null; email?: string | null } | null;
  community?: { name?: string | null; community_code?: string | null } | null;
  issue_type?: string;
  subject?: string;
  status?: SupportCaseStatus | string;
  last_message_preview?: string | null;
  last_activity_at?: string | null;
  created_at?: string | null;
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
  created_at?: string | null;
};

const STATUS_OPTIONS: { value: SupportCaseStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting_admin", label: "Waiting admin" },
  { value: "waiting_user", label: "Waiting user" },
  { value: "resolved", label: "Resolved" },
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

function countsFrom(input: any): Record<string, number> {
  const raw = input?.counts || {};
  return {
    waiting_admin: Number(raw.waiting_admin || 0),
    waiting_user: Number(raw.waiting_user || 0),
    resolved: Number(raw.resolved || 0),
  };
}

function statusLabel(status: unknown): string {
  const raw = safeStr(status, "waiting_admin");
  if (raw === "waiting_user") return "Waiting user";
  if (raw === "resolved") return "Resolved";
  return "Waiting admin";
}

function issueLabel(issueType: unknown): string {
  const raw = safeStr(issueType, "other");
  if (raw === "sign_in") return "Sign in";
  if (raw === "payment") return "Payment";
  if (raw === "community") return "Community";
  if (raw === "shop") return "Shop";
  if (raw === "marketplace") return "Marketplace";
  if (raw === "trust") return "Trust";
  if (raw === "technical") return "App problem";
  return "Other";
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
    width: "min(1220px, 100%)",
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

function sectionLabel(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function inputStyle(tall = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: tall ? 104 : 44,
    borderRadius: 14,
    border: "1px solid rgba(17,42,68,0.14)",
    background: "#FFFFFF",
    color: "#0B1F33",
    padding: "10px 12px",
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

function AdminSupportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryCaseId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return Number(params.get("case_id") || "") || null;
  }, [location.search]);

  const [status, setStatus] = useState<SupportCaseStatus | "all">("waiting_admin");
  const [search, setSearch] = useState("");
  const [cases, setCases] = useState<SupportCaseRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ waiting_admin: 0, waiting_user: 0, resolved: 0 });
  const [selectedId, setSelectedId] = useState<number | null>(queryCaseId);
  const [selectedCase, setSelectedCase] = useState<SupportCaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [statusControlsOpen, setStatusControlsOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<SupportCaseStatus>("waiting_user");
  const [statusNote, setStatusNote] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const out = await getAdminSupportCases({
        status,
        q: search,
        limit: 100,
      });
      const items = rowsFrom(out);
      setCases(items);
      setCounts(countsFrom(out));
      setSelectedId((current) => current || queryCaseId || items[0]?.id || null);
    } catch (err: any) {
      setError(structuredErrorMessage(err, "Support queue could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [queryCaseId, search, status]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

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
        const row = out?.case || out;
        setSelectedCase(row);
        setNextStatus((row?.status === "resolved" ? "resolved" : "waiting_user") as SupportCaseStatus);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(structuredErrorMessage(err, "This support case could not be opened."));
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function refreshSelected(caseId: number) {
    const out = await getSupportCase(caseId);
    setSelectedCase(out?.case || out);
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
      await refreshSelected(selectedId);
      await loadQueue();
      setNotice("Reply sent to the requester.");
    } catch (err: any) {
      setError(structuredErrorMessage(err, "Reply could not be sent."));
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateAdminSupportCaseStatus(selectedId, {
        status: nextStatus,
        note: safeStr(statusNote) || undefined,
      });
      setStatusNote("");
      setStatusControlsOpen(false);
      await refreshSelected(selectedId);
      await loadQueue();
      setNotice("Case status updated.");
    } catch (err: any) {
      setError(structuredErrorMessage(err, "Case status could not be updated."));
    } finally {
      setBusy(false);
    }
  }

  const messages = Array.isArray(selectedCase?.messages) ? selectedCase?.messages || [] : [];
  const attachments = Array.isArray(selectedCase?.attachments) ? selectedCase?.attachments || [] : [];

  return (
    <main style={pageShell()}>
      <div style={contentWrap()}>
        <PageTopNav
          sectionLabel="Command Centre"
          title="Support Queue"
          subtitle="Reply to app help requests and keep ordinary support separate from governance tools."
          homeTo="/app/command-center"
          homeLabel="Admin Tools"
          nextLinks={[{ label: "Action Inbox", to: "/app/notifications" }]}
        />

        <section style={card("#0B1F33")}> 
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ ...sectionLabel(), color: "#C9D7E5" }}>Open support queue</div>
              <h1 style={{ margin: "6px 0 0", color: "#FFFFFF", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.05 }}>
                Help people finish what blocked them.
              </h1>
              <p style={{ margin: "10px 0 0", color: "#D9E4EF", maxWidth: 780, lineHeight: 1.7 }}>
                This queue is practical support only. Keep policy decisions, lineage checks, and review evidence in their governance screens.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {[
                ["Waiting admin", counts.waiting_admin],
                ["Waiting user", counts.waiting_user],
                ["Resolved", counts.resolved],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ ...card("rgba(255,255,255,0.08)"), borderColor: "rgba(255,255,255,0.14)", boxShadow: "none" }}>
                  <div style={{ color: "#AFC3D7", fontSize: 12, fontWeight: 900 }}>{label}</div>
                  <div style={{ color: "#FFFFFF", fontSize: 26, fontWeight: 1000 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error ? <div style={{ ...card("#FEF2F2"), color: "#991B1B", fontWeight: 800 }}>{error}</div> : null}
        {notice ? <div style={{ ...card("#ECFDF3"), color: "#167447", fontWeight: 800 }}>{notice}</div> : null}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 18 }}>
          <div style={{ ...card(), display: "grid", gap: 14, alignContent: "start" }}>
            <div>
              <div style={sectionLabel()}>Queue</div>
              <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 24 }}>Cases</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, color: "#253B53", fontWeight: 900, fontSize: 13 }}>
                Status
                <select value={status} onChange={(event) => setStatus(event.target.value as SupportCaseStatus | "all")} style={inputStyle()}>
                  {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, color: "#253B53", fontWeight: 900, fontSize: 13 }}>
                Search
                <input value={search} onChange={(event) => setSearch(event.target.value)} style={inputStyle()} placeholder="Subject or case id" />
              </label>
            </div>
            {loading ? <div style={{ color: "#526579" }}>Loading queue...</div> : null}
            {!loading && cases.length === 0 ? <div style={{ color: "#526579", lineHeight: 1.7 }}>No cases match this view.</div> : null}
            <div style={{ display: "grid", gap: 10 }}>
              {cases.map((item) => (
                <StableButton
                  key={item.id}
                  type="button"
                  kind="secondary"
                  debugId={`admin-support.case-row-${item.id}`}
                  fullWidth
                  onClick={() => {
                    setSelectedId(item.id);
                    navigate(`/app/command-center/support?case_id=${item.id}`, { replace: true });
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
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#0B1F33", fontWeight: 1000 }}>{safeStr(item.subject, "Support request")}</div>
                      <div style={{ color: "#526579", fontSize: 13, marginTop: 4 }}>
                        {safeStr(item.requester?.label, "GSN member")} | {issueLabel(item.issue_type)}
                      </div>
                    </div>
                    <span style={badgeStyle(item.status)}>{statusLabel(item.status)}</span>
                  </div>
                  <div style={{ color: "#526579", fontSize: 13, marginTop: 8 }}>{formatWhen(item.last_activity_at || item.created_at)}</div>
                </StableButton>
              ))}
            </div>
          </div>

          <div style={{ ...card(), display: "grid", gap: 14, alignContent: "start" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={sectionLabel()}>Selected case</div>
                <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 24 }}>
                  {selectedCase ? safeStr(selectedCase.subject, "Support request") : "Choose a case"}
                </h2>
                {selectedCase ? (
                  <div style={{ marginTop: 7, color: "#526579", lineHeight: 1.6 }}>
                    {selectedCase.public_id} | {safeStr(selectedCase.requester?.label, "GSN member")}
                    {selectedCase.community?.name ? ` | ${selectedCase.community.name}` : ""}
                  </div>
                ) : null}
              </div>
              {selectedCase ? <span style={badgeStyle(selectedCase.status)}>{statusLabel(selectedCase.status)}</span> : null}
            </div>

            {threadLoading ? <div style={{ color: "#526579" }}>Opening case...</div> : null}
            {!selectedCase && !threadLoading ? <div style={{ color: "#526579" }}>Select a case from the queue.</div> : null}

            {selectedCase ? (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  {messages.map((item) => {
                    const admin = safeStr(item.author_role) === "admin";
                    return (
                      <div key={item.id} style={{ borderRadius: 18, border: "1px solid rgba(17,42,68,0.10)", background: admin ? "#EFF6FF" : "#FFFFFF", padding: 14 }}>
                        <div style={{ color: "#526579", fontSize: 12, fontWeight: 900 }}>
                          {admin ? "Admin" : safeStr(item.author?.label, "Requester")} | {formatWhen(item.created_at)}
                        </div>
                        <div style={{ marginTop: 7, color: "#0B1F33", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{safeStr(item.body)}</div>
                        {Array.isArray(item.attachments) && item.attachments.length ? (
                          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                            {item.attachments.map((attachment) => (
                              <StableCtaLink key={attachment.id} to={attachment.url || "#"} target="_blank" rel="noreferrer" kind="secondary" debugId={`admin-support.message-attachment-${attachment.id}`} style={{ color: "#0B63D1", fontWeight: 900, justifyContent: "flex-start" }}>
                                {safeStr(attachment.file_name, "Attachment")} ({safeStr(attachment.content_type, "file")})
                              </StableCtaLink>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {attachments.length ? (
                  <div style={{ ...card("#F8FBFF"), boxShadow: "none", display: "grid", gap: 8 }}>
                    <div style={sectionLabel()}>Attachments</div>
                    {attachments.map((attachment) => (
                      <StableCtaLink key={attachment.id} to={attachment.url || "#"} target="_blank" rel="noreferrer" kind="secondary" debugId={`admin-support.case-attachment-${attachment.id}`} style={{ color: "#0B63D1", fontWeight: 900, justifyContent: "flex-start" }}>
                        {safeStr(attachment.file_name, "Attachment")} | {safeStr(attachment.content_type, "file")} | {formatWhen(attachment.created_at)}
                      </StableCtaLink>
                    ))}
                  </div>
                ) : null}

                <form onSubmit={handleReply} style={{ display: "grid", gap: 10 }}>
                  <label style={{ display: "grid", gap: 7, color: "#253B53", fontSize: 13, fontWeight: 900 }}>
                    Reply
                    <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} style={inputStyle(true)} placeholder="Reply to the requester." />
                  </label>
                  <label style={{ display: "grid", gap: 7, color: "#253B53", fontSize: 13, fontWeight: 900 }}>
                    Add picture or PDF
                    <input type="file" accept="image/*,.pdf,application/pdf" data-gmfn-action-root="true" data-cta-id="admin-support.reply-attachment" onChange={(event) => setReplyAttachment(event.target.files?.[0] || null)} />
                  </label>
                  <StableButton type="submit" kind="primary" busy={busy} busyLabel="Sending" debugId="admin-support.reply" minWidth={140}>
                    Reply
                  </StableButton>
                </form>

                <StableButton
                  type="button"
                  kind="secondary"
                  debugId="admin-support.status-toggle"
                  aria-expanded={statusControlsOpen}
                  aria-controls="admin-support-status-controls"
                  onClick={() => setStatusControlsOpen((current) => !current)}
                  minWidth={160}
                >
                  {statusControlsOpen ? "Hide status controls" : "Status controls"}
                </StableButton>

                {statusControlsOpen ? (
                  <form id="admin-support-status-controls" onSubmit={handleStatus} style={{ ...card("#F8FBFF"), boxShadow: "none", display: "grid", gap: 10 }}>
                    <div style={sectionLabel()}>Status controls</div>
                    <label style={{ display: "grid", gap: 7, color: "#253B53", fontSize: 13, fontWeight: 900 }}>
                      Next status
                      <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as SupportCaseStatus)} style={inputStyle()}>
                        <option value="waiting_admin">Waiting admin</option>
                        <option value="waiting_user">Waiting user</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 7, color: "#253B53", fontSize: 13, fontWeight: 900 }}>
                      Note
                      <textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} maxLength={1200} style={inputStyle(true)} placeholder="Optional note to add to the case thread." />
                    </label>
                    <StableButton type="submit" kind="secondary" busy={busy} busyLabel="Updating" debugId="admin-support.status" minWidth={160}>
                      Update status
                    </StableButton>
                  </form>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdminSupportPage;
