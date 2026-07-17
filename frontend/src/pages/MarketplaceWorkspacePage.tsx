import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import {
  getClanInviteLink,
  getAccessToken,
  getMarketplaceShops,
  getPublicCommunityVerification,
  getSelectedClanId,
  listClanMembers,
  listJoinRequests,
  safeCopy,
  setSelectedClanId,
} from "../lib/api";
import { normalizedJoinInviteUrl } from "../lib/joinLinks";
import {
  resolveCtaTarget,
  type CtaTarget,
  type CtaIntent,
} from "../lib/ctaTargets";
import {
  publicFrontendUrl,
  publicShopRootUrl,
  publicShopUrl,
} from "../lib/publicLinks";
import {
  marketplaceSectionStyle,
  scrollElementToMarketplaceLanding,
  traceMarketplaceLanding,
} from "../lib/marketplaceActionStability";
import { getContextualEvidencePosture } from "../lib/trustBandLanguage";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function rowsOf(input: any): any[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.items)) return input.items;
  if (Array.isArray(input?.data?.items)) return input.data.items;
  if (Array.isArray(input?.results)) return input.results;
  return [];
}

function ctaPath(target: CtaTarget): string {
  return typeof target.to === "string" ? target.to : String(target.to);
}

function workspaceCtaPath(target: CtaTarget): string {
  const path = ctaPath(target);
  if (!path.startsWith("/app/") || getAccessToken()) return path;

  const next = new URLSearchParams();
  next.set("session", "expired");
  next.set("next", path);
  return `/login?${next.toString()}`;
}

function memberGmfnId(member: any): string {
  return safeStr(
    member?.owner_gmfn_id ||
      member?.gmfn_id ||
      member?.member_gmfn_id ||
      member?.user?.gmfn_id ||
      ""
  );
}

function memberUserId(member: any): number {
  return safeNum(member?.user_id || member?.owner_user_id || member?.id || 0);
}

function shopOwnerGmfnId(shop: any): string {
  return safeStr(shop?.owner_gmfn_id || shop?.gmfn_id || shop?.seller_gmfn_id || "");
}

function shopOwnerUserId(shop: any): number {
  return safeNum(shop?.owner_user_id || shop?.seller_user_id || shop?.user_id || 0);
}

function shopDirectUrl(shop: any): string {
  return safeStr(
    shop?.shop_view_url ||
      shop?.shop_link ||
      shop?.shop_profile_url ||
      shop?.public_shop_url ||
      ""
  );
}

function shopLinkForRecord(shop: any): string {
  const direct = shopDirectUrl(shop);
  if (direct) return publicShopRootUrl(direct);

  const gmfnId = shopOwnerGmfnId(shop);
  return gmfnId ? publicShopUrl(gmfnId) : "";
}

function getShopForMember(member: any, shops: any[]): any | null {
  const gmfnId = memberGmfnId(member).toUpperCase();
  const userId = memberUserId(member);

  return (
    shops.find((shop) => {
      const shopGmfn = shopOwnerGmfnId(shop).toUpperCase();
      const shopUserId = shopOwnerUserId(shop);

      if (gmfnId && shopGmfn && gmfnId === shopGmfn) return true;
      return userId > 0 && shopUserId > 0 && userId === shopUserId;
    }) || null
  );
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
    overflowAnchor: "none",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(37,78,119,0.18)",
    padding: 14,
    overflowAnchor: "none",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(37,78,119,0.16)",
    padding: 14,
    overflowAnchor: "none",
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

function workspaceActionRowStyle(marginTop = 0): React.CSSProperties {
  return {
    marginTop,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
    gridAutoRows: "58px",
    gap: 10,
    alignItems: "stretch",
    justifyContent: "stretch",
    minHeight: 58,
    overflowAnchor: "none",
    transition: "none",
  };
}

function workspaceActionStyle(disabled = false, fullWidth = true): React.CSSProperties {
  return {
    width: fullWidth ? "100%" : "auto",
    minWidth: fullWidth ? 0 : 96,
    height: 58,
    minHeight: 58,
    maxHeight: 58,
    padding: "0 12px",
    overflow: "hidden",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "normal",
    textAlign: "center",
    touchAction: "manipulation",
    pointerEvents: "auto",
    opacity: disabled ? 0.72 : undefined,
    cursor: disabled ? "not-allowed" : undefined,
    overflowAnchor: "none",
    transition: "none",
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

function floatingNoticeCard(tone: "success" | "error"): React.CSSProperties {
  return {
    ...pageCard(tone === "error" ? "#FEF2F2" : "#ECFDF5"),
    position: "fixed",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    width: "min(720px, calc(100vw - 32px))",
    zIndex: 90,
    pointerEvents: "none",
    border: tone === "error" ? "1px solid #FECACA" : "1px solid #A7F3D0",
    color: tone === "error" ? "#991B1B" : "#065F46",
    fontWeight: 900,
    boxShadow:
      "0 18px 42px rgba(10,24,49,0.22), inset 0 1px 0 rgba(255,255,255,0.82)",
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
    statusText: "No community trust reading yet",
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
  const signedIn = Boolean(getAccessToken());

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [privateBlocksLocked, setPrivateBlocksLocked] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(true);
  const [moneyOpen, setMoneyOpen] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const alertsSectionRef = useRef<HTMLDivElement | null>(null);
  const membersSectionRef = useRef<HTMLDivElement | null>(null);

  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [publicCommunityRecord, setPublicCommunityRecord] = useState<any>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const scrollTimeoutRefs = useRef<number[]>([]);

  useEffect(() => {
    if (activeClanId > 0) {
      setSelectedClanId(activeClanId);
    }
  }, [activeClanId]);

  const scrollToWorkspaceSection = useCallback(function scrollToWorkspaceSection(
    ref: React.RefObject<HTMLElement | null>,
    targetId: string,
    attempt = 0
  ) {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 0;
      const alreadyComfortablyVisible =
        rect.top >= 16 && rect.bottom <= Math.max(viewportHeight - 16, 16);

      if (alreadyComfortablyVisible) return;

      scrollElementToMarketplaceLanding(ref.current, {
        surface: "marketplace-workspace",
        targetId,
        reason: "section-open",
        attempt,
      });
      return;
    }
    traceMarketplaceLanding({
      surface: "marketplace-workspace",
      targetId,
      reason: "section-target-missing",
      attempt,
    });
    if (attempt >= 7) return;
    window.requestAnimationFrame(() => {
      scrollToWorkspaceSection(ref, targetId, attempt + 1);
    });
  }, []);

  useEffect(() => {
    return () => {
      scrollTimeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      scrollTimeoutRefs.current = [];
    };
  }, []);

  const revealWorkspaceSection = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<boolean>>,
      ref: React.RefObject<HTMLElement | null>,
      targetId: string
    ) => {
      setter(true);
      scrollTimeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      scrollTimeoutRefs.current = [];
      window.requestAnimationFrame(() => {
        scrollToWorkspaceSection(ref, targetId);
      });
      [80, 180, 360, 720, 1200].forEach((delay, index) => {
        const timeoutId = window.setTimeout(() => {
          scrollToWorkspaceSection(ref, targetId, index + 1);
        }, delay);
        scrollTimeoutRefs.current.push(timeoutId);
      });
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
        if (!signedIn) {
          const record = await getPublicCommunityVerification(String(activeClanId));
          setPublicCommunityRecord(record || null);
          setInviteInfo(record || null);
          setJoinRequests([]);
          setMembers([]);
          setShops([]);
          setPrivateBlocksLocked(true);
          return;
        }

        const [inviteRes, joinRes, membersRes, shopsRes] = await Promise.allSettled([
          getClanInviteLink(activeClanId),
          listJoinRequests(activeClanId),
          listClanMembers(activeClanId),
          getMarketplaceShops({
            clan_id: activeClanId,
            header_clan_id: activeClanId,
            only_active: true,
            limit: 100,
          }),
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

        if (shopsRes.status === "fulfilled") {
          setShops(rowsOf(shopsRes.value));
        } else {
          setShops([]);
          setPrivateBlocksLocked(true);
        }
      } catch (e: any) {
        setErr(
          String(
            e?.message ||
              e ||
              (signedIn
                ? "Unable to load community access page."
                : "GSN could not confirm this public community link.")
          )
        );
      } finally {
        setBusy(false);
      }
    }

    void loadAll();
  }, [activeClanId, signedIn]);

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
        ""
    );
  }, [inviteInfo]);

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

  const selectedMemberName = useMemo(() => {
    return safeStr(
      selectedMember?.display_name ||
        selectedMember?.full_name ||
        selectedMember?.nickname ||
        selectedMember?.email
    );
  }, [selectedMember]);

  const selectedMemberShop = useMemo(() => {
    return selectedMember ? getShopForMember(selectedMember, shops) : null;
  }, [selectedMember, shops]);

  const shopViewLink = useMemo(() => {
    const selectedLink = shopLinkForRecord(selectedMemberShop);
    if (selectedLink) return selectedLink;

    const direct = safeStr(
      inviteInfo?.shop_view_url ||
        inviteInfo?.shop_link ||
        inviteInfo?.shop_profile_url ||
        inviteInfo?.public_shop_url ||
        ""
    );
    if (direct) return publicShopRootUrl(direct);

    return "";
  }, [inviteInfo, selectedMemberShop]);

  const guideUrl = useMemo(() => {
    return publicFrontendUrl("/guide");
  }, []);

  const publicJoinPath = activeClanId
    ? `/join/community/${encodeURIComponent(String(activeClanId))}`
    : "/join";
  const publicVerifyPath = activeClanId
    ? `/verify/community/${encodeURIComponent(String(activeClanId))}`
    : "/verify/community";

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
  const communityTrustPosture = useMemo(
    () => getContextualEvidencePosture(communityTrust.scoreText, communityTrust.classText),
    [communityTrust.classText, communityTrust.scoreText]
  );

  const communityHomeCta = useMemo(
    () =>
      resolveCtaTarget("communityHome", {
        communityId: activeClanId,
        explicitTo: activeClanId ? `/app/community/${activeClanId}` : undefined,
        debugId: "marketplace-workspace.community-home",
      }),
    [activeClanId]
  );
  const communityListCta = useMemo(
    () =>
      resolveCtaTarget("communityHome", {
        debugId: "marketplace-workspace.community-list",
      }),
    []
  );
  const marketplaceCta = useMemo(
    () =>
      resolveCtaTarget("marketplace", {
        communityId: activeClanId,
        debugId: "marketplace-workspace.marketplace",
      }),
    [activeClanId]
  );
  const demandBoxCta = useMemo(
    () =>
      resolveCtaTarget("demandBox", {
        communityId: activeClanId,
        debugId: "marketplace-workspace.demand-box",
      }),
    [activeClanId]
  );
  const joinRequestsCta = useMemo(
    () =>
      resolveCtaTarget("communityHome", {
        explicitTo: activeClanId
          ? `/app/community/${activeClanId}/join-requests`
          : "/app/community",
        debugId: "marketplace-workspace.join-requests",
      }),
    [activeClanId]
  );
  const moneyCtas = useMemo(
    () =>
      [
        ["Money In", "moneyIn"],
        ["Money Out", "moneyOut"],
        ["Loan Support", "loans"],
        ["Readiness", "loanReadiness"],
        ["Workbench", "loanWorkbench"],
        ["Earnings", "guarantorEarnings"],
        ["Suggestions", "loanSuggestions"],
      ].map(([label, intent]) => ({
        label,
        target: resolveCtaTarget(intent as CtaIntent, {
          communityId: activeClanId,
          debugId: `marketplace-workspace.${intent}`,
        }),
      })),
    [activeClanId]
  );

  const memberRows = useMemo(() => {
    return members.map((member: any, idx: number) => {
      const shop = getShopForMember(member, shops);
      const displayName =
        safeStr(
          member?.display_name ||
            member?.full_name ||
            member?.nickname ||
            member?.email
        ) || `Member ${idx + 1}`;

      const gmfnId = memberGmfnId(member);

      const shopName = safeStr(
        shop?.name ||
          member?.shop_name ||
          member?.marketplace_shop_name ||
          member?.shop?.name
      );
      const shopLink = shopLinkForRecord(shop);

      return {
        raw: member,
        key: safeNum(member?.id) || idx,
        displayName,
        gmfnId,
        shopName,
        shopLink,
        hasVisibleShop: Boolean(shopLink),
        role: safeStr(member?.role || member?.membership_role || "member"),
      };
    });
  }, [members, shops]);

  function copyInviteMessage() {
    const title = safeStr(communityName || "this community");
    const text = [
      `Hello,`,
      ``,
      `You are invited to begin the request-to-join process for ${title}.`,
      `This link is a GSN access link. It confirms the community access path; joining may still require community approval.`,
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
    if (!inviteLink) {
      setMsg("Community invite link is not available yet.");
      return;
    }

    const title = safeStr(communityName || "this community");
    const text = [
      `You are invited to begin the request-to-join process for ${title}.`,
      `GSN confirms the community access path. Joining may still require community approval.`,
      inviteLink,
      `Guide: ${guideUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyShopViewLink() {
    if (!shopViewLink) {
      setMsg("Public shop link is not confirmed yet. Refresh it from Marketplace first.");
      return;
    }
    const copied = await safeCopy(shopViewLink);
    setMsg(
      copied
        ? "Community public shop link copied."
        : "Clipboard copy was blocked. Refresh the public shop link from Marketplace first."
    );
  }

  async function copyShopViewMessage() {
    if (!shopViewLink) {
      setMsg("Public shop link is not confirmed yet. Refresh it from Marketplace first.");
      return;
    }

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

    const copied = await safeCopy(text);
    setMsg(
      copied
        ? "Community public shop message copied."
        : "Clipboard copy was blocked. Refresh the public shop link from Marketplace first."
    );
  }

  function openShopForMember(member: any) {
    const link = shopLinkForRecord(getShopForMember(member, shops));
    if (!link) {
      setMsg("This member does not have a confirmed visible public shop yet.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  if (!signedIn) {
    const publicCommunityConfirmed = Boolean(publicCommunityRecord && !err);
    const publicStatusText = safeStr(publicCommunityRecord?.status || "");
    const activeText =
      publicStatusText.toLowerCase() === "active"
        ? "Active community"
        : publicStatusText
        ? `${publicStatusText} community`
        : publicCommunityConfirmed
        ? "Community found"
        : "System check";
    const publicMemberCount = safeNum(publicCommunityRecord?.active_member_count);

    async function copyPublicCommunityLink() {
      const copied = await safeCopy(publicFrontendUrl(`/community/${activeClanId}`));
      setMsg(
        copied
          ? "Public community access link copied."
          : "Clipboard copy was blocked. Use the browser address bar."
      );
    }

    return (
      <div style={{ maxWidth: 980, margin: "0 auto", paddingBottom: 36 }}>
        {err || msg ? (
          <div
            role="status"
            aria-live="polite"
            style={floatingNoticeCard(err ? "error" : "success")}
          >
            {err || msg}
          </div>
        ) : null}

        <PageTopNav
          sectionLabel="GSN system feedback"
          title={publicCommunityConfirmed ? communityName : "Community link check"}
          subtitle="This public page confirms whether the community access link is recognised. It is not committee verification, merchant verification, or member approval."
        />

        <section
          style={{
            ...pageCard("#061827"),
            marginTop: 18,
            border: "1px solid rgba(214,170,69,0.32)",
            color: "#FFFFFF",
          }}
        >
          <div style={{ ...sectionLabel(), color: "#F2C766" }}>
            Public community access
          </div>
          <h1
            style={{
              margin: "10px 0 0",
              color: "#FFFFFF",
              fontSize: 38,
              lineHeight: 1.02,
              fontWeight: 1000,
              letterSpacing: 0,
            }}
          >
            {busy
              ? "Checking this community"
              : publicCommunityConfirmed
              ? "Community access confirmed"
              : "Community access not confirmed"}
          </h1>
          <p
            style={{
              margin: "14px 0 0",
              color: "rgba(255,255,255,0.78)",
              fontSize: 16,
              lineHeight: 1.65,
              maxWidth: 720,
            }}
          >
            {publicCommunityConfirmed
              ? "GSN found this community in the system. This feedback only confirms the community access link and protects private member details."
              : "GSN could not confirm this community access link from the public check. The link may be wrong, expired, or not publicly available yet."}
          </p>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                ...badge(true),
                background: "rgba(242,199,102,0.14)",
                color: "#FDE9A8",
                border: "1px solid rgba(242,199,102,0.26)",
              }}
            >
              {activeText}
            </span>
            <span
              style={{
                ...badge(false),
                background: "rgba(255,255,255,0.10)",
                color: "#EAF3FF",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              Community ID: {communityIdentity || "No community ID yet"}
            </span>
            {publicMemberCount > 0 ? (
              <span
                style={{
                  ...badge(false),
                  background: "rgba(255,255,255,0.10)",
                  color: "#EAF3FF",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              >
                Active members: {publicMemberCount}
              </span>
            ) : null}
          </div>
        </section>

        <section style={{ ...pageCard(), marginTop: 18 }}>
          <div style={sectionTitle()}>What this link is for</div>
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#F8FBFF")}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                System feedback
              </div>
              <div style={{ marginTop: 8, ...muted() }}>
                GSN checks whether the community access link exists. This is not a
                community vote.
              </div>
            </div>
            <div style={innerCard("#F8FBFF")}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                Join starting point
              </div>
              <div style={{ marginTop: 8, ...muted() }}>
                A visitor can start a join request. Entry may still need the
                community's normal approval process.
              </div>
            </div>
            <div style={innerCard("#F8FBFF")}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                Private details protected
              </div>
              <div style={{ marginTop: 8, ...muted() }}>
                Member lists, alerts, money/support blocks, and shop mapping are
                not shown on this public surface.
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...pageCard("#F8FBFF"), marginTop: 18 }}>
          <div style={sectionLabel()}>Next step</div>
          <div
            style={{
              marginTop: 8,
              color: "#0B1F33",
              fontSize: 24,
              fontWeight: 1000,
              lineHeight: 1.12,
            }}
          >
            {publicCommunityConfirmed
              ? "Request access to this community."
              : "Check the link or sign in if this is your community."}
          </div>
          <CardActionRow style={workspaceActionRowStyle(16)}>
            <StableCtaLink
              to={publicJoinPath}
              kind="primary"
              debugId="marketplace-workspace.public-request-join"
              style={workspaceActionStyle(!publicCommunityConfirmed)}
            >
              Request to join
            </StableCtaLink>
            <StableCtaLink
              to={publicVerifyPath}
              kind="secondary"
              debugId="marketplace-workspace.public-verify-community"
              style={workspaceActionStyle(!activeClanId)}
            >
              Verify community
            </StableCtaLink>
            <SecondaryButton
              type="button"
              onClick={() => void copyPublicCommunityLink()}
              debugId="marketplace-workspace.public-copy-link"
              style={workspaceActionStyle(!activeClanId)}
            >
              Copy link
            </SecondaryButton>
          </CardActionRow>
        </section>

        <section
          style={{
            ...pageCard("#FFFDF5"),
            marginTop: 18,
            border: "1px solid rgba(214,175,71,0.25)",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#92400E" }}>
            Signed-in community access is required for the workspace
          </div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
            The deeper community desk contains alerts, member mapping,
            marketplace handoff, and money/support pages. Those blocks are for
            members or operators after sign-in, not for an outside invite
            viewer.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 36 }}>
      {err || msg ? (
        <div
          role="status"
          aria-live="polite"
          style={floatingNoticeCard(err ? "error" : "success")}
        >
          {err || msg}
        </div>
      ) : null}

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
            gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
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
                Community ID: {communityIdentity || "No community ID yet"}
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

            <CardActionRow style={workspaceActionRowStyle(16)}>
              <StableCtaLink
                to={workspaceCtaPath(communityHomeCta)}
                kind="secondary"
                debugId={communityHomeCta.debugId}
                style={workspaceActionStyle()}
              >
                Open Community Home
              </StableCtaLink>
              <StableCtaLink
                to={workspaceCtaPath(marketplaceCta)}
                kind="secondary"
                debugId={marketplaceCta.debugId}
                style={workspaceActionStyle()}
              >
                Open Marketplace
              </StableCtaLink>
              <StableCtaLink
                to={workspaceCtaPath(communityListCta)}
                kind="secondary"
                debugId={communityListCta.debugId}
                style={workspaceActionStyle()}
              >
                Community List
              </StableCtaLink>
            </CardActionRow>
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
              {communityTrustPosture.shortLabel}
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
              Evidence posture
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

          <CardActionRow style={workspaceActionRowStyle()}>
            <SecondaryButton
              type="button"
              onClick={() =>
                revealWorkspaceSection(
                  setAlertsOpen,
                  alertsSectionRef,
                  "marketplace-workspace-alerts"
                )
              }
              debugId="marketplace-workspace.open-alerts-section"
              style={workspaceActionStyle()}
            >
              Open Alerts
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() =>
                revealWorkspaceSection(
                  setMembersOpen,
                  membersSectionRef,
                  "marketplace-workspace-members"
                )
              }
              debugId="marketplace-workspace.open-members-section"
              style={workspaceActionStyle()}
            >
              Open Members
            </SecondaryButton>
          </CardActionRow>
        </div>
      </div>

      <section style={{ ...pageCard(), marginTop: 18 }}>
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
          <SubtleButton
            type="button"
            onClick={() => setInviteOpen((v) => !v)}
            stableHeight={58}
            debugId="marketplace-workspace.toggle-invite"
            style={workspaceActionStyle(false, false)}
          >
            {inviteOpen ? "Hide" : "Open"}
          </SubtleButton>
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

                <CardActionRow style={workspaceActionRowStyle()}>
                  <PrimaryButton
                    type="button"
                    onClick={() => {
                      if (!inviteLink) {
                        setMsg("Community invite link is not available yet.");
                        return;
                      }
                      safeCopy(inviteLink);
                      setMsg("Community invite link copied.");
                    }}
                    debugId="marketplace-workspace.copy-join-link"
                    style={workspaceActionStyle(!inviteLink)}
                  >
                    Copy Join Link
                  </PrimaryButton>

                  <SecondaryButton
                    type="button"
                    onClick={copyInviteMessage}
                    debugId="marketplace-workspace.copy-join-message"
                    style={workspaceActionStyle(!inviteLink)}
                  >
                    Copy Join Message
                  </SecondaryButton>

                  <SecondaryButton
                    type="button"
                    onClick={shareWhatsAppJoin}
                    debugId="marketplace-workspace.whatsapp-join"
                    style={workspaceActionStyle(!inviteLink)}
                  >
                    Send via WhatsApp
                  </SecondaryButton>
                </CardActionRow>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                Return links
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.7,
                }}
              >
                These buttons return you to the community's operating pages.
                This desk does not replace Marketplace.
              </div>

              <CardActionRow style={workspaceActionRowStyle(10)}>
                <StableCtaLink
                  to={workspaceCtaPath(demandBoxCta)}
                  kind="secondary"
                  debugId={demandBoxCta.debugId}
                  style={workspaceActionStyle()}
                >
                  Open Demand Box
                </StableCtaLink>
                <StableCtaLink
                  to={workspaceCtaPath(marketplaceCta)}
                  kind="secondary"
                  debugId={marketplaceCta.debugId}
                  style={workspaceActionStyle()}
                >
                  Open Marketplace
                </StableCtaLink>
                <StableCtaLink
                  to={workspaceCtaPath(communityHomeCta)}
                  kind="secondary"
                  debugId={communityHomeCta.debugId}
                  style={workspaceActionStyle()}
                >
                  Open Community Home
                </StableCtaLink>
              </CardActionRow>
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
                Select a member row below. A public shop link appears only
                when that member has a confirmed visible shop in this
                community.
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  wordBreak: "break-word",
                }}
              >
                {shopViewLink ||
                  "No confirmed public shop link is available for the selected member yet."}
              </div>

              <CardActionRow style={workspaceActionRowStyle(12)}>
                <SecondaryButton
                  type="button"
                  onClick={copyShopViewLink}
                  debugId="marketplace-workspace.copy-public-shop-link"
                  style={workspaceActionStyle(!shopViewLink)}
                >
                  Copy Public Shop Link
                </SecondaryButton>

                <SecondaryButton
                  type="button"
                  onClick={copyShopViewMessage}
                  debugId="marketplace-workspace.copy-public-shop-message"
                  style={workspaceActionStyle(!shopViewLink)}
                >
                  Copy Public Shop Message
                </SecondaryButton>
              </CardActionRow>
            </div>
          </div>
        ) : null}
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
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
          <SubtleButton
            type="button"
            onClick={() => setMoneyOpen((v) => !v)}
            stableHeight={58}
            debugId="marketplace-workspace.toggle-money"
            style={workspaceActionStyle(false, false)}
          >
            {moneyOpen ? "Hide" : "Open"}
          </SubtleButton>
        </div>

        {moneyOpen ? (
          <CardActionRow style={workspaceActionRowStyle(16)}>
            {moneyCtas.map((item) => (
              <SecondaryButton
                key={item.label}
                type="button"
                onClick={() =>
                  navigate(workspaceCtaPath(item.target), {
                    state: {
                      from: `${location.pathname || ""}${location.search || ""}${location.hash || ""}`,
                    },
                  })
                }
                debugId={item.target.debugId}
                style={workspaceActionStyle()}
              >
                {item.label}
              </SecondaryButton>
            ))}
          </CardActionRow>
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

      <div
        id="marketplace-workspace-alerts"
        ref={alertsSectionRef}
        style={{ ...pageCard(), ...marketplaceSectionStyle(), marginTop: 18 }}
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
          <div style={sectionTitle()}>Community alerts</div>
          <SubtleButton
            type="button"
            onClick={() => setAlertsOpen((v) => !v)}
            stableHeight={58}
            debugId="marketplace-workspace.toggle-alerts"
            style={workspaceActionStyle(false, false)}
          >
            {alertsOpen ? "Hide" : "Open"}
          </SubtleButton>
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

                    <CardActionRow minHeight={58} style={workspaceActionRowStyle()}>
                      <StableCtaLink
                        to={workspaceCtaPath(joinRequestsCta)}
                        kind="primary"
                        debugId={joinRequestsCta.debugId}
                        style={workspaceActionStyle()}
                      >
                        Open Requests
                      </StableCtaLink>
                    </CardActionRow>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div
        id="marketplace-workspace-members"
        ref={membersSectionRef}
        style={{ ...pageCard(), ...marketplaceSectionStyle(), marginTop: 18 }}
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
          <div style={sectionTitle()}>Members to shop mapping</div>
          <SubtleButton
            type="button"
            onClick={() => setMembersOpen((v) => !v)}
            stableHeight={58}
            debugId="marketplace-workspace.toggle-members"
            style={workspaceActionStyle(false, false)}
          >
            {membersOpen ? "Hide" : "Open"}
          </SubtleButton>
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
                      {member.hasVisibleShop
                        ? `Shop: ${member.shopName || "Visible shop"}`
                        : "No visible public shop in this community yet"}
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
                        ? `GSN ID: ${member.gmfnId}`
                        : "GSN ID not yet available"}
                    </div>
                  </div>

                  <CardActionRow minHeight={58} style={workspaceActionRowStyle()}>
                    <SecondaryButton
                      type="button"
                      onClick={() => setSelectedMember(member.raw)}
                      debugId="marketplace-workspace.view-member-row"
                      style={workspaceActionStyle()}
                    >
                      View Row
                    </SecondaryButton>

                    <PrimaryButton
                      type="button"
                      onClick={() => openShopForMember(member.raw)}
                      debugId="marketplace-workspace.open-member-shop"
                      style={workspaceActionStyle(!member.hasVisibleShop)}
                    >
                      Shop Gallery
                    </PrimaryButton>
                  </CardActionRow>
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
                  GSN ID:{" "}
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






