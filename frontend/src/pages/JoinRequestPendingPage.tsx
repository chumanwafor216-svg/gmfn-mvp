import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 20,
    background: bg,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 16,
    background: bg,
    padding: 14,
  };
}

function actionBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#1D4ED8" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textDecoration: "none",
    cursor: "pointer",
    minHeight: 42,
    whiteSpace: "nowrap",
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
    whiteSpace: "nowrap",
  };
}

function pendingNotice(): React.CSSProperties {
  return {
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
  const [searchParams] = useSearchParams();

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

  const state =
    (location.state as {
      request_id?: string | number;
      community_name?: string;
      clan_name?: string;
      status?: string;
      submitted_at?: string;
    }) || {};

  const requestId = useMemo(
    () => safeStr(state.request_id || searchParams.get("request_id") || ""),
    [state, searchParams]
  );

  const communityName = useMemo(
    () =>
      safeStr(
        state.community_name ||
          state.clan_name ||
          searchParams.get("community_name") ||
          searchParams.get("clan_name") ||
          "the community",
        "the community"
      ),
    [state, searchParams]
  );

  const statusText = useMemo(
    () => safeStr(state.status || searchParams.get("status") || "pending"),
    [state, searchParams]
  );

  const submittedAt = useMemo(
    () => safeStr(state.submitted_at || searchParams.get("submitted_at") || ""),
    [state, searchParams]
  );

  const approvalTo = useMemo(() => {
    if (!requestId) return "";
    return mergeSearchIntoPath(
      `/join-approval/${encodeURIComponent(requestId)}`,
      location.search
    );
  }, [requestId, location.search]);

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
          {requestId ? <span style={badge(false)}>Request ID: {requestId}</span> : null}
        </div>
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
                already in place.
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



