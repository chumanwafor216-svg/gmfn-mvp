import React, { useState } from "react";
import { StableButton } from "../../components/StableButton";
import { humanStatus } from "./statusLanguage";

type ActionReviewItem = {
  id?: number | string;
  parent_review_id?: number | string | null;
  action_key?: string;
  requested_by_user_id?: number | string | null;
  requested_by_user_email?: string | null;
  requested_by_user_display_name?: string | null;
  subject_user_id?: number | string | null;
  subject_user_email?: string | null;
  subject_user_display_name?: string | null;
  target_type?: string | null;
  target_id?: string | number | null;
  status?: string | null;
  request_note?: string | null;
  payload?: {
    user_id?: number | string | null;
    role?: string | null;
    [key: string]: unknown;
  } | null;
  required_approvals?: number | string | null;
  approval_count?: number | string | null;
};

type AccessRequestsPanelProps = {
  membershipAccessRequests?: ActionReviewItem[];
  loadingQueue?: boolean;
  busyReviewId?: string | null;
  onApproveOnly: (review: ActionReviewItem) => void;
  onRequestChanges: (review: ActionReviewItem) => void;
  onDecline: (review: ActionReviewItem) => void;
  onApproveAndApply: (review: ActionReviewItem) => void;
  onApplyApproved: (review: ActionReviewItem) => void;
  onRefresh: () => void;
  onOpenInvite?: () => void;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return humanStatus(value);
}

function numericCount(value: unknown): number | null {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) {
    return null;
  }
  return Math.floor(count);
}

function whiteCard(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(244,248,252,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.13)",
    boxShadow:
      "0 20px 46px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 16,
    color: "#091B2E",
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 14px 30px rgba(7,20,36,0.055)",
    padding: 14,
    color: "#091B2E",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#506A82",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid rgba(9,27,46,0.18)",
    background: "rgba(255,255,255,0.92)",
    color: "#091B2E",
    fontSize: 16,
    fontWeight: 750,
    padding: "9px 11px",
  };
}

function reviewUserLabel(review: ActionReviewItem): string {
  return cleanText(
    review.subject_user_display_name,
    cleanText(
      review.subject_user_email,
      cleanText(
        review.payload?.user_id,
        cleanText(review.subject_user_id, "requested member")
      )
    )
  );
}

function reviewRequesterLabel(review: ActionReviewItem): string {
  return cleanText(
    review.requested_by_user_display_name,
    cleanText(
      review.requested_by_user_email,
      cleanText(review.requested_by_user_id, "domain requester")
    )
  );
}

function approvalProgressText(review: ActionReviewItem): string {
  const requiredApprovals = numericCount(review.required_approvals);
  const approvalCount = numericCount(review.approval_count) ?? 0;
  if (!requiredApprovals || (requiredApprovals <= 1 && approvalCount <= 0)) {
    return "";
  }
  const remainingApprovals = Math.max(requiredApprovals - approvalCount, 0);
  if (remainingApprovals === 0) {
    return `Approvals complete: ${approvalCount} of ${requiredApprovals} recorded.`;
  }
  return `${approvalCount} of ${requiredApprovals} approvals recorded. ${remainingApprovals} more needed before this can be added.`;
}

function followUpText(review: ActionReviewItem): string {
  const parentReviewId = cleanText(review.parent_review_id);
  if (!parentReviewId) {
    return "";
  }
  const reviewStatus = cleanText(review.status).toLowerCase();
  const nextStep =
    reviewStatus === "approved"
      ? "Apply membership from this row"
      : "Decide from this row";
  return `Follow-up to review ${parentReviewId}. This is the applicant's updated request. ${nextStep} and keep the earlier request as history.`;
}

function requestLabel(review: ActionReviewItem): string {
  return cleanText(review.parent_review_id)
    ? "Follow-up request"
    : "Membership request";
}

export default function CommunityDomainAccessRequestsPanel({
  membershipAccessRequests = [],
  loadingQueue = false,
  busyReviewId = null,
  onApproveOnly,
  onRequestChanges,
  onDecline,
  onApproveAndApply,
  onApplyApproved,
  onRefresh,
  onOpenInvite,
}: AccessRequestsPanelProps): React.ReactElement {
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [decisionByReviewId, setDecisionByReviewId] = useState<
    Record<string, "approve" | "needs_changes" | "reject">
  >({});
  const visibleAccessRequests = showAllRequests
    ? membershipAccessRequests
    : membershipAccessRequests.slice(0, 3);
  const hiddenRequestCount = Math.max(
    membershipAccessRequests.length - visibleAccessRequests.length,
    0
  );

  return (
    <section style={whiteCard()}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={sectionLabel()}>Access requests</div>
          <h2 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.12 }}>
            Review people asking to enter this domain.
          </h2>
          <div style={{ ...helperText(), marginTop: 8 }}>
            These are membership access requests that still need a decision or
            an approved membership change. Approving records the decision;
            approving and adding applies the approved review so membership
            changes.
          </div>
        </div>

        {membershipAccessRequests.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {visibleAccessRequests.map((review) => {
              const reviewId = cleanText(review.id, "review");
              const reviewStatus = cleanText(review.status).toLowerCase();
              const isApprovedReview = reviewStatus === "approved";
              const approveBusy = busyReviewId === `${reviewId}:approve`;
              const needsChangesBusy =
                busyReviewId === `${reviewId}:needs_changes`;
              const applyBusy = busyReviewId === `${reviewId}:apply`;
              const declineBusy = busyReviewId === `${reviewId}:decline`;
              const decisionBusy =
                approveBusy || needsChangesBusy || declineBusy;
              const selectedDecision =
                decisionByReviewId[reviewId] || "approve";
              const approvalProgress = approvalProgressText(review);
              const followUp = followUpText(review);
              const recordDecision = () => {
                if (selectedDecision === "needs_changes") {
                  onRequestChanges(review);
                  return;
                }
                if (selectedDecision === "reject") {
                  onDecline(review);
                  return;
                }
                onApproveOnly(review);
              };
              return (
                <div key={reviewId} style={softCard()}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={sectionLabel()}>{requestLabel(review)}</div>
                    <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.14 }}>
                      User {reviewUserLabel(review)} wants access.
                    </h3>
                    <div style={{ ...helperText(), fontSize: 13 }}>
                      Requested by <strong>{reviewRequesterLabel(review)}</strong>.
                      Target role:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(review.payload?.role || "member")}
                      </strong>
                      . Status:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(review.status)}
                      </strong>
                      .
                    </div>
                    {review.request_note ? (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Note: {cleanText(review.request_note)}
                      </div>
                    ) : null}
                    {followUp ? (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {followUp}
                      </div>
                    ) : null}
                    {approvalProgress ? (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {approvalProgress}
                      </div>
                    ) : null}
                    {!isApprovedReview &&
                    selectedDecision === "needs_changes" ? (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        This sends the request back for a safe update. The
                        applicant sees the needs-changes status and general
                        update guidance. Private reviewer notes stay inside the
                        owner/admin review record, and membership is not added.
                      </div>
                    ) : null}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                        gap: 8,
                      }}
                    >
                      {!isApprovedReview ? (
                        <select
                          style={selectStyle()}
                          value={selectedDecision}
                          disabled={Boolean(busyReviewId)}
                          aria-label={`Decision for access request ${reviewId}`}
                          onChange={(event) =>
                            setDecisionByReviewId((current) => ({
                              ...current,
                              [reviewId]: event.target.value as
                                | "approve"
                                | "needs_changes"
                                | "reject",
                            }))
                          }
                        >
                          <option value="approve">Approve only</option>
                          <option value="needs_changes">Ask for changes</option>
                          <option value="reject">Decline</option>
                        </select>
                      ) : null}
                      {!isApprovedReview ? (
                        <StableButton
                          type="button"
                          kind="secondary"
                          fullWidth
                          disabled={Boolean(busyReviewId)}
                          debugId={`community-domain-dashboard.access-request.record-decision-${reviewId}`}
                          onClick={recordDecision}
                        >
                          {decisionBusy
                            ? "Recording..."
                            : selectedDecision === "needs_changes"
                            ? "Ask for changes"
                            : selectedDecision === "reject"
                            ? "Decline"
                            : "Record decision"}
                        </StableButton>
                      ) : null}
                      <StableButton
                        type="button"
                        kind="primary"
                        fullWidth
                        disabled={Boolean(busyReviewId)}
                        debugId={`community-domain-dashboard.access-request.approve-apply-${reviewId}`}
                        onClick={() =>
                          isApprovedReview
                            ? onApplyApproved(review)
                            : onApproveAndApply(review)
                        }
                      >
                        {applyBusy
                          ? "Working..."
                          : isApprovedReview
                          ? "Add approved member"
                          : "Approve, add if ready"}
                      </StableButton>
                    </div>
                  </div>
                </div>
              );
            })}
            {membershipAccessRequests.length > 3 ? (
              <StableButton
                type="button"
                kind="secondary"
                fullWidth
                disabled={Boolean(busyReviewId)}
                debugId="community-domain-dashboard.access-request.toggle-all"
                onClick={() => setShowAllRequests((current) => !current)}
              >
                {showAllRequests
                  ? "Show first 3 requests"
                  : `Show ${hiddenRequestCount} more request${
                      hiddenRequestCount === 1 ? "" : "s"
                    }`}
              </StableButton>
            ) : null}
          </div>
        ) : (
          <div style={softCard()}>
            <div style={sectionLabel()}>No open access requests</div>
            <div style={{ ...helperText(), marginTop: 7 }}>
              No one has requested access yet. Invite trusted people first;
              when they use the invite and request to join, their request will
              appear here for owner/admin decision and apply.
            </div>
            {onOpenInvite ? (
              <div style={{ marginTop: 10 }}>
                <StableButton
                  type="button"
                  kind="primary"
                  fullWidth
                  debugId="community-domain-dashboard.access-request.open-invite"
                  onClick={onOpenInvite}
                >
                  Invite people
                </StableButton>
              </div>
            ) : null}
          </div>
        )}

        <StableButton
          type="button"
          kind="secondary"
          fullWidth
          disabled={loadingQueue}
          debugId="community-domain-dashboard.access-request.refresh"
          onClick={onRefresh}
        >
          {loadingQueue ? "Refreshing requests..." : "Refresh requests"}
        </StableButton>
      </div>
    </section>
  );
}
