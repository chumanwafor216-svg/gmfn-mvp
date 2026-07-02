import React, { useEffect, useState } from "react";
import { StableButton, StableCtaLink } from "../../components/StableButton";
import { APP_ROUTES } from "../../lib/appRoutes";

type ActionReviewItem = {
  id?: number | string;
  parent_review_id?: number | string | null;
  status?: string | null;
  required_approvals?: number | string | null;
  approval_count?: number | string | null;
};

type DashboardRecoveryPanelProps = {
  communityDomainId?: string;
  message?: string;
  latestMembershipRequest?: ActionReviewItem | null;
  membershipRequestLineage?: ActionReviewItem[];
  loadingMembershipRequestLineage?: boolean;
  busyMembershipRequest?: boolean;
  onRetry: () => void | Promise<void>;
  onRequestDomainAccess: () => void | Promise<void>;
  onReviseMembershipRequest: (
    review: ActionReviewItem | null,
    fields: { title?: string | null; request_note?: string | null }
  ) => void | Promise<void>;
  onWithdrawMembershipRequest: (review: ActionReviewItem | null) => void | Promise<void>;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
}

function numericCount(value: unknown): number | null {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) {
    return null;
  }
  return Math.floor(count);
}

function isRevisionContinuation(review: ActionReviewItem | null): boolean {
  return Boolean(cleanText(review?.parent_review_id));
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

function fieldStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid rgba(9,27,46,0.18)",
    background: "rgba(255,255,255,0.92)",
    color: "#091B2E",
    fontSize: 16,
    lineHeight: 1.35,
    padding: "10px 12px",
    outline: "none",
  };
}

function textareaStyle(): React.CSSProperties {
  return {
    ...fieldStyle(),
    minHeight: 78,
    resize: "vertical",
  };
}

function membershipRequestStatusText(review: ActionReviewItem | null): string {
  const status = cleanText(review?.status, "pending").toLowerCase();
  const reviewId = cleanText(review?.id);
  const reviewLabel = reviewId ? ` Review ${reviewId}` : "";
  const approvalText = membershipApprovalProgressText(review);
  if (status === "pending" || status === "pending_review") {
    return `${reviewLabel} is pending. An owner/admin still needs to approve and apply it before membership changes.${approvalText}`;
  }
  if (status === "approved") {
    return `${reviewLabel} is approved, but membership still has to be applied by an owner/admin before this dashboard opens.${approvalText} You can withdraw it before it is applied if you no longer want this access added.`;
  }
  if (status === "needs_changes") {
    return `${reviewLabel} needs changes before an owner/admin can continue. Reviewer-private notes are not shown here, so add a clear member title, invite reference, department, class, or relationship proof and send it back to owner/admin review. You can also withdraw it if you want to restart later.`;
  }
  if (
    (status === "cancelled" || status === "rejected") &&
    isRevisionContinuation(review)
  ) {
    return `${reviewLabel} is ${compactStatus(status)}. The earlier request already has a follow-up record, so continue from this revision instead of starting over. Add a clearer member title, invite reference, department, class, or relationship proof and send it back to owner/admin review.`;
  }
  if (status === "cancelled") {
    return `${reviewLabel} was withdrawn before membership was added. You can request access again when you are ready.`;
  }
  if (status === "applied") {
    return `${reviewLabel} was applied before. Try opening the dashboard again, or send a fresh access request if your current membership is no longer active.`;
  }
  if (status === "rejected") {
    return `${reviewLabel} was declined. You can request again when you have clearer community proof or owner guidance.`;
  }
  return `${reviewLabel} is marked ${compactStatus(status)}. This status does not grant dashboard access by itself.`;
}

function membershipApprovalProgressText(review: ActionReviewItem | null): string {
  const requiredApprovals = numericCount(review?.required_approvals);
  const approvalCount = numericCount(review?.approval_count) ?? 0;
  if (!requiredApprovals || (requiredApprovals <= 1 && approvalCount <= 0)) {
    return "";
  }
  const remainingApprovals = Math.max(requiredApprovals - approvalCount, 0);
  if (remainingApprovals === 0) {
    return ` ${approvalCount} of ${requiredApprovals} approvals are recorded.`;
  }
  return ` ${approvalCount} of ${requiredApprovals} approvals are recorded; ${remainingApprovals} more needed before apply.`;
}

function membershipHistoryStepLabel(
  item: ActionReviewItem,
  index: number,
  total: number
): string {
  if (!cleanText(item.parent_review_id)) return "Original request";
  if (index === total - 1) return "Latest update";
  return "Follow-up update";
}

function membershipRequestButtonLabel(
  review: ActionReviewItem | null,
  busy: boolean
): string {
  if (busy) return "Working...";
  const status = cleanText(review?.status).toLowerCase();
  if (status === "pending" || status === "pending_review") return "Withdraw request";
  if (status === "needs_changes") return "Withdraw request";
  if (
    (status === "cancelled" || status === "rejected") &&
    isRevisionContinuation(review)
  ) {
    return "Send update above";
  }
  if (status === "approved") return "Withdraw request";
  if (status === "applied") return "Request access";
  if (status === "rejected") return "Request again";
  return "Request access";
}

export default function CommunityDomainDashboardRecoveryPanel({
  communityDomainId,
  message = "",
  latestMembershipRequest = null,
  membershipRequestLineage = [],
  loadingMembershipRequestLineage = false,
  busyMembershipRequest = false,
  onRetry,
  onRequestDomainAccess,
  onReviseMembershipRequest,
  onWithdrawMembershipRequest,
}: DashboardRecoveryPanelProps) {
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const latestMembershipRequestId = cleanText(latestMembershipRequest?.id);
  const latestMembershipRequestStatus = cleanText(
    latestMembershipRequest?.status
  ).toLowerCase();
  const isMembershipRequestContinuation =
    isRevisionContinuation(latestMembershipRequest);
  const canReviseMembershipRequest =
    latestMembershipRequestStatus === "needs_changes" ||
    ((latestMembershipRequestStatus === "cancelled" ||
      latestMembershipRequestStatus === "rejected") &&
      isMembershipRequestContinuation);
  const hasRevisionDetail =
    Boolean(cleanText(revisionTitle)) || Boolean(cleanText(revisionNote));
  const canWithdrawMembershipRequest =
    latestMembershipRequestStatus === "pending" ||
    latestMembershipRequestStatus === "pending_review" ||
    latestMembershipRequestStatus === "needs_changes" ||
    latestMembershipRequestStatus === "approved";
  const continuationNeedsRevision =
    isMembershipRequestContinuation && !canWithdrawMembershipRequest;
  const requestAccessLocked =
    busyMembershipRequest ||
    continuationNeedsRevision;
  const visibleMembershipRequestHistory = membershipRequestLineage.slice(-4);
  const hasMembershipRequestHistory =
    loadingMembershipRequestLineage || visibleMembershipRequestHistory.length > 1;

  useEffect(() => {
    setRevisionTitle("");
    setRevisionNote("");
  }, [latestMembershipRequestId]);

  return (
    <section style={whiteCard()}>
      <div style={sectionLabel()}>
        {communityDomainId ? "Cannot open dashboard" : "Cannot load domains"}
      </div>
      <h2 style={{ margin: "8px 0 6px", fontSize: 24, lineHeight: 1.1 }}>
        {communityDomainId
          ? "This Community Domain is not available here."
          : "Your Community Domains could not be loaded."}
      </h2>
      <div style={helperText()}>{message}</div>
      {latestMembershipRequest ? (
        <div
          style={{
            marginTop: 12,
            borderRadius: 16,
            border: "1px solid rgba(146,94,8,0.22)",
            background: "rgba(255,247,226,0.72)",
            padding: 12,
          }}
        >
          <div style={sectionLabel()}>Your access request</div>
          <div style={{ ...helperText(), marginTop: 6 }}>
            {membershipRequestStatusText(latestMembershipRequest)}
          </div>
          {hasMembershipRequestHistory ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                marginTop: 12,
                borderRadius: 14,
                border: "1px solid rgba(9,27,46,0.1)",
                background: "rgba(255,255,255,0.62)",
                padding: 10,
              }}
            >
              <div style={sectionLabel()}>Request history</div>
              {loadingMembershipRequestLineage ? (
                <div style={helperText()}>Checking request history...</div>
              ) : (
                visibleMembershipRequestHistory.map((item, index) => {
                  const reviewId = cleanText(item.id);
                  return (
                    <div
                      key={`${reviewId || "request"}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                        borderRadius: 12,
                        background: "rgba(241,247,255,0.82)",
                        padding: "8px 10px",
                      }}
                    >
                      <div style={{ color: "#091B2E", fontSize: 13, fontWeight: 850 }}>
                        {membershipHistoryStepLabel(
                          item,
                          index,
                          visibleMembershipRequestHistory.length
                        )}
                      </div>
                      <div
                        style={{
                          color: "#506A82",
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        {reviewId ? `Review ${reviewId} - ` : ""}
                        {compactStatus(item.status)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
          {canReviseMembershipRequest ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 12,
              }}
            >
              <input
                style={fieldStyle()}
                value={revisionTitle}
                onChange={(event) => setRevisionTitle(event.target.value)}
                placeholder="Member title or proof label"
                aria-label="Member title or proof label"
                disabled={busyMembershipRequest}
              />
              <textarea
                style={textareaStyle()}
                value={revisionNote}
                onChange={(event) => setRevisionNote(event.target.value)}
                placeholder="Add the safe detail the owner/admin should check"
                aria-label="Access request update note"
                disabled={busyMembershipRequest}
              />
              <div style={helperText()}>
                Add only details you can safely share with the Community Domain,
                such as your member title, invite reference, department, class,
                or relationship proof.
              </div>
              <StableButton
                type="button"
                kind="primary"
                debugId="community-domain-dashboard.error.revise-membership"
                disabled={busyMembershipRequest || !hasRevisionDetail}
                onClick={async () => {
                  if (!hasRevisionDetail) return;
                  await onReviseMembershipRequest(latestMembershipRequest, {
                    title: revisionTitle,
                    request_note: revisionNote,
                  });
                }}
              >
                {busyMembershipRequest ? "Sending update..." : "Send update"}
              </StableButton>
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <StableButton
          type="button"
          kind="primary"
          debugId={
            communityDomainId
              ? "community-domain-dashboard.error.retry-dashboard"
              : "community-domain-dashboard.error.retry-selector"
          }
          onClick={onRetry}
        >
          Try again
        </StableButton>
        <StableCtaLink
          to={APP_ROUTES.COMMUNITY}
          kind="secondary"
          debugId="community-domain-dashboard.error.community-home"
        >
          Community Home
        </StableCtaLink>
        <StableCtaLink
          to="/community-domain/purchase"
          kind="soft"
          debugId="community-domain-dashboard.error.purchase"
        >
          Purchase path
        </StableCtaLink>
        {communityDomainId ? (
          <StableButton
            type="button"
            kind="secondary"
            debugId="community-domain-dashboard.error.request-membership"
            disabled={requestAccessLocked}
            onClick={
              canWithdrawMembershipRequest
                ? () => onWithdrawMembershipRequest(latestMembershipRequest)
                : onRequestDomainAccess
            }
          >
            {membershipRequestButtonLabel(
              latestMembershipRequest,
              busyMembershipRequest
            )}
          </StableButton>
        ) : null}
      </div>
    </section>
  );
}
