import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PrimaryButton, SecondaryButton, StableDisclosureSummary } from "../components/StableButton";
import {
  TrustPaperIcon,
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

function pageShell(compact = false): React.CSSProperties {
  return {
    maxWidth: 900,
    margin: "0 auto",
    padding: compact ? "0 6px 28px" : "0 12px 42px",
    display: "grid",
    gap: 0,
  };
}

function paperCard(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(8,35,58,0.12)",
    boxShadow: "0 26px 76px rgba(6,24,39,0.16)",
  };
}

function paperHero(compact = false): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    padding: compact ? "22px 22px 30px" : "32px 36px 34px",
    minHeight: compact ? 214 : 258,
    color: "#FFFFFF",
    background:
      "radial-gradient(circle at 92% 38%, rgba(11,99,209,0.18), transparent 26%), linear-gradient(135deg, #061827 0%, #0B2D4A 100%)",
  };
}

function paperBody(compact = false): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    padding: compact ? "16px 16px 0" : "22px 34px 0",
    display: "grid",
    gap: compact ? 12 : 14,
    background: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  };
}

function sectionCard(background = "#FFFFFF"): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 17,
    background,
    border: "1px solid rgba(8,35,58,0.13)",
    padding: 16,
    boxShadow: "0 8px 22px rgba(6,24,39,0.04)",
  };
}

function sectionTitle(): React.CSSProperties {
  return {
    margin: 0,
    color: "#07172C",
    fontSize: 18,
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

function statTile(background = "#F7FAFF", compact = false): React.CSSProperties {
  return {
    borderRadius: compact ? 12 : 16,
    background,
    border: "1px solid rgba(8,35,58,0.10)",
    padding: compact ? 9 : 15,
    minHeight: compact ? 74 : 104,
    display: "grid",
    alignContent: "space-between",
    gap: compact ? 6 : 8,
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

function outcomeTitle(status: string, confidence: string): string {
  if (status === "expired") return "Expired request";
  if (confidence === "strong") return "Strong community confirmation";
  if (confidence === "moderate") return "Moderate community confirmation";
  if (confidence === "limited") return "Limited community confirmation";
  if (confidence === "caution") return "Caution raised";
  if (confidence === "not_available") return "No community response yet";
  return "Waiting for community response";
}

function outcomeMeaning(status: string, confidence: string): string {
  if (status === "expired") {
    return "The response window has passed. No valid responses were received.";
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
  const [isCompactPaper, setIsCompactPaper] = useState(false);

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
    const updateCompactPaper = () => {
      setIsCompactPaper(typeof window !== "undefined" && window.innerWidth < 620);
    };
    updateCompactPaper();
    window.addEventListener("resize", updateCompactPaper);
    return () => window.removeEventListener("resize", updateCompactPaper);
  }, []);

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
          "linear-gradient(180deg, #F7FAFF 0%, #EEF5FF 54%, #F8FAFC 100%)",
        paddingTop: 16,
      }}
    >
      <div style={pageShell(isCompactPaper)}>
        <article style={paperCard()}>
          <header style={paperHero(isCompactPaper)}>
            <TrustPaperWatermark
              name="shield"
              color="#FFFFFF"
              size={isCompactPaper ? 175 : 230}
              opacity={0.075}
              style={{ right: -18, bottom: -22 }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                alignItems: "flex-start",
                flexWrap: "wrap",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                aria-label="GSN Global Support Network"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#FFFFFF",
                  fontWeight: 1000,
                }}
              >
                <span style={{ fontSize: isCompactPaper ? 32 : 39, lineHeight: 0.95, letterSpacing: 0 }}>GSN</span>
                <span
                  style={{
                    width: 2,
                    height: isCompactPaper ? 34 : 42,
                    background: "#D6AA45",
                    transform: "skew(-14deg)",
                  }}
                />
                <span style={{ fontSize: isCompactPaper ? 11 : 13, lineHeight: 1.05 }}>
                  Global
                  <br />
                  Support
                  <br />
                  Network
                </span>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: isCompactPaper ? 34 : 42,
                  borderRadius: 999,
                  padding: isCompactPaper ? "0 11px" : "0 16px",
                  color: "#FFFFFF",
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                  fontSize: isCompactPaper ? 12 : 14,
                  fontWeight: 1000,
                }}
              >
                <TrustPaperIcon name="shield" size={isCompactPaper ? 15 : 18} color="#F6D77A" />
                Public Paper
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gap: 9,
                maxWidth: 680,
                marginTop: isCompactPaper ? 30 : 42,
                position: "relative",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  color: "#F6D77A",
                  fontSize: isCompactPaper ? 12 : 13,
                  fontWeight: 1000,
                  letterSpacing: 0.9,
                  textTransform: "uppercase",
                }}
              >
                GSN verification
              </span>
              <h1
                style={{
                  margin: 0,
                  color: "#FFFFFF",
                  fontSize: isCompactPaper ? 32 : "clamp(34px, 7vw, 56px)",
                  lineHeight: isCompactPaper ? 1.02 : 0.98,
                  fontWeight: 1000,
                  letterSpacing: 0,
                }}
              >
                Community Confirmation
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 560,
                  color: "rgba(255,255,255,0.84)",
                  fontSize: isCompactPaper ? 18 : 19,
                  fontWeight: 760,
                  lineHeight: 1.35,
                }}
              >
                A privacy-safe community response for this specific trust decision.
              </p>
            </div>
          </header>

          <div style={paperBody(isCompactPaper)}>
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
                    gridTemplateColumns: isCompactPaper ? "48px minmax(0, 1fr) 116px" : "72px minmax(0, 1fr) 168px",
                    gap: isCompactPaper ? 10 : 18,
                    alignItems: "center",
                    padding: isCompactPaper ? 12 : 18,
                    borderColor:
                      liveWindowOpen
                        ? "rgba(11,99,209,0.16)"
                        : status === "expired"
                          ? "rgba(200,58,58,0.18)"
                          : "rgba(214,170,69,0.22)",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: isCompactPaper ? 44 : 60,
                      height: isCompactPaper ? 44 : 60,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      color: "#FFFFFF",
                      background:
                        liveWindowOpen
                          ? "linear-gradient(135deg,#0B63D1,#073E83)"
                          : status === "expired"
                            ? "linear-gradient(135deg,#D43D3D,#991B1B)"
                            : "linear-gradient(135deg,#D6AA45,#92400E)",
                      boxShadow: "0 14px 28px rgba(6,24,39,0.12)",
                    }}
                  >
                    <TrustPaperIcon
                      name={liveWindowOpen ? "community" : status === "expired" ? "alert" : "shield"}
                      size={isCompactPaper ? 27 : 36}
                      strokeWidth={1.9}
                    />
                  </div>
                  <div style={{ display: "grid", gap: isCompactPaper ? 4 : 7, minWidth: 0 }}>
                    <h2 style={{ ...sectionTitle(), fontSize: isCompactPaper ? 18 : 23 }}>
                      {liveWindowOpen
                        ? "Live request"
                        : status === "expired"
                          ? "Expired request"
                          : outcomeTitle(status, confidence)}
                    </h2>
                    <p style={{ ...helperText(), color: "#1F3145", fontSize: isCompactPaper ? 12 : 14, lineHeight: isCompactPaper ? 1.35 : 1.5 }}>
                      {outcomeMeaning(status, confidence)}
                    </p>
                    {liveWindowOpen ? (
                      <div
                        aria-label="Community confirmation response progress"
                        style={{
                          width: "100%",
                          height: 8,
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
                            background: "#0B63D1",
                            transition: "width 180ms ease",
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      minWidth: 0,
                      minHeight: isCompactPaper ? 74 : 94,
                      borderRadius: isCompactPaper ? 12 : 15,
                      padding: isCompactPaper ? "9px 8px" : "13px 14px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(8,35,58,0.12)",
                      textAlign: "center",
                      boxShadow: "0 10px 24px rgba(6,24,39,0.08)",
                    }}
                  >
                    <div style={{ color: "#526579", fontSize: isCompactPaper ? 10 : 12, fontWeight: 1000, textTransform: "uppercase" }}>
                      Time left
                    </div>
                    <div style={{ color: "#07172C", fontSize: isCompactPaper ? 28 : 36, fontWeight: 1000, lineHeight: 1.05, letterSpacing: isCompactPaper ? 0.8 : 1.5 }}>
                      {liveWindowOpen ? formatCountdown(remainingSeconds) : "00:00"}
                    </div>
                    <div style={{ marginTop: isCompactPaper ? 5 : 8, color: "#526579", fontSize: isCompactPaper ? 10 : 12, fontWeight: 900 }}>
                      {responsesReceived} / {requestsSent} responded
                    </div>
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompactPaper ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: isCompactPaper ? 12 : 16,
                  }}
                >
                  <div style={sectionCard("#FFFFFF")}>
                    <h2 style={{ ...sectionTitle(), display: "flex", alignItems: "center", gap: 10 }}>
                      <TrustPaperIcon name="user" size={22} color="#0B63D1" />
                      Who is being confirmed?
                    </h2>
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <InfoRow compact={isCompactPaper} label="Community" value={outcome.community_name || "Not shown"} />
                      <InfoRow
                        compact={isCompactPaper}
                        label="Community ID"
                        value={firstTruthy(outcome.community_code, outcome.community_id)}
                      />
                      <InfoRow compact={isCompactPaper} label="Member reference" value={outcome.subject_user_id || "Protected"} />
                    </div>
                  </div>

                  <div style={sectionCard("#F8FBFF")}>
                    <h2 style={{ ...sectionTitle(), display: "flex", alignItems: "center", gap: 10 }}>
                      <TrustPaperIcon name="document" size={22} color="#0B63D1" />
                      What was requested?
                    </h2>
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <InfoRow compact={isCompactPaper} label="Reason" value={reasonMeaning(safeStr(outcome.reason_type))} />
                      <InfoRow compact={isCompactPaper} label="Risk level" value={labelize(outcome.risk_level)} />
                      <InfoRow compact={isCompactPaper} label="Mode" value={labelize(outcome.mode)} />
                    </div>
                  </div>
                </section>

                <section style={sectionCard("#FFFFFF")}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    <h2 style={{ ...sectionTitle(), display: "flex", alignItems: "center", gap: 10 }}>
                      <TrustPaperIcon name="community" size={23} color="#0B63D1" />
                      Community response
                    </h2>
                    <p style={helperText()}>
                      Aggregate counts only. No personal details are shown.
                    </p>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompactPaper ? "repeat(3, minmax(0, 1fr))" : "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: isCompactPaper ? 8 : 12,
                    }}
                  >
                    <Stat compact={isCompactPaper} label="Requests sent" value={requestsSent} icon="spark" />
                    <Stat compact={isCompactPaper} label="Responses received" value={responsesReceived} icon="document" />
                    <Stat compact={isCompactPaper} label="Active members" value={activeMemberCount} icon="community" />
                    <Stat compact={isCompactPaper} label="Confirmed known" value={confirmedKnown} icon="check" />
                    <Stat compact={isCompactPaper} label="Caution raised" value={cautionCount} icon="alert" tone="warn" />
                    <Stat compact={isCompactPaper} label="Objections" value={objectionCount} icon="lock" tone="bad" />
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 14,
                  }}
                >
                  <div style={sectionCard("#F7FAFF")}>
                    <h2 style={{ ...sectionTitle(), display: "flex", alignItems: "center", gap: 10 }}>
                      <TrustPaperIcon name="document" size={22} color="#0B63D1" />
                      Simple reading
                    </h2>
                    <p style={{ ...helperText(), color: "#1F3145", marginTop: 10 }}>
                      {outcome.visible_summary ||
                        (liveWindowOpen
                          ? `Instant community confirmation is pending. ${responsesReceived} of ${activeMemberCount} active community members responded. Wait for responses or ask for more evidence.`
                          : status === "expired"
                            ? "Instant community confirmation is expired. No valid response was received before the window closed."
                            : "Instant community confirmation is not complete yet. Refresh later or ask for more evidence.")}
                    </p>
                  </div>
                  <div style={sectionCard("#FFF7E6")}>
                    <h2 style={{ ...sectionTitle(), display: "flex", alignItems: "center", gap: 10 }}>
                      <TrustPaperIcon name="shield" size={22} color="#B7791F" />
                      Reader decision note
                    </h2>
                    <p style={{ ...helperText(), color: "#07172C", marginTop: 10, fontWeight: 900 }}>
                      {outcome.decision_note ||
                        "This is evidence for judgement, not a guarantee, payment instruction, or automatic approval."}
                    </p>
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompactPaper ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: isCompactPaper ? 12 : 14,
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
                  <h2 style={{ ...sectionTitle(), display: "flex", alignItems: "center", gap: 10 }}>
                    <TrustPaperIcon name="spark" size={22} color="#0B63D1" />
                    Public actions
                  </h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompactPaper ? "1fr" : "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: isCompactPaper ? 10 : 12,
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
          <div
            style={{
              padding: "24px 38px",
              background: "linear-gradient(90deg, #061827 0%, #0B2D4A 100%)",
              color: "#F6D77A",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              fontWeight: 1000,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <TrustPaperIcon name="shield" size={28} color="#F6D77A" />
              <span>
                Human-first community confirmation:{" "}
                <span style={{ color: "#FFFFFF" }}>
                  public outcome, private contacts protected.
                </span>
              </span>
            </span>
            <span style={{ display: "inline-flex", gap: 12, color: "#F6D77A" }} aria-hidden="true">
              <TrustPaperIcon name="spark" size={22} />
              <TrustPaperIcon name="lock" size={22} />
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  compact = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "minmax(88px, 0.72fr) minmax(0, 1fr)" : "minmax(110px, 0.75fr) minmax(0, 1fr)",
        gap: compact ? 9 : 12,
        alignItems: "start",
        borderBottom: "1px dashed rgba(8,35,58,0.12)",
        paddingBottom: compact ? 8 : 9,
      }}
    >
      <span style={{ color: "#617085", fontSize: compact ? 13 : undefined, fontWeight: 900, lineHeight: 1.28 }}>{label}</span>
      <strong style={{ color: "#07172C", fontSize: compact ? 13 : undefined, fontWeight: 1000, lineHeight: 1.28 }}>{value}</strong>
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
  compact = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof TrustPaperIcon>["name"];
  tone?: "good" | "warn" | "bad" | "info";
  compact?: boolean;
}) {
  const color =
    tone === "bad" ? "#991B1B" : tone === "warn" ? "#92400E" : tone === "good" ? "#166534" : "#073E83";
  return (
    <div style={statTile(tone === "bad" ? "#FEF2F2" : tone === "warn" ? "#FFF7E6" : "#F7FAFF", compact)}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: compact ? 5 : 8,
          color,
          fontSize: compact ? 11 : undefined,
          fontWeight: 1000,
          lineHeight: 1.15,
        }}
      >
        <TrustPaperIcon name={icon} size={compact ? 14 : 19} />
        {label}
      </span>
      <strong style={{ color: "#07172C", fontSize: compact ? 24 : 30, fontWeight: 1000, lineHeight: 1 }}>
        {value}
      </strong>
    </div>
  );
}
