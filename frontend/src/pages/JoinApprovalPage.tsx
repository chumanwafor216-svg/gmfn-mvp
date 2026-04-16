import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { getJoinApprovalStatus } from "../lib/api";
import { navigateWithOrigin, withOriginState } from "../lib/nav";

type ApprovalStatus = {
  request_id?: number | string;
  status?: string | null;
  gmfn_id?: string | null;
  next_step?: string | null;
  message?: string | null;
  community_name?: string | null;
  community_code?: string | null;
  marketplace_name?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  activated_at?: string | null;
};

type NormalizedStatus = "approved" | "pending" | "rejected" | "unknown";

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

function actionBtn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#1D4ED8" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.75 : 1,
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

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function safeDateTime(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "Not available yet";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function normalizedStatus(value?: string | null): NormalizedStatus {
  const raw = safeStr(value).toLowerCase();

  if (
    raw === "approved" ||
    raw === "approve" ||
    raw.includes("approved") ||
    raw.includes("ready") ||
    raw.includes("issued") ||
    raw.includes("activated")
  ) {
    return "approved";
  }

  if (
    raw === "pending" ||
    raw.includes("pending") ||
    raw.includes("review") ||
    raw.includes("waiting")
  ) {
    return "pending";
  }

  if (
    raw === "rejected" ||
    raw === "reject" ||
    raw.includes("reject") ||
    raw.includes("declin") ||
    raw.includes("denied")
  ) {
    return "rejected";
  }

  return "unknown";
}

function statusTone(status: NormalizedStatus) {
  if (status === "approved") {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
      title: "Approved",
    };
  }

  if (status === "pending") {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
      title: "Pending",
    };
  }

  if (status === "rejected") {
    return {
      bg: "#FEF2F2",
      border: "1px solid #FECACA",
      text: "#991B1B",
      title: "Rejected",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid #E2E8F0",
    text: "#475569",
    title: "Unknown",
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

export default function JoinApprovalPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [data, setData] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      document.title = "GSN | Join Approval";
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        if (!requestId) {
          throw new Error("Join request ID is missing.");
        }

        const res = await getJoinApprovalStatus(requestId);
        setData(res || null);
      } catch (err: any) {
        setError(err?.message || "Could not load approval status.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [requestId]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(mergeSearchIntoPath("/welcome", location.search));
  }

  const status = useMemo<NormalizedStatus>(
    () => normalizedStatus(data?.status),
    [data?.status]
  );

  const tone = useMemo(() => statusTone(status), [status]);

  const helperMessage = useMemo(() => {
    if (safeStr(data?.message)) return safeStr(data?.message);

    if (status === "approved") {
      return "Your request has been approved. Continue to activation to finish entry into your personal pages.";
    }

    if (status === "pending") {
      return "Your request is still under review. Check back again later.";
    }

    if (status === "rejected") {
      return "Your request was not approved at this time.";
    }

    return "Status information is available, but not fully classified.";
  }, [data?.message, status]);

  const communityLabel = useMemo(() => {
    return safeStr(
      data?.community_name || data?.marketplace_name || "Not available yet"
    );
  }, [data]);

  const requestLabel = useMemo(() => {
    return safeStr(data?.request_id || requestId || "Not available yet");
  }, [data, requestId]);

  const gmfnId = useMemo(() => {
    return safeStr(data?.gmfn_id || "");
  }, [data]);

  const reviewedAt = useMemo(() => {
    return safeStr(data?.approved_at || data?.reviewed_at || data?.activated_at || "");
  }, [data]);

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
        sectionLabel="Join Approval"
        title="Join Approval"
        subtitle="Review the outcome of your community join request and continue to the correct next step."
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Approval status</div>
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
              Join request status
            </div>
            <div style={{ marginTop: 8, ...helperText(), color: "#D7E3F1" }}>
              Review the outcome of your request, then continue to the right next public step.
            </div>
          </div>

          <button type="button" onClick={goBack} style={actionBtn(false)}>
            Back
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18 }}>
          <strong>Loading approval status...</strong>
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            ...pageCard("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1.02fr 0.98fr",
            gap: 18,
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                ...pageCard(tone.bg),
                border: tone.border,
              }}
            >
              <div style={sectionLabel()}>Status</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 30,
                  fontWeight: 1000,
                  color: tone.text,
                }}
              >
                {tone.title}
              </div>

              <div style={{ marginTop: 10, ...helperText(), color: "#475569" }}>
                {helperMessage}
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Status: {tone.title}</span>
                <span style={badge(false)}>Request ID: {requestLabel}</span>
                <span style={badge(false)}>
                  Current step:{" "}
                  {status === "approved"
                    ? "Activation ready"
                    : status === "pending"
                    ? "Awaiting decision"
                    : status === "rejected"
                    ? "Request closed"
                    : "Status review"}
                </span>
                {communityLabel !== "Not available yet" ? (
                  <span style={badge(false)}>Community: {communityLabel}</span>
                ) : null}
                {safeStr(data?.community_code) ? (
                  <span style={badge(false)}>
                    Community ID: {safeStr(data?.community_code)}
                  </span>
                ) : null}
                {gmfnId ? <span style={badge(false)}>GMFN ID: {gmfnId}</span> : null}
              </div>
            </div>

            <div style={pageCard()}>
              <div style={sectionLabel()}>Request details</div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={softCard()}>
                  <div style={sectionLabel()}>Request ID</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                    }}
                  >
                    {requestLabel}
                  </div>
                </div>

                <div style={softCard()}>
                  <div style={sectionLabel()}>Community</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      lineHeight: 1.45,
                    }}
                  >
                    {communityLabel}
                  </div>
                </div>

                {safeStr(data?.community_code) ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Community ID</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 1000,
                        lineHeight: 1.45,
                      }}
                    >
                      {safeStr(data?.community_code)}
                    </div>
                  </div>
                ) : null}

                {reviewedAt ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>
                      {status === "approved" ? "Approved / reviewed" : "Reviewed"}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 1000,
                        lineHeight: 1.45,
                      }}
                    >
                      {safeDateTime(reviewedAt)}
                    </div>
                  </div>
                ) : null}

                {status === "approved" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>GMFN ID</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 1000,
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                      }}
                    >
                      {gmfnId || "Awaiting issue"}
                    </div>
                  </div>
                ) : null}

                {safeStr(data?.next_step) ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Next step</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 1000,
                        lineHeight: 1.45,
                      }}
                    >
                      {safeStr(data?.next_step)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={pageCard()}>
              <div style={sectionLabel()}>Next action</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                {status === "approved"
                  ? "Activation is the correct next step."
                  : status === "pending"
                  ? "You can return later to check this status again."
                  : status === "rejected"
                  ? "You can return to entry or speak again with the inviting community."
                  : "Return to entry or try again later."}
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {status === "approved" ? (
                  <button
                    type="button"
                    style={actionBtn(true)}
                    onClick={() =>
                      navigateWithOrigin(
                        navigate,
                        mergeSearchIntoPath("/activate-membership", location.search),
                        location,
                        {
                          state: {
                            gmfn_id: gmfnId,
                            request_id: requestId || "",
                          },
                        }
                      )
                    }
                  >
                    Continue Activation
                  </button>
                ) : null}

                {status === "pending" ? (
                  <OriginLink
                    to={mergeSearchIntoPath("/join-request/pending", location.search)}
                    style={actionBtn(false)}
                  >
                    Open pending status
                  </OriginLink>
                ) : null}

                <OriginLink
                  to={mergeSearchIntoPath("/welcome", location.search)}
                  style={actionBtn(false)}
                >
                  Return to Welcome
                </OriginLink>
              </div>
            </div>

            <div style={pageCard()}>
              <div style={sectionLabel()}>Support</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                If you need to understand the system better before the next step,
                open the readable guide first.
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                GSN also supports steadier follow-through after entry, so goals
                around savings, repayment, and business discipline can become
                more structured once your path is active.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <OriginLink
                  to="/guide"
                  preserveSearch
                  state={withOriginState(location)}
                  style={actionBtn(false)}
                >
                  Open My GSN and I
                </OriginLink>

                <OriginLink
                  to="/app/dashboard#focus-commitments"
                  preserveSearch
                  state={withOriginState(location)}
                  style={actionBtn(false)}
                >
                  Open Commitment Builder
                </OriginLink>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


