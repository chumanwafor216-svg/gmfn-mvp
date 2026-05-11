import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { CardActionRow, StableCtaLink } from "../components/StableButton";
import { getJoinApprovalStatus } from "../lib/api";
import { resolveCtaTarget, type CtaTarget } from "../lib/ctaTargets";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";

type ReviewerLine = {
  display: string;
  gmfnId: string;
  role: string;
  roleLabel: string;
};

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function ctaPath(target: CtaTarget): string {
  return typeof target.to === "string" ? target.to : String(target.to);
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg
    ),
    border: "1px solid rgba(123,161,204,0.20)",
    padding: 18,
    boxShadow: "0 24px 54px rgba(2,6,23,0.26)",
  };
}

function softCard(bg = "#F4F8FC"): React.CSSProperties {
  return {
    ...institutionalSoftCard(
      bg === "#F4F8FC"
        ? "linear-gradient(180deg, rgba(12,26,43,0.96) 0%, rgba(17,39,62,0.94) 100%)"
        : bg
    ),
    border: "1px solid rgba(123,161,204,0.16)",
    padding: 14,
    boxShadow:
      "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#C8D8EA",
    lineHeight: 1.8,
    fontSize: 14,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary
      ? "rgba(32,76,133,0.36)"
      : "rgba(255,255,255,0.08)",
    border: primary
      ? "1px solid rgba(123,181,255,0.28)"
      : "1px solid rgba(214,226,239,0.18)",
    color: primary ? "#CFE3FF" : "#E6EEF8",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "normal",
  };
}

function pendingNotice(): React.CSSProperties {
  return {
    ...institutionalInnerCard(
      "linear-gradient(180deg, rgba(13,28,45,0.94) 0%, rgba(18,40,64,0.92) 100%)"
    ),
    borderRadius: 16,
    background:
      "linear-gradient(180deg, rgba(13,28,45,0.94) 0%, rgba(18,40,64,0.92) 100%)",
    border: "1px solid rgba(123,161,204,0.14)",
    color: "#D9E6F5",
    padding: 16,
    lineHeight: 1.75,
    fontSize: 14,
  };
}

function infoTile(): React.CSSProperties {
  return {
    ...institutionalInnerCard(
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
    ),
    borderRadius: 16,
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    border: "1px solid rgba(123,161,204,0.14)",
    padding: 14,
  };
}

function reviewerRoleLabel(role: string): string {
  const raw = safeStr(role);
  if (!raw) return "";
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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

export default function JoinRequestPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [handoffStarted, setHandoffStarted] = useState(false);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Join Request Pending";
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

  const submittedAt = useMemo(
    () => safeStr(state.submitted_at || searchParams.get("submitted_at") || ""),
    [state, searchParams]
  );

  const communityCode = useMemo(
    () => safeStr(liveStatus?.community_code || searchParams.get("community_code") || ""),
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

  const activationTo = useMemo(() => {
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
    if (lowerStatus === "approved" && activationTo) {
      setHandoffStarted(true);
      navigate(activationTo, {
        replace: true,
        state: {
          gmfn_id: safeStr(liveStatus?.gmfn_id || ""),
          request_id: requestId,
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
  }, [activationTo, approvalTo, handoffStarted, liveStatus, location.search, navigate, requestId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 20,
        maxWidth: 960,
        margin: "0 auto",
        paddingBottom: 30,
        background:
          "radial-gradient(circle at top, rgba(94,146,214,0.10) 0%, rgba(11,31,51,0.00) 24%), linear-gradient(180deg, #07101C 0%, #0B1F33 34%, #173654 70%, #24496E 100%)",
      }}
    >
      <PageTopNav
        sectionLabel="Join Request Pending"
        title="Join Request Pending"
        subtitle="Your request has been received and is now waiting for community review."
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen confirms that your join request was received and is now waiting for community review."
        why="It helps you understand that entry is not automatic and that the community still needs to decide on your request."
        next="Read the current pending state, then wait for the decision or return later to check the outcome."
        tone="light"
        style={{ marginTop: 18 }}
      />

      <div
        style={{
          ...pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 54%, #173654 100%)"
          ),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Request submitted</div>

        <div
          style={{
            marginTop: 8,
            fontSize: isCompact ? 28 : 34,
            fontWeight: 1000,
            color: "#F8FBFF",
            lineHeight: 1.12,
            maxWidth: 760,
          }}
        >
          Community review is now in progress
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#D7E3F1",
            lineHeight: 1.8,
            fontSize: 15,
            maxWidth: 860,
          }}
        >
          Your join request has been sent to {communityName}. Entry is not
          automatic. Members of the community still need to review and approve
          your request.
        </div>

          <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
          >
            <span style={badge(true)}>Status: {statusText}</span>
            <span style={badge(false)}>Community: {communityName}</span>
            {marketplaceName ? (
              <span style={badge(false)}>Community / Market: {marketplaceName}</span>
            ) : null}
            {communityCode ? <span style={badge(false)}>Community ID: {communityCode}</span> : null}
            {requestId ? <span style={badge(false)}>Request ID: {requestId}</span> : null}
          </div>

        <ExplainToggle
          label="What this does"
          what="This request-submitted block confirms that your join request is now in the community review lane."
          why="It makes the waiting state explicit so you do not mistake silence for a failed request."
          next="Use this as confirmation, then return later or wait for the next message about the decision."
          tone="dark"
          style={{ marginTop: 14 }}
        />
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1.05fr 0.95fr",
          gap: 18,
        }}
      >
        <div style={pageCard()}>
          <div style={sectionLabel()}>What happens next</div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={softCard()}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                1. Community review
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Members review your request according to the approval rule
                already in place. If more than one active member currently
                counts in that community, more than one approval may still be
                required before activation opens.
                If you reopen the same join path before a decision is made, the
                app can show that your request is already waiting. That does
                not create a second review notification because the first
                request is still the live one on record.
              </div>
            </div>

            <div style={softCard()}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                Live review position
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                This shows the real review counts currently on record for this
                request.
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <div style={infoTile()}>
                  <div style={sectionLabel()}>Approvals</div>
                  <div style={{ marginTop: 8, color: "#F8FBFF", fontWeight: 1000, fontSize: 24 }}>
                    {approvals}
                  </div>
                </div>
                <div style={infoTile()}>
                  <div style={sectionLabel()}>Rejects</div>
                  <div style={{ marginTop: 8, color: "#F8FBFF", fontWeight: 1000, fontSize: 24 }}>
                    {rejects}
                  </div>
                </div>
                <div style={infoTile()}>
                  <div style={sectionLabel()}>Total votes</div>
                  <div style={{ marginTop: 8, color: "#F8FBFF", fontWeight: 1000, fontSize: 24 }}>
                    {totalVotes}
                  </div>
                </div>
                <div style={infoTile()}>
                  <div style={sectionLabel()}>Required approvals</div>
                  <div style={{ marginTop: 8, color: "#F8FBFF", fontWeight: 1000, fontSize: 24 }}>
                    {requiredApprovals}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>
                Activated reviewers currently counted in this community:{" "}
                <strong>{activeMembers}</strong>
              </div>
            </div>

            <div style={softCard()}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                Activated reviewers on record
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                These are the currently activated reviewers the system counts in
                this community right now.
              </div>
              {eligibleReviewers.length ? (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {eligibleReviewers.map((reviewer: ReviewerLine, index: number) => (
                    <div key={`${reviewer.gmfnId || reviewer.display}-${index}`} style={infoTile()}>
                      <div style={sectionLabel()}>
                        Reviewer {index + 1}
                        {reviewer.role ? ` - ${reviewer.role}` : ""}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#F8FBFF",
                          fontWeight: 900,
                          lineHeight: 1.55,
                        }}
                      >
                        {reviewer.display || "Visible reviewer"}
                      </div>
                      {reviewer.gmfnId ? (
                        <div style={{ marginTop: 6, ...helperText() }}>
                          {reviewer.gmfnId}
                        </div>
                      ) : null}
                      {reviewer.roleLabel ? (
                        <div style={{ marginTop: 4, ...helperText() }}>
                          Role: {reviewer.roleLabel}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 12, ...pendingNotice() }}>
                  No activated reviewer line is visible in this community yet.
                </div>
              )}
            </div>

            <div style={softCard()}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                2. Approval outcome
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                If approved, your GSN identity will be issued and you will
                continue to activation.
              </div>
            </div>

            <div style={softCard()}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                3. Activation
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Activation is where you create your password and enter your
                personal pages properly.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, ...pendingNotice() }}>
            The app is holding this route steady until the community has made its
            decision. Wider member movement will open after that decision.
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={pageCard()}>
            <div style={sectionLabel()}>Track this request</div>

            <ExplainToggle
              label="What this does"
              what="This tracking block keeps the request ID and the approval-status link together so you can come back to the right decision record."
              why="It gives you a stable reference while the community is still reviewing the request."
              next="Keep the request ID visible and use the approval-status check when you want to see whether the decision has changed."
              tone="light"
              style={{ marginTop: 12 }}
            />

            {requestId ? (
              <>
                <div
                  style={{
                    marginTop: 8,
                    color: "#F8FBFF",
                    fontWeight: 1000,
                    fontSize: 22,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  Request ID: {requestId}
                </div>

                <div style={{ marginTop: 10, ...helperText() }}>
                  Keep this request ID so you can check the approval outcome later.
                </div>

                {submittedAt ? (
                  <div style={{ marginTop: 14, ...infoTile() }}>
                    <div style={sectionLabel()}>Submitted</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        lineHeight: 1.55,
                      }}
                    >
                      {submittedAt}
                    </div>
                  </div>
                ) : null}

                {communityCode ? (
                  <div style={{ marginTop: 14, ...infoTile() }}>
                    <div style={sectionLabel()}>Community ID</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                      }}
                    >
                      {communityCode}
                    </div>
                  </div>
                ) : null}

                {marketplaceName ? (
                  <div style={{ marginTop: 14, ...infoTile() }}>
                    <div style={sectionLabel()}>Community / Market</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                      }}
                    >
                      {marketplaceName}
                    </div>
                  </div>
                ) : null}

                <CardActionRow style={{ marginTop: 16 }}>
                  <StableCtaLink
                    to={ctaPath(approvalCta)}
                    kind="primary"
                    disabled={!approvalCta.enabled}
                    debugId={approvalCta.debugId}
                  >
                    Open approval status
                  </StableCtaLink>
                </CardActionRow>
              </>
            ) : (
              <div style={{ marginTop: 10, ...helperText() }}>
                A request ID is not visible here yet. Use the latest request link
                sent by the system when it becomes available.
              </div>
            )}
          </div>

          <div style={pageCard()}>
            <div style={sectionLabel()}>Useful links</div>

            <div style={{ marginTop: 10, ...helperText() }}>
              While you wait for a community decision, the wider GSN guide can
              explain how trust, participation, and steadier follow-through work
              after entry.
            </div>

            <CardActionRow style={{ marginTop: 16 }}>
              <StableCtaLink
                to={ctaPath(guideCta)}
                kind="secondary"
                debugId={guideCta.debugId}
              >
                Open full GSN guide
              </StableCtaLink>

              <StableCtaLink
                to={ctaPath(guideCta)}
                kind="secondary"
                debugId="join-pending.focus-guide"
              >
                Read about Focus Commitments first
              </StableCtaLink>

              <StableCtaLink
                to={ctaPath(welcomeCta)}
                kind="secondary"
                debugId={welcomeCta.debugId}
              >
                Open Welcome
              </StableCtaLink>
            </CardActionRow>
          </div>
        </div>
      </div>
    </div>
  );
}




