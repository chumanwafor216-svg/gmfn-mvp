import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableDisclosureSummary } from "../components/StableButton";
import {
  TrustPaperIcon,
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
} from "../components/TrustPaperMarks";
import {
  addCommunityConfirmationReviewEvidence,
  getAccessToken,
  getCommunityConfirmationReviewEvidence,
  getPublicCommunityConfirmation,
  getCommunityConfirmationDecision,
  recordCommunityConfirmationDecision,
  safeCopy,
  updateCommunityConfirmationDecisionStatus,
  updateCommunityConfirmationReviewCase,
  updateCommunityConfirmationRequestStatus,
} from "../lib/api";
import { publicFrontendUrl } from "../lib/publicLinks";

type CommunityResponse = {
  requests_sent?: number | null;
  active_member_count?: number | null;
  responses_received?: number | null;
  confirmed_known_count?: number | null;
  caution_count?: number | null;
  objection_count?: number | null;
  community_confidence?: string | null;
  private_contacts_exposed?: boolean | null;
};

type PublicOutcome = {
  request_id?: number | string | null;
  public_token?: string | null;
  status?: string | null;
  mode?: string | null;
  reason_type?: string | null;
  risk_level?: string | null;
  community_name?: string | null;
  community_id?: number | string | null;
  community_code?: string | null;
  subject_user_id?: number | string | null;
  created_at?: string | null;
  expires_at?: string | null;
  community_response?: CommunityResponse | null;
  visible_summary?: string | null;
  privacy_note?: string | null;
  decision_note?: string | null;
  review_case?: ReviewCaseSnapshot | null;
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

type DecisionSnapshot = {
  decisionId: number | string;
  decision: string;
  status: string;
  settled?: boolean | null;
  issueReported?: boolean | null;
};

type TrustReadingEffect = {
  impact?: string | null;
  resolution?: string | null;
  trustDelta?: string | null;
  label?: string | null;
  plainLanguage?: string | null;
  readerAction?: string | null;
};

type ReviewCaseSnapshot = {
  reviewCaseId: number | string;
  status: string;
  reviewReason?: string | null;
  resolution?: string | null;
  trustImpact?: string | null;
  trustReadingEffect?: TrustReadingEffect | null;
};

type ReviewEvidenceSnapshot = {
  evidenceId: number | string;
  evidenceType: string;
  title: string;
  body?: string | null;
  externalRef?: string | null;
  visibility?: string | null;
  createdAt?: string | null;
};

function safeStr(value: any): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function asNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function safeDateTime(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "Not shown";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function terminalStatus(status: string): boolean {
  return ["closed", "expired", "cancelled", "under_review"].includes(status);
}

function secondsUntil(value: any): number {
  const raw = safeStr(value);
  if (!raw) return 0;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return 0;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function labelize(value: any): string {
  const text = safeStr(value).replace(/[_-]+/g, " ");
  if (!text) return "Not shown";
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeTrustReadingEffect(raw: any): TrustReadingEffect | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    impact: firstTruthy(raw.impact),
    resolution: firstTruthy(raw.resolution),
    trustDelta: firstTruthy(raw.trust_delta, raw.trustDelta),
    label: firstTruthy(raw.label),
    plainLanguage: firstTruthy(raw.plain_language, raw.plainLanguage),
    readerAction: firstTruthy(raw.reader_action, raw.readerAction),
  };
}

function normalizeReviewEvidence(raw: any): ReviewEvidenceSnapshot {
  return {
    evidenceId: raw?.evidence_id ?? raw?.id ?? "",
    evidenceType: firstTruthy(raw?.evidence_type, "note"),
    title: firstTruthy(raw?.title, "Review evidence"),
    body: firstTruthy(raw?.body),
    externalRef: firstTruthy(raw?.external_ref),
    visibility: firstTruthy(raw?.visibility, "internal"),
    createdAt: firstTruthy(raw?.created_at),
  };
}

function normalizeOutcome(raw: any): PublicOutcome {
  const src = raw?.outcome || raw?.data || raw || {};
  const reviewCase = src.review_case || null;
  return {
    request_id: src.request_id ?? src.id ?? null,
    public_token: src.public_token ?? null,
    status: firstTruthy(src.status),
    mode: firstTruthy(src.mode),
    reason_type: firstTruthy(src.reason_type),
    risk_level: firstTruthy(src.risk_level),
    community_name: firstTruthy(src.community_name),
    community_id: src.community_id ?? null,
    community_code: firstTruthy(src.community_code),
    subject_user_id: src.subject_user_id ?? null,
    created_at: firstTruthy(src.created_at),
    expires_at: firstTruthy(src.expires_at),
    community_response: src.community_response || null,
    visible_summary: firstTruthy(src.visible_summary),
    privacy_note: firstTruthy(src.privacy_note),
    decision_note: firstTruthy(src.decision_note),
    review_case: reviewCase?.review_case_id
      ? {
          reviewCaseId: reviewCase.review_case_id,
          status: firstTruthy(reviewCase.status, "open"),
          reviewReason: firstTruthy(reviewCase.review_reason),
          resolution: firstTruthy(reviewCase.resolution),
          trustImpact: firstTruthy(reviewCase.trust_impact),
          trustReadingEffect: normalizeTrustReadingEffect(reviewCase.trust_reading_effect),
        }
      : null,
  };
}

function pageShell(): React.CSSProperties {
  return {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "20px 16px 42px",
    display: "grid",
    gap: 16,
  };
}

function paperCard(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    background: "#FFFFFF",
    border: "1px solid rgba(8,35,58,0.14)",
    boxShadow: "0 24px 70px rgba(6,24,39,0.14)",
  };
}

function sectionCard(background = "#FFFFFF"): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    background,
    border: "1px solid rgba(8,35,58,0.12)",
    padding: 16,
    boxShadow: "0 10px 28px rgba(6,24,39,0.06)",
  };
}

function sectionTitle(): React.CSSProperties {
  return {
    margin: 0,
    color: "#07172C",
    fontSize: 19,
    fontWeight: 1000,
    lineHeight: 1.16,
  };
}

function helperText(): React.CSSProperties {
  return {
    margin: 0,
    color: "#526579",
    fontSize: 14,
    fontWeight: 760,
    lineHeight: 1.5,
  };
}

function statTile(background = "#F7FAFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background,
    border: "1px solid rgba(8,35,58,0.10)",
    padding: 14,
    minHeight: 92,
    display: "grid",
    alignContent: "space-between",
    gap: 8,
  };
}

function badgeStyle(tone: "good" | "warn" | "bad" | "info" = "info"): React.CSSProperties {
  const map = {
    good: ["#EAF7EE", "#166534", "rgba(46,155,98,0.22)"],
    warn: ["#FFF7E6", "#92400E", "rgba(245,158,11,0.24)"],
    bad: ["#FEF2F2", "#991B1B", "rgba(200,58,58,0.22)"],
    info: ["#EAF3FF", "#073E83", "rgba(11,99,209,0.18)"],
  } as const;
  const [bg, color, border] = map[tone];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    width: "fit-content",
    maxWidth: "100%",
    borderRadius: 999,
    padding: "7px 11px",
    background: bg,
    color,
    border: `1px solid ${border}`,
    fontSize: 13,
    fontWeight: 1000,
    lineHeight: 1.15,
  };
}

function outcomeTone(status: string, confidence: string): "good" | "warn" | "bad" | "info" {
  if (status === "expired") return "bad";
  if (confidence === "strong" || confidence === "moderate") return "good";
  if (confidence === "caution") return "bad";
  if (confidence === "limited") return "warn";
  return "info";
}

function outcomeTitle(status: string, confidence: string): string {
  if (status === "expired") return "Request expired";
  if (confidence === "strong") return "Strong community confirmation";
  if (confidence === "moderate") return "Moderate community confirmation";
  if (confidence === "limited") return "Limited community confirmation";
  if (confidence === "caution") return "Caution raised";
  if (confidence === "not_available") return "No community response yet";
  return "Waiting for community response";
}

function outcomeMeaning(status: string, confidence: string): string {
  if (status === "expired") {
    return "This confirmation window has passed. Ask the holder to request a fresh community confirmation before relying on it.";
  }
  if (confidence === "strong") {
    return "Enough approved community contacts have confirmed this person for a low-risk first trust check.";
  }
  if (confidence === "moderate") {
    return "The community response is useful, but a careful reader should still keep the decision proportionate.";
  }
  if (confidence === "limited") {
    return "Some confirmation exists, but it is not deep enough for heavy reliance. Ask for more evidence for higher-risk decisions.";
  }
  if (confidence === "caution") {
    return "At least one response raised caution. Do not rely heavily without deeper review.";
  }
  return "The request has been sent. The result will become clearer when approved community contacts respond.";
}

function reasonMeaning(reason: string): string {
  if (reason === "merchant_trust_check") return "Merchant or small trade trust check";
  if (reason === "support_verification") return "Support or emergency-help verification";
  if (reason === "job_opportunity") return "Work or opportunity reference check";
  if (reason === "community_joining") return "Community joining or acceptance check";
  if (reason === "service_home_entry") return "Service or home-entry trust check";
  return labelize(reason);
}

function decisionFromResult(result: any): DecisionSnapshot | null {
  if (!result?.decision_found && !result?.decision_id) return null;
  return {
    decisionId: result?.decision_id,
    decision: firstTruthy(result?.decision, "recorded"),
    status: firstTruthy(result?.status, "recorded"),
    settled: result?.settled ?? null,
    issueReported: result?.issue_reported ?? null,
  };
}

export default function CommunityConfirmationOutcomePage() {
  const { token } = useParams<{ token: string }>();
  const [outcome, setOutcome] = useState<PublicOutcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [decisionBusy, setDecisionBusy] = useState("");
  const [requestStatusBusy, setRequestStatusBusy] = useState("");
  const [requestStatusNote, setRequestStatusNote] = useState("");
  const [decisionSnapshot, setDecisionSnapshot] = useState<DecisionSnapshot | null>(null);
  const [reviewBusy, setReviewBusy] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewEvidence, setReviewEvidence] = useState<ReviewEvidenceSnapshot[]>([]);
  const [reviewEvidenceBusy, setReviewEvidenceBusy] = useState("");
  const [evidenceType, setEvidenceType] = useState("note");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceBody, setEvidenceBody] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");

  const tokenText = safeStr(token);
  const outcomeLink = useMemo(
    () => publicFrontendUrl(`/community-confirmations/public/${encodeURIComponent(tokenText)}`),
    [tokenText]
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const loadOutcome = useCallback(async (options?: { silent?: boolean }) => {
    if (!tokenText) {
      setError("Community confirmation token is missing.");
      setLoading(false);
      return;
    }
    if (!options?.silent) {
      setLoading(true);
      setError("");
    }
    try {
      const result = await getPublicCommunityConfirmation(tokenText);
      setOutcome(normalizeOutcome(result));
    } catch (err: any) {
      if (!options?.silent) {
        setOutcome(null);
        setError(err?.message || "Community confirmation could not be loaded.");
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [tokenText]);

  useEffect(() => {
    void loadOutcome();
  }, [loadOutcome]);

  useEffect(() => {
    if (!outcome?.expires_at) {
      setRemainingSeconds(0);
      return undefined;
    }
    const update = () => setRemainingSeconds(secondsUntil(outcome.expires_at));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [outcome?.expires_at]);

  useEffect(() => {
    const requestId = outcome?.request_id;
    if (!requestId || decisionSnapshot || !getAccessToken()) return;
    let alive = true;
    getCommunityConfirmationDecision(requestId)
      .then((result) => {
        if (!alive) return;
        const next = decisionFromResult(result);
        if (next) setDecisionSnapshot(next);
      })
      .catch(() => {
        // Public readers may not be signed in. The paper remains usable without provider controls.
      });
    return () => {
      alive = false;
    };
  }, [outcome?.request_id, decisionSnapshot]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const reviewCaseId = outcome?.review_case?.reviewCaseId;
    if (!reviewCaseId || !getAccessToken()) {
      setReviewEvidence([]);
      return;
    }
    let alive = true;
    setReviewEvidenceBusy("load");
    getCommunityConfirmationReviewEvidence(reviewCaseId)
      .then((result) => {
        if (!alive) return;
        const items = Array.isArray(result?.items) ? result.items : [];
        setReviewEvidence(items.map(normalizeReviewEvidence));
      })
      .catch(() => {
        if (alive) setReviewEvidence([]);
      })
      .finally(() => {
        if (alive) setReviewEvidenceBusy("");
      });
    return () => {
      alive = false;
    };
  }, [outcome?.review_case?.reviewCaseId]);

  const response = outcome?.community_response || {};
  const status = safeStr(outcome?.status).toLowerCase() || "pending";
  const confidence =
    safeStr(response.community_confidence).toLowerCase() ||
    (status === "expired" ? "expired" : "pending");
  const tone = outcomeTone(status, confidence);
  const requestsSent = asNumber(response.requests_sent);
  const activeMemberCount = asNumber(response.active_member_count);
  const responsesReceived = asNumber(response.responses_received);
  const confirmedKnown = asNumber(response.confirmed_known_count);
  const cautionCount = asNumber(response.caution_count);
  const objectionCount = asNumber(response.objection_count);
  const liveWindowOpen = Boolean(outcome && !terminalStatus(status) && remainingSeconds > 0);
  const responseProgress = requestsSent > 0 ? Math.min(100, Math.round((responsesReceived / requestsSent) * 100)) : 0;

  useEffect(() => {
    if (!outcome || terminalStatus(status) || remainingSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      void loadOutcome({ silent: true });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [loadOutcome, outcome, remainingSeconds, status]);

  async function copyLink() {
    const copied = await safeCopy(outcomeLink);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied ? "Public outcome link copied." : "Copy failed. Use the browser address bar.",
    });
  }

  function printPage() {
    if (typeof window !== "undefined") window.print();
  }

  async function recordDecision(decision: string) {
    const requestId = outcome?.request_id;
    if (!requestId) {
      setNotice({ tone: "error", text: "The confirmation request ID is missing." });
      return;
    }
    setDecisionBusy(decision);
    try {
      const result = await recordCommunityConfirmationDecision(requestId, {
        decision,
        amount_band:
          decision === "partial_release" || decision === "reduced" ? "low" : undefined,
        issue_reported: false,
        settled: decision === "released" || decision === "partial_release" ? true : undefined,
        decision_note:
          decision === "released"
            ? "Provider proceeded after reviewing the community confirmation."
            : decision === "partial_release" || decision === "reduced"
              ? "Provider reduced the exposure after reviewing the community confirmation."
              : decision === "did_not_release"
                ? "Provider did not proceed after reviewing the community confirmation."
                : "Provider deferred the decision after reviewing the community confirmation.",
      });
      setDecisionSnapshot(
        decisionFromResult({
          ...result,
          status: result?.decision_status,
          settled: decision === "released" || decision === "partial_release" ? true : null,
          issue_reported: false,
        }) || {
          decisionId: result?.decision_id,
          decision: result?.decision || decision,
          status: result?.decision_status || "recorded",
          settled: decision === "released" || decision === "partial_release" ? true : null,
          issueReported: false,
        }
      );
      setNotice({ tone: "success", text: "Decision recorded into the Trust Event trail." });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          err?.message ||
          "Decision could not be recorded. Sign in as the provider or try again.",
      });
    } finally {
      setDecisionBusy("");
    }
  }

  async function updateDecisionStatus(statusValue: string) {
    if (!decisionSnapshot?.decisionId) {
      setNotice({ tone: "error", text: "Record a provider decision before updating its status." });
      return;
    }
    setDecisionBusy(`status:${statusValue}`);
    try {
      const issueReported = statusValue === "issue_reported" ? true : undefined;
      const settled = statusValue === "settled" ? true : statusValue === "issue_reported" ? false : undefined;
      const result = await updateCommunityConfirmationDecisionStatus(decisionSnapshot.decisionId, {
        status: statusValue,
        issue_reported: issueReported,
        settled,
        decision_note:
          statusValue === "settled"
            ? "Provider marked this confirmation decision as settled."
            : statusValue === "issue_reported"
              ? "Provider reported an issue after the confirmation decision."
              : "Provider sent this confirmation decision for further review.",
      });
      setDecisionSnapshot((current) =>
        current
          ? {
              ...current,
              status: result?.status || statusValue,
              settled: result?.settled ?? current.settled,
              issueReported: result?.issue_reported ?? current.issueReported,
            }
          : current
      );
      const nextReview = result?.review_case;
      if (nextReview?.review_case_id) {
        setOutcome((current) =>
          current
            ? {
                ...current,
                status: statusValue === "under_review" ? "under_review" : current.status,
                review_case: {
                  reviewCaseId: nextReview.review_case_id,
                  status: firstTruthy(nextReview.status, "open"),
                  reviewReason: firstTruthy(nextReview.review_reason),
                  resolution: firstTruthy(nextReview.resolution),
                  trustImpact: firstTruthy(nextReview.trust_impact),
                  trustReadingEffect: normalizeTrustReadingEffect(nextReview.trust_reading_effect),
                },
              }
            : current
        );
      }
      setNotice({ tone: "success", text: "Decision status recorded into the Trust Event trail." });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          err?.message ||
          "Decision status could not be updated. Sign in as the provider or admin.",
      });
    } finally {
      setDecisionBusy("");
    }
  }

  async function updateRequestStatus(statusValue: string) {
    const requestId = outcome?.request_id;
    if (!requestId) {
      setNotice({ tone: "error", text: "The confirmation request ID is missing." });
      return;
    }
    setRequestStatusBusy(statusValue);
    try {
      const result = await updateCommunityConfirmationRequestStatus(requestId, {
        status: statusValue,
        status_reason:
          statusValue === "closed"
            ? "provider_or_admin_closed"
            : statusValue === "cancelled"
              ? "confirmation_cancelled"
              : "sent_for_review",
        status_note:
          safeStr(requestStatusNote).slice(0, 500) ||
          (statusValue === "closed"
            ? "Confirmation request was intentionally closed."
            : statusValue === "cancelled"
              ? "Confirmation request was intentionally cancelled."
              : "Confirmation request was sent for review."),
      });
      const nextOutcome = normalizeOutcome(result?.request || result);
      setOutcome(nextOutcome);
      setRequestStatusNote("");
      setNotice({ tone: "success", text: "Request status recorded into the Trust Event trail." });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          err?.message ||
          "Request status could not be updated. Sign in as the requester, provider, or admin.",
      });
    } finally {
      setRequestStatusBusy("");
    }
  }

  async function resolveReviewCase(resolution: string, trustImpact: string) {
    const reviewCase = outcome?.review_case;
    if (!reviewCase?.reviewCaseId) {
      setNotice({ tone: "error", text: "There is no review case on this confirmation yet." });
      return;
    }
    setReviewBusy(resolution);
    try {
      const result = await updateCommunityConfirmationReviewCase(reviewCase.reviewCaseId, {
        status: resolution === "dismissed" ? "dismissed" : "resolved",
        resolution,
        trust_impact: trustImpact,
        resolution_note:
          safeStr(reviewNote).slice(0, 500) ||
          (resolution === "confirmed_clean"
            ? "Review found no issue requiring trust pressure."
            : resolution === "insufficient_evidence"
              ? "Review closed with limited evidence. Use caution."
              : "Review closed after checking the confirmation record."),
      });
      const nextReview = result?.review_case;
      setOutcome((current) =>
        current
          ? {
              ...current,
              status: resolution === "dismissed" ? "cancelled" : "closed",
              review_case: nextReview?.review_case_id
                ? {
                    reviewCaseId: nextReview.review_case_id,
                    status: firstTruthy(nextReview.status, "resolved"),
                    reviewReason: firstTruthy(nextReview.review_reason),
                    resolution: firstTruthy(nextReview.resolution),
                    trustImpact: firstTruthy(nextReview.trust_impact),
                    trustReadingEffect: normalizeTrustReadingEffect(nextReview.trust_reading_effect),
                  }
                : current.review_case,
            }
          : current
      );
      setReviewNote("");
      setNotice({ tone: "success", text: "Review outcome recorded into the Trust Event trail." });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          err?.message ||
          "Review case could not be updated. Sign in as the requester, provider, or admin.",
      });
    } finally {
      setReviewBusy("");
    }
  }

  async function addReviewEvidence() {
    const reviewCase = outcome?.review_case;
    const title = safeStr(evidenceTitle).slice(0, 160);
    if (!reviewCase?.reviewCaseId) {
      setNotice({ tone: "error", text: "There is no review case to attach evidence to." });
      return;
    }
    if (!title) {
      setNotice({ tone: "error", text: "Add a short evidence title first." });
      return;
    }
    setReviewEvidenceBusy("add");
    try {
      const result = await addCommunityConfirmationReviewEvidence(reviewCase.reviewCaseId, {
        evidence_type: evidenceType,
        title,
        body: safeStr(evidenceBody).slice(0, 2000) || null,
        external_ref: safeStr(evidenceRef).slice(0, 240) || null,
      });
      const next = result?.evidence ? normalizeReviewEvidence(result.evidence) : null;
      if (next) {
        setReviewEvidence((current) => [next, ...current]);
      }
      setEvidenceTitle("");
      setEvidenceBody("");
      setEvidenceRef("");
      setNotice({ tone: "success", text: "Review evidence added to the Trust Event trail." });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          err?.message ||
          "Review evidence could not be added. Sign in as the opener, reviewer, or admin.",
      });
    } finally {
      setReviewEvidenceBusy("");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #F7FAFF 0%, #EEF5FF 48%, #F8FAFC 100%)",
      }}
    >
      <div style={pageShell()}>
        <PageTopNav
          sectionLabel="GSN verification"
          title="Instant Community Confirmation"
          subtitle="A live, privacy-safe community response for this specific trust decision."
          homeTo="/"
          homeLabel="Home"
          backTo="/"
          backLabel="Back"
        />

        <article style={paperCard()}>
          <TrustPaperWatermark name="community" color="#0B63D1" size={260} opacity={0.045} />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              padding: 22,
              display: "grid",
              gap: 16,
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <span
                  style={{
                    color: "#0B63D1",
                    fontSize: 12,
                    fontWeight: 1000,
                    letterSpacing: 0.9,
                    textTransform: "uppercase",
                  }}
                >
                  Main Movement
                </span>
                <h1
                  style={{
                    margin: 0,
                    color: "#061827",
                    fontSize: "clamp(30px, 7vw, 54px)",
                    lineHeight: 0.98,
                    fontWeight: 1000,
                    letterSpacing: 0,
                  }}
                >
                  Community Confirmation
                </h1>
                <p style={{ ...helperText(), maxWidth: 660 }}>
                  This paper shows whether approved community contacts have confirmed that the
                  person is known, reachable, and recognised inside a real GSN community.
                </p>
              </div>
              <div
                aria-label="GSN Global Support Network"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#061827",
                  fontWeight: 1000,
                }}
              >
                <span style={{ fontSize: 36, lineHeight: 1 }}>GSN</span>
                <span
                  style={{
                    width: 2,
                    height: 38,
                    background: "#D6AA45",
                    transform: "skew(-14deg)",
                  }}
                />
                <span style={{ fontSize: 13, lineHeight: 1.05 }}>
                  Global
                  <br />
                  Support
                  <br />
                  Network
                </span>
              </div>
            </header>

            {notice ? (
              <div
                role="status"
                style={{
                  ...sectionCard(notice.tone === "success" ? "#ECFDF3" : "#FEF2F2"),
                  color: notice.tone === "success" ? "#166534" : "#991B1B",
                  fontWeight: 1000,
                }}
              >
                {notice.text}
              </div>
            ) : null}

            {loading ? (
              <section style={sectionCard("#F7FAFF")}>
                <h2 style={sectionTitle()}>Loading confirmation paper</h2>
                <p style={helperText()}>
                  GSN is checking the public outcome without exposing private community contacts.
                </p>
              </section>
            ) : error ? (
              <section style={sectionCard("#FEF2F2")}>
                <h2 style={sectionTitle()}>Confirmation not found</h2>
                <p style={helperText()}>{error}</p>
                <PrimaryButton
                  debugId="community-confirmation-outcome.retry"
                  stableHeight={58}
                  onClick={() => void loadOutcome()}
                  style={{ marginTop: 14 }}
                >
                  Try again
                </PrimaryButton>
              </section>
            ) : outcome ? (
              <>
                <section
                  style={{
                    ...sectionCard(liveWindowOpen ? "#EAF3FF" : status === "expired" ? "#FEF2F2" : "#F7FAFF"),
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "grid", gap: 8 }}>
                    <span style={badgeStyle(liveWindowOpen ? "info" : status === "expired" ? "bad" : "warn")}>
                      <TrustPaperIcon name={liveWindowOpen ? "community" : status === "expired" ? "alert" : "shield"} size={18} />
                      {liveWindowOpen ? "Live confirmation window" : status === "expired" ? "Expired request" : "Confirmation window"}
                    </span>
                    <h2 style={sectionTitle()}>
                      {liveWindowOpen
                        ? "Waiting for community responders"
                        : status === "expired"
                          ? "The response window has ended"
                          : "Community response lane"}
                    </h2>
                    <p style={helperText()}>
                      {liveWindowOpen
                        ? "Keep this page open. GSN refreshes the outcome while eligible responders answer from their confirmation inbox."
                        : status === "expired"
                          ? "The request is now closed for late responses. Any non-response has been recorded internally as part of the Trust Event trail."
                          : "This page keeps the confirmation request separate from the full TrustSlip so the reader can follow one decision lane."}
                    </p>
                    <div
                      aria-label="Community confirmation response progress"
                      style={{
                        width: "100%",
                        height: 10,
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "rgba(8,35,58,0.10)",
                      }}
                    >
                      <div
                        style={{
                          width: `${responseProgress}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: liveWindowOpen ? "#0B63D1" : status === "expired" ? "#C83A3A" : "#D6AA45",
                          transition: "width 180ms ease",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      minWidth: 112,
                      borderRadius: 24,
                      padding: "14px 16px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(8,35,58,0.12)",
                      textAlign: "center",
                      boxShadow: "0 10px 24px rgba(6,24,39,0.08)",
                    }}
                  >
                    <div style={{ color: "#526579", fontSize: 12, fontWeight: 1000, textTransform: "uppercase" }}>
                      Time left
                    </div>
                    <div style={{ color: "#07172C", fontSize: 30, fontWeight: 1000, lineHeight: 1.05 }}>
                      {liveWindowOpen ? formatCountdown(remainingSeconds) : "00:00"}
                    </div>
                    <div style={{ marginTop: 8, color: "#526579", fontSize: 12, fontWeight: 900 }}>
                      {responsesReceived} / {requestsSent} responded
                    </div>
                  </div>
                </section>

                <section
                  style={{
                    ...sectionCard(
                      tone === "good"
                        ? "#ECFDF3"
                        : tone === "bad"
                          ? "#FEF2F2"
                          : tone === "warn"
                            ? "#FFF7E6"
                            : "#EAF3FF"
                    ),
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <TrustPaperWatermark
                    name={tone === "bad" ? "alert" : tone === "warn" ? "shield" : "check"}
                    color={tone === "bad" ? "#C83A3A" : tone === "warn" ? "#D6AA45" : "#2E9B62"}
                    size={150}
                    opacity={0.08}
                  />
                  <div style={{ display: "grid", gap: 10 }}>
                    <span style={badgeStyle(tone)}>
                      <TrustPaperIcon
                        name={tone === "bad" ? "alert" : tone === "warn" ? "shield" : "check"}
                        size={18}
                      />
                      {labelize(status)}
                    </span>
                    <h2 style={{ ...sectionTitle(), fontSize: "clamp(25px, 6vw, 42px)" }}>
                      {outcomeTitle(status, confidence)}
                    </h2>
                    <p style={{ ...helperText(), color: "#1F3145", maxWidth: 720 }}>
                      {outcomeMeaning(status, confidence)}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 116,
                      height: 116,
                      borderRadius: 32,
                      display: "grid",
                      placeItems: "center",
                      color: "#FFFFFF",
                      background:
                        tone === "bad"
                          ? "linear-gradient(135deg,#C83A3A,#7F1D1D)"
                          : tone === "warn"
                            ? "linear-gradient(135deg,#F2C766,#B7791F)"
                            : "linear-gradient(135deg,#2E9B62,#166534)",
                      boxShadow: "0 18px 34px rgba(6,24,39,0.16)",
                    }}
                  >
                    <TrustPaperIcon
                      name={tone === "bad" ? "alert" : tone === "warn" ? "shield" : "check"}
                      size={64}
                      strokeWidth={1.8}
                    />
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div style={sectionCard("#FFFFFF")}>
                    <h2 style={sectionTitle()}>Who is being confirmed?</h2>
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <InfoRow label="Community" value={outcome.community_name || "Not shown"} />
                      <InfoRow
                        label="Community ID"
                        value={firstTruthy(outcome.community_code, outcome.community_id)}
                      />
                      <InfoRow label="Member reference" value={outcome.subject_user_id || "Protected"} />
                    </div>
                  </div>

                  <div style={sectionCard("#F8FBFF")}>
                    <h2 style={sectionTitle()}>What was requested?</h2>
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <InfoRow label="Reason" value={reasonMeaning(safeStr(outcome.reason_type))} />
                      <InfoRow label="Risk level" value={labelize(outcome.risk_level)} />
                      <InfoRow label="Mode" value={labelize(outcome.mode)} />
                    </div>
                  </div>
                </section>

                <section style={sectionCard("#FFFFFF")}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    <h2 style={sectionTitle()}>Community response</h2>
                    <p style={helperText()}>
                      These are aggregate counts only. GSN shows how many people were asked and
                      how many active community members responded. It does not show private phone
                      numbers or individual responder names on this public paper.
                    </p>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <Stat label="Requests sent" value={requestsSent} icon="community" />
                    <Stat label="Responses received" value={responsesReceived} icon="document" />
                    <Stat label="Active members" value={activeMemberCount} icon="community" />
                    <Stat label="Confirmed known" value={confirmedKnown} icon="check" />
                    <Stat label="Caution raised" value={cautionCount} icon="alert" tone="warn" />
                    <Stat label="Objections" value={objectionCount} icon="lock" tone="bad" />
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div style={sectionCard("#F7FAFF")}>
                    <h2 style={sectionTitle()}>Plain reading</h2>
                    <p style={{ ...helperText(), color: "#1F3145", marginTop: 10 }}>
                      {outcome.visible_summary ||
                        "The instant community response is not complete yet. Refresh later or ask for more evidence."}
                    </p>
                  </div>
                  <div style={sectionCard("#FFF7E6")}>
                    <h2 style={sectionTitle()}>Reader decision note</h2>
                    <p style={{ ...helperText(), color: "#1F3145", marginTop: 10 }}>
                      {outcome.decision_note ||
                        "Use this as evidence for judgement, not as an automatic approval."}
                    </p>
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div style={sectionCard("#ECFDF3")}>
                    <TrustPaperWatermark name="shield" color="#2E9B62" size={132} opacity={0.08} />
                    <h2 style={sectionTitle()}>Why a reader may use this</h2>
                    <ul style={{ ...helperText(), margin: "12px 0 0", paddingLeft: 20 }}>
                      <li>It is linked to a real community record.</li>
                      <li>It uses approved community contacts.</li>
                      <li>It gives a controlled public outcome.</li>
                      <li>It can be refreshed as more responses arrive.</li>
                    </ul>
                  </div>
                  <div style={sectionCard("#FEF2F2")}>
                    <TrustPaperWatermark name="alert" color="#C83A3A" size={132} opacity={0.08} />
                    <h2 style={sectionTitle()}>What this does not mean</h2>
                    <ul style={{ ...helperText(), margin: "12px 0 0", paddingLeft: 20 }}>
                      <li>Not a bank guarantee.</li>
                      <li>Not automatic lending or credit release.</li>
                      <li>Not a legal promise of repayment.</li>
                      <li>Not a public list of community contacts.</li>
                    </ul>
                  </div>
                </section>

                <section style={sectionCard("#FFFFFF")}>
                  <h2 style={sectionTitle()}>Public actions</h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 12,
                      marginTop: 14,
                    }}
                  >
                    <PrimaryButton
                      debugId="community-confirmation-outcome.refresh"
                      stableHeight={64}
                      onClick={() => void loadOutcome()}
                    >
                      <TrustPaperIcon name="refresh" size={20} />
                      Refresh outcome
                    </PrimaryButton>
                    <SecondaryButton
                      debugId="community-confirmation-outcome.copy-link"
                      stableHeight={64}
                      onClick={() => void copyLink()}
                    >
                      <TrustPaperIcon name="copy" size={20} />
                      Copy public link
                    </SecondaryButton>
                    <SecondaryButton
                      debugId="community-confirmation-outcome.print"
                      stableHeight={64}
                      onClick={printPage}
                    >
                      <TrustPaperIcon name="document" size={20} />
                      Print / Save PDF
                    </SecondaryButton>
                  </div>
                </section>

                <details style={sectionCard("#F7FAFF")}>
                  <StableDisclosureSummary
                    debugId="community-confirmation-outcome.record-decision"
                    stableHeight={52}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      fontWeight: 1000,
                      color: "#07172C",
                    }}
                  >
                    <span>Record provider decision</span>
                    <span style={badgeStyle("info")}>Signed-in action</span>
                  </StableDisclosureSummary>
                  <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                    <p style={helperText()}>
                      If you are the merchant, provider, or opportunity gatekeeper, record what
                      you did after reading this confirmation. This adds a Trust Event without
                      exposing private community contacts.
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: 10,
                      }}
                    >
                      <PrimaryButton
                        debugId="community-confirmation-outcome.decision.partial-release"
                        stableHeight={58}
                        busy={decisionBusy === "partial_release"}
                        onClick={() => void recordDecision("partial_release")}
                      >
                        Reduce and proceed
                      </PrimaryButton>
                      <SecondaryButton
                        debugId="community-confirmation-outcome.decision.did-not-release"
                        stableHeight={58}
                        busy={decisionBusy === "did_not_release"}
                        onClick={() => void recordDecision("did_not_release")}
                      >
                        Do not proceed
                      </SecondaryButton>
                      <SecondaryButton
                        debugId="community-confirmation-outcome.decision.deferred"
                        stableHeight={58}
                        busy={decisionBusy === "deferred"}
                        onClick={() => void recordDecision("deferred")}
                      >
                        Ask for more evidence
                      </SecondaryButton>
                    </div>
                    {decisionSnapshot ? (
                      <div
                        style={{
                          ...sectionCard("#FFFFFF"),
                          display: "grid",
                          gap: 12,
                          boxShadow: "none",
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <span style={badgeStyle("good")}>
                            Decision: {labelize(decisionSnapshot.decision)}
                          </span>
                          <span style={badgeStyle(decisionSnapshot.status === "issue_reported" ? "bad" : "info")}>
                            Status: {labelize(decisionSnapshot.status)}
                          </span>
                        </div>
                        <p style={helperText()}>
                          If something changes after the first decision, record the new status here.
                          GSN keeps this as part of the same evidence trail.
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                            gap: 10,
                          }}
                        >
                          <PrimaryButton
                            debugId="community-confirmation-outcome.decision-status.settled"
                            stableHeight={56}
                            busy={decisionBusy === "status:settled"}
                            onClick={() => void updateDecisionStatus("settled")}
                          >
                            Mark settled
                          </PrimaryButton>
                          <SecondaryButton
                            debugId="community-confirmation-outcome.decision-status.issue"
                            stableHeight={56}
                            busy={decisionBusy === "status:issue_reported"}
                            onClick={() => void updateDecisionStatus("issue_reported")}
                          >
                            Report issue
                          </SecondaryButton>
                          <SecondaryButton
                            debugId="community-confirmation-outcome.decision-status.review"
                            stableHeight={56}
                            busy={decisionBusy === "status:under_review"}
                            onClick={() => void updateDecisionStatus("under_review")}
                          >
                            Send to review
                          </SecondaryButton>
                        </div>
                      </div>
                    ) : null}

                    <div
                      style={{
                        ...sectionCard("#FFFFFF"),
                        display: "grid",
                        gap: 12,
                        boxShadow: "none",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <span style={badgeStyle("info")}>Request lifecycle</span>
                        <span style={badgeStyle(status === "cancelled" ? "bad" : status === "under_review" ? "warn" : "info")}>
                          Current: {labelize(status)}
                        </span>
                      </div>
                      <p style={helperText()}>
                        Close, cancel, or send this confirmation to review when the live request
                        should no longer sit open. This records the lifecycle decision as a Trust Event.
                      </p>
                      <textarea
                        value={requestStatusNote}
                        onChange={(event) => setRequestStatusNote(event.target.value.slice(0, 500))}
                        maxLength={500}
                        placeholder="Optional reason for closing, cancelling, or sending this confirmation to review."
                        style={{
                          width: "100%",
                          minHeight: 86,
                          resize: "vertical",
                          boxSizing: "border-box",
                          borderRadius: 16,
                          border: "1px solid rgba(8,35,58,0.14)",
                          padding: 12,
                          color: "#07172C",
                          fontSize: 14,
                          fontWeight: 800,
                          lineHeight: 1.45,
                          background: "#F8FBFF",
                          outline: "none",
                        }}
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <PrimaryButton
                          debugId="community-confirmation-outcome.request-status.close"
                          stableHeight={56}
                          busy={requestStatusBusy === "closed"}
                          onClick={() => void updateRequestStatus("closed")}
                        >
                          Close request
                        </PrimaryButton>
                        <SecondaryButton
                          debugId="community-confirmation-outcome.request-status.review"
                          stableHeight={56}
                          busy={requestStatusBusy === "under_review"}
                          onClick={() => void updateRequestStatus("under_review")}
                        >
                          Send to review
                        </SecondaryButton>
                        <SecondaryButton
                          debugId="community-confirmation-outcome.request-status.cancel"
                          stableHeight={56}
                          busy={requestStatusBusy === "cancelled"}
                          onClick={() => void updateRequestStatus("cancelled")}
                        >
                          Cancel request
                        </SecondaryButton>
                      </div>
                      {outcome.review_case ? (
                        <div
                          style={{
                            borderRadius: 18,
                            border: "1px solid rgba(214,170,69,0.30)",
                            background: "#FFFBEB",
                            padding: 14,
                            display: "grid",
                            gap: 12,
                          }}
                        >
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <span style={badgeStyle("warn")}>Review case</span>
                            <span style={badgeStyle("info")}>
                              Status: {labelize(outcome.review_case.status)}
                            </span>
                            {outcome.review_case.trustImpact ? (
                              <span style={badgeStyle(outcome.review_case.trustImpact === "negative" ? "bad" : outcome.review_case.trustImpact === "caution" ? "warn" : "info")}>
                                Trust impact: {labelize(outcome.review_case.trustImpact)}
                              </span>
                            ) : null}
                          </div>
                          <p style={helperText()}>
                            This confirmation has a review case. Close it only after the record
                            has been checked. The outcome becomes part of the Trust Event trail.
                          </p>
                          {outcome.review_case.trustReadingEffect?.label ? (
                            <div
                              style={{
                                borderRadius: 16,
                                border: "1px solid rgba(8,35,58,0.12)",
                                background: "#FFFFFF",
                                padding: 12,
                                display: "grid",
                                gap: 6,
                              }}
                            >
                              <strong style={{ color: "#07172C", fontSize: 14 }}>
                                Trust reading effect: {outcome.review_case.trustReadingEffect.label}
                              </strong>
                              {outcome.review_case.trustReadingEffect.plainLanguage ? (
                                <p style={{ ...helperText(), margin: 0 }}>
                                  {outcome.review_case.trustReadingEffect.plainLanguage}
                                </p>
                              ) : null}
                              {outcome.review_case.trustReadingEffect.readerAction ? (
                                <p style={{ ...helperText(), margin: 0 }}>
                                  {outcome.review_case.trustReadingEffect.readerAction}
                                </p>
                              ) : null}
                              {outcome.review_case.trustReadingEffect.trustDelta ? (
                                <span style={badgeStyle("info")}>
                                  Reading movement: {outcome.review_case.trustReadingEffect.trustDelta}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          <details style={sectionCard("#FFFFFF")}>
                            <StableDisclosureSummary
                              debugId="community-confirmation-outcome.review-evidence"
                              stableHeight={52}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                fontWeight: 1000,
                                color: "#07172C",
                              }}
                            >
                              <span>Internal review evidence</span>
                              <span style={badgeStyle("info")}>
                                {reviewEvidenceBusy === "load"
                                  ? "Loading"
                                  : `${reviewEvidence.length} item${reviewEvidence.length === 1 ? "" : "s"}`}
                              </span>
                            </StableDisclosureSummary>
                            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                              <p style={helperText()}>
                                Add private review context here. It is recorded for GSN review and
                                trust integrity, but it is not exposed as public member contact
                                information on this paper.
                              </p>
                              {reviewEvidence.length ? (
                                <div style={{ display: "grid", gap: 10 }}>
                                  {reviewEvidence.map((item) => (
                                    <div
                                      key={`${item.evidenceId}-${item.createdAt || item.title}`}
                                      style={{
                                        borderRadius: 16,
                                        border: "1px solid rgba(8,35,58,0.10)",
                                        background: "#F8FBFF",
                                        padding: 12,
                                        display: "grid",
                                        gap: 6,
                                      }}
                                    >
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                        <span style={badgeStyle("info")}>{labelize(item.evidenceType)}</span>
                                        <span style={badgeStyle("warn")}>
                                          {labelize(item.visibility || "internal")}
                                        </span>
                                      </div>
                                      <strong style={{ color: "#07172C", fontWeight: 1000 }}>
                                        {item.title}
                                      </strong>
                                      {item.body ? <p style={helperText()}>{item.body}</p> : null}
                                      {item.externalRef ? (
                                        <span style={{ ...helperText(), overflowWrap: "anywhere" }}>
                                          Ref: {item.externalRef}
                                        </span>
                                      ) : null}
                                      {item.createdAt ? (
                                        <span style={helperText()}>{safeDateTime(item.createdAt)}</span>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    borderRadius: 16,
                                    border: "1px dashed rgba(8,35,58,0.18)",
                                    background: "#F8FBFF",
                                    padding: 12,
                                  }}
                                >
                                  <p style={helperText()}>
                                    No internal review evidence is visible to this signed-in actor yet.
                                  </p>
                                </div>
                              )}
                              <div
                                style={{
                                  display: "grid",
                                  gap: 10,
                                  borderTop: "1px solid rgba(8,35,58,0.10)",
                                  paddingTop: 12,
                                }}
                              >
                                <select
                                  value={evidenceType}
                                  onChange={(event) => setEvidenceType(event.target.value)}
                                  style={{
                                    minHeight: 48,
                                    borderRadius: 14,
                                    border: "1px solid rgba(8,35,58,0.14)",
                                    padding: "0 12px",
                                    color: "#07172C",
                                    fontWeight: 900,
                                    background: "#FFFFFF",
                                  }}
                                >
                                  <option value="note">Review note</option>
                                  <option value="merchant_note">Merchant note</option>
                                  <option value="member_statement">Member statement</option>
                                  <option value="community_statement">Community statement</option>
                                  <option value="system_snapshot">System snapshot</option>
                                  <option value="external_reference">External reference</option>
                                </select>
                                <input
                                  value={evidenceTitle}
                                  onChange={(event) => setEvidenceTitle(event.target.value.slice(0, 160))}
                                  maxLength={160}
                                  placeholder="Evidence title"
                                  style={{
                                    minHeight: 48,
                                    borderRadius: 14,
                                    border: "1px solid rgba(8,35,58,0.14)",
                                    padding: "0 12px",
                                    color: "#07172C",
                                    fontWeight: 900,
                                    background: "#FFFFFF",
                                  }}
                                />
                                <textarea
                                  value={evidenceBody}
                                  onChange={(event) => setEvidenceBody(event.target.value.slice(0, 2000))}
                                  maxLength={2000}
                                  placeholder="Private evidence note for review."
                                  style={{
                                    width: "100%",
                                    minHeight: 92,
                                    resize: "vertical",
                                    boxSizing: "border-box",
                                    borderRadius: 14,
                                    border: "1px solid rgba(8,35,58,0.14)",
                                    padding: 12,
                                    color: "#07172C",
                                    fontSize: 14,
                                    fontWeight: 800,
                                    lineHeight: 1.45,
                                    background: "#FFFFFF",
                                    outline: "none",
                                  }}
                                />
                                <input
                                  value={evidenceRef}
                                  onChange={(event) => setEvidenceRef(event.target.value.slice(0, 240))}
                                  maxLength={240}
                                  placeholder="Optional reference"
                                  style={{
                                    minHeight: 48,
                                    borderRadius: 14,
                                    border: "1px solid rgba(8,35,58,0.14)",
                                    padding: "0 12px",
                                    color: "#07172C",
                                    fontWeight: 900,
                                    background: "#FFFFFF",
                                  }}
                                />
                                <SecondaryButton
                                  debugId="community-confirmation-outcome.review-evidence.add"
                                  stableHeight={56}
                                  busy={reviewEvidenceBusy === "add"}
                                  onClick={() => void addReviewEvidence()}
                                >
                                  Add review evidence
                                </SecondaryButton>
                              </div>
                            </div>
                          </details>
                          <textarea
                            value={reviewNote}
                            onChange={(event) => setReviewNote(event.target.value.slice(0, 500))}
                            maxLength={500}
                            placeholder="Optional review outcome note."
                            style={{
                              width: "100%",
                              minHeight: 82,
                              resize: "vertical",
                              boxSizing: "border-box",
                              borderRadius: 16,
                              border: "1px solid rgba(8,35,58,0.14)",
                              padding: 12,
                              color: "#07172C",
                              fontSize: 14,
                              fontWeight: 800,
                              lineHeight: 1.45,
                              background: "#FFFFFF",
                              outline: "none",
                            }}
                          />
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                              gap: 10,
                            }}
                          >
                            <PrimaryButton
                              debugId="community-confirmation-outcome.review.resolve-clean"
                              stableHeight={56}
                              busy={reviewBusy === "confirmed_clean"}
                              onClick={() => void resolveReviewCase("confirmed_clean", "none")}
                            >
                              Resolve clean
                            </PrimaryButton>
                            <SecondaryButton
                              debugId="community-confirmation-outcome.review.resolve-caution"
                              stableHeight={56}
                              busy={reviewBusy === "insufficient_evidence"}
                              onClick={() => void resolveReviewCase("insufficient_evidence", "caution")}
                            >
                              Resolve with caution
                            </SecondaryButton>
                            <SecondaryButton
                              debugId="community-confirmation-outcome.review.dismiss"
                              stableHeight={56}
                              busy={reviewBusy === "dismissed"}
                              onClick={() => void resolveReviewCase("dismissed", "none")}
                            >
                              Dismiss review
                            </SecondaryButton>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </details>

                <details style={sectionCard("#F8FBFF")}>
                  <StableDisclosureSummary
                    debugId="community-confirmation-outcome.technical-details"
                    stableHeight={52}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      fontWeight: 1000,
                      color: "#07172C",
                    }}
                  >
                    <span>Full evidence and technical detail</span>
                    <span style={badgeStyle("info")}>Open / close</span>
                  </StableDisclosureSummary>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <InfoTile label="Request ID" value={outcome.request_id || "Not shown"} />
                    <InfoTile label="Public token" value={outcome.public_token || tokenText} />
                    <InfoTile label="Created" value={safeDateTime(outcome.created_at)} />
                    <InfoTile label="Expires" value={safeDateTime(outcome.expires_at)} />
                    <InfoTile
                      label="Private contacts exposed"
                      value={response.private_contacts_exposed ? "Yes" : "No"}
                    />
                    <InfoTile
                      label="Privacy note"
                      value={
                        outcome.privacy_note ||
                        "GSN does not expose private member phone numbers on this public paper."
                      }
                    />
                  </div>
                </details>
              </>
            ) : null}
          </div>
          <TrustPaperSecurityFooter text="Human-first community confirmation: public outcome, private contacts protected." />
        </article>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(110px, 0.75fr) minmax(0, 1fr)",
        gap: 12,
        alignItems: "start",
        borderBottom: "1px dashed rgba(8,35,58,0.12)",
        paddingBottom: 9,
      }}
    >
      <span style={{ color: "#617085", fontWeight: 900, lineHeight: 1.28 }}>{label}</span>
      <strong style={{ color: "#07172C", fontWeight: 1000, lineHeight: 1.28 }}>{value}</strong>
    </div>
  );
}

function InfoTile({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div style={statTile()}>
      <span style={{ color: "#617085", fontSize: 13, fontWeight: 950 }}>{label}</span>
      <strong
        style={{
          color: "#07172C",
          fontSize: 17,
          fontWeight: 1000,
          lineHeight: 1.25,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = "info",
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof TrustPaperIcon>["name"];
  tone?: "good" | "warn" | "bad" | "info";
}) {
  const color =
    tone === "bad" ? "#991B1B" : tone === "warn" ? "#92400E" : tone === "good" ? "#166534" : "#073E83";
  return (
    <div style={statTile(tone === "bad" ? "#FEF2F2" : tone === "warn" ? "#FFF7E6" : "#F7FAFF")}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color, fontWeight: 1000 }}>
        <TrustPaperIcon name={icon} size={19} />
        {label}
      </span>
      <strong style={{ color: "#07172C", fontSize: 30, fontWeight: 1000, lineHeight: 1 }}>
        {value}
      </strong>
    </div>
  );
}
