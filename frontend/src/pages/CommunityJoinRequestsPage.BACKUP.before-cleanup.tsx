import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCommunityJoinRequests, voteOnJoinRequest } from "../lib/api";

type JoinRequestItem = {
  id: number;
  clan_id?: number;
  clan_name?: string | null;
  applicant_user_id?: number | null;
  applicant_email?: string | null;
  invite_id?: number | null;
  invite_code?: string | null;
  invited_by_user_id?: number | null;
  invited_by_email?: string | null;
  status?: string;
  created_at?: string;
  decided_at?: string | null;
  approvals?: number;
  rejects?: number;
  total_votes?: number;
  active_member_count?: number;
  required_approvals?: number;
  threshold_ratio?: string;
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
  };
}

function safeStr(x: any): string {
  return String(x ?? "");
}

export default function CommunityJoinRequestsPage() {
  const navigate = useNavigate();
  const { clanId } = useParams();

  const [items, setItems] = useState<JoinRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const clanNum = Number(clanId || 0);
      if (!clanNum) {
        throw new Error("Invalid community ID");
      }

      const data = await getCommunityJoinRequests(clanNum);
      const rows = Array.isArray(data) ? data : data?.items || [];
      setItems(rows);
    } catch (err: any) {
      setError(err?.message || "Failed to load join requests");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!clanId) return;
    void load();
  }, [clanId]);

  async function handleVote(requestId: number, vote: "approve" | "reject") {
    try {
      setBusyId(requestId);
      await voteOnJoinRequest(requestId, vote);
      await load();
    } catch (err: any) {
      alert(err?.message || "Vote failed");
    } finally {
      setBusyId(null);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/app/clans");
  }

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
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
        <div>
          <h2 style={{ margin: 0 }}>Incoming Join Requests</h2>
          <p style={{ marginTop: 8, color: "#64748B" }}>
            Review and respond to pending requests for this community.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={goBack} style={actionBtn(false)}>
            ← Back
          </button>
          <button type="button" onClick={() => void load()} style={actionBtn(false)}>
            Refresh
          </button>
        </div>
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

      {!loading && !error && !items.length ? (
        <div style={pageCard()}>
          <strong>No join requests yet.</strong>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {items.map((item) => (
          <div key={item.id} style={pageCard()}>
            <div style={{ marginBottom: 8 }}>
              <strong>Request #{item.id}</strong>
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>
              <div>Community: {safeStr(item.clan_name || "-")}</div>
              <div>Applicant: {safeStr(item.applicant_email || "-")}</div>
              <div>Invite code: {safeStr(item.invite_code || "-")}</div>
              <div>Invited by: {safeStr(item.invited_by_email || "-")}</div>
              <div>Status: {safeStr(item.status || "pending")}</div>
              <div>
                Submitted:{" "}
                {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
              </div>
              <div>
                Decided:{" "}
                {item.decided_at ? new Date(item.decided_at).toLocaleString() : "-"}
              </div>
              <div>Approvals: {Number(item.approvals || 0)}</div>
              <div>Rejects: {Number(item.rejects || 0)}</div>
              <div>Total votes: {Number(item.total_votes || 0)}</div>
              <div>Active members: {Number(item.active_member_count || 0)}</div>
              <div>Required approvals: {Number(item.required_approvals || 0)}</div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleVote(item.id, "approve")}
                disabled={busyId === item.id}
                style={actionBtn(true, busyId === item.id)}
              >
                {busyId === item.id ? "Working..." : "Approve"}
              </button>

              <button
                type="button"
                onClick={() => handleVote(item.id, "reject")}
                disabled={busyId === item.id}
                style={actionBtn(false, busyId === item.id)}
              >
                {busyId === item.id ? "Working..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}