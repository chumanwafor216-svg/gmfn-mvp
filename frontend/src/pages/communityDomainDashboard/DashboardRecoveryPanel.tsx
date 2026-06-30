import React from "react";
import { StableButton, StableCtaLink } from "../../components/StableButton";
import { APP_ROUTES } from "../../lib/appRoutes";

type ActionReviewItem = {
  id?: number | string;
  status?: string | null;
};

type DashboardRecoveryPanelProps = {
  communityDomainId?: string;
  message?: string;
  latestMembershipRequest?: ActionReviewItem | null;
  busyMembershipRequest?: boolean;
  onRetry: () => void | Promise<void>;
  onRequestDomainAccess: () => void | Promise<void>;
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

function membershipRequestStatusText(review: ActionReviewItem | null): string {
  const status = cleanText(review?.status, "pending").toLowerCase();
  const reviewId = cleanText(review?.id);
  const reviewLabel = reviewId ? ` Review ${reviewId}` : "";
  if (status === "pending" || status === "pending_review") {
    return `${reviewLabel} is pending. An owner/admin still needs to approve and apply it before membership changes.`;
  }
  if (status === "approved") {
    return `${reviewLabel} is approved, but membership still has to be applied by an owner/admin before this dashboard opens.`;
  }
  if (status === "applied") {
    return `${reviewLabel} has been applied. Try opening the dashboard again so GSN can refresh your membership view.`;
  }
  if (status === "rejected") {
    return `${reviewLabel} was declined. You can request again when you have clearer community proof or owner guidance.`;
  }
  return `${reviewLabel} is marked ${compactStatus(status)}. This status does not grant dashboard access by itself.`;
}

function membershipRequestButtonLabel(
  review: ActionReviewItem | null,
  busy: boolean
): string {
  if (busy) return "Sending request...";
  const status = cleanText(review?.status).toLowerCase();
  if (status === "pending" || status === "pending_review") return "Request pending";
  if (status === "approved") return "Approved, waiting to add";
  if (status === "applied") return "Try dashboard again";
  if (status === "rejected") return "Request again";
  return "Request access";
}

export default function CommunityDomainDashboardRecoveryPanel({
  communityDomainId,
  message = "",
  latestMembershipRequest = null,
  busyMembershipRequest = false,
  onRetry,
  onRequestDomainAccess,
}: DashboardRecoveryPanelProps) {
  const latestMembershipRequestStatus = cleanText(
    latestMembershipRequest?.status
  ).toLowerCase();
  const requestAccessLocked =
    busyMembershipRequest ||
    latestMembershipRequestStatus === "pending" ||
    latestMembershipRequestStatus === "pending_review" ||
    latestMembershipRequestStatus === "approved";

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
              latestMembershipRequestStatus === "applied"
                ? onRetry
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
