import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import { PrimaryButton, SecondaryButton, StableCtaLink } from "../components/StableButton";
import {
  canonicalJoinInviteUrl,
  normalizedJoinInviteUrl,
  personalizedJoinInviteUrl,
} from "../lib/joinLinks";
import { navigateWithOrigin } from "../lib/nav";
import { publicFrontendUrl } from "../lib/publicLinks";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
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
    background: "rgba(54,38,24,0.52)",
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
    border: "1px solid rgba(190,143,55,0.26)",
    background:
      "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(249,240,224,0.96) 58%, rgba(238,222,196,0.92) 100%)",
    boxShadow:
      "0 26px 64px rgba(54,38,24,0.24), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 20,
    overflow: "hidden",
  };
}

function darkPanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,250,240,0.98) 0%, rgba(246,232,206,0.96) 100%)",
    border: "1px solid rgba(190,143,55,0.22)",
    boxShadow:
      "0 18px 34px rgba(54,38,24,0.14), inset 0 1px 0 rgba(255,255,255,0.72)",
    padding: 18,
    position: "relative",
    overflow: "hidden",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(128,91,44,0.18)",
    padding: "13px 14px",
    outline: "none",
    fontSize: 16,
    color: "#241A12",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,250,242,0.98) 100%)",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 6px 14px rgba(54,38,24,0.05)",
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
    background: primary ? "rgba(243,208,106,0.18)" : "rgba(128,91,44,0.08)",
    color: primary ? "#8A6508" : "#6B5D50",
    border: primary
      ? "1px solid rgba(243,208,106,0.28)"
      : "1px solid rgba(128,91,44,0.10)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(190,143,55,0.20)",
    background:
      bg === "#FFFFFF" || bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(249,240,224,0.97) 56%, rgba(242,228,205,0.95) 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 22px 48px rgba(54,38,24,0.14), 0 2px 8px rgba(92,62,32,0.05)",
    overflow: "hidden",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(190,143,55,0.18)",
    background:
      bg === "#FFFFFF" || bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 14px 30px rgba(54,38,24,0.12), inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(190,143,55,0.16)",
    background:
      bg === "#F8FBFF" || bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(255,253,248,0.98) 0%, rgba(250,242,229,0.96) 100%)"
        : bg,
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(54,38,24,0.10), inset 0 1px 0 rgba(255,255,255,0.74)",
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
      ? "1px solid rgba(174,121,32,0.34)"
      : "1px solid rgba(128,91,44,0.18)",
    background: disabled
      ? "#D8CFC0"
      : primary
      ? "linear-gradient(180deg, #F2C766 0%, #D9A441 100%)"
      : "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
    color: primary ? "#241A12" : "#3A2A1C",
    fontWeight: 900,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    fontSize: 14,
    boxShadow: primary
      ? undefined
      : "0 12px 24px rgba(54,38,24,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(214,170,69,0.28)" : "rgba(128,91,44,0.10)",
    color: primary ? "#5F410D" : "#5F5143",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#8A735C",
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

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { explicitTo?: string } = {}
): string {
  return resolveCtaTarget(intent, { communityId, debugId, ...extra }).to as string;
}

function buildInviteState(
  raw: any,
  senderName: string,
  receiverField: string,
  shortMessage: string,
  selectedCommunityName: string
): InviteState {
  const code = safeStr(raw?.code || raw?.invite_code || "");
  const baseLink =
    normalizedJoinInviteUrl(raw) ||
    canonicalJoinInviteUrl(code);
  const link =
    personalizedJoinInviteUrl(baseLink, {
      inviterName: senderName,
      recipientName: receiverField,
      communityName: selectedCommunityName,
      marketplaceName: selectedCommunityName,
      message: shortMessage,
    }) || baseLink;
  const expiresAt = safeStr(raw?.expires_at || raw?.expiry || "");
  const guideUrl = buildGuideUrl();
  const fallbackGuideUrl = buildGuideFallbackUrl();

  const personalNote = safeStr(shortMessage);
  const receiver = safeStr(receiverField);

  const packagedShareText = [
    receiver ? `Hello ${receiver},` : "Hello,",
    "",
    `${senderName || "A known GSN member"} from ${selectedCommunityName} is inviting you to begin the GSN join request for ${selectedCommunityName}.`,
    "This link lets you send your request back to the community for review. It is not automatic entry.",
    "",
    personalNote ? `Personal note: ${personalNote}` : "",
    "",
    "GSN helps existing trust become visible, recordable, and useful.",
    link ? `Open secure join link: ${link}` : "",
    code ? `Invite code: ${code}` : "",
    expiresAt ? `Expiry: ${safeDateTime(expiresAt)}` : "",
    "",
    "Guide: My GSN and I",
    guideUrl,
    "",
    "Fallback PDF guide:",
    fallbackGuideUrl,
    "",
    "Sent through GSN",
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
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 720 : false
  );

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsCompact(window.innerWidth <= 720);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedCommunityId, "clans.route.dashboard"),
      community: routeTarget("communityHome", selectedCommunityId, "clans.route.community"),
      communityDetail: selectedCommunityId
        ? routeTarget("communityDetail", selectedCommunityId, "clans.route.community-detail")
        : routeTarget("communityHome", selectedCommunityId, "clans.route.community-fallback"),
      buildFirstCircle: routeTarget(
        "buildFirstCircle",
        selectedCommunityId,
        "clans.route.build-first-circle"
      ),
      demandBox: routeTarget("demandBox", selectedCommunityId, "clans.route.demand-box"),
      shop: routeTarget("shop", selectedCommunityId, "clans.route.shop"),
      marketplace: routeTarget("marketplace", selectedCommunityId, "clans.route.marketplace"),
    }),
    [selectedCommunityId]
  );

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
        navigateWithOrigin(navigate, routes.buildFirstCircle, location, {
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
    navigateWithOrigin(
      navigate,
      routeTarget("marketplace", clanId, "clans.community.marketplace-target"),
      location
    );
  }

  return (
    <div
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        padding: isCompact ? "0 10px calc(104px + env(safe-area-inset-bottom, 0px))" : 0,
        paddingBottom: isCompact
          ? "calc(104px + env(safe-area-inset-bottom, 0px))"
          : 36,
        display: "grid",
        gap: isCompact ? 12 : 18,
        overflowX: "hidden",
        boxSizing: "border-box",
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
            "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(249,240,224,0.97) 56%, rgba(242,228,205,0.95) 100%)"
          ),
          marginTop: isCompact ? 10 : 18,
          padding: isCompact ? 16 : 20,
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
                fontSize: isCompact ? 24 : 30,
                lineHeight: 1.15,
                color: "#241A12",
              }}
            >
              Create a new community
            </h1>

            <div
              style={{
                color: "#5F5143",
                fontSize: isCompact ? 14 : 15,
                lineHeight: isCompact ? 1.55 : 1.7,
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
              minWidth: isCompact ? 0 : 240,
              width: isCompact ? "100%" : undefined,
              flex: isCompact ? "1 1 100%" : "0 1 300px",
              ...softCard("rgba(255,252,246,0.96)"),
              border: "1px solid rgba(190,143,55,0.18)",
              boxShadow: "0 18px 38px rgba(54,38,24,0.12)",
            }}
          >
            <div style={{ fontSize: 13, color: "#6B5D50", fontWeight: 900 }}>
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
              <StableCtaLink
                to={routes.community}
                debugId="clans.quick.community"
                style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
              >
                Community Home
              </StableCtaLink>
              <StableCtaLink
                to={routes.dashboard}
                kind="primary"
                debugId="clans.quick.dashboard"
                style={{ ...btn(true), width: isCompact ? "100%" : undefined }}
              >
                Dashboard
              </StableCtaLink>
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
          gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: isCompact ? 10 : 14,
          order: isCompact ? 2 : undefined,
        }}
      >
        <div style={card()}>
          <div style={{ fontSize: 13, color: "#6B5D50", fontWeight: 800 }}>
            My communities
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#241A12",
            }}
          >
            {communityCount}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 13, color: "#6B5D50", fontWeight: 800 }}>
            Selected community
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 1000,
              color: "#241A12",
              lineHeight: 1.35,
            }}
          >
            {selectedCommunity ? communityName(selectedCommunity) : "None selected"}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 13, color: "#6B5D50", fontWeight: 800 }}>
            Selected members
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#241A12",
            }}
          >
            {selectedCommunityMemberCount}
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), order: isCompact ? 1 : undefined }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1.05fr 0.95fr",
            gap: isCompact ? 12 : 16,
            alignItems: "start",
          }}
        >
          <div style={{ ...softCard(), minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#241A12" }}>
              Community creation form
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#6B5D50",
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
                    color: "#3A2A1C",
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
                    border: "1px solid rgba(128,91,44,0.16)",
                    padding: "12px 14px",
                    outline: "none",
                    fontSize: 16,
                    color: "#241A12",
                    background: "#FFFFFF",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    color: "#3A2A1C",
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
                    border: "1px solid rgba(128,91,44,0.16)",
                    padding: "12px 14px",
                    outline: "none",
                    fontSize: 16,
                    color: "#241A12",
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
                <PrimaryButton
                  type="submit"
                  busy={creatingCommunity}
                  busyLabel="Creating..."
                  debugId="clans.create-community"
                  style={{
                    ...btn(true, creatingCommunity || !safeStr(communityNameInput)),
                    width: isCompact ? "100%" : undefined,
                  }}
                  disabled={creatingCommunity || !safeStr(communityNameInput)}
                >
                  Create community
                </PrimaryButton>

                <StableCtaLink
                  to={routes.community}
                  debugId="clans.create.open-community"
                  style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                >
                  Open Community Home
                </StableCtaLink>
              </div>
            </form>
          </div>

          <div style={{ ...softCard(), minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#241A12" }}>
              Current community
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#6B5D50",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Use one current community as your active base for next steps.
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  color: "#3A2A1C",
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
                  border: "1px solid rgba(128,91,44,0.16)",
                  background: "#FFFFFF",
                  padding: "12px 14px",
                  fontSize: 16,
                  color: "#241A12",
                  outline: "none",
                  boxSizing: "border-box",
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
                <div style={{ color: "#241A12", fontWeight: 1000, fontSize: 16 }}>
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
                    color: "#6B5D50",
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
                <div style={{ color: "#241A12", fontWeight: 1000, fontSize: 16 }}>
                  After creation / next steps
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#6B5D50",
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
                  <StableCtaLink
                    to={routes.communityDetail}
                    debugId="clans.next.community"
                    style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  >
                    Community Home
                  </StableCtaLink>
                  <StableCtaLink
                    to={routes.demandBox}
                    debugId="clans.next.demand-box"
                    style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  >
                    Demand Box
                  </StableCtaLink>
                  <StableCtaLink
                    to={routes.shop}
                    debugId="clans.next.shop-control"
                    style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  >
                    My Shop Tools
                  </StableCtaLink>
                  <StableCtaLink
                    to={routes.marketplace}
                    debugId="clans.next.marketplace"
                    style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  >
                    Marketplace
                  </StableCtaLink>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(128,91,44,0.10)",
                    background: "#F8FBFF",
                    padding: 12,
                    color: "#6B5D50",
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

      <div style={{ ...pageCard(), order: isCompact ? 3 : undefined }}>
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
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#241A12" }}>
              Invite package
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#6B5D50",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Create a join package for your current community with sender,
              receiver, message, guide link, share-ready copy, and WhatsApp copy.
            </div>
          </div>

          <PrimaryButton
            style={{
              ...btn(true, !selectedCommunityId || inviteLoading),
              width: isCompact ? "100%" : undefined,
            }}
            onClick={() => setInviteComposerOpen(true)}
            disabled={!selectedCommunityId || inviteLoading}
            busy={inviteLoading}
            busyLabel="Creating..."
            debugId="clans.invite.open-form.top"
          >
            Open invite form
          </PrimaryButton>
        </div>

        <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
          gap: isCompact ? 12 : 16,
        }}
      >
          <div style={{ ...softCard(), minWidth: 0 }}>
            <div
              style={{
                color: "#241A12",
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
                  border: "1px solid rgba(128,91,44,0.10)",
                  background:
                    "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
                  padding: "12px 14px",
                  color: "#3A2A1C",
                  fontWeight: 700,
                }}
              >
                Sender: {senderName}
              </div>

              <div style={{ color: "#6B5D50", lineHeight: 1.7, fontSize: 14 }}>
                Use the invite form to attach the receiver name and short note
                before the join package is generated.
              </div>

              <div>
                <PrimaryButton
                  style={{
                    ...btn(true, !selectedCommunityId || inviteLoading),
                    width: isCompact ? "100%" : undefined,
                  }}
                  onClick={() => setInviteComposerOpen(true)}
                  disabled={!selectedCommunityId || inviteLoading}
                  busy={inviteLoading}
                  busyLabel="Creating..."
                  debugId="clans.invite.open-form.summary"
                >
                  Open invite form
                </PrimaryButton>
              </div>
            </div>
          </div>

          <div style={{ ...softCard(), minWidth: 0 }}>
            {!selectedCommunityId ? (
              <div style={{ color: "#6B5D50", lineHeight: 1.7 }}>
                Select a community to create an invitation.
              </div>
            ) : inviteState?.link || inviteState?.code ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={card("#F8FBFF")}>
                  <div
                    style={{
                      color: "#241A12",
                      fontWeight: 1000,
                      fontSize: 16,
                    }}
                  >
                    Invitation ready
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#6B5D50",
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
                            color: "#6B5D50",
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
                            border: "1px solid rgba(128,91,44,0.10)",
                            background:
                              "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
                            padding: "12px 14px",
                            color: "#241A12",
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
                            color: "#6B5D50",
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
                            border: "1px solid rgba(128,91,44,0.10)",
                            background:
                              "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
                            padding: "12px 14px",
                            color: "#241A12",
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
                          color: "#6B5D50",
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
                            color: "#6B5D50",
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
                            border: "1px solid rgba(128,91,44,0.10)",
                            background:
                              "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
                            padding: "12px 14px",
                            color: "#241A12",
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
                        <SecondaryButton
                          style={btn(false)}
                          onClick={() => copyText(inviteState.link || "", "link")}
                          debugId="clans.invite.copy-link"
                        >
                          {copied === "link" ? "Copied link" : "Copy link"}
                        </SecondaryButton>
                      ) : null}

                      {inviteState.packagedShareText ? (
                        <SecondaryButton
                          style={btn(false)}
                          onClick={() =>
                            copyText(inviteState.packagedShareText || "", "package")
                          }
                          debugId="clans.invite.copy-package"
                        >
                          {copied === "package"
                            ? "Copied package"
                            : "Copy full package"}
                        </SecondaryButton>
                      ) : null}

                      {inviteState.guideUrl ? (
                        <SecondaryButton
                          style={btn(false)}
                          onClick={() => {
                            window.open(
                              inviteState.guideUrl || "",
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                          debugId="clans.invite.open-guide"
                        >
                          Open guide
                        </SecondaryButton>
                      ) : null}

                      {inviteState.whatsappShareText ? (
                        <PrimaryButton
                          style={{ ...btn(true), width: isCompact ? "100%" : undefined }}
                          onClick={shareViaWhatsApp}
                          debugId="clans.invite.share-whatsapp"
                        >
                          Share on WhatsApp
                        </PrimaryButton>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={card("#F8FBFF")}>
                <div
                  style={{
                    color: "#241A12",
                    fontWeight: 1000,
                    fontSize: 16,
                  }}
                >
                  No active invite yet
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#6B5D50",
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
        <div style={{ ...overlayShell(), padding: isCompact ? 10 : 18 }}>
          <div
            style={{
              ...modalCard(),
              maxHeight: isCompact ? "calc(100svh - 32px)" : undefined,
              overflowY: isCompact ? "auto" : "hidden",
            }}
          >
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
                    color: "#241A12",
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
                    color: "#5F5143",
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
                    color: "#241A12",
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
                    color: "#241A12",
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
                <SecondaryButton
                  onClick={() => setInviteComposerOpen(false)}
                  style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  disabled={inviteLoading}
                  debugId="clans.invite-modal.cancel"
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => void handleCreateInvite()}
                  style={{
                    ...btn(true, inviteLoading || !selectedCommunityId),
                    width: isCompact ? "100%" : undefined,
                  }}
                  disabled={inviteLoading || !selectedCommunityId}
                  busy={inviteLoading}
                  busyLabel="Creating..."
                  debugId="clans.invite-modal.create-package"
                >
                  Create invite package
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ ...pageCard(), order: isCompact ? 4 : undefined }}>
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
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#241A12" }}>
              Existing communities
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#6B5D50",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Keep this compact. Community Home remains the real main page.
            </div>
          </div>

          <StableCtaLink
            to={routes.community}
            kind="primary"
            debugId="clans.existing.open-community"
            style={{ ...btn(true), width: isCompact ? "100%" : undefined }}
          >
            Open Community Home
          </StableCtaLink>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 10,
          }}
        >
          {loadingCommunities ? (
            <div style={{ color: "#6B5D50", lineHeight: 1.7 }}>
              Loading your communities...
            </div>
          ) : communities.length === 0 ? (
            <div style={card("#F8FBFF")}>
              <div
                style={{
                  color: "#241A12",
                  fontWeight: 1000,
                  fontSize: 17,
                }}
              >
                No community yet
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#6B5D50",
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
                      ? "1px solid rgba(174,121,32,0.30)"
                      : "1px solid rgba(128,91,44,0.10)",
                    boxShadow: isActive
                      ? "0 12px 28px rgba(174,121,32,0.12)"
                      : "0 12px 30px rgba(54,38,24,0.07)",
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
                    <div style={{ minWidth: isCompact ? 0 : 220, flex: 1 }}>
                      <div
                        style={{
                          color: "#241A12",
                          fontWeight: 1000,
                          fontSize: 17,
                        }}
                      >
                        {communityName(item)}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#6B5D50",
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
                        display: isCompact ? "grid" : "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                        width: isCompact ? "100%" : undefined,
                      }}
                    >
                      <SecondaryButton
                        style={{
                          ...(isActive ? btn(true) : btn(false)),
                          width: isCompact ? "100%" : undefined,
                        }}
                        onClick={() => handleSelectCommunity(id)}
                        debugId={`clans.community.${id}.select`}
                      >
                        {isActive ? "Selected" : "Select"}
                      </SecondaryButton>

                      <SecondaryButton
                        style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                        onClick={() => handleOpenMarketplace(id)}
                        debugId={`clans.community.${id}.marketplace`}
                      >
                        Open Marketplace
                      </SecondaryButton>
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
