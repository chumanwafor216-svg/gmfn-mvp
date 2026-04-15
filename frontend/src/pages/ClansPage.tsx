import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import { navigateWithOrigin } from "../lib/nav";
import {
  createClan,
  createClanInvite,
  getMe,
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

type InviteState = {
  code?: string | null;
  link?: string | null;
  expiresAt?: string | null;
  guideUrl?: string | null;
  fallbackGuideUrl?: string | null;
  packagedShareText?: string | null;
  whatsappShareText?: string | null;
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
      "Not available yet"
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
  return `${appOrigin()}/app/my-gmfn-and-i`;
}

function buildGuideFallbackUrl(): string {
  return `${appOrigin()}/GMFN_FINAL_WHITE.pdf`;
}

function buildInviteState(
  raw: any,
  senderName: string,
  receiverField: string,
  shortMessage: string,
  selectedCommunityName: string
): InviteState {
  const code = safeStr(raw?.code || raw?.invite_code || "");
  const link = safeStr(raw?.link || raw?.invite_link || raw?.invite_url || "");
  const expiresAt = safeStr(raw?.expires_at || raw?.expiry || "");
  const guideUrl = buildGuideUrl();
  const fallbackGuideUrl = buildGuideFallbackUrl();

  const defaultMessage = `You are invited to join ${selectedCommunityName} on GMFN.`;
  const effectiveMessage = safeStr(shortMessage) || defaultMessage;

  const packagedShareText = [
    `From: ${senderName || "Community member"}`,
    `Receiver: ${safeStr(receiverField) || "[add receiver name]"}`,
    `Community: ${selectedCommunityName}`,
    "",
    `Message: ${effectiveMessage}`,
    link ? `Join link: ${link}` : "",
    code ? `Invite code: ${code}` : "",
    expiresAt ? `Expiry: ${safeDateTime(expiresAt)}` : "",
    "",
    "Guide: My GMFN and I",
    guideUrl,
    "",
    "Fallback PDF guide:",
    fallbackGuideUrl,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    code,
    link,
    expiresAt,
    guideUrl,
    fallbackGuideUrl,
    packagedShareText,
    whatsappShareText: packagedShareText,
  };
}

export default function ClansPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [me, setMe] = useState<any>(null);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number>(0);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteState, setInviteState] = useState<InviteState | null>(null);
  const [copied, setCopied] = useState("");

  const [communityNameInput, setCommunityNameInput] = useState("");
  const [communityDescriptionInput, setCommunityDescriptionInput] = useState("");
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  const [inviteReceiver, setInviteReceiver] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  async function loadCommunities(preferredId?: number) {
    setLoadingCommunities(true);
    try {
      const [meRes, res] = await Promise.all([
        getMe().catch(() => null),
        listMyClans().catch(() => []),
      ]);

      const rows: CommunityItem[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.items)
        ? (res as any).items
        : [];

      setMe(meRes || null);
      setCommunities(rows);

      const storedId = Number(getSelectedClanId() || 0);
      const fallbackId = Number(preferredId || storedId || rows?.[0]?.id || 0);

      setSelectedCommunityId(fallbackId || 0);
    } finally {
      setLoadingCommunities(false);
    }
  }

  useEffect(() => {
    loadCommunities();
  }, []);

  const selectedCommunity = useMemo(() => {
    return (
      communities.find((item) => Number(item?.id || 0) === selectedCommunityId) ||
      null
    );
  }, [communities, selectedCommunityId]);

  const communityCount = communities.length;
  const selectedCommunityMemberCount = selectedCommunity
    ? extractMembers(selectedCommunity).length
    : 0;

  const senderName = safeStr(
    me?.display_name || me?.full_name || me?.nickname || me?.email || "Community member"
  );

  async function handleSelectCommunity(clanId: number) {
    if (!clanId) return;
    try {
      await selectClan(clanId).catch(() => null);
    } finally {
      setSelectedCommunityId(clanId);
      setInviteState(null);
      setCreateMessage("");
    }
  }

  async function handleCreateInvite() {
    if (!selectedCommunityId || !selectedCommunity) return;

    setInviteLoading(true);
    try {
      const res = await createClanInvite(selectedCommunityId).catch(() => null);

      const source = res || selectedCommunity || {};
      setInviteState(
        buildInviteState(
          source,
          senderName,
          inviteReceiver,
          inviteMessage,
          communityName(selectedCommunity)
        )
      );
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyText(value: string, tag: string) {
    const text = safeStr(value);
    if (!text) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(tag);
        window.setTimeout(() => setCopied(""), 1400);
        return;
      }
    } catch {}

    window.prompt("Copy this text:", text);
  }

  function shareViaWhatsApp() {
    const text = safeStr(inviteState?.whatsappShareText || "");
    if (!text) return;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
      setCreateMessage("Community created. Continue below with next steps.");
    } finally {
      setCreatingCommunity(false);
    }
  }

  async function handleOpenMarketplace(clanId: number) {
    if (!clanId) return;
    await handleSelectCommunity(clanId);
    navigateWithOrigin(navigate, "/app/marketplace", location);
  }

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
          ...pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          ),
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
            <div style={sectionLabel()}>Create Community</div>

            <h1
              style={{
                margin: "14px 0 8px",
                fontSize: 30,
                lineHeight: 1.15,
                color: "#F8FBFF",
              }}
            >
              Create a new community
            </h1>

            <div
              style={{
                color: "#D7E3F1",
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              This page is for creation first. Create a community, select the one
              you want active, then move into invite, demand, marketplace, shop,
              or Community Home.
            </div>
          </div>

          <div
            style={{
              minWidth: 240,
              flex: "0 1 300px",
              ...softCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.16)",
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
              <OriginLink to="/app/community" style={btn(false)}>
                Community Home
              </OriginLink>
              <OriginLink to="/app/dashboard" style={btn(true)}>
                Dashboard
              </OriginLink>
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
            Selected community
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
              lineHeight: 1.35,
            }}
          >
            {selectedCommunity ? communityName(selectedCommunity) : "None selected"}
          </div>
        </div>

        <div style={card("#FFFFFF")}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Selected members
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
      </div>

      <div style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={softCard("#FFFFFF")}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Community creation form
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Keep the name clear and the description short. This page should stay
              creation-first, not overloaded with extra control surfaces.
            </div>

            {createMessage ? (
              <div
                style={{
                  marginTop: 14,
                  borderRadius: 14,
                  border: "1px solid #A7F3D0",
                  background: "#ECFDF5",
                  color: "#065F46",
                  fontWeight: 900,
                  padding: 12,
                }}
              >
                {createMessage}
              </div>
            ) : null}

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

                <OriginLink to="/app/community" style={btn(false)}>
                  Open Community Home
                </OriginLink>
              </div>
            </form>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Current community context
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Use one selected community as your active context for next steps.
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                Active community
              </div>

              <select
                value={selectedCommunityId || ""}
                onChange={(e) => handleSelectCommunity(Number(e.target.value))}
                disabled={loadingCommunities || communities.length === 0}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(11,31,51,0.12)",
                  background: "#FFFFFF",
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#0B1F33",
                  outline: "none",
                }}
              >
                {communities.length === 0 ? (
                  <option value="">No communities available</option>
                ) : (
                  communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {communityName(community)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={card("#F8FBFF")}>
                <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 16 }}>
                  {selectedCommunity
                    ? communityName(selectedCommunity)
                    : "No community selected"}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {selectedCommunity ? (
                    <>
                      <span style={badge(true)}>
                        ID: {communityIdentity(selectedCommunity)}
                      </span>
                      <span style={badge(false)}>
                        Members: {selectedCommunityMemberCount}
                      </span>
                    </>
                  ) : null}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#64748B",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {selectedCommunity
                    ? safeStr(
                        selectedCommunity.description ||
                          "Community governance and relationship layer."
                      )
                    : "Create or select a community to continue."}
                </div>
              </div>

              <div style={card("#FFFFFF")}>
                <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 16 }}>
                  After creation / next steps
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#64748B",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  Move from creation into the surfaces that matter next.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <OriginLink to="/app/community" style={btn(false)}>
                    Community Home
                  </OriginLink>
                  <OriginLink to="/app/demand-box" style={btn(false)}>
                    Demand Box
                  </OriginLink>
                  <OriginLink to="/app/shop-control" style={btn(false)}>
                    My Shop Tools
                  </OriginLink>
                  <OriginLink to="/app/marketplace" style={btn(false)}>
                    Marketplace
                  </OriginLink>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background: "#F8FBFF",
                    padding: 12,
                    color: "#64748B",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Spotlight entry has no separate page active yet. Use shop tools
                  and marketplace visibility for now.
                </div>
              </div>
            </div>
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
              Invite package
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Create a join package for the selected community with sender,
              receiver, message, guide link, share-ready copy, and WhatsApp copy.
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
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div style={softCard("#FFFFFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 16,
              }}
            >
              Invite details
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  Sender
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background: "#F8FBFF",
                    padding: "12px 14px",
                    color: "#0B1F33",
                    fontWeight: 700,
                  }}
                >
                  {senderName}
                </div>
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
                  Intended receiver
                </div>
                <input
                  value={inviteReceiver}
                  onChange={(e) => setInviteReceiver(e.target.value)}
                  placeholder="Enter receiver name or leave blank"
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
                  Editable short message
                </div>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a short personal message"
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
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            {!selectedCommunityId ? (
              <div style={{ color: "#64748B", lineHeight: 1.7 }}>
                Select a community to create an invitation.
              </div>
            ) : inviteState?.link || inviteState?.code ? (
              <div style={{ display: "grid", gap: 10 }}>
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
                    This package uses the selected community plus the guide link
                    and fallback PDF.
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    {inviteState.code ? (
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

                    {inviteState.link ? (
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
                          Join link
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

                    {inviteState.expiresAt ? (
                      <div
                        style={{
                          color: "#64748B",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Expiry: {safeDateTime(inviteState.expiresAt)}
                      </div>
                    ) : null}

                    {inviteState.packagedShareText ? (
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
                          Share-ready copy
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
                      {inviteState.link ? (
                        <button
                          type="button"
                          style={btn(false)}
                          onClick={() => copyText(inviteState.link || "", "link")}
                        >
                          {copied === "link" ? "Copied link" : "Copy link"}
                        </button>
                      ) : null}

                      {inviteState.packagedShareText ? (
                        <button
                          type="button"
                          style={btn(false)}
                          onClick={() =>
                            copyText(inviteState.packagedShareText || "", "package")
                          }
                        >
                          {copied === "package"
                            ? "Copied package"
                            : "Copy full package"}
                        </button>
                      ) : null}

                      {inviteState.guideUrl ? (
                        <a
                          href={inviteState.guideUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={btn(false)}
                        >
                          Open guide
                        </a>
                      ) : null}

                      {inviteState.whatsappShareText ? (
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
                  Create an invite when you are ready. The package will include
                  sender, receiver, message, guide link, and share-ready copy.
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
              Existing communities
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Keep this compact. Community Home remains the real control surface.
            </div>
          </div>

          <OriginLink to="/app/community" style={btn(true)}>
            Open Community Home
          </OriginLink>
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
                Create your first community above.
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

                      <button
                        type="button"
                        style={btn(false)}
                        onClick={() => handleOpenMarketplace(id)}
                      >
                        Open Marketplace
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
