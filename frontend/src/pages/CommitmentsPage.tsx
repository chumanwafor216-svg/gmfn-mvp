import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { StableButton, StableCtaLink } from "../components/StableButton";
import { APP_ROUTES } from "../lib/appRoutes";
import {
  acceptParticipantRoscaInvitation,
  activateParticipantRoscaRun,
  createParticipantRoscaDraft,
  declineParticipantRoscaInvitation,
  getMe,
  getParticipantRoscaRun,
  inviteParticipantRoscaParticipant,
  listMyParticipantRoscaRuns,
  recordParticipantRoscaContribution,
  type ParticipantRoscaObligationOut,
  type ParticipantRoscaParticipantOut,
  type ParticipantRoscaRunOut,
} from "../lib/api";

const FOCUS_STORAGE_KEY = "gmfn.dashboard.focus-commitments.v1";

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown, currency: unknown): string {
  const amount = numberValue(value);
  const formatted = amount.toLocaleString(undefined, {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
  return `${safeText(currency) || "GBP"} ${formatted}`;
}

function frequencyLabel(run: ParticipantRoscaRunOut): string {
  const interval = Number(run.frequency_interval || 1);
  const unit = safeText(run.frequency_unit || "monthly");
  if (unit === "daily") return interval > 1 ? `every ${interval} days` : "daily";
  if (unit === "weekly") return interval > 1 ? `every ${interval} weeks` : "weekly";
  if (unit === "custom_days") return interval > 1 ? `every ${interval} days` : "custom";
  return interval > 1 ? `every ${interval} months` : "monthly";
}

function dateLabel(value: unknown): string {
  const raw = safeText(value);
  if (!raw) return "When ready";
  const dt = new Date(raw);
  if (!Number.isFinite(dt.getTime())) return raw;
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function runStatusLabel(status: string): string {
  switch (safeText(status).toLowerCase()) {
    case "draft":
      return "Draft";
    case "inviting":
      return "Inviting";
    case "ready_to_activate":
      return "Ready to start";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Not ready";
  }
}

function participantStatusLabel(status: string): string {
  switch (safeText(status).toLowerCase()) {
    case "invited":
      return "Waiting";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "revoked":
      return "Revoked";
    default:
      return "Pending";
  }
}

function readLocalFocusCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(FOCUS_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    return parsed.filter((item) => item && !item.archived && !item.completedAt).length;
  } catch {
    return 0;
  }
}

function participantForMe(run: ParticipantRoscaRunOut, userId: number | null): ParticipantRoscaParticipantOut | null {
  if (!userId) return null;
  return run.participants.find((row) => Number(row.user_id) === Number(userId)) || null;
}

function myContributionObligations(run: ParticipantRoscaRunOut, userId: number | null): ParticipantRoscaObligationOut[] {
  if (!userId) return [];
  return (run.obligations || []).filter(
    (row) => row.obligation_type === "contribution" && Number(row.user_id) === Number(userId)
  );
}

function contributionLanguage(row: ParticipantRoscaObligationOut, userId: number | null): string {
  const state = safeText(row.state).toLowerCase();
  if (state === "scheduled") return "Next contribution";
  if (Number(row.reported_by_user_id) === Number(userId) && Number(row.confirmed_by_user_id) === Number(userId)) {
    return "You recorded your contribution";
  }
  if (row.reported_by_user_id && Number(row.reported_by_user_id) !== Number(row.user_id)) {
    return "Coordinator recorded contribution";
  }
  if (state === "reported") return "Contribution recorded";
  return "Contribution recorded";
}

function shell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #061827 0%, #0B2D4A 36%, #F4F8FC 36%, #F8FBFF 100%)",
    padding: "18px 16px 96px",
    color: "#07172C",
  };
}

function page(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gap: 14,
  };
}

function card(extra?: React.CSSProperties): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "rgba(255,255,255,0.98)",
    boxShadow: "0 18px 44px rgba(7,23,44,0.08)",
    padding: 16,
    ...extra,
  };
}

function softCard(extra?: React.CSSProperties): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FBFF",
    padding: 13,
    ...extra,
  };
}

function label(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#5B6B80",
  };
}

function title(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.1,
    letterSpacing: 0,
    color: "#FFFFFF",
    fontWeight: 950,
  };
}

function h2(): React.CSSProperties {
  return {
    margin: 0,
    color: "#07172C",
    fontSize: 18,
    fontWeight: 950,
    lineHeight: 1.18,
  };
}

function muted(): React.CSSProperties {
  return {
    color: "#617085",
    fontSize: 13.5,
    lineHeight: 1.45,
  };
}

function chip(tone: "blue" | "green" | "amber" | "red" | "plain" = "plain"): React.CSSProperties {
  const map = {
    blue: ["#EAF3FF", "#0B63D1", "rgba(11,99,209,0.14)"],
    green: ["#ECFDF3", "#166534", "rgba(34,197,94,0.16)"],
    amber: ["#FFFBEB", "#92400E", "rgba(245,158,11,0.18)"],
    red: ["#FEF2F2", "#991B1B", "rgba(239,68,68,0.16)"],
    plain: ["#F1F5F9", "#334155", "rgba(15,23,42,0.08)"],
  } as const;
  const [background, color, border] = map[tone];
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background,
    color,
    border: `1px solid ${border}`,
    fontSize: 12,
    fontWeight: 850,
    lineHeight: 1.1,
  };
}

function field(): React.CSSProperties {
  return {
    minHeight: 48,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "#FFFFFF",
    color: "#07172C",
    padding: "10px 12px",
    fontSize: 16,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
}

function grid(min = 220): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 10,
  };
}

export default function CommitmentsPage() {
  const [searchParams] = useSearchParams();
  const requestedRunId = useMemo(() => {
    const value = Number(searchParams.get("rosca_run_id") || 0);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [searchParams]);
  const [me, setMe] = useState<any>(null);
  const [runs, setRuns] = useState<ParticipantRoscaRunOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [focusCount, setFocusCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    amount: "100",
    currency: "GBP",
    frequency_unit: "monthly",
    frequency_interval: "1",
    participant_count_required: "2",
    round_count: "2",
    start_at: "",
  });
  const [invite, setInvite] = useState({ gsnId: "", rotation: "1" });
  const [contributionDraft, setContributionDraft] = useState<Record<number, string>>({});

  const userId = me?.id ? Number(me.id) : null;

  async function refreshRuns(preferredRunId?: number | null) {
    const payload = await listMyParticipantRoscaRuns();
    const nextRuns = Array.isArray(payload?.runs) ? payload.runs : [];
    setRuns(nextRuns);
    const preferredVisible = preferredRunId && nextRuns.some((run) => Number(run.id) === Number(preferredRunId));
    if (preferredVisible) setSelectedRunId(Number(preferredRunId));
    else if (!selectedRunId && nextRuns.length) setSelectedRunId(Number(nextRuns[0].id));
  }

  useEffect(() => {
    let alive = true;
    setFocusCount(readLocalFocusCount());
    Promise.allSettled([getMe({ timeoutMs: 12000 }), listMyParticipantRoscaRuns()])
      .then(([meResult, runsResult]) => {
        if (!alive) return;
        if (meResult.status === "fulfilled") setMe(meResult.value);
        if (runsResult.status === "fulfilled") {
          const nextRuns = Array.isArray(runsResult.value?.runs) ? runsResult.value.runs : [];
          setRuns(nextRuns);
          const requestedVisible = requestedRunId && nextRuns.some((run) => Number(run.id) === Number(requestedRunId));
          if (requestedVisible) setSelectedRunId(Number(requestedRunId));
          else if (nextRuns.length) setSelectedRunId(Number(nextRuns[0].id));
        } else {
          setNotice({ tone: "error", text: "Shared ROSCA could not be loaded." });
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [requestedRunId]);

  useEffect(() => {
    if (!requestedRunId || !runs.length) return;
    if (runs.some((run) => Number(run.id) === Number(requestedRunId))) {
      setSelectedRunId(Number(requestedRunId));
    }
  }, [requestedRunId, runs]);
  const invitations = useMemo(
    () => runs.filter((run) => participantForMe(run, userId)?.status === "invited"),
    [runs, userId]
  );
  const activeRuns = useMemo(() => runs.filter((run) => run.status === "active"), [runs]);
  const coordinatorRuns = useMemo(
    () => runs.filter((run) => Number(run.coordinator_user_id) === Number(userId) && !["completed", "cancelled"].includes(run.status)),
    [runs, userId]
  );
  const pastRuns = useMemo(() => runs.filter((run) => ["completed", "cancelled"].includes(run.status)), [runs]);
  const selectedRun = useMemo(
    () => runs.find((run) => Number(run.id) === Number(selectedRunId)) || runs[0] || null,
    [runs, selectedRunId]
  );

  useEffect(() => {
    if (!selectedRunId) return;
    const current = runs.find((run) => Number(run.id) === Number(selectedRunId));
    if (!current || current.status !== "active" || current.obligations.length > 0) return;
    let alive = true;
    getParticipantRoscaRun(selectedRunId)
      .then((updated) => {
        if (!alive) return;
        setRuns((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      })
      .catch(() => {
        // The list view remains usable even if detailed obligations are temporarily unavailable.
      });
    return () => {
      alive = false;
    };
  }, [runs, selectedRunId]);

  const primarySharedState = invitations.length
    ? `${invitations.length} invitation${invitations.length === 1 ? "" : "s"}`
    : activeRuns.length
    ? `${activeRuns.length} active`
    : coordinatorRuns.length
    ? `${coordinatorRuns.length} draft/coordinator`
    : "No shared ROSCA yet";

  async function withBusy(key: string, action: () => Promise<void>) {
    if (busyKey) return;
    setBusyKey(key);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Action could not complete." });
    } finally {
      setBusyKey("");
    }
  }

  function validDraft(): boolean {
    return Boolean(
      safeText(draft.name) &&
        Number(draft.amount) > 0 &&
        Number(draft.participant_count_required) >= 2 &&
        Number(draft.round_count) >= 2
    );
  }

  async function createDraft() {
    await withBusy("create", async () => {
      const run = await createParticipantRoscaDraft({
        name: draft.name,
        amount: draft.amount,
        currency: draft.currency,
        frequency_unit: draft.frequency_unit,
        frequency_interval: Math.max(1, Number(draft.frequency_interval) || 1),
        participant_count_required: Math.max(2, Number(draft.participant_count_required) || 2),
        round_count: Math.max(2, Number(draft.round_count) || 2),
        start_rule: draft.start_at ? "on_date_after_all_acceptance" : "on_all_acceptance",
        start_at: draft.start_at || null,
      });
      setNotice({ tone: "success", text: "Draft created. Add people by exact GSN ID." });
      setCreateOpen(false);
      await refreshRuns(Number(run.id));
    });
  }

  async function addInvite(run: ParticipantRoscaRunOut) {
    await withBusy(`invite-${run.id}`, async () => {
      await inviteParticipantRoscaParticipant({
        run_id: run.id,
        invitee_gsn_id: invite.gsnId,
        rotation_position: Math.max(1, Number(invite.rotation) || 1),
      });
      setInvite({ gsnId: "", rotation: String(Math.min(run.round_count, Number(invite.rotation || 1) + 1)) });
      setNotice({ tone: "success", text: "Invitation sent to that exact GSN ID." });
      await refreshRuns(run.id);
    });
  }

  async function acceptRun(run: ParticipantRoscaRunOut) {
    await withBusy(`accept-${run.id}`, async () => {
      await acceptParticipantRoscaInvitation({ run_id: run.id, terms_version: run.terms_version, terms_hash: run.terms_hash });
      setNotice({ tone: "success", text: "Accepted. Waiting for the others." });
      await refreshRuns(run.id);
    });
  }

  async function declineRun(run: ParticipantRoscaRunOut) {
    await withBusy(`decline-${run.id}`, async () => {
      await declineParticipantRoscaInvitation({ run_id: run.id, reason: "Declined in app" });
      setNotice({ tone: "info", text: "Declined. No negative evidence is created." });
      await refreshRuns(run.id);
    });
  }

  async function startRun(run: ParticipantRoscaRunOut) {
    await withBusy(`activate-${run.id}`, async () => {
      const updated = await activateParticipantRoscaRun(run.id);
      setNotice({ tone: "success", text: "ROSCA started. GSN still does not hold the money." });
      await refreshRuns(updated.id);
    });
  }

  async function recordContribution(run: ParticipantRoscaRunOut, obligation: ParticipantRoscaObligationOut) {
    await withBusy(`record-${obligation.id}`, async () => {
      await recordParticipantRoscaContribution({
        run_id: run.id,
        obligation_id: obligation.id,
        amount_recorded: contributionDraft[obligation.id] || String(obligation.amount),
        note: "Recorded from Commitments",
      });
      setNotice({ tone: "success", text: "Contribution recorded. This is not independent verification." });
      setContributionDraft((prev) => ({ ...prev, [obligation.id]: "" }));
      const updated = await getParticipantRoscaRun(run.id);
      setRuns((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    });
  }

  return (
    <main style={shell()} data-commitments-home="true">
      <div style={page()}>
        <header style={{ display: "grid", gap: 12 }}>
          <Link to={APP_ROUTES.DASHBOARD} style={{ color: "#C8DCF6", fontSize: 13, fontWeight: 850, textDecoration: "none" }}>
            Back to Dashboard
          </Link>
          <div>
            <div style={{ color: "#D6AA45", fontSize: 12, fontWeight: 950, letterSpacing: 1, textTransform: "uppercase" }}>
              Commitments
            </div>
            <h1 style={title()}>Personal and shared follow-through</h1>
          </div>
        </header>

        {notice ? (
          <div
            style={card({
              borderColor:
                notice.tone === "error" ? "rgba(239,68,68,0.22)" : notice.tone === "success" ? "rgba(34,197,94,0.20)" : "rgba(11,99,209,0.16)",
              background: notice.tone === "error" ? "#FEF2F2" : notice.tone === "success" ? "#F0FDF4" : "#EAF3FF",
              color: notice.tone === "error" ? "#991B1B" : notice.tone === "success" ? "#166534" : "#0B3F7C",
              fontWeight: 850,
            })}
          >
            {notice.text}
          </div>
        ) : null}

        <section style={grid(260)} aria-label="Commitments first view">
          <div style={card()}>
            <div style={label()}>Personal</div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <h2 style={h2()}>Focus commitments</h2>
                <div style={{ marginTop: 6, ...muted() }}>
                  {focusCount > 0 ? `${focusCount} active local commitment${focusCount === 1 ? "" : "s"}` : "No active local commitment"}
                </div>
              </div>
              <span style={chip(focusCount > 0 ? "blue" : "plain")}>{focusCount} active</span>
            </div>
            <StableCtaLink debugId="commitments.personal.open-focus" to={`${APP_ROUTES.DASHBOARD}#focus-commitments`} kind="secondary" fullWidth stableHeight={50} style={{ marginTop: 14 }}>
              Open
            </StableCtaLink>
          </div>

          <div style={card()}>
            <div style={label()}>Shared</div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <h2 style={h2()}>ROSCA</h2>
                <div style={{ marginTop: 6, ...muted() }}>
                  {loading ? "Checking shared ROSCAs" : primarySharedState}
                </div>
              </div>
              <span style={chip(invitations.length ? "amber" : activeRuns.length ? "green" : "plain")}>{loading ? "Checking" : primarySharedState}</span>
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <StableButton debugId="commitments.shared.open" kind="secondary" stableHeight={50} onClick={() => selectedRun && setSelectedRunId(selectedRun.id)}>
                Open
              </StableButton>
              <StableButton debugId="commitments.shared.start-create" kind="primary" stableHeight={50} onClick={() => setCreateOpen((prev) => !prev)}>
                Start
              </StableButton>
            </div>
          </div>
        </section>

        <section style={card()} aria-label="Shared ROSCA workspace">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={label()}>My ROSCAs</div>
              <h2 style={{ ...h2(), marginTop: 6 }}>Shared</h2>
            </div>
            <span style={chip("blue")}>GSN records the arrangement; GSN does not hold the money.</span>
          </div>

          {createOpen ? (
            <div style={{ marginTop: 14, ...softCard() }} data-commitments-create-flow="true">
              <div style={grid(160)}>
                <input style={field()} value={draft.name} placeholder="Name" onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
                <input style={field()} value={draft.amount} inputMode="decimal" placeholder="Contribution amount" onChange={(event) => setDraft((prev) => ({ ...prev, amount: event.target.value }))} />
                <input style={field()} value={draft.currency} placeholder="Currency" onChange={(event) => setDraft((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))} />
                <select style={field()} value={draft.frequency_unit} onChange={(event) => setDraft((prev) => ({ ...prev, frequency_unit: event.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                  <option value="custom_days">Custom days</option>
                </select>
                <input style={field()} value={draft.participant_count_required} inputMode="numeric" placeholder="People" onChange={(event) => setDraft((prev) => ({ ...prev, participant_count_required: event.target.value }))} />
                <input style={field()} value={draft.round_count} inputMode="numeric" placeholder="Rounds" onChange={(event) => setDraft((prev) => ({ ...prev, round_count: event.target.value }))} />
                <input style={field()} value={draft.frequency_interval} inputMode="numeric" placeholder="Frequency" onChange={(event) => setDraft((prev) => ({ ...prev, frequency_interval: event.target.value }))} />
                <input style={field()} type="date" value={draft.start_at} onChange={(event) => setDraft((prev) => ({ ...prev, start_at: event.target.value }))} />
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <div style={muted()}>Create the draft first, then add people by exact GSN ID and set the order.</div>
                <StableButton debugId="commitments.shared.create-draft" kind="primary" disabled={!validDraft()} busy={busyKey === "create"} onClick={createDraft}>
                  Create draft
                </StableButton>
              </div>
            </div>
          ) : null}

          {loading ? <div style={{ marginTop: 14, ...muted() }}>Loading shared ROSCAs.</div> : null}

          {!loading && !runs.length ? (
            <div style={{ marginTop: 14, ...softCard() }}>
              <div style={{ fontWeight: 900, color: "#07172C" }}>No shared ROSCA yet.</div>
              <div style={{ marginTop: 6, ...muted() }}>Start one only when the people and order are known.</div>
            </div>
          ) : null}

          {runs.length ? (
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(180px, 0.75fr) minmax(0, 1.4fr)", gap: 12 }}>
              <div style={{ display: "grid", gap: 8, alignSelf: "start" }}>
                {runs.map((run) => {
                  const mine = participantForMe(run, userId);
                  const tone = run.status === "active" ? "green" : run.status === "ready_to_activate" ? "amber" : mine?.status === "invited" ? "amber" : "plain";
                  return (
                    <StableButton
                      key={`commitments-rosca-run-${run.id}`}
                      debugId={`commitments.shared.run.${run.id}`}
                      kind="secondary"
                      onClick={() => setSelectedRunId(run.id)}
                      style={{ justifyContent: "flex-start", textAlign: "left", minHeight: 64, background: selectedRun?.id === run.id ? "#EAF3FF" : "#FFFFFF" }}
                    >
                      <span style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontWeight: 950 }}>{run.name}</span>
                        <span style={{ ...chip(tone as any), alignSelf: "start" }}>{mine?.status === "invited" ? "Invitation" : runStatusLabel(run.status)}</span>
                      </span>
                    </StableButton>
                  );
                })}
              </div>

              {selectedRun ? (
                <RunDetail
                  run={selectedRun}
                  userId={userId}
                  busyKey={busyKey}
                  invite={invite}
                  setInvite={setInvite}
                  contributionDraft={contributionDraft}
                  setContributionDraft={setContributionDraft}
                  onInvite={() => addInvite(selectedRun)}
                  onAccept={() => acceptRun(selectedRun)}
                  onDecline={() => declineRun(selectedRun)}
                  onActivate={() => startRun(selectedRun)}
                  onRecordContribution={(obligation) => recordContribution(selectedRun, obligation)}
                />
              ) : null}
            </div>
          ) : null}

          {pastRuns.length ? (
            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 900, color: "#334155" }}>Completed or cancelled</summary>
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                {pastRuns.map((run) => (
                  <div key={`commitments-past-${run.id}`} style={softCard()}>
                    <strong>{run.name}</strong> - {runStatusLabel(run.status)}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      </div>
    </main>
  );
}

type RunDetailProps = {
  run: ParticipantRoscaRunOut;
  userId: number | null;
  busyKey: string;
  invite: { gsnId: string; rotation: string };
  setInvite: React.Dispatch<React.SetStateAction<{ gsnId: string; rotation: string }>>;
  contributionDraft: Record<number, string>;
  setContributionDraft: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onInvite: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onActivate: () => void;
  onRecordContribution: (obligation: ParticipantRoscaObligationOut) => void;
};

function RunDetail({
  run,
  userId,
  busyKey,
  invite,
  setInvite,
  contributionDraft,
  setContributionDraft,
  onInvite,
  onAccept,
  onDecline,
  onActivate,
  onRecordContribution,
}: RunDetailProps) {
  const me = participantForMe(run, userId);
  const isCoordinator = Number(run.coordinator_user_id) === Number(userId);
  const contributions = myContributionObligations(run, userId);
  const nextContribution = contributions.find((row) => row.state === "scheduled") || contributions[0] || null;
  const acceptedCount = run.participants.filter((row) => row.status === "accepted").length;
  const invitedCount = run.participants.filter((row) => row.status === "invited").length;

  return (
    <div style={softCard({ background: "#FFFFFF" })} data-commitments-rosca-detail="true">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={label()}>ROSCA</div>
          <h2 style={{ ...h2(), marginTop: 6 }}>{run.name}</h2>
          <div style={{ marginTop: 7, display: "flex", gap: 7, flexWrap: "wrap" }}>
            <span style={chip(run.status === "active" ? "green" : run.status === "ready_to_activate" ? "amber" : "blue")}>{runStatusLabel(run.status)}</span>
            <span style={chip("plain")}>{money(run.amount, run.currency)} {frequencyLabel(run)}</span>
            <span style={chip("plain")}>{run.participant_count_required} people - {run.round_count} rounds</span>
          </div>
        </div>
        {isCoordinator && run.status === "ready_to_activate" ? (
          <StableButton debugId="commitments.shared.activate" kind="primary" busy={busyKey === `activate-${run.id}`} onClick={onActivate}>
            Start ROSCA
          </StableButton>
        ) : null}
      </div>

      <div style={{ marginTop: 12, ...softCard({ background: "#F8FBFF" }) }}>
        <div style={{ fontWeight: 950, color: "#07172C" }}>{me?.status === "invited" ? "Invitation" : "State"}</div>
        <div style={{ marginTop: 6, ...muted() }}>
          {me?.status === "invited"
            ? `${money(run.amount, run.currency)} ${frequencyLabel(run)}. Your turn: ${me.rotation_position || "set by order"}.`
            : run.status === "active" && nextContribution
            ? `${contributionLanguage(nextContribution, userId)} - round ${nextContribution.round_number}.`
            : `${acceptedCount} accepted, ${invitedCount} waiting.`}
        </div>
        <div style={{ marginTop: 8, ...muted() }}>GSN records the arrangement; GSN does not hold the money.</div>
        {me?.status === "invited" ? (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StableButton debugId="commitments.shared.invitation.accept" kind="primary" busy={busyKey === `accept-${run.id}`} onClick={onAccept}>
              Accept
            </StableButton>
            <StableButton debugId="commitments.shared.invitation.decline" kind="secondary" busy={busyKey === `decline-${run.id}`} onClick={onDecline}>
              Decline
            </StableButton>
          </div>
        ) : null}
      </div>

      {run.status === "active" && nextContribution ? (
        <div style={{ marginTop: 12, ...softCard() }} data-commitments-contribution-boundary="actor-truthful">
          <div style={{ fontWeight: 950, color: "#07172C" }}>{contributionLanguage(nextContribution, userId)}</div>
          <div style={{ marginTop: 6, ...muted() }}>
            {money(nextContribution.amount_outstanding || nextContribution.amount, nextContribution.currency)} - round {nextContribution.round_number}
            {nextContribution.due_at ? ` - due ${dateLabel(nextContribution.due_at)}` : ""}
          </div>
          {nextContribution.state === "scheduled" ? (
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 }}>
              <input
                style={field()}
                value={contributionDraft[nextContribution.id] || String(nextContribution.amount)}
                inputMode="decimal"
                aria-label="Recorded contribution amount"
                onChange={(event) =>
                  setContributionDraft((prev) => ({ ...prev, [nextContribution.id]: event.target.value }))
                }
              />
              <StableButton debugId="commitments.shared.record-contribution" kind="primary" busy={busyKey === `record-${nextContribution.id}`} onClick={() => onRecordContribution(nextContribution)}>
                Record
              </StableButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {isCoordinator && ["draft", "inviting", "ready_to_activate"].includes(run.status) ? (
        <div style={{ marginTop: 12, ...softCard() }} data-commitments-add-people="exact-gsn-id">
          <div style={{ fontWeight: 950, color: "#07172C" }}>Add people</div>
          <div style={{ marginTop: 6, ...muted() }}>Use exact GSN ID. This is not a directory search.</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 96px auto", gap: 8 }}>
            <input style={field()} value={invite.gsnId} placeholder="Exact GSN ID" onChange={(event) => setInvite((prev) => ({ ...prev, gsnId: event.target.value }))} />
            <input style={field()} value={invite.rotation} inputMode="numeric" placeholder="Turn" onChange={(event) => setInvite((prev) => ({ ...prev, rotation: event.target.value }))} />
            <StableButton debugId="commitments.shared.invite" kind="primary" disabled={!safeText(invite.gsnId)} busy={busyKey === `invite-${run.id}`} onClick={onInvite}>
              Add
            </StableButton>
          </div>
        </div>
      ) : null}

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 900, color: "#334155" }}>View terms and people</summary>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={grid(150)}>
            <div style={softCard()}><strong>Start</strong><br />{dateLabel(run.start_at)}</div>
            <div style={softCard()}><strong>Accepted</strong><br />{acceptedCount} of {run.participant_count_required}</div>
            <div style={softCard()}><strong>Money</strong><br />External to GSN</div>
          </div>
          {run.participants.map((row) => (
            <div key={`commitments-participant-${row.id}`} style={{ ...softCard(), display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span>Turn {row.rotation_position || "?"}</span>
              <span>{participantStatusLabel(row.status)}</span>
              <span>{Number(row.user_id) === Number(userId) ? "You" : "Participant"}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
