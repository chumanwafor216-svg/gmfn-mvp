import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getCommunityJoinRequests,
  selectClan,
  voteOnJoinRequest,
} from "../lib/api";

type JoinRequestItem = {
  id: number;
  clan_id?: number;
  community_code?: string | null;
  clan_name?: string | null;
  marketplace_name?: string | null;
  applicant_user_id?: number | null;
  applicant_name?: string | null;
  applicant_nickname?: string | null;
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
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textAlign: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.78 : 1,
    whiteSpace: "normal",
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

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "Not available yet";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function friendlyStatus(value: any): string {
  const raw = safeStr(value, "pending").toLowerCase();
  if (raw === "approve" || raw === "approved") return "approved";
  if (raw === "reject" || raw === "rejected") return "rejected";
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
  } catch {
    // ignore
  }
  document.body.removeChild(area);
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
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

  const clanNum = Number(clanId || 0);

  async function load() {
    try {
      setLoading(true);
      setError("");

      if (!clanNum) {
        throw new Error("Invalid community ID.");
      }

      const data = await getCommunityJoinRequests(clanNum);
      const rows = Array.isArray(data) ? data : data?.items || [];
      setItems(rows);
    } catch (err: any) {
      setError(err?.message || "Failed to load join requests.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!clanNum) {
      setError("Invalid community ID.");
      setLoading(false);
      return;
    }

    (async () => {
      await selectClan(clanNum).catch(() => null);
      await load();
    })();
  }, [clanNum]);

  const selectedCommunityName = useMemo(() => {
    const first = items[0];
    return safeStr(
      first?.clan_name || first?.marketplace_name || `Community ${clanNum}`
    );
  }, [items, clanNum]);

  const summary = useMemo(() => {
    const pending = items.filter(
      (item) => friendlyStatus(item.status) === "pending"
    ).length;
    const approved = items.filter(
      (item) => friendlyStatus(item.status) === "approved"
    ).length;
    const rejected = items.filter(
      (item) => friendlyStatus(item.status) === "rejected"
    ).length;

    return {
      total: items.length,
      pending,
      approved,
      rejected,
    };
  }, [items]);

  async function handleVote(requestId: number, vote: "approve" | "reject") {
    try {
      setBusyId(requestId);
      setError("");
      setSuccess("");
      setActivationPack(null);

      await selectClan(clanNum).catch(() => null);

      const res = (await voteOnJoinRequest(requestId, vote)) as VoteResponse;

      if (vote === "approve" && res?.approved_now && res?.approval_result?.gmfn_id) {
        setSuccess(
          `Request approved successfully. GMFN ID issued: ${res.approval_result.gmfn_id}`
        );
        setActivationPack(res.approval_result || null);
      } else if (vote === "approve") {
        setSuccess(
          "Approval recorded successfully. The request may still be waiting for the final approval threshold."
        );
      } else {
        setSuccess("Rejection recorded successfully.");
      }

      await load();
    } catch (err: any) {
      setError(err?.message || "Vote failed.");
    } finally {
      setBusyId(null);
    }
  }

  function goBack() {
    navigate(`/app/community/${clanNum}`);
  }

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Community Join Requests"
        title="Community Join Requests"
        subtitle="Review incoming requests for your current community and decide whether to approve or reject them."
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen gathers incoming join requests for one community so you can review each applicant and decide whether to approve or reject the request."
        why="It keeps community entry decisions clear and tied to the right community instead of mixing them into the wider community workspace."
        next="Confirm the community first, read the request counts, and then review each applicant card before voting."
        tone="light"
        style={{ marginTop: 18 }}
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Selected community</div>

        <div
          style={{
            marginTop: 10,
            fontSize: 30,
            fontWeight: 1000,
            color: "#F8FBFF",
            lineHeight: 1.15,
          }}
        >
          {selectedCommunityName}
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#D7E3F1",
            lineHeight: 1.8,
          }}
        >
          This belongs to the community approval flow. Review join requests
          here, then return to Community Home or Marketplace when this review task is complete.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 30,
              padding: "6px 10px",
              borderRadius: 999,
              background: "#F8FAFC",
              border: "1px solid rgba(11,31,51,0.08)",
              color: "#475569",
              fontWeight: 900,
              fontSize: 12,
              whiteSpace: "normal",
            }}
          >
            Current step: Community review
          </span>
          <button type="button" onClick={goBack} style={actionBtn(false)}>
            Community Home
          </button>

          <OriginLink to="/app/marketplace" style={actionBtn(false)}>
            Marketplace
          </OriginLink>

          <button
            type="button"
            onClick={() => void load()}
            style={actionBtn(true, loading)}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            ...pageCard("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            ...pageCard("#ECFDF5"),
            marginTop: 18,
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {success}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Total</div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {summary.total}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Pending</div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {summary.pending}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Approved</div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {summary.approved}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Rejected</div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {summary.rejected}
          </div>
        </div>
      </div>

      {activationPack?.gmfn_id ? (
        <div
          style={{
            ...pageCard("#F8FBFF"),
            marginTop: 18,
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 18, color: "#0B1F33" }}>
            Approval to activation package
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
              <strong>Community:</strong> {safeStr(activationPack.community_name || "Not available yet")}
            </div>
            <div>
              <strong>Community ID:</strong> {safeStr(activationPack.community_code || "Not available yet")}
            </div>
            <div>
              <strong>Invited by:</strong>{" "}
              {safeStr(
                activationPack.invited_by_display ||
                  activationPack.invited_by_email ||
                  "Not available yet"
              )}
            </div>
            <div>
              <strong>Activation link:</strong>{" "}
              <span style={{ wordBreak: "break-word" }}>
                {safeStr(activationPack.activation_link || "Not available yet")}
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
                letterSpacing: 0.35,
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

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
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

            {safeStr(activationPack.activation_link || "") ? (
              <a
                href={safeStr(activationPack.activation_link || "")}
                target={isExternalUrl(safeStr(activationPack.activation_link || "")) ? "_blank" : undefined}
                rel={isExternalUrl(safeStr(activationPack.activation_link || "")) ? "noreferrer" : undefined}
                style={actionBtn(false)}
              >
                Open Activation Page
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18 }}>
          <strong>Loading join requests...</strong>
        </div>
      ) : null}

      {!loading && !error && !items.length ? (
        <div style={{ ...pageCard(), marginTop: 18 }}>
          <strong>No join requests are currently shown.</strong>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        {items.map((item) => {
          const status = friendlyStatus(item.status);
          const isPending = status === "pending";
          const isBusy = busyId === item.id;
          const applicantLabel = safeStr(
            item.applicant_name ||
              item.applicant_nickname ||
              item.applicant_email ||
              "Applicant"
          );

          return (
            <div key={item.id} style={pageCard()}>
              <div style={{ marginBottom: 8, fontWeight: 1000, color: "#0B1F33" }}>
                Request #{item.id}
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>
                <div>
                  <strong>{applicantLabel}</strong> invited by{" "}
                  <strong>
                    {safeStr(
                      item.invited_by_display ||
                        item.invited_by_email ||
                        "a community member"
                    )}
                  </strong>{" "}
                  wants to join <strong>{safeStr(item.clan_name || "this community")}</strong>.
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
                  <div>
                    Community ID: {safeStr(item.community_code || "Awaiting issue")}
                  </div>
                  <div>
                    Community / Market:{" "}
                    {safeStr(
                      item.marketplace_name ||
                        item.clan_name ||
                        "Not available yet"
                    )}
                  </div>
                  <div>Invite code: {safeStr(item.invite_code || "Not available yet")}</div>
                  <div>Status: {status}</div>
                  <div>Submitted: {safeDateTime(item.created_at)}</div>
                  <div>Decided: {safeDateTime(item.decided_at)}</div>
                  <div>Approvals: {Number(item.approvals || 0)}</div>
                  <div>Rejects: {Number(item.rejects || 0)}</div>
                  <div>Total votes: {Number(item.total_votes || 0)}</div>
                  <div>Active members: {Number(item.active_member_count || 0)}</div>
                  <div>Required approvals: {Number(item.required_approvals || 0)}</div>

                  {safeStr(item.applicant_gmfn_id || "") ? (
                    <div>Applicant GMFN ID: {safeStr(item.applicant_gmfn_id)}</div>
                  ) : null}
                </div>
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
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
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


