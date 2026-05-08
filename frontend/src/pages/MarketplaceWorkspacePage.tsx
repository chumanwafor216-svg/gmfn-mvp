import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import {
  getClanInviteLink,
  getSelectedClanId,
  listClanMembers,
  listJoinRequests,
  safeCopy,
  setSelectedClanId,
} from "../lib/api";
import { normalizedJoinInviteUrl } from "../lib/joinLinks";
import { navigateWithOrigin } from "../lib/nav";
import { publicFrontendUrl } from "../lib/publicLinks";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function withClanQuery(path: string, clanId: number): string {
  const target = safeStr(path);
  const selectedId = safeNum(clanId);
  if (!target || selectedId <= 0) return target;
  const [pathAndSearch, hash = ""] = target.split("#");
  const [pathname, search = ""] = pathAndSearch.split("?");
  const query = new URLSearchParams(search);
  if (!query.has("clan_id") && !query.has("community")) {
    query.set("clan_id", String(selectedId));
  }
  const nextSearch = query.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${
    hash ? `#${hash}` : ""
  }`;
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return browserOrigin();
    }
  }

  return browserOrigin();
}

function browserOrigin(): string {
  try {
    if (typeof window === "undefined") return "";
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function resolveImageSrc(src?: string | null): string {
  const raw = String(src || "").trim();
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }
  if (raw.startsWith("/")) {
    return `${apiOrigin()}${raw}`;
  }
  return `${apiOrigin()}/${raw.replace(/^\/+/, "")}`;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(37,78,119,0.20)",
    padding: 18,
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(37,78,119,0.18)",
    padding: 14,
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 16px",
    borderRadius: 14,
    border: primary
      ? "1px solid rgba(11,80,170,0.24)"
      : "1px solid rgba(37,78,119,0.20)",
    background: disabled
      ? "linear-gradient(180deg, #CBD5E1 0%, #B8C4D4 100%)"
      : primary
      ? "linear-gradient(180deg, #1A6BE1 0%, #0B63D1 58%, #09479C 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(236,244,251,0.984) 62%, rgba(221,231,241,0.98) 100%)",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    gap: 8,
    opacity: disabled ? 0.72 : 1,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    appearance: "none",
    WebkitAppearance: "none",
    position: "relative",
    isolation: "isolate",
    zIndex: 2,
    transform: "translateZ(0)",
    outlineOffset: 4,
    boxShadow: disabled
      ? "0 10px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.52)"
      : primary
      ? "0 16px 30px rgba(11,99,209,0.20), inset 0 1px 0 rgba(255,255,255,0.20)"
      : "0 16px 30px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.88)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(37,78,119,0.16)",
    padding: 14,
  };
}

function guardWorkspacePress(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return {
    onPointerDown: guardWorkspacePress,
    onMouseDown: guardWorkspacePress,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary
      ? "linear-gradient(180deg, rgba(11,99,209,0.15) 0%, rgba(11,99,209,0.09) 100%)"
      : "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(228,238,248,0.78) 100%)",
    color: primary ? "#0B63D1" : "#466078",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(37,78,119,0.16)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.74)",
  };
}

function muted(): React.CSSProperties {
  return {
    color: "#445C73",
    lineHeight: 1.7,
    fontSize: 14,
  };
}

function sectionTitle(): React.CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 1000,
    color: "#0B1F33",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4A627A",
    fontWeight: 1000,
    letterSpacing: 0.55,
    textTransform: "uppercase",
  };
}

type CommunityTrustState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
};

function getCommunityTrustState(source: any): CommunityTrustState {
  const rawScore =
    source?.community_cci_score ??
    source?.cci_score ??
    source?.trust_score ??
    source?.community_trust_score ??
    null;

  const rawClass =
    source?.community_cci_class ??
    source?.cci_class ??
    source?.trust_class ??
    source?.community_trust_class ??
    "";

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    return {
      classText,
      scoreText:
        scoreNum === null || Number.isNaN(scoreNum)
          ? "Not available yet"
          : String(Math.round(scoreNum)),
      tone:
        classText === "A" || classText === "A+" || classText === "B"
          ? "green"
          : classText === "C"
          ? "yellow"
          : "red",
      statusText:
        classText === "A" || classText === "A+"
          ? "Healthy"
          : classText === "B"
          ? "Stable"
          : classText === "C"
          ? "Needs attention"
          : "At risk",
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy",
      };
    }
    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable",
      };
    }
    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
      };
    }
    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
    };
  }

  return {
    classText: "Awaiting reading",
    scoreText: "Not available yet",
    tone: "neutral",
    statusText: "Loading",
  };
}

function communityToneStyles(tone: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green") {
    return {
      bg: "#F0FDF4",
      border: "1px solid rgba(34,197,94,0.18)",
      text: "#166534",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEB",
      border: "1px solid rgba(245,158,11,0.18)",
      text: "#92400E",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FEF2F2",
      border: "1px solid rgba(239,68,68,0.18)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.18)",
    text: "#334155",
  };
}

export default function MarketplaceWorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const routeClanId = safeNum(params.clanId);
  const storedClanId = safeNum(getSelectedClanId() || 0);
  const activeClanId = routeClanId || storedClanId;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [privateBlocksLocked, setPrivateBlocksLocked] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(true);
  const [moneyOpen, setMoneyOpen] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const alertsSectionRef = useRef<HTMLElement | null>(null);
  const membersSectionRef = useRef<HTMLElement | null>(null);

  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  useEffect(() => {
    if (activeClanId > 0) {
      setSelectedClanId(activeClanId);
    }
  }, [activeClanId]);

  const scrollToWorkspaceSection = useCallback(function scrollToWorkspaceSection(
    ref: React.RefObject<HTMLElement | null>,
    attempt = 0
  ) {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    if (attempt >= 5) return;
    window.requestAnimationFrame(() => {
      scrollToWorkspaceSection(ref, attempt + 1);
    });
  }, []);

  const revealWorkspaceSection = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<boolean>>,
      ref: React.RefObject<HTMLElement | null>
    ) => {
      setter(true);
      scrollToWorkspaceSection(ref);
    },
    [scrollToWorkspaceSection]
  );

  useEffect(() => {
    async function loadAll() {
      if (!activeClanId) {
        setErr("No community selected.");
        return;
      }

      setBusy(true);
      setErr("");
      setMsg("");
      setPrivateBlocksLocked(false);

      try {
        const [inviteRes, joinRes, membersRes] = await Promise.allSettled([
          getClanInviteLink(activeClanId),
          listJoinRequests(activeClanId),
          listClanMembers(activeClanId),
        ]);

        if (inviteRes.status === "fulfilled") {
          setInviteInfo(inviteRes.value || null);
        } else {
          setInviteInfo({
            clan_id: activeClanId,
            community_id: activeClanId,
          });
          setPrivateBlocksLocked(true);
        }

        if (joinRes.status === "fulfilled") {
          setJoinRequests(
            Array.isArray(joinRes.value) ? joinRes.value : joinRes.value?.items || []
          );
        } else {
          setJoinRequests([]);
          setPrivateBlocksLocked(true);
        }

        if (membersRes.status === "fulfilled") {
          setMembers(
            Array.isArray(membersRes.value)
              ? membersRes.value
              : membersRes.value?.items || []
          );
        } else {
          setMembers([]);
          setPrivateBlocksLocked(true);
        }
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load community access page."));
      } finally {
        setBusy(false);
      }
    }

    void loadAll();
  }, [activeClanId]);

  const communityName = useMemo(() => {
    if (inviteInfo?.marketplace_name) return safeStr(inviteInfo.marketplace_name);
    if (inviteInfo?.clan_name) return safeStr(inviteInfo.clan_name);
    if (inviteInfo?.community_name) return safeStr(inviteInfo.community_name);
    if (activeClanId > 0) return `Community ${activeClanId}`;
    return "Community";
  }, [inviteInfo, activeClanId]);

  const communityIdentity = useMemo(() => {
    return safeStr(
      inviteInfo?.community_id ||
        inviteInfo?.marketplace_id ||
        inviteInfo?.clan_code ||
        inviteInfo?.gmfn_id ||
        activeClanId ||
        ""
    );
  }, [inviteInfo, activeClanId]);

  const communityPicture = useMemo(() => {
    return safeStr(
      inviteInfo?.community_image_url ||
        inviteInfo?.marketplace_image_url ||
        inviteInfo?.image_url ||
        inviteInfo?.image ||
        ""
    );
  }, [inviteInfo]);

  const communityDescription = useMemo(() => {
    return safeStr(
      inviteInfo?.community_description ||
        inviteInfo?.marketplace_description ||
        inviteInfo?.description ||
        ""
    );
  }, [inviteInfo]);

  const inviteLink = useMemo(() => {
    return normalizedJoinInviteUrl(inviteInfo);
  }, [inviteInfo]);

  const inviteCode = useMemo(() => {
    return safeStr(inviteInfo?.code || inviteInfo?.invite_code || "");
  }, [inviteInfo]);

  const selectedMemberGmfnId = useMemo(() => {
    return safeStr(
      selectedMember?.gmfn_id ||
        selectedMember?.member_gmfn_id ||
        selectedMember?.user?.gmfn_id
    );
  }, [selectedMember]);

  const selectedMemberName = useMemo(() => {
    return safeStr(
      selectedMember?.display_name ||
        selectedMember?.full_name ||
        selectedMember?.nickname ||
        selectedMember?.email
    );
  }, [selectedMember]);

  const shopViewLink = useMemo(() => {
    const direct = safeStr(
      inviteInfo?.shop_view_url ||
        inviteInfo?.shop_link ||
        inviteInfo?.shop_profile_url ||
        inviteInfo?.public_shop_url ||
        ""
    );
    if (direct) return publicFrontendUrl(direct);

    return selectedMemberGmfnId
      ? publicFrontendUrl(
          withClanQuery(`/shop/${encodeURIComponent(selectedMemberGmfnId)}`, activeClanId)
        )
      : "";
  }, [activeClanId, inviteInfo, selectedMemberGmfnId]);

  const guideUrl = useMemo(() => {
    return publicFrontendUrl("/guide");
  }, []);

  const pendingCount = useMemo(() => {
    return joinRequests.filter(
      (x) => safeStr(x?.status).toLowerCase() === "pending"
    ).length;
  }, [joinRequests]);

  const communityTrust = useMemo(
    () => getCommunityTrustState(inviteInfo),
    [inviteInfo]
  );
  const trustTone = useMemo(
    () => communityToneStyles(communityTrust.tone),
    [communityTrust.tone]
  );

  const communityHomeLink = useMemo(() => {
    return activeClanId ? `/app/community/${activeClanId}` : "/app/community";
  }, [activeClanId]);
  const marketplaceLink = useMemo(() => {
    return withClanQuery("/app/marketplace", activeClanId);
  }, [activeClanId]);
  const demandBoxLink = useMemo(() => {
    return withClanQuery("/app/demand-box", activeClanId);
  }, [activeClanId]);

  const memberRows = useMemo(() => {
    return members.map((member: any, idx: number) => {
      const displayName =
        safeStr(
          member?.display_name ||
            member?.full_name ||
            member?.nickname ||
            member?.email
        ) || `Member ${idx + 1}`;

      const gmfnId = safeStr(
        member?.gmfn_id ||
          member?.member_gmfn_id ||
          member?.user?.gmfn_id
      );

      const shopName = safeStr(
        member?.shop_name ||
          member?.marketplace_shop_name ||
          member?.shop?.name
      );

      return {
        raw: member,
        key: safeNum(member?.id) || idx,
        displayName,
        gmfnId,
        shopName,
        role: safeStr(member?.role || member?.membership_role || "member"),
      };
    });
  }, [members]);

  function copyInviteMessage() {
    const title = safeStr(communityName || "this community");
    const text = [
      `Hello,`,
      ``,
      `You are invited to begin the request-to-join process for ${title}.`,
      `Admission is not automatic. Existing members still review and vote according to community rules.`,
      ``,
      `Use this community link to begin:`,
      inviteLink || "(invite link unavailable)",
      ``,
      `Guide:`,
      guideUrl,
    ].join("\n");

    safeCopy(text);
    setMsg("Community invite message copied.");
  }

  function shareWhatsAppJoin() {
    const title = safeStr(communityName || "this community");
    const text = [
      `You are invited to begin the request-to-join process for ${title}.`,
      `Admission is not automatic. Members still review and vote.`,
      inviteLink,
      `Guide: ${guideUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function copyShopViewLink() {
    if (!shopViewLink) return;
    safeCopy(shopViewLink);
    setMsg("Community public shop link copied.");
  }

  function copyShopViewMessage() {
    const title = safeStr(communityName || "this community");
    const text = [
      selectedMemberName
        ? `Take a look at ${selectedMemberName}'s public shop in ${title}.`
        : `Take a look at shops visible in ${title}.`,
      shopViewLink || "(shop view link unavailable)",
      `Guide: ${guideUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    safeCopy(text);
    setMsg("Community public shop message copied.");
  }

  function openShopForMember(member: any) {
    const gmfnId = safeStr(
      member?.gmfn_id || member?.member_gmfn_id || member?.user?.gmfn_id
    );
    if (!gmfnId) {
      setMsg("This member does not yet have a visible shop identity.");
      return;
    }
    navigateWithOrigin(
      navigate,
      withClanQuery(`/shop/${encodeURIComponent(gmfnId)}`, activeClanId),
      location
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 36 }}>
      <PageTopNav
        sectionLabel="Community Access Desk"
        title={communityName}
        subtitle="Owner-side links, visibility, and member-to-shop mapping for one community."
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen is the access desk for one community. It keeps join links, alerts, visibility, and member-to-shop mapping together."
        why="It supports one community's access layer only. Marketplace still remains the operating surface for that same community."
        next="Use this page when the job is invite, alert, visibility, or member mapping. Open Marketplace when the work becomes live community activity."
        tone="light"
        style={{ marginTop: 18 }}
      />

      {err ? (
        <div
          style={{
            ...pageCard("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            ...pageCard("#ECFDF5"),
            marginTop: 18,
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {msg}
        </div>
      ) : null}

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Community profile</div>

        <ExplainToggle
          label="What this does"
          what="This community profile block confirms which one community this access desk belongs to before you move into invites, alerts, shares, or member mapping."
          why="It keeps this page anchored to one community instead of drifting into a duplicate Marketplace."
          next="Read the community profile first, then choose the exact access or visibility task you need here."
          tone="light"
          style={{ marginTop: 14 }}
        />

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "0.9fr 1.1fr",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div style={softCard("#FCFEFF")}>
            {communityPicture ? (
              <img
                src={resolveImageSrc(communityPicture)}
                alt={communityName}
                style={{
                  width: "100%",
                  height: 220,
                  objectFit: "cover",
                  borderRadius: 16,
                  border: "1px solid rgba(11,31,51,0.08)",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 16,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background: "linear-gradient(180deg, #EAF2FF 0%, #DCEBFF 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                Community Picture
              </div>
            )}
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 900 }}>
              Community identity
            </div>

            <ExplainToggle
              label="What this does"
              what="This identity block keeps the community name, counts, and description visible while you work on this community's access desk."
              why="It helps you stay anchored in the right community before you move into invite, alert, member, or shop-facing tasks."
              next="Read this identity block first whenever you need to confirm which community this access desk belongs to."
              tone="light"
              style={{ marginTop: 12, marginBottom: 12 }}
            />

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              {communityName}
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
                Community ID: {communityIdentity || "Not available yet"}
              </span>
              <span style={badge(false)}>Members: {memberRows.length}</span>
              <span style={badge(false)}>Alerts: {pendingCount}</span>
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 560,
              }}
            >
              {communityDescription ||
                "This keeps one community's owner-side invite, alert, member, and shop-facing visibility tasks together without turning this desk into the full Marketplace."}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <OriginLink to={communityHomeLink} style={btn(false)}>
                Open Community Home
              </OriginLink>
              <OriginLink to={marketplaceLink} style={btn(false)}>
                Open Marketplace
              </OriginLink>
              <OriginLink to="/app/community" style={btn(false)}>
                Community List
              </OriginLink>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          ...pageCard(trustTone.bg),
          marginTop: 18,
          border: trustTone.border,
        }}
      >
        <div style={{ fontSize: 13, color: trustTone.text, fontWeight: 900 }}>
          Community trust reading
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 1000,
                lineHeight: 1,
                color: trustTone.text,
              }}
            >
              {communityTrust.classText}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                padding: "7px 12px",
                borderRadius: 999,
                background: "#FFFFFF",
                border: trustTone.border,
                color: trustTone.text,
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              Score: {communityTrust.scoreText}
            </div>

            <div
              style={{
                marginTop: 14,
                color: trustTone.text,
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              {communityTrust.statusText}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => revealWorkspaceSection(setAlertsOpen, alertsSectionRef)}
              style={btn(false)}
            >
              Open Alerts
            </button>
            <button
              type="button"
              onClick={() => revealWorkspaceSection(setMembersOpen, membersSectionRef)}
              style={btn(false)}
            >
              Open Members
            </button>
          </div>
        </div>
      </div>

      <section ref={alertsSectionRef} style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionTitle()}>Access & sharing</div>
          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => setInviteOpen((v) => !v)}
            style={btn(false)}
          >
            {inviteOpen ? "Hide" : "Open"}
          </button>
        </div>

        {inviteOpen ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div style={innerCard("#F8FBFF")}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                Invite package
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                    Invite code
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 1000,
                    }}
                  >
                    {inviteCode || "Invite code not available yet."}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                    Invite link
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      wordBreak: "break-word",
                    }}
                  >
                    {inviteLink || "Invite link not available yet."}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                    Guide
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      wordBreak: "break-word",
                    }}
                  >
                    {guideUrl}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => {
                        safeCopy(inviteLink);
                        setMsg("Community invite link copied.");
                      }}
                    style={btn(true, !inviteLink)}
                    disabled={!inviteLink}
                  >
                    Copy Join Link
                  </button>

                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={copyInviteMessage}
                      style={btn(false)}
                    >
                      Copy Join Message
                  </button>

                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={shareWhatsAppJoin}
                    style={btn(false)}
                  >
                    Send via WhatsApp
                  </button>
                </div>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                Route handoff
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.7,
                }}
              >
                These buttons return you to the community's operating routes.
                This desk does not replace Marketplace.
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <OriginLink to={demandBoxLink} style={btn(false)}>
                  Open Demand Box
                </OriginLink>
                <OriginLink to={marketplaceLink} style={btn(false)}>
                  Open Marketplace
                </OriginLink>
                <OriginLink to={communityHomeLink} style={btn(false)}>
                  Open Community Home
                </OriginLink>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                View shop from this community
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.7,
                }}
              >
                Select a member row below, then share that public shop-face
                link with this community context attached.
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  wordBreak: "break-word",
                }}
              >
                {shopViewLink || "Public shop link not available yet."}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={copyShopViewLink}
                    style={btn(false)}
                    disabled={!shopViewLink}
                  >
                  Copy Public Shop Link
                </button>

                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={copyShopViewMessage}
                    style={btn(false)}
                    disabled={!shopViewLink}
                  >
                  Copy Public Shop Message
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section ref={membersSectionRef} style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionTitle()}>Money & support handoff</div>
          <button
            type="button"
            onClick={() => setMoneyOpen((v) => !v)}
            style={btn(false)}
          >
            {moneyOpen ? "Hide" : "Open"}
          </button>
        </div>

        {moneyOpen ? (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              {...buttonGuardProps()}
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/payment/pool", location)}
            >
              Money In
            </button>
            <button
              type="button"
              {...buttonGuardProps()}
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/withdrawal-instructions", location)}
            >
              Money Out
            </button>
            <button
              type="button"
              {...buttonGuardProps()}
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/loans", location)}
            >
              Loans
            </button>
            <button
              type="button"
              {...buttonGuardProps()}
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/loan-readiness", location)}
            >
              Readiness
            </button>
            <button
              type="button"
              {...buttonGuardProps()}
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/loan-workbench", location)}
            >
              Workbench
            </button>
            <button
              type="button"
              {...buttonGuardProps()}
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/guarantor-earnings", location)}
            >
              Earnings
            </button>
            <button
              type="button"
              {...buttonGuardProps()}
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/loan-suggestions", location)}
            >
              Suggestions
            </button>
          </div>
        ) : null}
      </section>

      {privateBlocksLocked ? (
        <div
          style={{
            ...pageCard("#FFFDF5"),
            marginTop: 18,
            border: "1px solid rgba(214,175,71,0.25)",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#92400E" }}>
            Some private community blocks require sign-in
          </div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
            The public community face is open, but invite details, alerts, and
            member mapping may require signed-in community access.
          </div>
        </div>
      ) : null}

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionTitle()}>Community alerts</div>
          <button
            type="button"
            onClick={() => setAlertsOpen((v) => !v)}
            style={btn(false)}
          >
            {alertsOpen ? "Hide" : "Open"}
          </button>
        </div>

        {alertsOpen ? (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {joinRequests.length === 0 ? (
              <div style={{ color: "#64748B" }}>No community alerts yet.</div>
            ) : (
              joinRequests.map((req: any, idx: number) => (
                <div key={safeNum(req?.id) || idx} style={softCard("#F8FBFF")}>
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
                      <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                        Membership request #{safeNum(req?.id) || "Not available yet"}
                      </div>
                      <div style={{ marginTop: 6, ...muted() }}>
                        Status: {safeStr(req?.status || "pending")}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <OriginLink
                        to={`/app/community/${activeClanId}/join-requests`}
                        style={btn(true)}
                      >
                        Open Requests
                      </OriginLink>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionTitle()}>Members to shop mapping</div>
          <button
            type="button"
            onClick={() => setMembersOpen((v) => !v)}
            style={btn(false)}
          >
            {membersOpen ? "Hide" : "Open"}
          </button>
        </div>

        {membersOpen ? (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {memberRows.length === 0 ? (
              <div style={{ color: "#64748B" }}>No members found yet.</div>
            ) : (
              memberRows.map((member, idx) => (
                <div
                  key={member.key || idx}
                  style={{
                    ...innerCard("#FFFFFF"),
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 1000,
                        color: "#0B1F33",
                        fontSize: 16,
                      }}
                    >
                      {member.displayName}
                    </div>

                    <div style={{ marginTop: 6, ...muted() }}>
                      {member.shopName ? `Shop: ${member.shopName}` : "No shop yet"}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color: "#0B63D1",
                        fontWeight: 1000,
                        fontSize: 13,
                      }}
                    >
                      {member.gmfnId
                        ? `GMFN ID: ${member.gmfnId}`
                        : "GMFN ID not yet available"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => setSelectedMember(member.raw)}
                      style={btn(false)}
                    >
                      View Row
                    </button>

                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => openShopForMember(member.raw)}
                      style={btn(true)}
                    >
                      Shop Gallery
                    </button>
                  </div>
                </div>
              ))
            )}

            {selectedMember ? (
              <div style={{ ...innerCard("#F8FBFF"), marginTop: 4 }}>
                <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                  Selected member
                </div>
                <div style={{ marginTop: 10, ...muted() }}>
                  Member:{" "}
                  {safeStr(
                    selectedMember?.display_name ||
                      selectedMember?.full_name ||
                      selectedMember?.nickname ||
                      selectedMember?.email ||
                      "Not available yet"
                  )}
                </div>
                <div style={muted()}>
                  GMFN ID:{" "}
                  {safeStr(
                    selectedMember?.gmfn_id ||
                      selectedMember?.member_gmfn_id ||
                      selectedMember?.user?.gmfn_id ||
                      "Not available yet"
                  )}
                </div>
                <div style={muted()}>
                  Role:{" "}
                  {safeStr(
                    selectedMember?.role ||
                      selectedMember?.membership_role ||
                      "member"
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {busy ? (
        <div style={{ marginTop: 18, color: "#64748B", fontWeight: 900 }}>
          Loading community page...
        </div>
      ) : null}
    </div>
  );
}






