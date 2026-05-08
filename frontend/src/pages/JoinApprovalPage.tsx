import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { getJoinApprovalStatus } from "../lib/api";
import {
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import { navigateWithOrigin, withOriginState } from "../lib/nav";

type ApprovalStatus = {
  request_id?: number | string;
  status?: string | null;
  gmfn_id?: string | null;
  next_step?: string | null;
  message?: string | null;
  result_channel?: string | null;
  result_path?: string | null;
  pending_status_path?: string | null;
  approval_path?: string | null;
  activation_path?: string | null;
  activation_link?: string | null;
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

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "translateZ(0)",
    outlineOffset: 4,
  };
}

function consumeActionEvent(
  event:
    | React.MouseEvent<HTMLElement>
    | React.PointerEvent<HTMLElement>
    | React.TouchEvent<HTMLElement>
) {
  event.stopPropagation();
}

function actionBtn(primary = false, disabled = false): React.CSSProperties {
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
    background: disabled
      ? "linear-gradient(180deg, #CBD5E1 0%, #B8C4D4 100%)"
      : primary
      ? "linear-gradient(180deg, #1A6BE1 0%, #0B63D1 58%, #09479C 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,247,253,0.98) 62%, rgba(224,234,244,0.98) 100%)",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textAlign: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.75 : 1,
    boxShadow: disabled
      ? "none"
      : primary
      ? "0 16px 30px rgba(11,99,209,0.22), inset 0 1px 0 rgba(255,255,255,0.24)"
      : "0 12px 24px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.84)",
    whiteSpace: "normal",
    ...stableTapStyle(),
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
      return "Your request is still under review. If the community currently requires more than one approval, it can remain pending until the remaining review decision arrives.";
    }

    if (status === "rejected") {
      return "Your request was not approved at this time.";
    }

    return "Status information is available, but not fully classified.";
  }, [data?.message, status]);

  const communityLabel = useMemo(() => {
    return safeStr(data?.community_name || "Not available yet");
  }, [data]);

  const marketplaceLabel = useMemo(() => {
    return safeStr(data?.marketplace_name || "");
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

  const continueActivationTo = useMemo(() => {
    const resultPath = safeStr(data?.result_path || "");
    const resultChannel = safeStr(data?.result_channel || "").toLowerCase();
    if (resultPath && resultChannel === "activation-ready") {
      return mergeSearchIntoPath(resultPath, location.search);
    }

    const activationPath = safeStr(data?.activation_path || "");
    if (activationPath) {
      return mergeSearchIntoPath(activationPath, location.search);
    }

    const activationLink = safeStr(data?.activation_link || "");
    if (activationLink && typeof window !== "undefined") {
      try {
        const url = new URL(activationLink, window.location.origin);
        return `${url.pathname}${url.search}${url.hash}`;
      } catch {
        // fall through to local path fallback
      }
    }

    return mergeSearchIntoPath("/activate-membership", location.search);
  }, [data, location.search]);

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
        sectionLabel="Join Approval"
        title="Join Approval"
        subtitle="Review the outcome of your community join request and continue to the correct next step."
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen shows the outcome of your community join request and helps you move into the right next public step."
        why="It keeps approval, rejection, and next-step guidance in one place so you do not have to guess what to do after review."
        next="Check the approval status first, then follow the next action shown here."
        tone="light"
        style={{ marginTop: 18 }}
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 54%, #173654 100%)"),
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

          <button
            type="button"
            onPointerDown={consumeActionEvent}
            onMouseDown={consumeActionEvent}
            onClick={goBack}
            style={actionBtn(false)}
          >
            Back
          </button>
        </div>

        <ExplainToggle
          label="What this does"
          what="This approval status block keeps the outcome of your join request visible before you move into the next public step."
          why="It helps you understand whether entry was approved, rejected, or still unresolved without guessing from the route alone."
          next="Read the status here first, then use the next action the page gives you."
          tone="dark"
          style={{ marginTop: 14 }}
        />
      </div>

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18, color: "#F8FBFF" }}>
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

              <div style={{ marginTop: 10, ...helperText(), color: "#35516B" }}>
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
                {marketplaceLabel ? (
                  <span style={badge(false)}>
                    Community / Market: {marketplaceLabel}
                  </span>
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
                      color: "#F8FBFF",
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
                      color: "#F8FBFF",
                      fontWeight: 1000,
                      lineHeight: 1.45,
                    }}
                  >
                    {communityLabel}
                  </div>
                </div>

                {marketplaceLabel ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Community / Market</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 1000,
                        lineHeight: 1.45,
                      }}
                    >
                      {marketplaceLabel}
                    </div>
                  </div>
                ) : null}

                {safeStr(data?.community_code) ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Community ID</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
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
                        color: "#F8FBFF",
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
                        color: "#F8FBFF",
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
                        color: "#F8FBFF",
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
                    onPointerDown={consumeActionEvent}
                    onMouseDown={consumeActionEvent}
                    style={actionBtn(true)}
                    onClick={() =>
                      navigateWithOrigin(
                        navigate,
                        continueActivationTo,
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
                    Open activation
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
                Focus Commitments opens from Dashboard after workspace entry. If
                you want to understand that discipline path first, open the full
                guide before you continue.
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
                  Open full GSN guide
                </OriginLink>

                <OriginLink
                  to="/guide"
                  preserveSearch
                  state={withOriginState(location)}
                  style={actionBtn(false)}
                >
                  Read about Focus Commitments first
                </OriginLink>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


