import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getJoinApprovalStatus } from "../lib/api";

type ApprovalStatus = {
  request_id?: number;
  status?: string;
  gmfn_id?: string | null;
  next_step?: string | null;
  message?: string | null;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 20,
    background: bg,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
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
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.75 : 1,
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

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function normalizedStatus(value?: string | null): "approved" | "pending" | "rejected" | "unknown" {
  const raw = safeStr(value).toLowerCase();

  if (raw === "approved") return "approved";
  if (raw === "pending") return "pending";
  if (raw === "rejected" || raw === "reject") return "rejected";
  return "unknown";
}

function statusTone(status: "approved" | "pending" | "rejected" | "unknown") {
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

export default function JoinApprovalPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/welcome");
  }

  const status = useMemo(
    () => normalizedStatus(data?.status),
    [data?.status]
  );

  const tone = useMemo(() => statusTone(status), [status]);

  const helperMessage = useMemo(() => {
    if (safeStr(data?.message)) return safeStr(data?.message);

    if (status === "approved") {
      return "Your request has been approved. Continue to activation to finish entry into your personal surfaces.";
    }

    if (status === "pending") {
      return "Your request is still under review. Check back again later.";
    }

    if (status === "rejected") {
      return "Your request was not approved at this time.";
    }

    return "Status information is available, but not fully classified.";
  }, [data?.message, status]);

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto", paddingBottom: 30 }}>
      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
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
            <div style={sectionLabel()}>Join approval</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 28,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              Application Status
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.8,
              }}
            >
              Review the outcome of your request, then move to the next public step.
            </div>
          </div>

          <button type="button" onClick={goBack} style={actionBtn(false)}>
            ← Back
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18 }}>
          <strong>Loading...</strong>
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
        <>
          <div
            style={{
              ...pageCard(tone.bg),
              marginTop: 18,
              border: tone.border,
            }}
          >
            <div style={sectionLabel()}>Status</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 28,
                fontWeight: 1000,
                color: tone.text,
              }}
            >
              {tone.title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#475569",
                lineHeight: 1.8,
              }}
            >
              {helperMessage}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 8,
                color: "#334155",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              <div>
                <strong>Request ID:</strong> {safeStr(data.request_id || requestId || "—")}
              </div>

              {status === "approved" ? (
                <div>
                  <strong>GMFN ID:</strong> {safeStr(data.gmfn_id || "Pending issuance")}
                </div>
              ) : null}

              {safeStr(data.next_step) ? (
                <div>
                  <strong>Next step:</strong> {safeStr(data.next_step)}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ ...pageCard(), marginTop: 18 }}>
            <div style={sectionLabel()}>Next action</div>

            <div
              style={{
                marginTop: 10,
                color: "#64748B",
                lineHeight: 1.8,
              }}
            >
              {status === "approved"
                ? "Activation is the correct next step."
                : status === "pending"
                ? "You can return later to check this status again."
                : status === "rejected"
                ? "You can return to the public entry surface."
                : "Return to the public entry surface or try again later."}
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
                    navigate("/activate-membership", {
                      state: {
                        gmfn_id: safeStr(data.gmfn_id || ""),
                        request_id: requestId || "",
                      },
                    })
                  }
                >
                  Continue Onboarding
                </button>
              ) : null}

              <Link to="/welcome" style={actionBtn(false)}>
                Open Welcome
              </Link>

              <Link to="/cover" style={actionBtn(false)}>
                Open Cover
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}