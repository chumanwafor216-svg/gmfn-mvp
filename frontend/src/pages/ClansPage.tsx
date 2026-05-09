import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import { canonicalJoinInviteUrl, normalizedJoinInviteUrl } from "../lib/joinLinks";
import { navigateWithOrigin } from "../lib/nav";
import { publicFrontendUrl } from "../lib/publicLinks";
import {
  createClan,
  createClanInvite,
  getMe,
  getSelectedClanId,
  listMyClans,
  safeCopy,
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

function overlayShell(): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(7,16,28,0.64)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 50,
  };
}

function modalCard(): React.CSSProperties {
  return {
    width: "min(100%, 720px)",
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,0.28)",
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)",
    boxShadow:
      "0 26px 64px rgba(5,16,38,0.30), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 20,
    overflow: "hidden",
  };
}

function darkPanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)",
    border: "1px solid rgba(16,37,59,0.16)",
    boxShadow:
      "0 18px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 18,
    position: "relative",
    overflow: "hidden",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.16)",
    padding: "13px 14px",
    outline: "none",
    fontSize: 14,
    color: "#0B1F33",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 6px 14px rgba(10,24,49,0.04)",
  };
}

function textareaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 120,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.65,
  };
}

function modalChip(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(243,208,106,0.16)" : "rgba(16,37,59,0.06)",
    color: primary ? "#8A6508" : "#475569",
    border: primary
      ? "1px solid rgba(243,208,106,0.28)"
      : "1px solid rgba(11,31,51,0.08)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(123,161,204,0.20)",
    background:
      bg === "#FFFFFF" || bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 22px 48px rgba(2,6,23,0.22), 0 2px 8px rgba(15,23,42,0.04)",
    overflow: "hidden",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(123,161,204,0.16)",
    background:
      bg === "#FFFFFF" || bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(123,161,204,0.14)",
    background:
      bg === "#F8FBFF" || bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
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
      : "1px solid rgba(123,161,204,0.16)",
    background: disabled
      ? "#CBD5E1"
      : primary
      ? "#0B63D1"
      : "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: primary ? "#FFFFFF" : "#E6EEF8",
    fontWeight: 900,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    fontSize: 14,
    boxShadow: primary
      ? undefined
      : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(32,76,133,0.36)" : "rgba(255,255,255,0.08)",
    color: primary ? "#CFE3FF" : "#E6EEF8",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
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

function buildGuideUrl(): string {
  return publicFrontendUrl("/guide");
}

function buildGuideFallbackUrl(): string {
  return publicFrontendUrl("/guide");
}

function withClanQuery(path: string, clanId: number): string {
  const safeClanId = Number(clanId || 0);
  if (!path || !Number.isFinite(safeClanId) || safeClanId <= 0) return path;

  const [baseWithQuery, hash = ""] = path.split("#");
  const separator = baseWithQuery.includes("?") ? "&" : "?";
  const next = `${baseWithQuery}${separator}community=${encodeURIComponent(
    String(safeClanId)
  )}`;
  return hash ? `${next}#${hash}` : next;
}

function buildInviteState(
  raw: any,
  senderName: string,
  receiverField: string,
  shortMessage: string,
  selectedCommunityName: string
): InviteState {
  const code = safeStr(raw?.code || raw?.invite_code || "");
  const link =
    normalizedJoinInviteUrl(raw) ||
    canonicalJoinInviteUrl(code);
  const expiresAt = safeStr(raw?.expires_at || raw?.expiry || "");
  const guideUrl = buildGuideUrl();
  const fallbackGuideUrl = buildGuideFallbackUrl();

  const defaultMessage = `You are invited to join ${selectedCommunityName} on GSN.`;
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
    "Guide: My GSN and I",
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
  const [inviteComposerOpen, setInviteComposerOpen] = useState(false);

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
      const res = await createClanInvite(selectedCommunityId);
      const source = res || {};
      const nextInviteState = buildInviteState(
        source,
        senderName,
        inviteReceiver,
        inviteMessage,
        communityName(selectedCommunity)
      );

      if (!safeStr(nextInviteState.link) || !safeStr(nextInviteState.code)) {
        throw new Error(
          "GSN could not prepare a fresh join link yet. Please try again."
        );
      }

      setInviteState(
        nextInviteState
      );
      setInviteComposerOpen(false);
    } catch {
      setInviteState(null);
    } finally {
      setInviteLoading(false);
    }
  }

  function copyText(value: string, tag: string) {
    const text = safeStr(value);
    if (!text) return;

    safeCopy(text);
    setCopied(tag);
    window.setTimeout(() => setCopied(""), 1400);
  }

  function shareViaWhatsApp() {
    const text = safeStr(inviteState?.whatsappShareText || "");
    if (!text) return;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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

      const createdCommunityName = name;
      setCommunityNameInput("");
      setCommunityDescriptionInput("");
      setInviteState(null);

      if (newId) {
        navigateWithOrigin(navigate, "/app/build-first-circle", location, {
          replace: false,
          state: {
            created_clan_id: newId,
            created_clan_name: createdCommunityName,
            next_action: "invite-trusted-people",
          },
        });
        return;
      }

      setCreateMessage(
        "Community created. The app could not open the next route automatically, so choose the new community below and continue into your next step."
      );
    } finally {
      setCreatingCommunity(false);
    }
  }

  async function handleOpenMarketplace(clanId: number) {
    if (!clanId) return;
    await handleSelectCommunity(clanId);
    navigateWithOrigin(navigate, withClanQuery("/app/marketplace", clanId), location);
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
      <ExplainToggle
        label="What this screen does"
        what="This screen helps you create a new community or return to a community you already belong to."
        why="It keeps community creation and community selection in one guided place instead of scattering them across the app."
        next="If you are starting something new, create the community first. If you already belong somewhere, choose the community you want to enter."
        tone="light"
      />

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
              Start here with community creation. Create a community, select the one
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

        <ExplainToggle
          label="What this does"
          what="This create-community block starts a new community and reminds you that the next steps continue into activation, invite, and community work."
          why="It helps you treat community creation as the first guided move, not the whole workflow."
          next="Create the community here first, then select it and move into the route you need next."
          tone="dark"
          style={{ marginTop: 14 }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div style={card()}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            My communities
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#F8FBFF",
            }}
          >
            {communityCount}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Selected community
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 1000,
              color: "#F8FBFF",
              lineHeight: 1.35,
            }}
          >
            {selectedCommunity ? communityName(selectedCommunity) : "None selected"}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Selected members
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#F8FBFF",
            }}
          >
            {selectedCommunityMemberCount}
          </div>
        </div>
      </div>

      <div style={pageCard()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={softCard()}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#F8FBFF" }}>
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
              Keep the name clear and the description short. This stays
              creation-first, not overloaded with extra control pages.
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
                    color: "#F8FBFF",
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
                    color: "#F8FBFF",
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

          <div style={softCard()}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#F8FBFF" }}>
              Current community
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Use one current community as your active base for next steps.
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  color: "#F8FBFF",
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
                <div style={{ color: "#F8FBFF", fontWeight: 1000, fontSize: 16 }}>
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

              <div style={card()}>
                <div style={{ color: "#F8FBFF", fontWeight: 1000, fontSize: 16 }}>
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
                  Move from creation into the pages that matter next.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <OriginLink
                    to={
                      selectedCommunityId
                        ? `/app/community/${encodeURIComponent(String(selectedCommunityId))}`
                        : "/app/community"
                    }
                    style={btn(false)}
                  >
                    Community Home
                  </OriginLink>
                  <OriginLink
                    to={withClanQuery("/app/demand-box", selectedCommunityId)}
                    style={btn(false)}
                  >
                    Demand Box
                  </OriginLink>
                  <OriginLink
                    to={withClanQuery("/app/shop-control", selectedCommunityId)}
                    style={btn(false)}
                  >
                    My Shop Tools
                  </OriginLink>
                  <OriginLink
                    to={withClanQuery("/app/marketplace", selectedCommunityId)}
                    style={btn(false)}
                  >
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

      <div style={pageCard()}>
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
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#F8FBFF" }}>
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
              Create a join package for your current community with sender,
              receiver, message, guide link, share-ready copy, and WhatsApp copy.
            </div>
          </div>

          <button
            type="button"
            style={btn(true, !selectedCommunityId || inviteLoading)}
            onClick={() => setInviteComposerOpen(true)}
            disabled={!selectedCommunityId || inviteLoading}
          >
            {inviteLoading ? "Creating..." : "Open invite form"}
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
          <div style={softCard()}>
            <div
              style={{
                color: "#F8FBFF",
                fontWeight: 1000,
                fontSize: 16,
              }}
            >
              Invite form summary
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={modalChip(true)}>Sender known</span>
                <span style={modalChip(false)}>
                  {selectedCommunity ? communityName(selectedCommunity) : "No community selected"}
                </span>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(10,22,36,0.94) 0%, rgba(14,31,50,0.92) 100%)",
                  padding: "12px 14px",
                  color: "#F8FBFF",
                  fontWeight: 700,
                }}
              >
                Sender: {senderName}
              </div>

              <div style={{ color: "#64748B", lineHeight: 1.7, fontSize: 14 }}>
                Use the invite form to attach the receiver name and short note
                before the join package is generated.
              </div>

              <div>
                <button
                  type="button"
                  style={btn(true, !selectedCommunityId || inviteLoading)}
                  onClick={() => setInviteComposerOpen(true)}
                  disabled={!selectedCommunityId || inviteLoading}
                >
                  {inviteLoading ? "Creating..." : "Open invite form"}
                </button>
              </div>
            </div>
          </div>

          <div style={softCard()}>
            {!selectedCommunityId ? (
              <div style={{ color: "#64748B", lineHeight: 1.7 }}>
                Select a community to create an invitation.
              </div>
            ) : inviteState?.link || inviteState?.code ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={card("#F8FBFF")}>
                  <div
                    style={{
                      color: "#F8FBFF",
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
                    This package uses your current community plus the guide link
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
                            background:
                            "linear-gradient(180deg, rgba(10,22,36,0.94) 0%, rgba(14,31,50,0.92) 100%)",
                            padding: "12px 14px",
                            color: "#F8FBFF",
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
                            background:
                            "linear-gradient(180deg, rgba(10,22,36,0.94) 0%, rgba(14,31,50,0.92) 100%)",
                            padding: "12px 14px",
                            color: "#F8FBFF",
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
                            background:
                            "linear-gradient(180deg, rgba(10,22,36,0.94) 0%, rgba(14,31,50,0.92) 100%)",
                            padding: "12px 14px",
                            color: "#F8FBFF",
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
                    color: "#F8FBFF",
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
                  Open the invite form when you are ready. The package will
                  include sender, receiver, message, guide link, and share-ready
                  copy.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {inviteComposerOpen ? (
        <div style={overlayShell()}>
          <div style={modalCard()}>
            <div style={{ ...darkPanel(), marginBottom: 16 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 28%), radial-gradient(circle at bottom, rgba(123,181,255,0.10) 0%, rgba(123,181,255,0) 30%)",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#F3D06A",
                    fontWeight: 1000,
                    letterSpacing: 3.2,
                    textTransform: "uppercase",
                  }}
                >
                  GSN
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#F8FBFF",
                    fontSize: 24,
                    fontWeight: 1000,
                    lineHeight: 1.2,
                  }}
                >
                  Invite sender form
                </div>
                <div
                  style={{
                    marginTop: 10,
                    color: "#D7E3F1",
                    fontSize: 14,
                    lineHeight: 1.7,
                    maxWidth: 560,
                  }}
                >
                  Fill the receiver name and short note here. GSN will use this
                  together with the selected community to prepare the outgoing join
                  invitation.
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={softCard()}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <span style={modalChip(true)}>Sender known</span>
                  <span style={modalChip(false)}>
                    {selectedCommunity ? communityName(selectedCommunity) : "No community selected"}
                  </span>
                </div>
                <div style={sectionLabel()}>Sender</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  {senderName}
                </div>
              </div>

              <div style={softCard()}>
                <div style={sectionLabel()}>Selected community</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  {selectedCommunity ? communityName(selectedCommunity) : "No community selected"}
                </div>
              </div>

              <div style={softCard()}>
                <div style={sectionLabel()}>Receiver name</div>
                <input
                  value={inviteReceiver}
                  onChange={(e) => setInviteReceiver(e.target.value)}
                  placeholder="Enter the name of the person you want to invite"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div style={softCard()}>
                <div style={sectionLabel()}>Short invitation note</div>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a short personal note"
                  rows={4}
                  style={{ ...textareaStyle(), marginTop: 8 }}
                />
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
                  onClick={() => setInviteComposerOpen(false)}
                  style={btn(false)}
                  disabled={inviteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateInvite()}
                  style={btn(true, inviteLoading || !selectedCommunityId)}
                  disabled={inviteLoading || !selectedCommunityId}
                >
                  {inviteLoading ? "Creating..." : "Create invite package"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={pageCard()}>
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
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#F8FBFF" }}>
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
              Keep this compact. Community Home remains the real main page.
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
                  color: "#F8FBFF",
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
                    ...card(),
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
                          color: "#F8FBFF",
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
