import React from "react";
import { StableButton } from "../../components/StableButton";

type ActionReviewItem = {
  id?: number | string;
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
  onDecline: (review: ActionReviewItem) => void;
  onApproveAndApply: (review: ActionReviewItem) => void;
  onApplyApproved: (review: ActionReviewItem) => void;
  onRefresh: () => void;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
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
    letterSpacing: 0.5,
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

export default function CommunityDomainAccessRequestsPanel({
  membershipAccessRequests = [],
  loadingQueue = false,
  busyReviewId = null,
  onApproveOnly,
  onDecline,
  onApproveAndApply,
  onApplyApproved,
  onRefresh,
}: AccessRequestsPanelProps): React.ReactElement {
  return (
    <section style={whiteCard()}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={sectionLabel()}>Access requests</div>
          <h2 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.12 }}>
            Review people asking to enter this domain.
          </h2>
          <div style={{ ...helperText(), marginTop: 8 }}>
            These are pending membership-change reviews from the existing
            governance queue. Approving records the decision; approving and adding
            applies the approved review so membership changes.
          </div>
        </div>

        {membershipAccessRequests.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {membershipAccessRequests.slice(0, 3).map((review) => {
              const reviewId = cleanText(review.id, "review");
              const reviewStatus = cleanText(review.status).toLowerCase();
              const isApprovedReview = reviewStatus === "approved";
              const approveBusy = busyReviewId === `${reviewId}:approve`;
              const applyBusy = busyReviewId === `${reviewId}:apply`;
              const declineBusy = busyReviewId === `${reviewId}:decline`;
              return (
                <div key={reviewId} style={softCard()}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={sectionLabel()}>Membership request</div>
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
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                        gap: 8,
                      }}
                    >
                      {!isApprovedReview ? (
                        <StableButton
                          type="button"
                          kind="secondary"
                          fullWidth
                          disabled={Boolean(busyReviewId)}
                          debugId={`community-domain-dashboard.access-request.approve-${reviewId}`}
                          onClick={() => onApproveOnly(review)}
                        >
                          {approveBusy ? "Approving..." : "Approve only"}
                        </StableButton>
                      ) : null}
                      {!isApprovedReview ? (
                        <StableButton
                          type="button"
                          kind="secondary"
                          fullWidth
                          disabled={Boolean(busyReviewId)}
                          debugId={`community-domain-dashboard.access-request.decline-${reviewId}`}
                          onClick={() => onDecline(review)}
                        >
                          {declineBusy ? "Declining..." : "Decline"}
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
                          ? "Adding..."
                          : isApprovedReview
                          ? "Add approved member"
                          : "Approve + add member"}
                      </StableButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={softCard()}>
            <div style={sectionLabel()}>No pending access requests</div>
            <div style={{ ...helperText(), marginTop: 7 }}>
              The current reviewer queue has no pending membership requests this
              account can decide.
            </div>
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
