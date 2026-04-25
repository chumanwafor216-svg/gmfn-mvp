import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { getJoinApprovalStatus } from "../lib/api";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 18,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 14,
  };
}

function actionBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 16px",
    borderRadius: 14,
    border: primary
      ? "1px solid rgba(11,80,170,0.22)"
      : "1px solid rgba(37,78,119,0.20)",
    background: primary
      ? "linear-gradient(180deg, #1A6BE1 0%, #0B63D1 58%, #09479C 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,247,253,0.98) 62%, rgba(224,234,244,0.98) 100%)",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textAlign: "center",
    textDecoration: "none",
    cursor: "pointer",
    boxShadow: primary
      ? "0 16px 30px rgba(11,99,209,0.22), inset 0 1px 0 rgba(255,255,255,0.24)"
      : "0 12px 24px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.84)",
    whiteSpace: "normal",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "translateZ(0)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#64748B",
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
    background: primary ? "#EAF2FF" : "#F8FAFC",
    border: primary
      ? "1px solid rgba(29,78,216,0.16)"
      : "1px solid rgba(11,31,51,0.08)",
    color: primary ? "#1D4ED8" : "#475569",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "normal",
  };
}

function pendingNotice(): React.CSSProperties {
  return {
    ...institutionalInnerCard("#F8FBFF"),
    borderRadius: 16,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.08)",
    color: "#35516B",
    padding: 16,
    lineHeight: 1.75,
    fontSize: 14,
  };
}

function infoTile(): React.CSSProperties {
  return {
    ...institutionalInnerCard("#FFFFFF"),
    borderRadius: 16,
    background: "#FFFFFF",
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 14,
  };
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

  const approvalTo = useMemo(() => {
    if (!requestId) return "";
    return mergeSearchIntoPath(
      `/join-approval/${encodeURIComponent(requestId)}`,
      location.search
    );
  }, [requestId, location.search]);

  const activationTo = useMemo(() => {
    const activationPath = safeStr(liveStatus?.activation_path || "");
    if (activationPath) {
      return mergeSearchIntoPath(activationPath, location.search);
    }

    const activationLink = safeStr(liveStatus?.activation_link || "");
    if (activationLink && typeof window !== "undefined") {
      try {
        const url = new URL(activationLink, window.location.origin);
        return `${url.pathname}${url.search}${url.hash}`;
      } catch {}
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
      setHandoffStarted(true);
      navigate(approvalTo, { replace: true });
    }
  }, [activationTo, approvalTo, handoffStarted, liveStatus, navigate, requestId]);

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 960,
        margin: "0 auto",
        paddingBottom: 30,
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
            "linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)"
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
                  color: "#0B1F33",
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
                  color: "#0B1F33",
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
                  color: "#0B1F33",
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
                    color: "#0B1F33",
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
                        color: "#0B1F33",
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
                        color: "#0B1F33",
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
                        color: "#0B1F33",
                        fontWeight: 900,
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                      }}
                    >
                      {marketplaceName}
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <OriginLink to={approvalTo} style={actionBtn(true)}>
                    Check approval status
                  </OriginLink>
                </div>
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

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <OriginLink to="/guide" style={actionBtn(false)}>
                Open My GSN and I
              </OriginLink>

              <OriginLink to="/app/dashboard#focus-commitments" style={actionBtn(false)}>
                Open Commitment Builder
              </OriginLink>

              <OriginLink to="/welcome" style={actionBtn(false)}>
                Welcome
              </OriginLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



