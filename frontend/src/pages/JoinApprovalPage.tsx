import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJoinApprovalStatus } from "../lib/api";

type ApprovalStatus = {
  request_id?: number;
  status?: string;
  gmfn_id?: string | null;
  next_step?: string | null;
  message?: string | null;
};

function pageCard(): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 18,
    background: "#fff",
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
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
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: "pointer",
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
        const res = await getJoinApprovalStatus(requestId || "");
        setData(res);
      } catch (err: any) {
        setError(err?.message || "Could not load approval status");
      } finally {
        setLoading(false);
      }
    }

    if (requestId) {
      void load();
    }
  }, [requestId]);

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/welcome");
  }

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Application Status</h2>

        <button type="button" onClick={goBack} style={actionBtn(false)}>
          ← Back
        </button>
      </div>

      {loading ? (
        <div style={pageCard()}>
          <strong>Loading...</strong>
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            ...pageCard(),
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && data ? (
        <div style={pageCard()}>
          <p>
            <strong>Status:</strong> {data.status || "pending"}
          </p>

          {data.status === "approved" ? (
            <>
              <p>Congratulations. Your request has been approved.</p>
              <p>
                <strong>GMFN ID:</strong> {data.gmfn_id || "Pending issuance"}
              </p>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  style={actionBtn(true)}
                  onClick={() =>
                    navigate("/activate-membership", {
                      state: {
                        gmfn_id: data.gmfn_id || "",
                        request_id: requestId || "",
                      },
                    })
                  }
                >
                  Continue Onboarding
                </button>
              </div>
            </>
          ) : null}

          {data.status === "pending" ? (
            <p>Your request is still under review.</p>
          ) : null}

          {data.status === "rejected" ? (
            <p>Your request was not approved at this time.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}