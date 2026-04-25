import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommunityShopControlPanel from "../components/CommunityShopControlPanel";
import DomainIntroToggle from "../components/DomainIntroToggle";
import GSNBrandMark from "../components/GSNBrandMark";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
import PageTopNav from "../components/PageTopNav";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { navigateWithOrigin } from "../lib/nav";
import {
  getMarketplaceBroadcasts,
  getMe,
  getPoolMeSummary,
  getSelectedClanId,
  listMyClans,
  safeCopy,
  selectClan,
} from "../lib/api";
import {
  buildInviteBundle,
  getFirstCircleProgress,
  getSuggestedRelationshipsForRole,
  isContactInviteReady,
  loadFirstCircleDraft,
  relationshipLabel,
  roleLabel,
} from "../lib/firstCircle";
import {
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_REFRESH_MS,
  SPOTLIGHT_PILOT_ROTATION_MS,
  SPOTLIGHT_PILOT_ROTATION_SECONDS_LABEL,
} from "../lib/spotlightPilot";

type ClanItem = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  clan_name?: string | null;
  description?: string | null;
  clan_description?: string | null;
  marketplace_name?: string | null;
  marketplace_description?: string | null;
  community_global_id?: string | null;
  global_id?: string | null;
  gmfn_id?: string | null;
  community_code?: string | null;
  clan_code?: string | null;
  code?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  community_trust_band?: string | null;
  community_finance_health?: string | null;
  finance_health?: string | null;
  finance_band?: string | null;
  community_cci_score?: string | null;
  community_cci_band?: string | null;
  cci_score?: string | null;
  cci_band?: string | null;
  community_standing?: any;
  community_strength?: string | null;
  interaction_density?: string | null;
  interaction_count?: number | null;
  spotlight_subscription_count?: number | null;
  spotlight_subscribers_count?: number | null;
  vault_subscription_count?: number | null;
  vault_subscribers_count?: number | null;
  member_count?: number | null;
  members_count?: number | null;
  role?: string | null;
  member_role?: string | null;
  membership_role?: string | null;
  participant_role?: string | null;
  community?: any;
  profile?: any;
  marketplace?: any;
  clan?: any;
};

type NoticeTone = "success" | "error";
type CollapseKey =
  | "tools"
  | "circle"
  | "spotlight"
  | "communities";

type CollapseState = Record<CollapseKey, boolean>;

type ActiveCommunitySpotlight = {
  id?: number;
  message: string;
  imageUrl: string;
  videoUrl: string;
  expiresAt: string;
  createdAt: string;
};

const COMMUNITY_HOME_COLLAPSE_KEY = "gmfn.communityHome.sections.v3";
const COMMUNITY_BRAND = {
  ink: "#071827",
  navy: "#081E32",
  deep: "#0B2942",
  blue: "#0D5FA8",
  lightBlue: "#EAF4FF",
  gold: "#C9A13A",
  goldSoft: "rgba(212,175,55,0.12)",
  panel: "rgba(255,255,255,0.94)",
  border: "rgba(21,64,103,0.14)",
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function toBackendAssetUrl(path: string): string {
  const raw = safeStr(path);
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const configured =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env?.VITE_API_BASE_URL) ||
    "/api";
  const trimmed = String(configured || "").trim().replace(/\/+$/, "");

  let origin = "";
  if (typeof window !== "undefined" && window.location) {
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        origin = new URL(trimmed).origin;
      } catch {
        origin = window.location.origin;
      }
    } else {
      origin = window.location.origin.replace(/:\d+$/, ":8012");
    }
  }

  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function normalizeActiveCommunitySpotlight(
  row: any
): ActiveCommunitySpotlight | null {
  if (!row) return null;

  return {
    id: Number(row?.id || 0) || undefined,
    message: safeStr(row?.message || ""),
    imageUrl: toBackendAssetUrl(safeStr(row?.image_url || "")),
    videoUrl: toBackendAssetUrl(safeStr(row?.video_url || "")),
    expiresAt: safeStr(row?.expires_at || ""),
    createdAt: safeStr(row?.created_at || ""),
  };
}

function getClanId(clan: ClanItem | null | undefined): number {
  return Number(clan?.id || clan?.clan_id || 0);
}

function getClanName(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.name,
    clan?.clan_name,
    clan?.marketplace_name,
    "Community"
  );
}

function getClanGlobalId(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.community_global_id,
    clan?.global_id,
    clan?.gmfn_id,
    clan?.community_code,
    clan?.clan_code,
    clan?.code,
    getClanId(clan) ? `COMM-${getClanId(clan)}` : "",
    "Awaiting issue"
  );
}

function getClanFinanceHealth(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    (clan as any)?.community_finance_health,
    (clan as any)?.finance_health,
    (clan as any)?.finance_band,
    (clan as any)?.liquidity_band,
    (clan as any)?.exposure_band,
    clan?.community?.finance_health,
    clan?.community?.liquidity_band,
    clan?.marketplace?.finance_health,
    clan?.marketplace?.liquidity_band,
    "Preparing"
  );
}

function getClanMemberCount(clan: ClanItem | null | undefined): number {
  const count = Number(
    clan?.member_count ??
      clan?.members_count ??
      (clan as any)?.community_standing?.member_count ??
      0
  );
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function getClanStrength(clan: ClanItem | null | undefined): string {
  const count = getClanMemberCount(clan);
  return firstTruthy(
    (clan as any)?.community_strength,
    (clan as any)?.community_standing?.community_strength,
    count ? `${count} members` : "Preparing"
  );
}

function getClanInteractionDensity(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    (clan as any)?.interaction_density,
    (clan as any)?.community_standing?.interaction_density,
    "Preparing"
  );
}

function getClanSpotlightSubscriberCount(clan: ClanItem | null | undefined): number {
  const count = Number(
    (clan as any)?.spotlight_subscription_count ??
      (clan as any)?.spotlight_subscribers_count ??
      (clan as any)?.community_standing?.spotlight_subscription_count ??
      0
  );
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function getClanVaultSubscriberCount(clan: ClanItem | null | undefined): number {
  const count = Number(
    (clan as any)?.vault_subscription_count ??
      (clan as any)?.vault_subscribers_count ??
      (clan as any)?.community_standing?.vault_subscription_count ??
      0
  );
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function displayPendingSignal(value: string): string {
  const text = safeStr(value);
  return text.toLowerCase() === "preparing" ? "Pending" : text || "Pending";
}

function resolveMemberName(me: any): string {
  const direct =
    safeStr(me?.display_name) ||
    safeStr(me?.nickname) ||
    safeStr(me?.name) ||
    safeStr(me?.first_name);

  if (direct) return direct;

  const email = safeStr(me?.email);
  if (email.includes("@")) return email.split("@")[0] || "Member";

  return email || "Member";
}

function communityShellStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    maxWidth: 1180,
    margin: "0 auto",
    padding: isCompact ? 12 : 22,
    paddingBottom: isCompact ? 28 : 44,
    display: "grid",
    gap: isCompact ? 14 : 18,
    borderRadius: isCompact ? 24 : 34,
    border: "1px solid rgba(16,37,59,0.10)",
    isolation: "isolate",
    background:
      "radial-gradient(circle at 10% 0%, rgba(11,99,209,0.14) 0%, rgba(11,99,209,0.00) 32%), radial-gradient(circle at 88% 7%, rgba(244,114,182,0.09) 0%, rgba(244,114,182,0.00) 24%), radial-gradient(circle at 92% 14%, rgba(243,208,106,0.09) 0%, rgba(243,208,106,0.00) 28%), linear-gradient(180deg, #F5FAFF 0%, #EEF5FD 42%, #F8FBFF 100%)",
    boxShadow:
      "0 22px 52px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
    overflow: "hidden",
  };
}

function communityAuraStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "absolute",
    inset: isCompact ? "-12% -38% auto -38%" : "-16% -18% auto -18%",
    height: isCompact ? "76%" : "68%",
    zIndex: 0,
    pointerEvents: "none",
    opacity: isCompact ? 0.78 : 0.7,
    background:
      "radial-gradient(circle at 16% 20%, rgba(11,99,209,0.14) 0%, rgba(11,99,209,0.00) 34%), radial-gradient(circle at 76% 24%, rgba(244,114,182,0.085) 0%, rgba(244,114,182,0.00) 28%), radial-gradient(circle at 58% 8%, rgba(243,208,106,0.08) 0%, rgba(243,208,106,0.00) 24%)",
    transform: "translate3d(0,0,0)",
    animation: "communityHomeAuraShift 20s ease-in-out infinite alternate",
    willChange: "transform, opacity",
  };
}

function communityWatermarkStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "absolute",
    right: isCompact ? -28 : 20,
    top: isCompact ? 70 : 88,
    zIndex: 0,
    opacity: isCompact ? 0.045 : 0.065,
    pointerEvents: "none",
    filter: "drop-shadow(0 18px 30px rgba(16,36,58,0.14))",
  };
}

function communityContentStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: isCompact ? 10 : 18,
  };
}

function CommunityShellLayers({ isCompact }: { isCompact: boolean }) {
  return (
    <>
      <style>
        {`
          @keyframes communityHomeAuraShift {
            0% {
              transform: translate3d(-1.6%, -0.8%, 0) scale(1);
              opacity: 0.68;
            }
            50% {
              transform: translate3d(1.2%, 1.1%, 0) scale(1.035);
              opacity: 0.82;
            }
            100% {
              transform: translate3d(2.2%, -0.4%, 0) scale(1.02);
              opacity: 0.74;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .community-home-aura-shift {
              animation: none !important;
              transform: none !important;
            }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="community-home-aura-shift"
        style={communityAuraStyle(isCompact)}
      />
      <div style={communityWatermarkStyle(isCompact)} aria-hidden="true">
        <GSNBrandMark
          width={isCompact ? 180 : 260}
          height={isCompact ? 218 : 315}
        />
      </div>
    </>
  );
}

function communityHeroStyle(isCompact: boolean): React.CSSProperties {
  return {
    borderRadius: isCompact ? 22 : 30,
    border: "1px solid rgba(16,37,59,0.14)",
    background:
      "radial-gradient(circle at top left, rgba(11,99,209,0.14) 0%, rgba(11,99,209,0.00) 38%), linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)",
    padding: isCompact ? 12 : 20,
    boxShadow:
      "0 20px 44px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
    overflow: "hidden",
  };
}

type CommunitySurfaceTone = "summary" | "blue" | "gold" | "raised" | "quiet";

function communityBlockBackground(tone: CommunitySurfaceTone): string {
  if (tone === "summary") {
    return "radial-gradient(circle at top left, rgba(11,99,209,0.14) 0%, rgba(11,99,209,0.00) 38%), linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)";
  }

  if (tone === "blue") {
    return "radial-gradient(circle at top left, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.00) 28%), linear-gradient(180deg, #F8FBFF 0%, #F1F7FF 52%, #E7F0FB 100%)";
  }

  if (tone === "gold") {
    return "radial-gradient(circle at top left, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.00) 28%), linear-gradient(180deg, #F8FBFF 0%, #EEF5FD 54%, #DCEBFA 100%)";
  }

  if (tone === "raised") {
    return "linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)";
  }

  return "linear-gradient(180deg, #FFFFFF 0%, #FCFEFF 100%)";
}

function communityBlockCard(tone: CommunitySurfaceTone): React.CSSProperties {
  const stronger = tone === "summary" || tone === "gold";

  return {
    ...pageCard(communityBlockBackground(tone)),
    border: stronger
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(16,37,59,0.12)",
    boxShadow: stronger
      ? "0 20px 44px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.78)"
      : "0 16px 34px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF"
      ? "radial-gradient(circle at top left, rgba(11,99,209,0.07) 0%, rgba(11,99,209,0.00) 38%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,249,255,0.96) 100%)"
      : bg;

  return {
    borderRadius: "clamp(18px, 4vw, 24px)",
    border: "1px solid rgba(16,37,59,0.14)",
    background: resolvedBg,
    padding: "clamp(12px, 3.6vw, 20px)",
    boxShadow:
      "0 20px 44px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#F8FBFF"
      ? "linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)"
      : bg;

  return {
    borderRadius: 18,
    border: `1px solid ${COMMUNITY_BRAND.border}`,
    background: resolvedBg,
    padding: "clamp(12px, 3vw, 16px)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 12px 26px rgba(10,24,49,0.05)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF"
      ? "linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)"
      : bg;

  return {
    borderRadius: 16,
    border: "1px solid rgba(16,37,59,0.14)",
    background: resolvedBg,
    padding: "clamp(9px, 2.6vw, 12px)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.84), 0 14px 28px rgba(10,24,49,0.05)",
  };
}

function sectionLabel(align: "left" | "center" = "left"): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#244B72",
    fontWeight: 900,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    textAlign: align,
    width: align === "center" ? "100%" : undefined,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 26,
    borderRadius: 999,
    padding: "5px 8px",
    background: primary ? "rgba(29,78,216,0.08)" : "rgba(13,95,168,0.08)",
    color: primary ? "#173654" : "#1E4063",
    border: primary
      ? "1px solid rgba(29,78,216,0.14)"
      : "1px solid rgba(13,95,168,0.12)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    textAlign: "center",
  };
}

function heroStatCard(): React.CSSProperties {
  return {
    ...innerCard("rgba(255,255,255,0.74)"),
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    textAlign: "center",
  };
}

function compactSignal(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 24,
    borderRadius: 999,
    padding: "4px 8px",
    background: primary ? "rgba(29,78,216,0.08)" : "rgba(13,95,168,0.08)",
    color: primary ? "#173654" : "#1E4063",
    border: primary
      ? "1px solid rgba(29,78,216,0.14)"
      : "1px solid rgba(13,95,168,0.10)",
    fontSize: 11.5,
    fontWeight: 900,
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    textAlign: "center",
    boxShadow: primary
      ? "0 6px 12px rgba(29,78,216,0.08), inset 0 1px 0 rgba(255,255,255,0.7)"
      : "inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function metricLabel(): React.CSSProperties {
  return {
    color: "#315A80",
    fontSize: 9.4,
    fontWeight: 950,
    letterSpacing: 0.72,
    lineHeight: 1.08,
    textTransform: "uppercase",
    textAlign: "center",
  };
}

function metricValue(): React.CSSProperties {
  return {
    marginTop: 4,
    color: COMMUNITY_BRAND.ink,
    fontSize: 13.5,
    fontWeight: 950,
    lineHeight: 1.2,
    textAlign: "center",
    wordBreak: "break-word",
  };
}

function metricCard(bg: "blue" | "gold" | "white" = "white"): React.CSSProperties {
  const backgrounds = {
    blue:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(234,244,255,0.98) 62%, rgba(220,235,250,0.98) 100%)",
    gold:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.98) 62%, rgba(235,243,251,0.96) 100%)",
    white:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 60%, #EEF6FF 100%)",
  };

  return {
    minHeight: 64,
    borderRadius: 15,
    border:
      bg === "gold"
        ? "1px solid rgba(16,36,58,0.12)"
        : "1px solid rgba(13,95,168,0.16)",
    background: backgrounds[bg],
    padding: 8,
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    textAlign: "center",
    boxShadow:
      "0 8px 18px rgba(7,24,39,0.07), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(8,40,72,0.05)",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  const stableActionLayer: React.CSSProperties = {
    position: "relative",
    zIndex: 20,
    isolation: "isolate",
    transform: "translateZ(0)",
    pointerEvents: "auto",
    outlineOffset: 4,
    appearance: "none",
    WebkitAppearance: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  };

  if (kind === "primary") {
    return {
      ...stableActionLayer,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
      minHeight: 48,
      padding: "12px 15px",
      borderRadius: 14,
      border: disabled
        ? "1px solid rgba(148,163,184,0.26)"
        : "1px solid rgba(255,255,255,0.18)",
      background: disabled
        ? "#CBD5E1"
        : "linear-gradient(180deg, #1B4B78 0%, #2B6599 56%, #3B78AE 100%)",
      color: "#F8FBFF",
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      alignContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      opacity: disabled ? 0.86 : 1,
      boxShadow: disabled
        ? "none"
        : "0 5px 0 rgba(7,24,39,0.28), 0 16px 30px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -10px 18px rgba(7,24,39,0.10)",
      touchAction: "manipulation",
      lineHeight: 1.18,
      userSelect: "none",
    };
  }

  if (kind === "soft") {
    return {
      ...stableActionLayer,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
      minHeight: 46,
      padding: "11px 14px",
      borderRadius: 12,
      border: "1px solid rgba(13,95,168,0.12)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
      color: disabled ? "#94A3B8" : "#1E4063",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      alignContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      opacity: disabled ? 0.86 : 1,
      boxShadow:
        "0 4px 0 rgba(79,97,120,0.14), 0 10px 20px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -8px 14px rgba(15,59,116,0.08)",
      touchAction: "manipulation",
      lineHeight: 1.18,
      userSelect: "none",
    };
  }

  return {
    ...stableActionLayer,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    minHeight: 46,
    padding: "11px 14px",
    borderRadius: 14,
    border: "1px solid rgba(16,37,59,0.14)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    alignContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    opacity: disabled ? 0.86 : 1,
    boxShadow: disabled
      ? "none"
      : "0 4px 0 rgba(79,97,120,0.16), 0 12px 24px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -8px 14px rgba(15,59,116,0.08)",
    touchAction: "manipulation",
    lineHeight: 1.18,
    userSelect: "none",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 30,
    isolation: "isolate",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    minHeight: 50,
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid rgba(16,37,59,0.14)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
    color: "#0B1F33",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    textAlign: "center",
    alignContent: "center",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    boxShadow:
      "0 5px 0 rgba(79,97,120,0.16), 0 13px 26px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -9px 16px rgba(15,59,116,0.08)",
    touchAction: "manipulation",
    lineHeight: 1.18,
    outline: "none",
    outlineOffset: 4,
    appearance: "none",
    WebkitAppearance: "none",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    transform: "translateZ(0)",
  };
}

function collapseHeaderLayout(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
    gap: isCompact ? 10 : 12,
    alignItems: "start",
  };
}

function communitiesCollapseHeaderLayout(
  isCompact: boolean
): React.CSSProperties {
  return {
    ...collapseHeaderLayout(isCompact),
    zIndex: 30,
    padding: isCompact ? "4px 0" : 0,
    borderRadius: 20,
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    isolation: "isolate",
  };
}

function collapseHeaderText(align: "left" | "center" = "left"): React.CSSProperties {
  return {
    minWidth: 0,
    textAlign: align,
    justifySelf: align === "center" ? "center" : undefined,
    width: "100%",
  };
}

function collapseHeaderButton(isCompact: boolean): React.CSSProperties {
  return {
    ...collapseToggle(),
    justifySelf: isCompact ? "stretch" : "end",
    alignSelf: "start",
    width: isCompact ? "100%" : undefined,
  };
}

function communitiesCollapseHeaderButton(
  isCompact: boolean
): React.CSSProperties {
  return {
    ...collapseHeaderButton(isCompact),
    zIndex: 25,
    width: "100%",
    minHeight: isCompact ? 64 : 52,
    padding: isCompact ? "16px 18px" : "13px 18px",
    borderRadius: isCompact ? 18 : 16,
    overflow: "hidden",
    isolation: "isolate",
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function getSummaryTotal(payload: any, key: string, fallback = "0.00"): string {
  return firstTruthy(payload?.totals?.[key], payload?.summary?.totals?.[key], fallback);
}

function moneyNumber(value: any): number {
  const raw = safeStr(value).replace(/,/g, "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function standingLabel(amount: number): string {
  return amount < 0 ? "Negative" : "Positive";
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function defaultCollapseState(): CollapseState {
  return {
    tools: true,
    circle: true,
    spotlight: true,
    communities: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    tools: Boolean(raw?.tools ?? base.tools),
    circle: Boolean(raw?.circle ?? base.circle),
    spotlight: Boolean(raw?.spotlight ?? base.spotlight),
    communities: Boolean(raw?.communities ?? base.communities),
  };
}

export default function CommunityHomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [selectedClan, setSelectedClan] = useState<ClanItem | null>(null);
  const [poolSummary, setPoolSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changingClanId, setChangingClanId] = useState<number>(0);

  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [activeCommunitySpotlight, setActiveCommunitySpotlight] =
    useState<ActiveCommunitySpotlight | null>(null);
  const [activeCommunitySpotlights, setActiveCommunitySpotlights] = useState<
    ActiveCommunitySpotlight[]
  >([]);
  const [activeCommunitySpotlightIndex, setActiveCommunitySpotlightIndex] =
    useState(0);
  const [activeCommunitySpotlightTotal, setActiveCommunitySpotlightTotal] =
    useState(0);
  const [activeCommunitySpotlightLoading, setActiveCommunitySpotlightLoading] =
    useState(false);
  const [activeCommunitySpotlightSyncIssue, setActiveCommunitySpotlightSyncIssue] =
    useState("");
  const activeCommunitySpotlightsRef = useRef<ActiveCommunitySpotlight[]>([]);

  const [firstCircleDraft, setFirstCircleDraft] = useState(() =>
    loadFirstCircleDraft()
  );

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(COMMUNITY_HOME_COLLAPSE_KEY, defaultCollapseState())
    )
  );
  const collapseToggleTimersRef = useRef<number[]>([]);
  const [shopControlOpenSignal, setShopControlOpenSignal] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    writeLocalJSON(COMMUNITY_HOME_COLLAPSE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    return () => {
      collapseToggleTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      collapseToggleTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    function refreshFirstCircleDraft() {
      setFirstCircleDraft(loadFirstCircleDraft());
    }

    refreshFirstCircleDraft();

    if (typeof window === "undefined") return;

    window.addEventListener("focus", refreshFirstCircleDraft);
    window.addEventListener("storage", refreshFirstCircleDraft);
    document.addEventListener("visibilitychange", refreshFirstCircleDraft);

    return () => {
      window.removeEventListener("focus", refreshFirstCircleDraft);
      window.removeEventListener("storage", refreshFirstCircleDraft);
      document.removeEventListener("visibilitychange", refreshFirstCircleDraft);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clansRes] = await Promise.all([
          getMe().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
        ]);

        const rows: ClanItem[] = Array.isArray(clansRes)
          ? clansRes
          : Array.isArray(clansRes?.items)
          ? clansRes.items
          : [];

        const storedId = Number(getSelectedClanId() || 0);
        const current =
          rows.find((item) => getClanId(item) === storedId) || rows[0] || null;

        if (current) {
          const currentId = getClanId(current);

          if (currentId && currentId !== storedId) {
            await selectClan(currentId).catch(() => null);
          }
        }

        if (!alive) return;

        setMe(meRes || null);
        setClans(rows);
        setSelectedClan(current);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setPoolSummary(null);
      return;
    }

    (async () => {
      const summaryRes = await getPoolMeSummary("NGN").catch((err) => ({
        __failed: String(
          err?.message || err || "Your full finance summary is not ready yet."
        ),
      }));

      if (!alive) return;

      setPoolSummary(
        summaryRes && !(summaryRes as any).__failed ? summaryRes : null
      );
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan]);

  const selectedClanName = getClanName(selectedClan);
  const selectedClanId = getClanId(selectedClan);
  const memberGlobalId = firstTruthy(
    me?.gmfn_id,
    me?.global_member_id,
    me?.member_global_id,
    me?.member_id,
    me?.id,
    "Awaiting issue"
  );

  const cumulativeAvailable = getSummaryTotal(
    poolSummary,
    "effective_available",
    getSummaryTotal(poolSummary, "available_balance", "0.00")
  );
  const cumulativeGuarantorEarned = getSummaryTotal(
    poolSummary,
    "guarantor_earned_total",
    "0.00"
  );
  const cumulativeBorrowerOutstanding = getSummaryTotal(
    poolSummary,
    "borrower_outstanding_total",
    "0.00"
  );
  const cumulativeGuaranteeLocked = getSummaryTotal(
    poolSummary,
    "guarantee_locked_as_guarantor",
    "0.00"
  );
  const cumulativeStandingAmount =
    moneyNumber(cumulativeAvailable) +
    moneyNumber(cumulativeGuarantorEarned) -
    moneyNumber(cumulativeBorrowerOutstanding) -
    moneyNumber(cumulativeGuaranteeLocked);
  const communityHomeOwnerName = resolveMemberName(me);
  const communityCountFromSummary = Number(poolSummary?.communities_count || clans.length || 0);

  const sortedClans = useMemo(() => {
    return [...clans].sort((a, b) => getClanName(a).localeCompare(getClanName(b)));
  }, [clans]);

  const communityNextActionItems = useMemo<NextActionGuideItem[]>(
    () => [
      {
        id: "choose-community",
        label: "Choose community",
        detail: "Open the community list and pick where you want to work.",
        technical: "Community list",
        keywords: ["community", "communities", "group", "select", "choose", "work"],
        tone: "primary",
      },
      {
        id: "marketplace",
        label: "Enter marketplace",
        detail: selectedClanId
          ? `Enter ${selectedClanName || "the selected community"} to work inside that one community.`
          : "Select a community first, then enter its marketplace.",
        technical: "Selected marketplace",
        keywords: ["marketplace", "market", "trade", "work", "open community"],
        disabled: !selectedClanId,
        disabledReason: "Select one community first, then Marketplace can open.",
      },
      {
        id: "create-community",
        label: "Create community",
        detail: "Start a new community and build its first circle.",
        technical: "Create community",
        keywords: ["create", "new community", "start group", "founder"],
      },
      {
        id: "join-community",
        label: "Join community",
        detail: "Enter an existing community path or use an invite.",
        technical: "Join existing community",
        keywords: ["join", "existing", "invite", "enter community"],
      },
      {
        id: "circle",
        label: "Grow circle",
        detail: "Prepare trusted people before live community work begins.",
        technical: "Trusted circle",
        keywords: ["invite", "circle", "people", "trusted", "grow"],
      },
      {
        id: "shop-control",
        label: "Open shop control",
        detail: "Open the owner-side controls for your one GSN shop.",
        technical: "Shop control",
        keywords: ["shop", "seller", "gallery", "control", "products"],
      },
      {
        id: "spotlight",
        label: "Prepare spotlight",
        detail:
          "Prepare spotlight in Shop Control before any selected community sees it live.",
        technical: "Shop Control spotlight",
        keywords: ["spotlight", "picture", "video", "advert", "visibility"],
      },
      {
        id: "finance",
        label: "Review finance file",
        detail: "Open your wider finance file across communities.",
        technical: "Finance",
        keywords: ["finance", "money", "deposit", "withdraw", "pool", "pay"],
      },
      {
        id: "support",
        label: "Open loans and support",
        detail: selectedClanId
          ? `Open loans and support for ${selectedClanName || "the selected community"}.`
          : "Select a community first, then open its loans and support path.",
        technical: "Loans and support",
        keywords: ["loan", "borrow", "lend", "support", "guarantor"],
        disabled: !selectedClanId,
        disabledReason:
          "Select one community first so loans and support stay local to that group.",
      },
      {
        id: "trust",
        label: "Review Trust Passport",
        detail: "Open Trust Passport for your wider trust record across communities.",
        technical: "Trust Passport",
        keywords: ["trust", "passport", "integrity", "cci", "identity"],
      },
      {
        id: "notifications",
        label: "Check notices",
        detail: "Open the action queue and see what needs attention.",
        technical: "Notifications",
        keywords: ["notifications", "notice", "alert", "queue", "what matters"],
      },
    ],
    [selectedClanId, selectedClanName]
  );

  const firstCircleProgress = useMemo(
    () => getFirstCircleProgress(firstCircleDraft),
    [firstCircleDraft]
  );

  const readyFirstCircleContacts = useMemo(() => {
    return firstCircleDraft.contacts.filter(
      (item) => item.selected && isContactInviteReady(item)
    );
  }, [firstCircleDraft]);

  const firstCircleRelationshipHints = useMemo(() => {
    return getSuggestedRelationshipsForRole(firstCircleDraft.memberRole);
  }, [firstCircleDraft.memberRole]);

  const communitySpotlightNextAction = useMemo(() => {
    if (activeCommunitySpotlight) {
      return {
        title: "Live spotlight is already visible",
        detail: activeCommunitySpotlight.expiresAt
          ? "Open Shop Control only when you want to replace or update the current live item."
          : "Open Shop Control only when you are ready to replace this standing spotlight.",
      };
    }

    return {
      title: "Open Shop Control when you are ready",
      detail:
        "Spotlight publishing belongs inside Shop Control so your shop picture, products, Vault, and visibility stay in one clean place.",
    };
  }, [activeCommunitySpotlight]);

  useEffect(() => {
    activeCommunitySpotlightsRef.current = activeCommunitySpotlights;
  }, [activeCommunitySpotlights]);

  async function refreshActiveCommunitySpotlight(clanId: number) {
    if (!clanId) {
      setActiveCommunitySpotlight(null);
      setActiveCommunitySpotlights([]);
      setActiveCommunitySpotlightIndex(0);
      setActiveCommunitySpotlightTotal(0);
      setActiveCommunitySpotlightLoading(false);
      setActiveCommunitySpotlightSyncIssue("");
      return;
    }

    if (activeCommunitySpotlightsRef.current.length === 0) {
      setActiveCommunitySpotlightLoading(true);
    }

    try {
      const res = await getMarketplaceBroadcasts({
        clan_id: clanId,
        active_only: true,
        limit: 12,
      }).catch((err) => ({
        items: [],
        __failed: String(err?.message || err || "Spotlight refresh failed."),
      }));

      const rows = Array.isArray((res as any)?.items)
        ? (res as any).items
        : Array.isArray(res)
        ? res
        : [];

      const normalizedRows = rows
        .map((row: any) => normalizeActiveCommunitySpotlight(row))
        .filter(Boolean) as ActiveCommunitySpotlight[];
      const reportedTotal = Number(
        (res as any)?.active_total ??
          (res as any)?.matching_total ??
          (res as any)?.total ??
          normalizedRows.length
      );

      setActiveCommunitySpotlights(normalizedRows);
      setActiveCommunitySpotlightTotal(
        Number.isFinite(reportedTotal)
          ? Math.max(normalizedRows.length, reportedTotal)
          : normalizedRows.length
      );
      setActiveCommunitySpotlightIndex((prev) =>
        normalizedRows.length > 0 ? prev % normalizedRows.length : 0
      );
      setActiveCommunitySpotlightSyncIssue(safeStr((res as any)?.__failed || ""));
    } finally {
      setActiveCommunitySpotlightLoading(false);
    }
  }

  useEffect(() => {
    if (activeCommunitySpotlights.length === 0) {
      setActiveCommunitySpotlight(null);
      return;
    }

    setActiveCommunitySpotlight(
      activeCommunitySpotlights[
        activeCommunitySpotlightIndex % activeCommunitySpotlights.length
      ] || activeCommunitySpotlights[0]
    );
  }, [activeCommunitySpotlightIndex, activeCommunitySpotlights]);

  useEffect(() => {
    if (activeCommunitySpotlights.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveCommunitySpotlightIndex(
        (prev) => (prev + 1) % activeCommunitySpotlights.length
      );
    }, SPOTLIGHT_PILOT_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [activeCommunitySpotlights.length]);

  useEffect(() => {
    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setActiveCommunitySpotlight(null);
      setActiveCommunitySpotlights([]);
      setActiveCommunitySpotlightIndex(0);
      setActiveCommunitySpotlightTotal(0);
      setActiveCommunitySpotlightLoading(false);
      return;
    }

    let alive = true;

    async function loadIfAlive() {
      if (!alive) return;
      await refreshActiveCommunitySpotlight(clanId);
    }

    void loadIfAlive();

    const timer = window.setInterval(() => {
      void loadIfAlive();
    }, SPOTLIGHT_PILOT_REFRESH_MS);

    function handleFocusRefresh() {
      void loadIfAlive();
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadIfAlive();
      }
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [selectedClan]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: CollapseKey) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSectionFromButton(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    key: CollapseKey
  ) {
    consumeCommunityButtonEvent(event);

    const timerId = window.setTimeout(() => {
      collapseToggleTimersRef.current = collapseToggleTimersRef.current.filter(
        (id) => id !== timerId
      );
      toggleSection(key);
    }, 24);
    collapseToggleTimersRef.current.push(timerId);
  }

  function toggleCommunitiesSectionFromHeader(
    event: React.SyntheticEvent<HTMLElement> | undefined
  ) {
    toggleSectionFromButton(event, "communities");
  }

  function handleCommunitiesHeaderKeyDown(
    event: React.KeyboardEvent<HTMLElement>
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    toggleCommunitiesSectionFromHeader(event);
  }

  function openCommunityHomeSection(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    targetId: string,
    expandKey?: CollapseKey
  ) {
    consumeCommunityButtonEvent(event);

    if (expandKey) {
      setCollapsed((prev) => ({ ...prev, [expandKey]: false }));
    }

    if (typeof document !== "undefined") {
      window.setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);
    }
  }

  function openCommunityShopControl(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    targetId = "community-home-shop-control"
  ) {
    consumeCommunityButtonEvent(event);
    setShopControlOpenSignal((prev) => prev + 1);

    if (typeof document !== "undefined") {
      window.setTimeout(() => {
        const el =
          document.getElementById(targetId) ||
          document.getElementById("community-home-shop-control");
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, targetId === "community-home-shop-control" ? 0 : 48);
    }
  }

  async function handleSelectCommunity(clan: ClanItem, openAfter = false) {
    const clanId = getClanId(clan);
    if (!clanId) {
      showNotice("error", "This community is missing a usable ID.");
      return;
    }

    setChangingClanId(clanId);

    try {
      await selectClan(clanId);
      setSelectedClan(clan);

      if (openAfter) {
        navigateWithOrigin(navigate, "/app/marketplace", location);
      } else {
        showNotice(
          "success",
          `${getClanName(clan)} is now your current community.`
        );
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "This community could not be selected right now."
      );
    } finally {
      setChangingClanId(0);
    }
  }

  function consumeCommunityButtonEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    if (!event) return;

    if (event.type === "click" || event.type === "submit") {
      event.preventDefault();
    }

    event.stopPropagation();
  }

function communityButtonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onTouchStart" | "onMouseDown"
> {
  return {
    onPointerDown: consumeCommunityButtonEvent,
    onTouchStart: consumeCommunityButtonEvent,
    onMouseDown: consumeCommunityButtonEvent,
  };
}

  function openCommunityRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeCommunityButtonEvent(event);
    navigateWithOrigin(navigate, to, location);
  }

  function handleCommunityNextAction(
    item: NextActionGuideItem,
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    switch (item.id) {
      case "choose-community":
        openCommunityHomeSection(event, "community-home-community-list", "communities");
        break;
      case "marketplace":
        void openSelectedMarketplace(event);
        break;
      case "create-community":
        openCommunityRoute(event, "/app/clans");
        break;
      case "join-community":
        openCommunityRoute(event, "/join");
        break;
      case "circle":
        openCommunityHomeSection(event, "community-home-grow-your-circle", "circle");
        break;
      case "shop-control":
        openCommunityShopControl(event);
        break;
      case "spotlight":
        openCommunityRoute(event, "/app/shop-control#shop-control-spotlight");
        break;
      case "finance":
        openCommunityRoute(event, "/app/finance");
        break;
      case "support":
        openCommunityRoute(event, "/app/loans");
        break;
      case "trust":
        openCommunityRoute(event, "/app/trust");
        break;
      case "notifications":
        openCommunityRoute(event, "/app/notifications");
        break;
      default:
        consumeCommunityButtonEvent(event);
        break;
    }
  }

  async function openSelectedMarketplace(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeCommunityButtonEvent(event);

    if (!selectedClanId || !selectedClan) {
      showNotice("error", "Select a community first.");
      return;
    }

    setChangingClanId(selectedClanId);

    try {
      await selectClan(selectedClanId);
      navigateWithOrigin(navigate, "/app/marketplace", location);
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Selected community could not be opened."
      );
    } finally {
      setChangingClanId(0);
    }
  }

  async function openSelectedMarketplaceLinks(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeCommunityButtonEvent(event);

    if (!selectedClanId || !selectedClan) {
      showNotice("error", "Select a community first.");
      return;
    }

    setChangingClanId(selectedClanId);

    try {
      await selectClan(selectedClanId);
      navigateWithOrigin(
        navigate,
        "/app/marketplace#marketplace-owned-links",
        location
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) ||
          "Selected community links could not be opened yet."
      );
    } finally {
      setChangingClanId(0);
    }
  }

  function copyFirstCircleInviteBundle(event?: React.SyntheticEvent<HTMLElement>) {
    consumeCommunityButtonEvent(event);

    if (readyFirstCircleContacts.length === 0) {
      showNotice("error", "No ready invite draft is available yet.");
      return;
    }

    const bundle = buildInviteBundle({
      draft: firstCircleDraft,
      memberName: resolveMemberName(me),
      gmfnId: safeStr(me?.gmfn_id || ""),
      communityName: selectedClanName || "your community",
    });

    safeCopy(bundle);
    showNotice("success", "First-circle invite bundle copied.");
  }

  if (loading) {
    return (
      <div
        style={communityShellStyle(isCompact)}
      >
        <CommunityShellLayers isCompact={isCompact} />
        <div style={communityContentStyle(isCompact)}>
          <PageTopNav
            sectionLabel="Community Home"
            title="Community Home"
            subtitle="Loading your current community..."
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/dashboard"
            nextLinks={[
              { label: "Marketplace", to: "/app/marketplace" },
              { label: "Notifications", to: "/app/notifications" },
            ]}
          />

          <section style={communityBlockCard("quiet")}>
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              Loading your communities...
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (clans.length === 0) {
    return (
      <div style={communityShellStyle(isCompact)}>
        <CommunityShellLayers isCompact={isCompact} />
        <div style={communityContentStyle(isCompact)}>
          <PageTopNav
            sectionLabel="Community Home"
            title="Community Home"
            subtitle="Choose a working community here, confirm where you are, and move into the right community route."
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/dashboard"
            nextLinks={[
              { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
              { label: "Trust", to: "/app/trust" },
            ]}
          />

          <DomainIntroToggle
            title="About Community Home"
            body="Community Home is the place where your communities gather in one view. Create or join one first, then come back here to choose the exact group you want to open."
            bullets={[
              "Create or join a community first.",
              "Then choose the one group you want to open next.",
              "Marketplace, links, and local member activity stay inside the selected community after you open it.",
            ]}
            note="Simple rule: Community Home gathers your groups first, then Marketplace opens one group at a time."
            tone="dark"
          />

          <NextActionGuide
            storageKey="gmfn.communityHome.nextActionGuide.v1"
            compact={isCompact}
            items={communityNextActionItems}
            onSelect={handleCommunityNextAction}
            intro="Say what you want in normal words, like choose community, marketplace, create, join, shop, trust, or finance. GSN will point you to the closest path."
          />

          <section style={communityBlockCard("blue")}>
            <div style={sectionLabel()}>No communities yet</div>

            <div
              style={{
                marginTop: 12,
                color: "#0B1F33",
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.15,
                maxWidth: 760,
              }}
            >
              You do not have any visible communities in Community Home yet.
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 860,
              }}
            >
              Create or join a community first. After that, Community Home will
              show your groups in one place and let you choose the exact
              community you want to open next.
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                {...communityButtonGuardProps()}
                onClick={(event) => openCommunityRoute(event, "/app/clans")}
                style={actionBtn("primary")}
              >
                Create New Community
              </button>
              <button
                type="button"
                {...communityButtonGuardProps()}
                onClick={(event) =>
                  openCommunityRoute(event, "/app/build-first-circle")
                }
                style={actionBtn("secondary")}
              >
                Build Your First Circle
              </button>
              <button
                type="button"
                {...communityButtonGuardProps()}
                onClick={(event) => openCommunityRoute(event, "/app/dashboard")}
                style={actionBtn("secondary")}
              >
                Dashboard
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div
      style={communityShellStyle(isCompact)}
    >
      <CommunityShellLayers isCompact={isCompact} />
      <div style={communityContentStyle(isCompact)}>
      <section style={communityHeroStyle(isCompact)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "auto minmax(0, 1fr)",
            gap: isCompact ? 8 : 18,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCompact ? "flex-start" : "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: isCompact ? 44 : 68,
                height: isCompact ? 50 : 78,
                display: "grid",
                placeItems: "center",
                borderRadius: isCompact ? 18 : 22,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(234,244,255,0.92) 100%)",
                border: "1px solid rgba(16,36,58,0.12)",
                boxShadow: "0 12px 24px rgba(7,24,39,0.10)",
              }}
            >
              <GSNBrandMark
                width={isCompact ? 30 : 48}
                height={isCompact ? 36 : 58}
              />
            </div>
            {isCompact ? (
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabel()}>GSN Community Home</div>
                <div
                  style={{
                    marginTop: 3,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1.15,
                  }}
                >
                  {communityHomeOwnerName}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            {!isCompact ? (
              <>
                <div style={sectionLabel()}>GSN Community Home</div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 30,
                    fontWeight: 900,
                    lineHeight: 1.08,
                    letterSpacing: -0.4,
                  }}
                >
                  Community Home of {communityHomeOwnerName}
                </div>
              </>
            ) : null}

            <div
              style={{
                marginTop: isCompact ? 6 : 12,
                color: "#3A526A",
                fontSize: isCompact ? 11.5 : 14,
                lineHeight: isCompact ? 1.45 : 1.75,
                maxWidth: 880,
              }}
            >
              Choose the community you want to open. Community Home keeps your
              communities, owner identity, and cross-community readings together
              before you hand off into one marketplace.
            </div>

            <div
              style={{
                marginTop: isCompact ? 8 : 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(auto-fit, minmax(142px, 1fr))",
                gap: isCompact ? 6 : 8,
              }}
            >
              <div style={heroStatCard()}>
                <div style={sectionLabel("center")}>Holder</div>
                <div
                  style={{
                    marginTop: 4,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: isCompact ? 12.5 : 15,
                    fontWeight: 900,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {communityHomeOwnerName}
                </div>
              </div>
              <div style={heroStatCard()}>
                <div style={sectionLabel("center")}>GSN ID</div>
                <div
                  style={{
                    marginTop: 4,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: isCompact ? 12.5 : 15,
                    fontWeight: 900,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {memberGlobalId}
                </div>
              </div>
              <div style={heroStatCard()}>
                <div style={sectionLabel("center")}>Communities</div>
                <div
                  style={{
                    marginTop: 2,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: isCompact ? 22 : 24,
                    fontWeight: 900,
                  }}
                >
                  {communityCountFromSummary}
                </div>
              </div>
              <div style={heroStatCard()}>
                <div style={sectionLabel("center")}>Money across communities</div>
                <div
                  style={{
                    marginTop: 4,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: isCompact ? 16 : 18,
                    fontWeight: 900,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {standingLabel(cumulativeStandingAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <NextActionGuide
        storageKey="gmfn.communityHome.nextActionGuide.v1"
        compact={isCompact}
        items={communityNextActionItems}
        onSelect={handleCommunityNextAction}
        intro="Say what you want in normal words, like choose community, enter marketplace, shop control, finance, trust, or support. GSN will point you to the closest path."
      />

      <section style={{ ...communityBlockCard("blue"), order: 55 }}>
        <div
          style={collapseHeaderLayout(isCompact)}
        >
          <div style={collapseHeaderText("center")}>
            <div style={sectionLabel("center")}>Owner actions from Community Home</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: isCompact ? 12.5 : 14,
                lineHeight: isCompact ? 1.5 : 1.75,
                textAlign: "center",
              }}
            >
              Start a community, open owner-side tools that follow your one GSN
              ID, or hand off into the selected marketplace. Marketplace keeps
              one community's live operating lanes together, while the
              marketplace link desk carries that community's outward links.
            </div>
          </div>

          <button
            type="button"
            {...communityButtonGuardProps()}
            onClick={(event) => toggleSectionFromButton(event, "tools")}
            style={collapseHeaderButton(isCompact)}
          >
            {collapsed.tools ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.tools ? (
          <div
            style={{
              marginTop: isCompact ? 10 : 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(auto-fit, minmax(180px, 1fr))",
              gap: isCompact ? 8 : 10,
            }}
          >
            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={(event) => openCommunityRoute(event, "/app/clans")}
              style={actionBtn("primary")}
            >
              Create New Community
            </button>

            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={(event) => void openSelectedMarketplaceLinks(event)}
              style={actionBtn(
                "secondary",
                !selectedClanId || changingClanId === selectedClanId
              )}
              disabled={!selectedClanId || changingClanId === selectedClanId}
            >
              {changingClanId === selectedClanId
                ? "Opening..."
                : "Open Marketplace Link Desk"}
            </button>

            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={(event) =>
                openCommunityHomeSection(
                  event,
                  "community-home-grow-your-circle",
                  "circle"
                )
              }
              style={actionBtn("secondary")}
            >
              Grow Trusted Circle
            </button>

            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={openCommunityShopControl}
              style={actionBtn("secondary")}
            >
              Open Shop Control
            </button>

            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={(event) => openCommunityRoute(event, "/app/notifications")}
              style={actionBtn("secondary")}
            >
              Notifications
            </button>

            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={(event) => void openSelectedMarketplace(event)}
              disabled={!selectedClanId || changingClanId === selectedClanId}
              style={actionBtn(
                "secondary",
                !selectedClanId || changingClanId === selectedClanId
              )}
            >
              {changingClanId === selectedClanId
                ? "Opening..."
                : "Open Selected Marketplace"}
            </button>
          </div>
        ) : null}
      </section>

      <div id="community-home-shop-control" style={{ order: 60 }}>
        <CommunityShopControlPanel forceOpenSignal={shopControlOpenSignal} />
      </div>

      <section
        id="community-home-grow-your-circle"
        style={{ ...communityBlockCard("gold"), order: 70 }}
      >
        <div
          style={collapseHeaderLayout(isCompact)}
        >
          <div style={collapseHeaderText("center")}>
            <div style={sectionLabel("center")}>Grow your trusted circle</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: isCompact ? 12.5 : 14,
                lineHeight: isCompact ? 1.5 : 1.75,
                textAlign: "center",
              }}
            >
              Invite trusted real-life people.
            </div>
          </div>

          <button
            type="button"
            {...communityButtonGuardProps()}
            onClick={(event) => toggleSectionFromButton(event, "circle")}
            style={collapseHeaderButton(isCompact)}
          >
            {collapsed.circle ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.circle ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>First-circle progress</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {firstCircleProgress.nextStepText}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  Role: {roleLabel(firstCircleDraft.memberRole)}
                </span>
                <span style={badge(false)}>
                  Selected: {firstCircleProgress.selectedCount}
                </span>
                <span style={badge(false)}>
                  Ready: {firstCircleProgress.readyCount}
                </span>
                <span style={badge(false)}>
                  Target: {firstCircleProgress.targetCount}
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Build this circle from serious real-life relationships: suppliers,
                buyers, family-support people, remittance contacts, group
                officers, savings partners, and other trusted people.
              </div>

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
                  {...communityButtonGuardProps()}
                  onClick={(event) =>
                    openCommunityRoute(event, "/app/build-first-circle")
                  }
                  style={actionBtn("primary")}
                >
                  Open First Circle
                </button>

                <button
                  type="button"
                  {...communityButtonGuardProps()}
                  onClick={copyFirstCircleInviteBundle}
                  disabled={readyFirstCircleContacts.length === 0}
                  style={actionBtn(
                    "secondary",
                    readyFirstCircleContacts.length === 0
                  )}
                >
                  Copy Invite Bundle
                </button>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Role-based hints</div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {firstCircleRelationshipHints.length > 0 ? (
                  firstCircleRelationshipHints.map((item) => (
                    <span key={item} style={badge(false)}>
                      {relationshipLabel(item)}
                    </span>
                  ))
                ) : (
                  <span style={badge(false)}>Choose your member role first</span>
                )}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {firstCircleDraft.contacts.length === 0 ? (
                  <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                    No trusted person has been added yet.
                  </div>
                ) : (
                  firstCircleDraft.contacts.slice(0, 3).map((item) => (
                    <div key={item.id} style={innerCard("#FCFEFF")}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                          {safeStr(item.name || "Contact")}
                        </div>

                        <span style={badge(item.selected)}>
                          {item.selected ? "Selected" : "Saved"}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(false)}>
                          {relationshipLabel(item.relationship)}
                        </span>
                        <span style={badge(false)}>
                          {isContactInviteReady(item)
                            ? "Invite ready"
                            : "Needs phone or email"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section
        id="community-home-spotlight-gears"
        style={{ ...communityBlockCard("summary"), order: 80 }}
      >
        <div
          style={collapseHeaderLayout(isCompact)}
        >
          <div style={collapseHeaderText("center")}>
            <div style={sectionLabel("center")}>Owner spotlight status</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: isCompact ? 12.5 : 14,
                lineHeight: isCompact ? 1.5 : 1.75,
                textAlign: "center",
              }}
            >
              See the selected community's spotlight status here. Prepare or
              replace the owner content inside Shop Control.
            </div>
          </div>

          <button
            type="button"
            {...communityButtonGuardProps()}
            onClick={(event) => toggleSectionFromButton(event, "spotlight")}
            style={collapseHeaderButton(isCompact)}
          >
            {collapsed.spotlight ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.spotlight ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 0.95fr) minmax(320px, 1.05fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div
              style={{
                ...innerCard("#FCFEFF"),
                border: "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div style={sectionLabel()}>Selected community spotlight</div>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={badge(true)}>
                  {activeCommunitySpotlightTotal ||
                    activeCommunitySpotlights.length}{" "}
                  live / queued
                </span>
                {activeCommunitySpotlights.length > 1 ? (
                  <span style={badge(false)}>
                    Showing{" "}
                    {(activeCommunitySpotlightIndex %
                      activeCommunitySpotlights.length) +
                      1}{" "}
                    of {activeCommunitySpotlights.length}
                  </span>
                ) : null}
                <span style={badge(false)}>
                  Rotates every {SPOTLIGHT_PILOT_ROTATION_SECONDS_LABEL} seconds
                </span>
              </div>

              {activeCommunitySpotlightLoading ? (
                <div
                  style={{
                    marginTop: 10,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Refreshing live spotlight state...
                </div>
              ) : activeCommunitySpotlight ? (
                <>
                  <div style={{ marginTop: 12 }}>
                    <SpotlightMediaFrame
                      imageUrl={activeCommunitySpotlight.imageUrl}
                      videoUrl={activeCommunitySpotlight.videoUrl}
                      videoPoster={activeCommunitySpotlight.imageUrl}
                      alt="Live community spotlight"
                      frameStyle={{
                        minHeight: 180,
                        maxHeight: 260,
                        borderRadius: 18,
                        border: "1px solid rgba(212,175,55,0.14)",
                        background:
                          "linear-gradient(180deg, rgba(24,58,88,0.98) 0%, rgba(38,84,122,0.98) 100%)",
                      }}
                      mediaStyle={{
                        minHeight: 180,
                        maxHeight: 260,
                      }}
                      showVideoControls={Boolean(
                        activeCommunitySpotlight.videoUrl
                      )}
                      autoPlayVideo={Boolean(activeCommunitySpotlight.videoUrl)}
                      mutedVideo={Boolean(activeCommunitySpotlight.videoUrl)}
                      loopVideo={Boolean(activeCommunitySpotlight.videoUrl)}
                      maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
                      fallback={
                        <div
                          style={{
                            padding: 20,
                            textAlign: "center",
                            color: "#D7E3F1",
                            fontWeight: 800,
                            fontSize: 14,
                            lineHeight: 1.7,
                          }}
                        >
                          The active spotlight is live, but no image or video is attached to it.
                        </div>
                      }
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontSize: 16,
                      fontWeight: 900,
                      lineHeight: 1.4,
                    }}
                  >
                    {activeCommunitySpotlight.message || "Live spotlight is active."}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(true)}>Active now</span>
                    {activeCommunitySpotlight.videoUrl ? (
                      <span style={badge(false)}>Short video live</span>
                    ) : activeCommunitySpotlight.imageUrl ? (
                      <span style={badge(false)}>Image live</span>
                    ) : null}
                    {activeCommunitySpotlight.expiresAt ? (
                      <span style={badge(false)}>
                        Expires:{" "}
                        {new Date(
                          activeCommunitySpotlight.expiresAt
                        ).toLocaleString()}
                      </span>
                    ) : (
                      <span style={badge(false)}>No expiry set</span>
                    )}
                  </div>
                </>
              ) : activeCommunitySpotlightSyncIssue ? (
                <div
                  style={{
                    marginTop: 10,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Live spotlight data could not be confirmed just now.
                  <div style={{ marginTop: 8, color: "#8A1C1C" }}>
                    Refresh note: {activeCommunitySpotlightSyncIssue}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 10,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  No spotlight is live in the selected community right now.
                  Open Shop Control when you want to publish one.
                </div>
              )}
            </div>

            <div
              style={{
                ...innerCard("rgba(255,255,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
                boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
              }}
            >
              <div style={sectionLabel()}>Spotlight tools live in Shop Control</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {communitySpotlightNextAction.title}
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                {communitySpotlightNextAction.detail}
              </div>
              <div
                style={{
                  marginTop: 14,
                  color: "#5F7287",
                  fontSize: 13,
                  lineHeight: 1.75,
                }}
              >
                This keeps Community Home clean: it shows the owner-side
                spotlight status here, Shop Control prepares the picture, short
                video, products, Vault, and paid choices, and Marketplace
                carries that spotlight inside the selected community.
              </div>
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
                  {...communityButtonGuardProps()}
                  onClick={(event) =>
                    openCommunityShopControl(
                      event,
                      "community-shop-control-owner-shortcuts"
                    )
                  }
                  style={actionBtn("primary")}
                >
                  Open Owner Spotlight Here
                </button>
                <button
                  type="button"
                  {...communityButtonGuardProps()}
                  onClick={(event) =>
                    openCommunityRoute(
                      event,
                      "/app/shop-control#shop-control-spotlight"
                    )
                  }
                  style={actionBtn("secondary")}
                >
                  Open Full Spotlight Publisher
                </button>
                <button
                  type="button"
                  {...communityButtonGuardProps()}
                  onClick={(event) =>
                    openCommunityRoute(
                      event,
                      "/app/shop-control#shop-control-paid-spotlight"
                    )
                  }
                  style={actionBtn("secondary")}
                >
                  Open Paid Spotlight
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section
        id="community-home-community-list"
        style={{
          ...communityBlockCard("raised"),
          order: 20,
          position: "relative",
          zIndex: 30,
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed.communities}
          aria-controls="community-home-communities-panel"
          {...communityButtonGuardProps()}
          onClick={toggleCommunitiesSectionFromHeader}
          onKeyDown={handleCommunitiesHeaderKeyDown}
          style={communitiesCollapseHeaderLayout(isCompact)}
        >
          <div style={{ minWidth: 0, width: "100%", textAlign: "center" }}>
            <div style={sectionLabel("center")}>Your communities</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: isCompact ? 12.5 : 14,
                lineHeight: isCompact ? 1.5 : 1.75,
                textAlign: "center",
              }}
            >
              Choose one community here, then hand off into its Marketplace.
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <span style={badge(false)}>{sortedClans.length} communities</span>
              {!isCompact ? <span style={badge(false)}>One GSN ID</span> : null}
            </div>
          </div>

          <span
            aria-hidden="true"
            style={communitiesCollapseHeaderButton(isCompact)}
          >
            {collapsed.communities ? "Open" : "Collapse"}
          </span>
        </div>

        {!collapsed.communities ? (
          <div
            id="community-home-communities-panel"
            style={{ marginTop: isCompact ? 10 : 16, display: "grid", gap: 10 }}
          >
            {sortedClans.map((clan, index) => {
              const clanId = getClanId(clan);
              const active = clanId > 0 && clanId === getClanId(selectedClan);
              const working = clanId > 0 && clanId === changingClanId;
              const financeHealth = getClanFinanceHealth(clan);
              const memberCount = getClanMemberCount(clan);
              const strengthLabel = getClanStrength(clan);
              const numericalStrength = memberCount
                ? `${memberCount}`
                : displayPendingSignal(strengthLabel);
              const interactionDensity = displayPendingSignal(
                getClanInteractionDensity(clan)
              );
              const spotlightSubscribers = getClanSpotlightSubscriberCount(clan);
              const vaultSubscribers = getClanVaultSubscriberCount(clan);

              return (
                <div
                  key={`${clanId || index}`}
                  style={{
                    ...innerCard(
                      active
                        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 58%, #EAF4FF 100%)"
                        : "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 62%, #EFF7FF 100%)"
                    ),
                    border: active
                      ? "1px solid rgba(13,95,168,0.20)"
                      : "1px solid rgba(13,95,168,0.13)",
                    boxShadow: active
                      ? "0 14px 30px rgba(13,95,168,0.10), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -2px 0 rgba(8,40,72,0.04)"
                      : "0 12px 26px rgba(7,24,39,0.07), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -2px 0 rgba(8,40,72,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "42px minmax(0, 1.45fr) minmax(170px, 0.65fr) minmax(190px, 0.75fr) auto",
                      gap: isCompact ? 8 : 12,
                      alignItems: "center",
                    }}
                  >
                    {!isCompact ? (
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: active
                            ? "linear-gradient(180deg, #10243A 0%, #26527C 100%)"
                            : "#EEF6FF",
                          color: active ? "#F8FBFF" : "#0B1F33",
                          fontWeight: 950,
                          boxShadow: active
                            ? "0 8px 18px rgba(16,36,58,0.18)"
                            : "none",
                        }}
                      >
                        {index + 1}
                      </div>
                    ) : null}

                    <div style={{ gridColumn: isCompact ? "1 / -1" : "auto" }}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: isCompact ? 15 : 17,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {isCompact ? `${index + 1}. ` : ""}
                        {getClanName(clan)}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#5F7287",
                          fontSize: isCompact ? 12.5 : 14,
                          lineHeight: isCompact ? 1.45 : 1.75,
                        }}
                      >
                        Community no: {getClanGlobalId(clan)}
                      </div>

                      {isCompact ? (
                        <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {active ? <span style={compactSignal(true)}>Selected</span> : null}
                          <span style={compactSignal(false)}>
                            Paid spotlight: {spotlightSubscribers}
                          </span>
                          <span style={compactSignal(false)}>Private Vault: {vaultSubscribers}</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 5,
                            flexWrap: "wrap",
                          }}
                        >
                          {active ? <span style={compactSignal(true)}>Selected</span> : null}
                          <span style={compactSignal(false)}>
                            Numerical strength: {numericalStrength}
                          </span>
                          <span style={compactSignal(false)}>
                            Interaction density: {interactionDensity}
                          </span>
                          <span style={compactSignal(false)}>
                            Paid spotlight: {spotlightSubscribers}
                          </span>
                          <span style={compactSignal(false)}>Private Vault: {vaultSubscribers}</span>
                        </div>
                      )}
                    </div>

                    {isCompact ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 6,
                        }}
                      >
                        <div style={metricCard("blue")}>
                          <div style={metricLabel()}>Numerical strength</div>
                          <div style={metricValue()}>{numericalStrength}</div>
                        </div>
                        <div style={metricCard("white")}>
                          <div style={metricLabel()}>Interaction density</div>
                          <div style={metricValue()}>{interactionDensity}</div>
                        </div>
                        <div style={metricCard("gold")}>
                          <div style={metricLabel()}>Community finance standing</div>
                          <div style={metricValue()}>{financeHealth}</div>
                        </div>
                        <div style={metricCard("blue")}>
                          <div style={metricLabel()}>Trust in this community</div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            ...innerCard("#FFFFFF"),
                            padding: 12,
                          }}
                        >
                          <div style={sectionLabel()}>Community finance standing</div>
                          <div
                            style={{
                              marginTop: 8,
                              color: "#0B1F33",
                              fontSize: 19,
                              fontWeight: 950,
                              lineHeight: 1.2,
                            }}
                          >
                            {financeHealth}
                          </div>
                        </div>

                        <div
                          style={{
                            ...innerCard("#FFFFFF"),
                            padding: 12,
                          }}
                        >
                          <div style={sectionLabel()}>Trust in this community</div>
                        </div>
                      </>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? active
                            ? "1fr"
                            : "0.72fr 1.28fr"
                          : "auto",
                        justifyContent: isCompact ? "stretch" : "flex-end",
                        gap: isCompact ? 6 : 8,
                        gridColumn: isCompact ? "1 / -1" : "auto",
                        marginTop: isCompact ? 2 : 0,
                      }}
                    >
                      {!active ? (
                        <button
                          type="button"
                          {...communityButtonGuardProps()}
                          onClick={(event) => {
                            consumeCommunityButtonEvent(event);
                            void handleSelectCommunity(clan, false);
                          }}
                          disabled={working}
                          style={{
                            ...actionBtn("secondary", working),
                            width: isCompact ? "100%" : undefined,
                          }}
                        >
                          {working ? "Selecting..." : "Select"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        {...communityButtonGuardProps()}
                        onClick={(event) => {
                          consumeCommunityButtonEvent(event);
                          void handleSelectCommunity(clan, true);
                        }}
                        disabled={working}
                        style={{
                          ...actionBtn("primary", working),
                          width: isCompact ? "100%" : undefined,
                        }}
                      >
                        {working ? "Opening..." : "Open Marketplace"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
      </div>
    </div>
  );
}


