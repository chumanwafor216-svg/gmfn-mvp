import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CardActionRow, StableCtaLink } from "../components/StableButton";
import { getJoinApprovalStatus } from "../lib/api";
import { resolveCtaTarget, type CtaTarget } from "../lib/ctaTargets";

type ReviewerLine = {
  display: string;
  gmfnId: string;
  role: string;
  roleLabel: string;
};

type FactRow = {
  icon: string;
  label: string;
  value: string;
};

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function ctaPath(target: CtaTarget): string {
  return typeof target.to === "string" ? target.to : String(target.to);
}

function mergeSearchIntoPath(to: string, currentSearch: string): string {
  const [basePath, baseQueryRaw = ""] = String(to || "").split("?");
  const merged = new URLSearchParams(baseQueryRaw);
  const current = new URLSearchParams(currentSearch);

  current.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.append(key, value);
    }
  });

  const finalQuery = merged.toString();
  return finalQuery ? `${basePath}?${finalQuery}` : basePath;
}

function statusLabel(value: string): string {
  const raw = safeStr(value, "pending").toLowerCase();
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function reviewerRoleLabel(role: string): string {
  const raw = safeStr(role);
  if (!raw) return "";
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function shellStyle(isCompact: boolean): React.CSSProperties {
  return {
    minHeight: "100vh",
    padding: isCompact ? "18px 14px 30px" : "28px 20px 40px",
    background:
      "radial-gradient(circle at 84% 2%, rgba(70,118,181,0.18) 0%, rgba(70,118,181,0.00) 30%), linear-gradient(180deg, #030813 0%, #06182A 26%, #08233A 64%, #061827 100%)",
    color: "#F8FBFF",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  };
}

function pageRail(isCompact: boolean): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 880,
    margin: "0 auto",
    display: "grid",
    gap: isCompact ? 14 : 18,
  };
}

function panelStyle(padding = 18): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(123,161,204,0.22)",
    background:
      "linear-gradient(180deg, rgba(8,32,57,0.88) 0%, rgba(7,27,49,0.92) 100%)",
    boxShadow:
      "0 24px 54px rgba(0,4,12,0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
    padding,
    overflow: "hidden",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#8EA9CA",
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.65,
    textTransform: "uppercase",
  };
}

function mutedText(size = 14): React.CSSProperties {
  return {
    color: "#C7D6E8",
    fontSize: size,
    lineHeight: 1.58,
    fontWeight: 650,
  };
}

function iconBubble(size = 46): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: size >= 44 ? 16 : 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: `0 0 ${size}px`,
    background:
      "linear-gradient(180deg, rgba(73,115,177,0.54) 0%, rgba(36,70,123,0.52) 100%)",
    border: "1px solid rgba(142,184,238,0.22)",
    boxShadow:
      "0 12px 26px rgba(2,8,23,0.28), inset 0 1px 0 rgba(255,255,255,0.10)",
    color: "#DCEBFF",
    fontWeight: 1000,
    fontSize: size >= 44 ? 18 : 13,
    lineHeight: 1,
  };
}

function actionStyle(kind: "primary" | "secondary"): React.CSSProperties {
  const primary = kind === "primary";
  return {
    minHeight: 58,
    minWidth: 0,
    width: "100%",
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(172,204,255,0.58)"
      : "1px solid rgba(255,255,255,0.78)",
    background: primary
      ? "linear-gradient(180deg, #2E74FF 0%, #1A49DC 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F4F8FF 100%)",
    color: primary ? "#FFFFFF" : "#10253B",
    boxShadow: primary
      ? "0 18px 34px rgba(30,86,220,0.32), inset 0 1px 0 rgba(255,255,255,0.22)"
      : "0 18px 34px rgba(0,8,18,0.20), inset 0 1px 0 rgba(255,255,255,0.86)",
    fontWeight: 1000,
    fontSize: 15,
  };
}

function progressPercent(approvals: number, requiredApprovals: number): number {
  if (!requiredApprovals || requiredApprovals <= 0) return approvals > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((approvals / requiredApprovals) * 100)));
}

export default function JoinRequestPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [handoffStarted, setHandoffStarted] = useState(false);
  const [reviewDetailsOpen, setReviewDetailsOpen] = useState(false);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 720;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 720);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Pending Review";
    }
  }, []);

  const state = useMemo(
    () =>
      ((location.state as {
        request_id?: string | number;
        community_name?: string;
        clan_name?: string;
        status?: string;
        submitted_at?: string;
      }) || {}),
    [location.state]
  );

  const requestId = useMemo(
    () => safeStr(state.request_id || searchParams.get("request_id") || ""),
    [state, searchParams]
  );

  useEffect(() => {
    let alive = true;

    async function loadStatus() {
      if (!requestId) {
        setLiveStatus(null);
        return;
      }

      try {
        const res = await getJoinApprovalStatus(requestId);
        if (!alive) return;
        setLiveStatus(res || null);
      } catch {
        if (!alive) return;
        setLiveStatus(null);
      }
    }

    void loadStatus();
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 8000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, [requestId]);

  const communityName = useMemo(
    () =>
      safeStr(
        liveStatus?.community_name ||
          state.community_name ||
          state.clan_name ||
          searchParams.get("community_name") ||
          searchParams.get("clan_name") ||
          "the community",
        "the community"
      ),
    [liveStatus, state, searchParams]
  );

  const marketplaceName = useMemo(
    () =>
      safeStr(
        liveStatus?.marketplace_name || searchParams.get("marketplace_name") || ""
      ),
    [liveStatus, searchParams]
  );

  const statusText = useMemo(
    () =>
      safeStr(
        liveStatus?.status || state.status || searchParams.get("status") || "pending"
      ),
    [liveStatus, state, searchParams]
  );

  const communityCode = useMemo(
    () => safeStr(liveStatus?.community_code || searchParams.get("community_code") || ""),
    [liveStatus, searchParams]
  );

  const communityId = useMemo(
    () => safeStr(liveStatus?.community_id || searchParams.get("community_id") || ""),
    [liveStatus, searchParams]
  );

  const approvals = useMemo(() => Number(liveStatus?.approvals || 0), [liveStatus]);
  const rejects = useMemo(() => Number(liveStatus?.rejects || 0), [liveStatus]);
  const totalVotes = useMemo(
    () => Number(liveStatus?.total_votes || approvals + rejects || 0),
    [liveStatus, approvals, rejects]
  );
  const activeMembers = useMemo(
    () => Number(liveStatus?.active_member_count || 0),
    [liveStatus]
  );
  const requiredApprovals = useMemo(
    () => Number(liveStatus?.required_approvals || 0),
    [liveStatus]
  );
  const progress = useMemo(
    () => progressPercent(approvals, requiredApprovals),
    [approvals, requiredApprovals]
  );
  const identityReused = Boolean(liveStatus?.existing_identity || liveStatus?.identity_reused);
  const eligibleReviewers = useMemo<ReviewerLine[]>(() => {
    const rows = Array.isArray(liveStatus?.eligible_reviewers)
      ? liveStatus.eligible_reviewers
      : [];
    return rows
      .map((row: any) => ({
        display: safeStr(row?.display || ""),
        gmfnId: safeStr(row?.gmfn_id || ""),
        role: "",
        roleLabel: reviewerRoleLabel(safeStr(row?.role || "user")),
      }))
      .filter((row: ReviewerLine) => row.display || row.gmfnId);
  }, [liveStatus]);

  const approvalTo = useMemo(() => {
    if (!requestId) return "";
    return mergeSearchIntoPath(
      `/join-approval/${encodeURIComponent(requestId)}`,
      location.search
    );
  }, [requestId, location.search]);
  const approvalCta = useMemo(
    () =>
      resolveCtaTarget("joinPending", {
        explicitTo: approvalTo || undefined,
        enabled: Boolean(approvalTo),
        disabledReason: "Approval status is not available until the request ID is known.",
        debugId: "join-pending.approval-status",
      }),
    [approvalTo]
  );
  const guideCta = useMemo(
    () =>
      resolveCtaTarget("welcome", {
        explicitTo: "/guide",
        debugId: "join-pending.guide",
      }),
    []
  );
  const welcomeCta = useMemo(
    () =>
      resolveCtaTarget("welcome", {
        debugId: "join-pending.welcome",
      }),
    []
  );

  const communityTo = useMemo(() => {
    const resultPath = safeStr(liveStatus?.result_path || "");
    const resultChannel = safeStr(liveStatus?.result_channel || "").toLowerCase();
    if (resultPath && resultChannel === "approved-existing-member") {
      return mergeSearchIntoPath(resultPath, location.search);
    }
    if (communityId) {
      return mergeSearchIntoPath(
        `/app/community/${encodeURIComponent(communityId)}`,
        location.search
      );
    }
    return mergeSearchIntoPath("/app/community", location.search);
  }, [communityId, liveStatus, location.search]);

  const activationTo = useMemo(() => {
    const activationRequired = liveStatus?.activation_required !== false;
    const existingApproved = Boolean(
      liveStatus?.existing_identity ||
        liveStatus?.identity_reused ||
        safeStr(liveStatus?.result_channel || "").toLowerCase() === "approved-existing-member"
    );
    if (!activationRequired || existingApproved) return "";

    const resultPath = safeStr(liveStatus?.result_path || "");
    const resultChannel = safeStr(liveStatus?.result_channel || "").toLowerCase();
    if (resultPath && resultChannel === "activation-ready") {
      return mergeSearchIntoPath(resultPath, location.search);
    }

    const activationPath = safeStr(liveStatus?.activation_path || "");
    if (activationPath) {
      return mergeSearchIntoPath(activationPath, location.search);
    }

    const activationLink = safeStr(liveStatus?.activation_link || "");
    if (activationLink && typeof window !== "undefined") {
      try {
        const url = new URL(activationLink, window.location.origin);
        return `${url.pathname}${url.search}${url.hash}`;
      } catch {
        // Fall through to the gmfn_id activation path fallback below.
      }
    }

    const gmfnId = safeStr(liveStatus?.gmfn_id || "");
    if (!gmfnId) return "";

    const params = new URLSearchParams();
    params.set("gmfn_id", gmfnId);
    if (requestId) params.set("request_id", requestId);
    return mergeSearchIntoPath(`/activate-membership?${params.toString()}`, location.search);
  }, [liveStatus, location.search, requestId]);

  useEffect(() => {
    if (!requestId || handoffStarted || !liveStatus) return;

    const lowerStatus = safeStr(liveStatus?.status).toLowerCase();
    if (lowerStatus === "approved") {
      setHandoffStarted(true);
      navigate(activationTo || communityTo, {
        replace: true,
        state: {
          gmfn_id: safeStr(liveStatus?.gmfn_id || ""),
          request_id: requestId,
          community_name: communityName,
          status: lowerStatus,
        },
      });
      return;
    }

    if (lowerStatus === "rejected" && approvalTo) {
      const resultPath = safeStr(liveStatus?.result_path || "");
      setHandoffStarted(true);
      navigate(
        resultPath ? mergeSearchIntoPath(resultPath, location.search) : approvalTo,
        { replace: true }
      );
    }
  }, [
    activationTo,
    approvalTo,
    communityName,
    communityTo,
    handoffStarted,
    liveStatus,
    location.search,
    navigate,
    requestId,
  ]);

  const factRows = useMemo<FactRow[]>(
    () =>
      [
        { icon: "H", label: "Community", value: communityName },
        {
          icon: "M",
          label: "Market",
          value: marketplaceName || `${communityName} Marketplace`,
        },
        { icon: "ID", label: "Community ID", value: communityCode },
        { icon: "R", label: "Request ID", value: requestId },
      ].filter((row) => safeStr(row.value)),
    [communityCode, communityName, marketplaceName, requestId]
  );

  return (
    <main style={shellStyle(isCompact)}>
      <div style={pageRail(isCompact)}>
        <header
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            paddingTop: isCompact ? 2 : 6,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, rgba(71,132,255,0.95), rgba(118,166,255,0.86))",
              color: "#061827",
              fontWeight: 1000,
              boxShadow: "0 14px 26px rgba(46,116,255,0.28)",
            }}
          >
            G
          </div>
          <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 1000 }}>GSN</div>
        </header>

        <section
          style={{
            ...panelStyle(isCompact ? 22 : 28),
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.2fr) 240px",
            gap: isCompact ? 20 : 28,
            alignItems: "center",
          }}
        >
          <div>
            <div style={sectionLabel()}>Join request</div>
            <h1
              style={{
                margin: "8px 0 0",
                color: "#FFFFFF",
                fontSize: isCompact ? 38 : 48,
                lineHeight: 1.02,
                fontWeight: 1000,
                letterSpacing: 0,
              }}
            >
              Pending Review
            </h1>
            <div style={{ marginTop: 12, ...mutedText(isCompact ? 16 : 18) }}>
              Your request has been sent to the community.
            </div>
            <div
              style={{
                marginTop: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
                padding: "8px 18px",
                borderRadius: 999,
                color: "#FFD96D",
                background:
                  "linear-gradient(180deg, rgba(88,72,25,0.74) 0%, rgba(48,43,20,0.72) 100%)",
                border: "1px solid rgba(242,199,102,0.32)",
                fontWeight: 1000,
                fontSize: 20,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 999,
                  background: "#FFD24A",
                  boxShadow: "0 0 18px rgba(255,210,74,0.72)",
                }}
              />
              {statusLabel(statusText)}
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              minHeight: isCompact ? 138 : 184,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                width: isCompact ? 116 : 152,
                height: isCompact ? 130 : 168,
                borderRadius: "42px 42px 50px 50px",
                clipPath: "polygon(50% 0%, 92% 16%, 88% 67%, 50% 100%, 12% 67%, 8% 16%)",
                background:
                  "linear-gradient(180deg, rgba(103,166,255,0.95) 0%, rgba(31,87,177,0.94) 68%, rgba(17,55,120,0.98) 100%)",
                border: "1px solid rgba(190,220,255,0.66)",
                boxShadow:
                  "0 26px 48px rgba(24,100,220,0.36), inset 0 2px 0 rgba(255,255,255,0.28)",
                display: "grid",
                placeItems: "center",
                color: "#DCEBFF",
                fontSize: isCompact ? 42 : 58,
                fontWeight: 1000,
              }}
            >
              ID
            </div>
          </div>
        </section>

        <section style={panelStyle(isCompact ? 14 : 18)} aria-label="Request facts">
          <div style={{ display: "grid" }}>
            {factRows.map((row, index) => (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "54px minmax(0, 1fr) minmax(0, 1.15fr)",
                  gap: 12,
                  alignItems: "center",
                  minHeight: 74,
                  borderBottom:
                    index === factRows.length - 1
                      ? "none"
                      : "1px solid rgba(123,161,204,0.14)",
                }}
              >
                <span style={iconBubble(46)}>{row.icon}</span>
                <span style={{ ...mutedText(18), color: "#DCE7F4", fontWeight: 780 }}>
                  {row.label}
                </span>
                <span
                  style={{
                    color: "#FFFFFF",
                    fontSize: isCompact ? 16 : 18,
                    fontWeight: 1000,
                    textAlign: "right",
                    overflowWrap: "anywhere",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "0 0 10px",
              paddingLeft: 8,
            }}
          >
            <span style={{ color: "#79A9FF", fontSize: 20, fontWeight: 1000 }}>*</span>
            <div style={sectionLabel()}>What happens next</div>
          </div>

          <div
            style={{
              ...panelStyle(14),
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                step: "1",
                icon: "R",
                title: "Review",
                body: "Members review your request.",
              },
              {
                step: "2",
                icon: "D",
                title: "Decision",
                body: identityReused
                  ? "If approved, your existing GSN ID is reused."
                  : "If approved, your GSN ID is issued.",
              },
              {
                step: "3",
                icon: "A",
                title: identityReused ? "Enter" : "Activate",
                body: identityReused
                  ? "Open the community and continue."
                  : "Create password and continue.",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  position: "relative",
                  borderRadius: 20,
                  border: "1px solid rgba(123,161,204,0.16)",
                  background:
                    "linear-gradient(180deg, rgba(9,35,63,0.86) 0%, rgba(8,28,51,0.86) 100%)",
                  padding: "24px 14px 16px",
                  minHeight: 132,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -18,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(180deg, #4B8DFF 0%, #2563DB 100%)",
                    border: "1px solid rgba(190,220,255,0.55)",
                    boxShadow: "0 14px 26px rgba(37,99,235,0.30)",
                    fontWeight: 1000,
                    color: "#FFFFFF",
                  }}
                >
                  {item.step}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={iconBubble(48)}>{item.icon}</span>
                  <div>
                    <div style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 1000 }}>
                      {item.title}
                    </div>
                    <div style={{ marginTop: 5, ...mutedText(14) }}>{item.body}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={panelStyle(isCompact ? 16 : 20)}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr) auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span style={iconBubble(40)}>B</span>
            <div>
              <div style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 1000 }}>
                Review reading
              </div>
              <div style={{ marginTop: 8, ...mutedText(24), color: "#FFFFFF" }}>
                <strong>
                  {approvals} / {requiredApprovals || 1}
                </strong>{" "}
                approvals
              </div>
            </div>
            <div style={{ color: "#C8D8EA", fontWeight: 900 }}>{progress}%</div>
          </div>

          <div
            aria-hidden="true"
            style={{
              marginTop: 12,
              height: 18,
              borderRadius: 999,
              overflow: "hidden",
              background: "rgba(123,161,204,0.20)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(47,121,255,0.95), rgba(242,199,102,0.95))",
              }}
            />
          </div>

          <div style={{ marginTop: 14, ...mutedText(15) }}>
            {progress > 0
              ? "Community action has started."
              : "Waiting for community action."}
          </div>

          {reviewDetailsOpen ? (
            <div
              id="review-details"
              style={{
                marginTop: 16,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Approvals", approvals],
                  ["Rejects", rejects],
                  ["Total votes", totalVotes],
                  ["Active reviewers", activeMembers],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(123,161,204,0.15)",
                      background: "rgba(255,255,255,0.055)",
                      padding: 13,
                    }}
                  >
                    <div style={sectionLabel()}>{label}</div>
                    <div style={{ marginTop: 6, color: "#FFFFFF", fontSize: 22, fontWeight: 1000 }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {eligibleReviewers.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {eligibleReviewers.map((reviewer: ReviewerLine, index: number) => (
                    <div
                      key={`${reviewer.gmfnId || reviewer.display}-${index}`}
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(123,161,204,0.15)",
                        background: "rgba(255,255,255,0.055)",
                        padding: 13,
                      }}
                    >
                      <div style={sectionLabel()}>Reviewer {index + 1}</div>
                      <div style={{ marginTop: 6, color: "#FFFFFF", fontWeight: 1000 }}>
                        {reviewer.display || "Visible reviewer"}
                      </div>
                      {reviewer.gmfnId ? (
                        <div style={{ marginTop: 4, ...mutedText(13) }}>{reviewer.gmfnId}</div>
                      ) : null}
                      {reviewer.roleLabel ? (
                        <div style={{ marginTop: 4, ...mutedText(13) }}>
                          Role: {reviewer.roleLabel}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ ...mutedText(14), color: "#DCE7F4" }}>
                  No activated reviewer line is visible in this community yet.
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section style={panelStyle(isCompact ? 14 : 18)}>
          <CardActionRow
            align="stretch"
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 14,
              minHeight: 0,
            }}
          >
            <StableCtaLink
              to={ctaPath(approvalCta)}
              kind="primary"
              disabled={!approvalCta.enabled}
              debugId={approvalCta.debugId}
              style={actionStyle("primary")}
            >
              Open approval status
            </StableCtaLink>
            <StableCtaLink
              to="#review-details"
              kind="secondary"
              onClick={(event) => {
                event.preventDefault();
                setReviewDetailsOpen((current) => !current);
              }}
              debugId="join-pending.review-details.toggle"
              style={actionStyle("secondary")}
            >
              {reviewDetailsOpen ? "Hide review details" : "View review details"}
            </StableCtaLink>
          </CardActionRow>
        </section>

        <section>
          <div style={{ ...sectionLabel(), paddingLeft: 8 }}>Helpful links</div>
          <CardActionRow
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
              minHeight: 0,
            }}
          >
            <StableCtaLink
              to={ctaPath(guideCta)}
              kind="secondary"
              debugId={guideCta.debugId}
              style={{ ...actionStyle("secondary"), minHeight: 52, fontSize: 14 }}
            >
              Full GSN guide
            </StableCtaLink>
            <StableCtaLink
              to={ctaPath(guideCta)}
              kind="secondary"
              debugId="join-pending.focus-guide"
              style={{ ...actionStyle("secondary"), minHeight: 52, fontSize: 14 }}
            >
              Focus Commitments
            </StableCtaLink>
            <StableCtaLink
              to={ctaPath(welcomeCta)}
              kind="secondary"
              debugId={welcomeCta.debugId}
              style={{ ...actionStyle("secondary"), minHeight: 52, fontSize: 14 }}
            >
              Welcome
            </StableCtaLink>
          </CardActionRow>
        </section>

        <section
          style={{
            ...panelStyle(16),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            textAlign: "center",
            color: "#C7D6E8",
            fontWeight: 800,
          }}
        >
          <span style={iconBubble(38)}>L</span>
          Entry is reviewed, not automatic.
        </section>
      </div>
    </main>
  );
}
