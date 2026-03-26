import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createClan,
  createClanInvite,
  getCommunityJoinRequests,
  getSelectedClanId,
  listMyClans,
  selectClan,
} from "../lib/api";

type CommunityItem = {
  id?: number;
  name?: string | null;
  display_name?: string | null;
  title?: string | null;
  description?: string | null;
  invite_code?: string | null;
  invite_link?: string | null;
  invite_url?: string | null;
  community_id?: string | null;
  marketplace_id?: string | null;
  gmfn_id?: string | null;
  clan_code?: string | null;
  members?: any[];
  memberships?: any[];
  member_rows?: any[];
  created_at?: string | null;
};

type JoinRequestItem = {
  id?: number;
  clan_id?: number;
  clan_name?: string | null;
  applicant_name?: string | null;
  applicant_nickname?: string | null;
  applicant_email?: string | null;
  applicant_gmfn_id?: string | null;
  status?: string | null;
  approvals?: number;
  required_approvals?: number;
  created_at?: string | null;
};

type InviteState = {
  code?: string | null;
  link?: string | null;
  shareText?: string | null;
  expiresAt?: string | null;
  guideUrl?: string | null;
  packagedShareText?: string | null;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 22px 54px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.03)",
    overflow: "hidden",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 13px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(11,99,209,0.22)"
      : "1px solid rgba(11,31,51,0.10)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    fontSize: 14,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function communityName(item: any): string {
  return safeStr(item?.display_name || item?.name || item?.title || "Community");
}

function communityIdentity(item: any): string {
  return safeStr(
    item?.community_id ||
      item?.marketplace_id ||
      item?.gmfn_id ||
      item?.clan_code ||
      item?.id ||
      "Pending"
  );
}

function extractMembers(community: any): any[] {
  return Array.isArray(community?.members)
    ? community.members
    : Array.isArray(community?.member_rows)
    ? community.member_rows
    : Array.isArray(community?.memberships)
    ? community.memberships
    : [];
}

function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

function buildGuideUrl(): string {
  return `${appOrigin()}/GSN_FINAL_WHITE.pdf`;
}

function buildInviteState(raw: any): InviteState {
  const code = safeStr(raw?.code || raw?.invite_code || "");
  const link = safeStr(raw?.link || raw?.invite_link || raw?.invite_url || "");
  const shareText = safeStr(raw?.share_text || raw?.message || "");
  const expiresAt = safeStr(raw?.expires_at || raw?.expiry || "");
  const guideUrl = buildGuideUrl();

  const packagedShareText = [
    shareText || "You are invited to join our GSN community.",
    link ? `Join here: ${link}` : "",
    "",
    "Before you enter, see what GSN can do for you:",
    guideUrl,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    code,
    link,
    shareText,
    expiresAt,
    guideUrl,
    packagedShareText,
  };
}

export default function ClansPage() {
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number>(0);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteState, setInviteState] = useState<InviteState | null>(null);
  const [copied, setCopied] = useState("");

  const [communityNameInput, setCommunityNameInput] = useState("");
  const [communityDescriptionInput, setCommunityDescriptionInput] = useState("");
  const [creatingCommunity, setCreatingCommunity] = useState(false);

  async function loadCommunities(preferredId?: number) {
    setLoadingCommunities(true);
    try {
      const res = await listMyClans().catch(() => []);
      const rows: CommunityItem[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.items)
        ? (res as any).items
        : [];

      setCommunities(rows);

      const storedId = Number(getSelectedClanId() || 0);
      const fallbackId = Number(preferredId || storedId || rows?.[0]?.id || 0);

      setSelectedCommunityId(fallbackId || 0);
    } finally {
      setLoadingCommunities(false);
    }
  }

  async function loadRequests(clanId: number) {
    if (!clanId) {
      setRequests([]);
      return;
    }

    setLoadingRequests(true);
    try {
      const res = await getCommunityJoinRequests(clanId).catch(() => ({ items: [] }));
      const rows: JoinRequestItem[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.items)
        ? (res as any).items
        : [];
      setRequests(rows);
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => {
    loadCommunities();
  }, []);

  useEffect(() => {
    if (!selectedCommunityId) {
      setRequests([]);
      return;
    }
    loadRequests(selectedCommunityId);
  }, [selectedCommunityId]);

  const selectedCommunity = useMemo(() => {
    return (
      communities.find((item) => Number(item?.id || 0) === selectedCommunityId) ||
      null
    );
  }, [communities, selectedCommunityId]);

  const pendingRequests = useMemo(() => {
    return requests.filter(
      (item) => safeStr(item?.status || "").toLowerCase() === "pending"
    );
  }, [requests]);

  const selectedMembers = useMemo(() => {
    return extractMembers(selectedCommunity);
  }, [selectedCommunity]);

  async function handleSelectCommunity(clanId: number) {
    if (!clanId) return;
    try {
      await selectClan(clanId).catch(() => null);
    } finally {
      setSelectedCommunityId(clanId);
      setInviteState(null);
    }
  }

  async function handleCreateInvite() {
    if (!selectedCommunityId) return;
    setInviteLoading(true);
    try {
      const res = await createClanInvite(selectedCommunityId).catch(() => null);
      setInviteState(buildInviteState(res));
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyText(value: string, tag: string) {
    const text = safeStr(value);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      window.setTimeout(() => setCopied(""), 1400);
    } catch {}
  }

  function shareViaWhatsApp() {
    const text = safeStr(inviteState?.packagedShareText || "");
    if (!text) return;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  async function handleCreateCommunity(e: React.FormEvent) {
    e.preventDefault();

    const name = safeStr(communityNameInput);
    const description = safeStr(communityDescriptionInput);

    if (!name) return;

    setCreatingCommunity(true);
    try {
      const res = await createClan({
        name,
        description: description || undefined,
      }).catch(() => null);

      const newId = Number((res as any)?.id || 0);
      await loadCommunities(newId || undefined);

      if (newId) {
        await selectClan(newId).catch(() => null);
        setSelectedCommunityId(newId);
      }

      setCommunityNameInput("");
      setCommunityDescriptionInput("");
      setInviteState(null);
    } finally {
      setCreatingCommunity(false);
    }
  }

  const communityCount = communities.length;
  const selectedCommunityMemberCount = selectedMembers.length;

  return (
    <div
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        paddingBottom: 36,
        display: "grid",
        gap: 18,
      }}
    >
      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "8px 12px",
                border: "1px solid rgba(11,99,209,0.14)",
                background: "rgba(11,99,209,0.06)",
                color: "#0B63D1",
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Communities
            </div>

            <h1
              style={{
                margin: "14px 0 8px",
                fontSize: 30,
                lineHeight: 1.15,
                color: "#0B1F33",
              }}
            >
              Choose or create a community
            </h1>

            <div
              style={{
                color: "#475569",
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              This page is for community selection and setup. Keep it simple:
              choose the community you want to work with, create a new one when
              needed, and handle invite and requests for the selected community.
            </div>
          </div>

          <div
            style={{
              minWidth: 240,
              flex: "0 1 300px",
              ...softCard("#FFFFFF"),
            }}
          >
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 900 }}>
              Quick links
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/community" style={btn(false)}>
                Community Home
              </Link>
              <Link to="/app/dashboard" style={btn(true)}>
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div style={card("#FFFFFF")}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            My communities
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {communityCount}
          </div>
        </div>

        <div style={card("#FFFFFF")}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Selected community members
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {selectedCommunityMemberCount}
          </div>
        </div>

        <div style={card("#FFFFFF")}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Pending join requests
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {pendingRequests.length}
          </div>
        </div>
      </div>

      <div style={{ ...pageCard("#FFFFFF") }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={softCard("#FFFFFF")}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              My communities
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Select one community to make it active.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 10,
              }}
            >
              {loadingCommunities ? (
                <div style={{ color: "#64748B", lineHeight: 1.7 }}>
                  Loading your communities...
                </div>
              ) : communities.length === 0 ? (
                <div style={card("#F8FBFF")}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 1000,
                      fontSize: 17,
                    }}
                  >
                    No community yet
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#64748B",
                      lineHeight: 1.7,
                      fontSize: 14,
                    }}
                  >
                    Create your first community on the right.
                  </div>
                </div>
              ) : (
                communities.map((item, idx) => {
                  const id = Number(item?.id || 0);
                  const isActive = id === selectedCommunityId;
                  const memberCount = extractMembers(item).length;

                  return (
                    <div
                      key={`${id || "community"}-${idx}`}
                      style={{
                        ...card("#FFFFFF"),
                        border: isActive
                          ? "1px solid rgba(11,99,209,0.24)"
                          : "1px solid rgba(11,31,51,0.08)",
                        boxShadow: isActive
                          ? "0 12px 28px rgba(11,99,209,0.08)"
                          : "0 12px 30px rgba(15,23,42,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ minWidth: 220, flex: 1 }}>
                          <div
                            style={{
                              color: "#0B1F33",
                              fontWeight: 1000,
                              fontSize: 17,
                            }}
                          >
                            {communityName(item)}
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              color: "#64748B",
                              fontSize: 14,
                              lineHeight: 1.7,
                            }}
                          >
                            {safeStr(
                              item?.description ||
                                "Community governance and relationship layer."
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={badge(true)}>
                              ID: {communityIdentity(item)}
                            </span>
                            <span style={badge(false)}>
                              {memberCount} member{memberCount === 1 ? "" : "s"}
                            </span>
                            {isActive ? <span style={badge(false)}>Active</span> : null}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            style={isActive ? btn(true) : btn(false)}
                            onClick={() => handleSelectCommunity(id)}
                          >
                            {isActive ? "Selected" : "Select"}
                          </button>

                          <Link
                            to={id ? `/community/${id}` : "/app/community"}
                            style={btn(false)}
                          >
                            Open Workspace
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Create community
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Start a new community with a clear name and short description.
            </div>

            <form
              onSubmit={handleCreateCommunity}
              style={{
                marginTop: 14,
                display: "grid",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  Community name
                </div>
                <input
                  value={communityNameInput}
                  onChange={(e) => setCommunityNameInput(e.target.value)}
                  placeholder="Enter community name"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(11,31,51,0.12)",
                    padding: "12px 14px",
                    outline: "none",
                    fontSize: 14,
                    color: "#0B1F33",
                    background: "#FFFFFF",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  Short description
                </div>
                <textarea
                  value={communityDescriptionInput}
                  onChange={(e) => setCommunityDescriptionInput(e.target.value)}
                  placeholder="Describe what this community represents"
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(11,31,51,0.12)",
                    padding: "12px 14px",
                    outline: "none",
                    fontSize: 14,
                    color: "#0B1F33",
                    background: "#FFFFFF",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  style={btn(true, creatingCommunity || !safeStr(communityNameInput))}
                  disabled={creatingCommunity || !safeStr(communityNameInput)}
                >
                  {creatingCommunity ? "Creating..." : "Create community"}
                </button>

                <Link to="/app/community" style={btn(false)}>
                  Open Community Home
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div style={pageCard("#FFFFFF")}>
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
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                Membership requests
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                Review people asking to join the selected community.
              </div>
            </div>

            <span style={badge(false)}>{pendingRequests.length} pending</span>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gap: 10,
            }}
          >
            {!selectedCommunityId ? (
              <div style={{ color: "#64748B", lineHeight: 1.7 }}>
                Select a community to view membership requests.
              </div>
            ) : loadingRequests ? (
              <div style={{ color: "#64748B", lineHeight: 1.7 }}>
                Loading membership requests...
              </div>
            ) : pendingRequests.length === 0 ? (
              <div style={card("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 1000,
                    fontSize: 16,
                  }}
                >
                  No pending requests
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#64748B",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  New join requests will appear here.
                </div>
              </div>
            ) : (
              pendingRequests.slice(0, 4).map((item, idx) => (
                <div key={`${item.id || "request"}-${idx}`} style={card("#FFFFFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 1000,
                          fontSize: 16,
                        }}
                      >
                        {safeStr(
                          item?.applicant_name ||
                            item?.applicant_nickname ||
                            item?.applicant_email ||
                            "Applicant"
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#64748B",
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
                        {safeStr(item?.applicant_email || "No email provided")}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(true)}>
                          {Number(item?.approvals || 0)} /{" "}
                          {Number(item?.required_approvals || 0)} approvals
                        </span>

                        {safeStr(item?.applicant_gmfn_id) ? (
                          <span style={badge(false)}>
                            {safeStr(item?.applicant_gmfn_id)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <Link
                      to={
                        selectedCommunityId
                          ? `/app/community/${selectedCommunityId}/join-requests`
                          : "/app/community"
                      }
                      style={btn(true)}
                    >
                      Open requests
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
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
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                Invitation
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                Create and share an invite for the selected community.
              </div>
            </div>

            <button
              type="button"
              style={btn(true, !selectedCommunityId || inviteLoading)}
              onClick={handleCreateInvite}
              disabled={!selectedCommunityId || inviteLoading}
            >
              {inviteLoading ? "Creating..." : "Create invite"}
            </button>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gap: 10,
            }}
          >
            {!selectedCommunityId ? (
              <div style={{ color: "#64748B", lineHeight: 1.7 }}>
                Select a community to create an invitation.
              </div>
            ) : inviteState?.link || inviteState?.code ? (
              <div style={card("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 1000,
                    fontSize: 16,
                  }}
                >
                  Invitation ready
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#64748B",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  This invite now includes the GSN guide so the person you are
                  inviting can understand what GSN is for before entering.
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {inviteState?.code ? (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          fontWeight: 900,
                          marginBottom: 6,
                          textTransform: "uppercase",
                        }}
                      >
                        Invite code
                      </div>
                      <div
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(11,31,51,0.08)",
                          background: "#FFFFFF",
                          padding: "12px 14px",
                          color: "#0B1F33",
                          fontWeight: 900,
                          wordBreak: "break-word",
                        }}
                      >
                        {inviteState.code}
                      </div>
                    </div>
                  ) : null}

                  {inviteState?.link ? (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          fontWeight: 900,
                          marginBottom: 6,
                          textTransform: "uppercase",
                        }}
                      >
                        Invite link
                      </div>
                      <div
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(11,31,51,0.08)",
                          background: "#FFFFFF",
                          padding: "12px 14px",
                          color: "#0B1F33",
                          fontWeight: 700,
                          wordBreak: "break-word",
                        }}
                      >
                        {inviteState.link}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#64748B" }}>
                      GSN Guide
                  </div>

                  <a
                    href="/app/my-gmfn-and-i"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 6,
                      color: "#0B63D1",
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    Open Guide (What GSN Can Do)
                  </a>
                </div>
                  {inviteState?.guideUrl ? (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          fontWeight: 900,
                          marginBottom: 6,
                          textTransform: "uppercase",
                        }}
                      >
                        GSN guide attached
                      </div>
                      <div
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(11,31,51,0.08)",
                          background: "#FFFFFF",
                          padding: "12px 14px",
                          color: "#0B1F33",
                          fontWeight: 700,
                          wordBreak: "break-word",
                        }}
                      >
                        {inviteState.guideUrl}
                      </div>
                    </div>
                  ) : null}

                  {inviteState?.expiresAt ? (
                    <div
                      style={{
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Expires: {safeDateTime(inviteState.expiresAt)}
                    </div>
                  ) : null}

                  {inviteState?.packagedShareText ? (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          fontWeight: 900,
                          marginBottom: 6,
                          textTransform: "uppercase",
                        }}
                      >
                        Full share package
                      </div>
                      <div
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(11,31,51,0.08)",
                          background: "#FFFFFF",
                          padding: "12px 14px",
                          color: "#0B1F33",
                          fontWeight: 700,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          lineHeight: 1.7,
                        }}
                      >
                        {inviteState.packagedShareText}
                      </div>
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {inviteState?.link ? (
                      <button
                        type="button"
                        style={btn(false)}
                        onClick={() => copyText(inviteState.link || "", "link")}
                      >
                        {copied === "link" ? "Copied link" : "Copy link"}
                      </button>
                    ) : null}

                    {inviteState?.packagedShareText ? (
                      <button
                        type="button"
                        style={btn(false)}
                        onClick={() =>
                          copyText(inviteState.packagedShareText || "", "package")
                        }
                      >
                        {copied === "package"
                          ? "Copied full package"
                          : "Copy full invite package"}
                      </button>
                    ) : null}

                    {inviteState?.guideUrl ? (
                      <a
                        href={inviteState.guideUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={btn(false)}
                      >
                        Open GSN guide
                      </a>
                    ) : null}

                    {inviteState?.packagedShareText ? (
                      <button
                        type="button"
                        style={btn(true)}
                        onClick={shareViaWhatsApp}
                      >
                        Share on WhatsApp
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div style={card("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 1000,
                    fontSize: 16,
                  }}
                >
                  No active invite yet
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#64748B",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  Create an invite when you are ready to bring someone in.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={pageCard("#FFFFFF")}>
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
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Selected community summary
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              For full member browsing and shop access, continue in Community Home.
            </div>
          </div>

          <Link to="/app/community" style={btn(true)}>
            Open Community Home
          </Link>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 10,
          }}
        >
          {!selectedCommunity ? (
            <div style={{ color: "#64748B", lineHeight: 1.7 }}>
              Select a community to see its summary.
            </div>
          ) : (
            <div style={card("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 17,
                }}
              >
                {communityName(selectedCommunity)}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  ID: {communityIdentity(selectedCommunity)}
                </span>
                <span style={badge(false)}>
                  Members: {selectedMembers.length}
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                {safeStr(
                  selectedCommunity?.description ||
                    "Community governance and relationship layer."
                )}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  to={selectedCommunityId ? `/community/${selectedCommunityId}` : "/app/community"}
                  style={btn(false)}
                >
                  Open Workspace
                </Link>

                <Link to="/app/community" style={btn(false)}>
                  Open Community Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}