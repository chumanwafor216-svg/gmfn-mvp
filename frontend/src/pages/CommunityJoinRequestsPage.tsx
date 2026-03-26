import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCommunityJoinRequests, voteOnJoinRequest } from "../lib/api";

type JoinRequestItem = {
  id: number;
  clan_id?: number;
  community_code?: string | null;
  clan_name?: string | null;
  marketplace_name?: string | null;
  applicant_user_id?: number | null;
  applicant_email?: string | null;
  applicant_gmfn_id?: string | null;
  invite_id?: number | null;
  invite_code?: string | null;
  invited_by_user_id?: number | null;
  invited_by_email?: string | null;
  invited_by_display?: string | null;
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

type ApprovalResult = {
  ok?: boolean;
  status?: string;
  gmfn_id?: string | null;
  user_id?: number;
  membership_id?: number;
  message?: string;
  community_id?: number;
  community_code?: string | null;
  community_name?: string | null;
  marketplace_name?: string | null;
  invited_by_user_id?: number | null;
  invited_by_email?: string | null;
  invited_by_display?: string | null;
  activation_link?: string | null;
  activation_message?: string | null;
  lineage?: {
    origin_community_id?: number;
    origin_community_code?: string | null;
    origin_community_name?: string | null;
    inviter_user_id?: number | null;
    invite_id?: number | null;
    join_request_id?: number | null;
  } | null;
};

type VoteResponse = {
  ok?: boolean;
  community_id?: number;
  community_code?: string | null;
  approved_now?: boolean;
  approval_result?: ApprovalResult | null;
  request?: JoinRequestItem;
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
    textDecoration: "none",
  };
}

function safeStr(x: any): string {
  return String(x ?? "");
}

function friendlyStatus(value: any): string {
  const raw = safeStr(value).trim().toLowerCase();
  if (!raw) return "pending";
  if (raw === "approved") return "approved";
  if (raw === "reject") return "rejected";
  if (raw === "rejected") return "rejected";
  return raw;
}

function copyText(text: string) {
  const safe = safeStr(text);
  if (!safe) return;

  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(safe).catch(() => {});
    return;
  }

  const area = document.createElement("textarea");
  area.value = safe;
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand("copy");
  } catch {}
  document.body.removeChild(area);
}

export default function CommunityJoinRequestsPage() {
  const navigate = useNavigate();
  const { clanId } = useParams();

  const [items, setItems] = useState<JoinRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activationPack, setActivationPack] = useState<ApprovalResult | null>(null);

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
      setError("");
      setSuccess("");
      setActivationPack(null);

      const res = (await voteOnJoinRequest(requestId, vote)) as VoteResponse;

      if (vote === "approve" && res?.approved_now && res?.approval_result?.gmfn_id) {
        setSuccess(
          `Request approved successfully. GMFN ID issued: ${res.approval_result.gmfn_id}`
        );
        setActivationPack(res.approval_result || null);
      } else if (vote === "approve") {
        setSuccess("Approval recorded successfully.");
      } else {
        setSuccess("Rejection recorded successfully.");
      }

      await load();
    } catch (err: any) {
      setError(err?.message || "Vote failed");
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
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            ...pageCard(),
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            marginBottom: 16,
            fontWeight: 900,
          }}
        >
          {success}
        </div>
      ) : null}

      {activationPack?.gmfn_id ? (
        <div
          style={{
            ...pageCard(),
            background: "#F8FBFF",
            border: "1px solid rgba(11,31,51,0.08)",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 18, color: "#0B1F33" }}>
            Approval → Activation Package
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 8,
              color: "#334155",
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            <div>
              <strong>GMFN ID:</strong> {safeStr(activationPack.gmfn_id)}
            </div>
            <div>
              <strong>Community:</strong>{" "}
              {safeStr(activationPack.community_name || "—")}
            </div>
            <div>
              <strong>Community ID:</strong>{" "}
              {safeStr(activationPack.community_code || "—")}
            </div>
            <div>
              <strong>Invited by:</strong>{" "}
              {safeStr(
                activationPack.invited_by_display ||
                  activationPack.invited_by_email ||
                  "—"
              )}
            </div>
            <div>
              <strong>Activation link:</strong>{" "}
              <span style={{ wordBreak: "break-word" }}>
                {safeStr(activationPack.activation_link || "—")}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              background: "#FFFFFF",
              border: "1px solid rgba(11,31,51,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 1000,
                color: "#64748B",
                marginBottom: 8,
              }}
            >
              ACTIVATION MESSAGE
            </div>

            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "inherit",
                color: "#0B1F33",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              {safeStr(activationPack.activation_message || "")}
            </pre>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button
              type="button"
              style={actionBtn(true)}
              onClick={() => copyText(safeStr(activationPack.activation_message || ""))}
            >
              Copy Activation Message
            </button>

            <button
              type="button"
              style={actionBtn(false)}
              onClick={() => copyText(safeStr(activationPack.activation_link || ""))}
            >
              Copy Activation Link
            </button>
          </div>
        </div>
      ) : null}

      {!loading && !error && !items.length ? (
        <div style={pageCard()}>
          <strong>No join requests yet.</strong>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {items.map((item) => {
          const status = friendlyStatus(item.status);
          const isPending = status === "pending";
          const isBusy = busyId === item.id;

          return (
            <div key={item.id} style={pageCard()}>
              <div style={{ marginBottom: 8 }}>
                <strong>Request #{item.id}</strong>
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>
                <div>
                  <strong>{safeStr(item.applicant_email || "A member")}</strong> invited by{" "}
                  <strong>
                    {safeStr(
                      item.invited_by_display ||
                        item.invited_by_email ||
                        "a community member"
                    )}
                  </strong>{" "}
                  wants to join <strong>{safeStr(item.clan_name || "this community")}</strong>.
                </div>

                <div style={{ marginTop: 10 }}>
                  Community ID: {safeStr(item.community_code || "-")}
                </div>
                <div>
                  Community / Market:{" "}
                  {safeStr(item.marketplace_name || item.clan_name || "-")}
                </div>
                <div>Invite code: {safeStr(item.invite_code || "-")}</div>
                <div>Status: {status}</div>
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

                {safeStr(item.applicant_gmfn_id || "").trim() ? (
                  <div>
                    Applicant GMFN ID: {safeStr(item.applicant_gmfn_id)}
                  </div>
                ) : null}
              </div>

              {!isPending ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 12,
                    background: "#F8FAFC",
                    color: "#0B1F33",
                    fontWeight: 800,
                  }}
                >
                  This request has already been {status}.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleVote(item.id, "approve")}
                    disabled={isBusy}
                    style={actionBtn(true, isBusy)}
                  >
                    {isBusy ? "Working..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVote(item.id, "reject")}
                    disabled={isBusy}
                    style={actionBtn(false, isBusy)}
                  >
                    {isBusy ? "Working..." : "Reject"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}