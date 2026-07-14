import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DomainIntroToggle from "../components/DomainIntroToggle";
import CommunityNoticeModal from "../components/CommunityNoticeModal";
import GSNBrandMark from "../components/GSNBrandMark";
import NextActionGuide, {
  type NextActionGuideItem,
  type NextActionGuideResolution,
} from "../components/NextActionGuide";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { StableButton } from "../components/StableButton";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { brandClampLines, brandSingleLine } from "../styles/gmfnBrand";
import { APP_ROUTES, routeWithCommunity } from "../lib/appRoutes";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { navigateWithOrigin } from "../lib/nav";
import { revealElementWithoutJump } from "../lib/mobileRevealStability";
import {
  getMarketplaceBroadcasts,
  getMyMarketplaceShop,
  getMarketplaceShopByGmfnId,
  getMe,
  getPoolMeSummary,
  getSelectedClanId,
  createCommunityNotice,
  listCommunityNotices,
  updateCommunityNoticeSettings,
  listMyCommunityDomains,
  listMyClans,
  selectClan,
} from "../lib/api";
import { buildPhoneCallUrl, buildWhatsAppChatUrl } from "../lib/whatsappLinks";
import {
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_REFRESH_MS,
  SPOTLIGHT_PILOT_ROTATION_MS,
  SPOTLIGHT_PILOT_ROTATION_SECONDS_LABEL,
} from "../lib/spotlightPilot";
import {
  OWNER_SHOP_HANDLES,
  OWNER_SHOP_HASHES,
  PAID_REPOST_HASH,
  ROSCA_MARKETPLACE_HASH,
  type OwnerShopHandleId,
} from "../lib/ownerShopHandles";

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
  official_whatsapp_number?: string | null;
  official_whatsapp_label?: string | null;
  official_contact_ready?: boolean;
  notice_posting_policy?: string | null;
  community?: any;
  profile?: any;
  marketplace?: any;
  clan?: any;
};

type CommunityDomainListRow = {
  key: string;
  id: number;
  name: string;
  code: string;
  status: string;
  clanId: number;
  marketplaceReady: boolean;
  dashboardPath: string;
  billingPath: string;
  marketplacePath: string;
};

type NoticeTone = "success" | "error";
type CollapseKey =
  | "communities"
  | "marketplaceTools"
  | "subscriptions"
  | "trustFinance";

type CollapseState = Record<CollapseKey, boolean>;
const COMMUNITY_HOME_ACTION_LANES: CollapseKey[] = [
  "communities",
  "marketplaceTools",
  "subscriptions",
  "trustFinance",
];

type ActiveCommunitySpotlight = {
  id?: number;
  authorUserId?: number;
  authorGmfnId: string;
  message: string;
  imageUrl: string;
  videoUrl: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  availability: string;
  ownerName: string;
  communityName: string;
  sourceProductId?: number;
  sourceProductBlock?: number;
  sourceProductSlotNumber?: number;
  expiresAt: string;
  createdAt: string;
};

type CommunityNoticeItem = {
  notice_id?: string | null;
  meeting_id?: string | null;
  body?: string | null;
  title?: string | null;
  purpose?: string | null;
  scheduled_at?: string | null;
  status?: string | null;
  created_at?: string | null;
  source?: string | null;
  posting_policy?: string | null;
  expiry_policy?: string | null;
  expires_at?: string | null;
  sender_whatsapp_number?: string | null;
  sender_whatsapp_label?: string | null;
  sender_contact_ready?: boolean;
};

type CommunityIconMark = GsnIconName;

const COMMUNITY_OWNER_HANDLE_ICONS: Record<OwnerShopHandleId, CommunityIconMark> = {
  "shop-control": "shop-storefront",
  "shop-gallery-tools": "shop-storefront",
  "vault-control": "vault",
  "free-spotlight": "spotlight-megaphone",
  "spotlight-subscription": "financeInstitution",
  "paid-repost": "spotlight-megaphone",
  "community-package": "financeInstitution",
  "merchant-release": "evidence",
};

function ownerShopHandle(id: OwnerShopHandleId) {
  const handle = OWNER_SHOP_HANDLES.find((item) => item.id === id);
  if (!handle) {
    throw new Error(`Missing owner shop handle: ${id}`);
  }
  return handle;
}

function communityIconGlyph(icon: CommunityIconMark, size = 22): React.ReactNode {
  return <GsnLegacyIcon name={icon} size={Math.max(26, Math.round(size * 1.28))} />;
}

const COMMUNITY_HOME_COLLAPSE_KEY = "gmfn.communityHome.sections.v6";
const PROFILE_NAME_STORAGE_KEY = "gmfn_profile_name";
const COMMUNITY_BRAND = {
  ink: "#F8FBFF",
  navy: "#081E32",
  deep: "#0B2942",
  blue: "#CFE3FF",
  lightBlue: "#EAF4FF",
  gold: "#E7CA7C",
  goldSoft: "rgba(212,175,55,0.16)",
  panel: "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
  border: "rgba(123,161,204,0.18)",
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

function positiveNumber(value: any): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function communityDomainNeedsSetup(domain: any): boolean {
  const status = safeStr(domain?.status).toLowerCase();
  if (!positiveNumber(domain?.clan_id)) return true;
  return (
    status.includes("draft") ||
    status.includes("quote") ||
    status.includes("pending") ||
    status.includes("waiting") ||
    status.includes("suspended") ||
    status.includes("closed") ||
    status.includes("expired")
  );
}

function communityDomainLanePath(path: string, lane: "billing"): string {
  const target = safeStr(path) || "/app/community-domain";
  const [baseWithQuery, hash = ""] = target.split("#");
  const [pathname, search = ""] = baseWithQuery.split("?");
  const query = new URLSearchParams(search);
  query.set("lane", lane);
  const nextSearch = query.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash ? `#${hash}` : ""}`;
}

function normalizeCommunityDomainListRow(item: any): CommunityDomainListRow | null {
  const domain = item?.community_domain || item?.domain || item || {};
  const domainId = positiveNumber(domain?.id || item?.community_domain_id);
  const clanId = positiveNumber(
    domain?.clan_id || domain?.community_id || item?.clan_id || item?.community_id
  );
  const dashboardPath =
    firstTruthy(item?.dashboard_path, domain?.dashboard_path) ||
    (domainId ? `/app/community-domain/${domainId}` : "/app/community-domain");
  const name = firstTruthy(domain?.display_name, domain?.domain_name, "Community Domain");

  if (!domainId && !firstTruthy(domain?.domain_name, domain?.display_name)) {
    return null;
  }

  return {
    key: firstTruthy(domainId, domain?.domain_name, dashboardPath),
    id: domainId,
    name,
    code: firstTruthy(domain?.domain_name, "domain code pending"),
    status: firstTruthy(domain?.status, "status pending"),
    clanId,
    marketplaceReady: !communityDomainNeedsSetup({ ...domain, clan_id: clanId }),
    dashboardPath,
    billingPath: communityDomainLanePath(dashboardPath, "billing"),
    marketplacePath: clanId
      ? routeWithCommunity(APP_ROUTES.MARKETPLACE, clanId)
      : dashboardPath,
  };
}

function readLocalText(key: string): string {
  try {
    if (typeof window === "undefined") return "";
    return safeStr(window.localStorage.getItem(key));
  } catch {
    return "";
  }
}

function spotlightPriceLine(price: any, currency: any): string {
  const priceText = safeStr(price);
  const currencyText = safeStr(currency);
  if (priceText && currencyText) return `${currencyText} ${priceText}`;
  return priceText || currencyText;
}

function normalizeGmfnKey(value: any): string {
  const raw = safeStr(value).toUpperCase();
  if (!raw) return "";
  return raw.replace(/^GSN-/, "GMFN-");
}

function getCurrentUserId(user: any): number {
  return Number(user?.id || user?.user_id || user?.userId || 0) || 0;
}

function getCurrentGmfnKey(user: any): string {
  return normalizeGmfnKey(
    firstTruthy(
      user?.gmfn_id,
      user?.gmfnId,
      user?.global_member_id,
      user?.member_global_id,
      user?.member_id
    )
  );
}

function spotlightBelongsToCurrentUser(
  row: any,
  currentUserId: number,
  currentGmfnKey: string
): boolean {
  if (!row) return false;

  const authorUserId =
    Number(row?.author_user_id || row?.authorUserId || row?.user_id || 0) || 0;
  const authorGmfnKey = normalizeGmfnKey(
    firstTruthy(
      row?.author_gmfn_id,
      row?.authorGmfnId,
      row?.gmfn_id,
      row?.owner_gmfn_id,
      row?.ownerGmfnId
    )
  );

  if (currentUserId && authorUserId && authorUserId === currentUserId) {
    return true;
  }

  return Boolean(
    currentGmfnKey && authorGmfnKey && authorGmfnKey === currentGmfnKey
  );
}

function normalizeActiveCommunitySpotlight(
  row: any
): ActiveCommunitySpotlight | null {
  if (!row) return null;

  return {
    id: Number(row?.id || 0) || undefined,
    authorUserId:
      Number(row?.author_user_id || row?.authorUserId || row?.user_id || 0) ||
      undefined,
    authorGmfnId: firstTruthy(row?.author_gmfn_id, row?.authorGmfnId),
    message: safeStr(row?.message || ""),
    imageUrl: toBackendAssetUrl(safeStr(row?.image_url || row?.imageUrl || "")),
    videoUrl: toBackendAssetUrl(safeStr(row?.video_url || row?.videoUrl || "")),
    title: firstTruthy(
      row?.source_product_title,
      row?.sourceProductTitle,
      row?.spotlight_title,
      row?.spotlightTitle,
      row?.message
    ),
    description: firstTruthy(
      row?.source_product_description,
      row?.sourceProductDescription,
      row?.spotlight_description,
      row?.spotlightDescription,
      row?.message
    ),
    price: firstTruthy(row?.source_product_price, row?.sourceProductPrice),
    currency: firstTruthy(row?.source_product_currency, row?.sourceProductCurrency),
    category: firstTruthy(
      row?.source_product_category,
      row?.sourceProductCategory,
      "Spotlight item"
    ),
    availability: firstTruthy(
      row?.source_product_availability,
      row?.sourceProductAvailability
    ),
    ownerName: firstTruthy(
      row?.spotlight_owner,
      row?.spotlightOwner,
      row?.source_shop_name,
      row?.sourceShopName,
      row?.author_name,
      row?.authorName
    ),
    communityName: firstTruthy(
      row?.spotlight_community,
      row?.spotlightCommunity,
      row?.source_clan_name,
      row?.sourceClanName
    ),
    sourceProductId:
      Number(row?.source_product_id || row?.sourceProductId || 0) || undefined,
    sourceProductBlock:
      Number(row?.source_product_block || row?.sourceProductBlock || 0) ||
      undefined,
    sourceProductSlotNumber:
      Number(row?.source_product_slot_number || row?.sourceProductSlotNumber || 0) ||
      undefined,
    expiresAt: safeStr(row?.expires_at || row?.expiresAt || ""),
    createdAt: safeStr(row?.created_at || row?.createdAt || ""),
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

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { hash?: string } = {}
): string {
  return resolveCtaTarget(intent, {
    communityId,
    debugId,
    ...extra,
  }).to as string;
}

function identityTextShape(value: unknown) {
  const text = safeStr(value);
  const digits = text.replace(/\D/g, "");

  return {
    text,
    looksLikeEmail: text.includes("@"),
    looksLikePhone: digits.length >= 9 && digits.length >= text.length - 3,
    looksLikeGsnId: /^(?:GMFN|GMFM|GSN)-[A-Z0-9]+-/i.test(text),
  };
}

function isHumanMemberName(value: unknown): boolean {
  const shape = identityTextShape(value);
  if (!shape.text || shape.text.toLowerCase() === "member") return false;
  return !shape.looksLikeEmail && !shape.looksLikePhone && !shape.looksLikeGsnId;
}

function hasHumanMemberName(me: any): boolean {
  return [
    readLocalText(PROFILE_NAME_STORAGE_KEY),
    me?.display_name,
    me?.nickname,
    me?.name,
    me?.first_name,
  ].some(isHumanMemberName);
}

function resolveMemberName(me: any): string {
  const candidates = [
    readLocalText(PROFILE_NAME_STORAGE_KEY),
    me?.display_name,
    me?.nickname,
    me?.name,
    me?.first_name,
    me?.gmfn_id,
    me?.gsn_id,
    me?.member_code,
    me?.global_id,
    me?.username,
    me?.email,
    me?.phone,
    me?.phone_e164,
  ];

  for (const candidate of candidates) {
    const shape = identityTextShape(candidate);
    if (!shape.text) continue;
    if (!shape.looksLikeEmail && !shape.looksLikePhone) return shape.text;
  }

  return "Member";
}

function identityNamePromptStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 6 : 9,
    display: "inline-flex",
    alignItems: "center",
    minHeight: isCompact ? 30 : 34,
    padding: isCompact ? "6px 10px" : "7px 12px",
    borderRadius: 999,
    border: "1px solid rgba(226,192,106,0.35)",
    background: "rgba(255,255,255,0.08)",
    color: "#F8E7B2",
    fontSize: isCompact ? 11 : 12,
    fontWeight: 850,
    lineHeight: 1.1,
    letterSpacing: 0,
    cursor: "pointer",
    touchAction: "manipulation",
  };
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
    border: "1px solid rgba(8,35,58,0.12)",
    isolation: "isolate",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 42%, #EEF5FB 100%)",
    boxShadow:
      "0 20px 44px rgba(6,24,39,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
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
    opacity: 0,
    background: "transparent",
    transform: "none",
    animation: "none",
    willChange: "auto",
  };
}

function communityWatermarkStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "absolute",
    right: isCompact ? -28 : 20,
    top: isCompact ? 70 : 88,
    zIndex: 0,
    opacity: 0,
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
    border: "1px solid rgba(226,192,106,0.26)",
    background:
      "radial-gradient(circle at 14% -10%, rgba(214,170,69,0.18) 0%, rgba(214,170,69,0.00) 26%), radial-gradient(circle at 88% 4%, rgba(54,105,151,0.18) 0%, rgba(54,105,151,0.00) 34%), linear-gradient(180deg, #06101A 0%, #08233A 48%, #061827 100%)",
    padding: isCompact ? 12 : 20,
    boxShadow:
      "0 24px 50px rgba(6,24,39,0.26), inset 0 1px 0 rgba(255,255,255,0.10)",
    overflow: "hidden",
  };
}

type CommunitySurfaceTone = "summary" | "blue" | "gold" | "raised" | "quiet";

function communityBlockBackground(tone: CommunitySurfaceTone): string {
  if (tone === "summary") {
    return "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)";
  }

  if (tone === "blue") {
    return "linear-gradient(180deg, #FFFFFF 0%, #F2F8FF 100%)";
  }

  if (tone === "gold") {
    return "linear-gradient(180deg, #FFFFFF 0%, #FFF9EA 100%)";
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
      ? "1px solid rgba(214,170,69,0.20)"
      : "1px solid rgba(16,37,59,0.12)",
    boxShadow: stronger
      ? "0 16px 32px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.92)"
      : "0 12px 26px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: "clamp(18px, 4vw, 24px)",
    border: "1px solid rgba(16,37,59,0.12)",
    background: bg,
    padding: "clamp(12px, 3.6vw, 20px)",
    boxShadow:
      "0 12px 28px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.92)",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#F8FBFF" || bg === "#FFFFFF"
      ? "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)"
      : bg;

  return {
    borderRadius: 18,
    border: "1px solid rgba(16,37,59,0.12)",
    background: resolvedBg,
    padding: "clamp(12px, 3vw, 16px)",
    boxShadow:
      "0 10px 24px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
    overflowAnchor: "none",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF" || bg === "#FCFEFF"
      ? "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)"
      : bg;

  return {
    borderRadius: 16,
    border: "1px solid rgba(16,37,59,0.10)",
    background: resolvedBg,
    padding: "clamp(9px, 2.6vw, 12px)",
    boxShadow:
      "0 10px 22px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
    overflowAnchor: "none",
  };
}

function sectionLabel(align: "left" | "center" = "left"): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#48657D",
    fontWeight: 900,
    letterSpacing: 0,
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
    background: primary ? "#EAF3FF" : "#FFFFFF",
    color: primary ? "#0B2D4A" : "#48657D",
    border: primary
      ? "1px solid rgba(13,95,168,0.18)"
      : "1px solid rgba(16,37,59,0.10)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    textAlign: "center",
  };
}

function communityActionStyle(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  const stableActionLayer: React.CSSProperties = {
    position: "relative",
    zIndex: 60,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    WebkitUserSelect: "none",
    flexShrink: 0,
    overflowAnchor: "none",
    transform: "none",
    translate: "none",
    scale: "none",
    transition: "none",
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
      minHeight: 46,
      padding: "11px 14px",
      borderRadius: 13,
      border: disabled
        ? "1px solid rgba(148,163,184,0.26)"
        : "1px solid rgba(255,255,255,0.16)",
      background: disabled
        ? "#CBD5E1"
        : "linear-gradient(180deg, #0B2D4A 0%, #08233A 100%)",
      color: "#F8FBFF",
      fontWeight: 900,
      fontSize: 13.5,
      textAlign: "center",
      textDecoration: "none",
      alignContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      overflow: "hidden",
      overflowWrap: "normal",
      wordBreak: "normal",
      hyphens: "none",
      textOverflow: "ellipsis",
      opacity: disabled ? 0.86 : 1,
      boxShadow: disabled
        ? "none"
        : "0 5px 0 rgba(7,24,39,0.22), 0 14px 26px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
      lineHeight: 1.18,
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
      minHeight: 44,
      padding: "10px 13px",
      borderRadius: 12,
      border: "1px solid rgba(123,161,204,0.16)",
      background:
        "linear-gradient(180deg, #F8FBFF 0%, #EEF5FD 100%)",
      color: disabled ? "#94A3B8" : "#0B2D4A",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      alignContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      overflow: "hidden",
      overflowWrap: "normal",
      wordBreak: "normal",
      hyphens: "none",
      textOverflow: "ellipsis",
      opacity: disabled ? 0.86 : 1,
      boxShadow:
        "0 8px 18px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
      lineHeight: 1.18,
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
    minHeight: 44,
    padding: "10px 13px",
    borderRadius: 13,
    border: "1px solid rgba(123,161,204,0.16)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)",
    color: disabled ? "#94A3B8" : "#0B2D4A",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    alignContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    textOverflow: "ellipsis",
    opacity: disabled ? 0.86 : 1,
    boxShadow: disabled
      ? "none"
      : "0 8px 18px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
    lineHeight: 1.18,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    minHeight: 50,
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid rgba(123,161,204,0.16)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: "#E6EEF8",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    textAlign: "center",
    alignContent: "center",
    whiteSpace: "normal",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    boxShadow:
      "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    lineHeight: 1.18,
    outline: "none",
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

function collapseButtonRow(): React.CSSProperties {
  return {
    marginTop: 12,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 8,
    flexWrap: "wrap",
    minHeight: 50,
    overflowAnchor: "none",
  };
}

function communityQuickActionButton(
  primary = false,
  isCompact = false
): React.CSSProperties {
  return {
    ...communityActionStyle("secondary"),
    width: "100%",
    height: isCompact ? 58 : 100,
    minHeight: isCompact ? 58 : 100,
    maxHeight: isCompact ? 58 : 100,
    justifyContent: "center",
    alignItems: "center",
    gap: isCompact ? 3 : 7,
    padding: isCompact ? "5px 6px" : "11px 8px",
    textAlign: "center",
    flexDirection: "column",
    background: primary
      ? "linear-gradient(180deg, #F1F7FF 0%, #E6F1FF 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F5FAFF 100%)",
    color: "#07172C",
    border: primary
      ? "1px solid rgba(13,95,168,0.16)"
      : "1px solid rgba(16,37,59,0.10)",
    overflow: "hidden",
  };
}

function communityQuickActionIcon(
  primary = false,
  isCompact = false
): React.CSSProperties {
  return {
    ...communityActionIcon(primary),
    ...(isCompact
      ? {
          width: 25,
          height: 25,
          borderRadius: 10,
          boxShadow:
            "0 6px 12px rgba(13,95,168,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        }
      : {}),
  };
}

function communityActionIcon(primary = false): React.CSSProperties {
  return {
    flex: "0 0 auto",
    width: 46,
    height: 46,
    borderRadius: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.94)",
    border: primary
      ? "1px solid rgba(226,192,106,0.30)"
      : "1px solid rgba(13,95,168,0.12)",
    color: "#135A94",
    fontSize: 20,
    lineHeight: 1,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    boxShadow: primary
      ? "0 10px 18px rgba(2,12,27,0.10), inset 0 1px 0 rgba(255,255,255,0.96)"
      : "0 8px 16px rgba(13,95,168,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
  };
}

function communityToolRowStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 20,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "center",
    height: 72,
    minHeight: 72,
    maxHeight: 72,
    boxSizing: "border-box",
    borderRadius: 16,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,251,255,0.98) 100%)",
    padding: "10px 12px",
    color: "#07172C",
    cursor: "pointer",
    textAlign: "left",
    isolation: "isolate",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    overflow: "hidden",
    overflowAnchor: "none",
    transform: "none",
    translate: "none",
    scale: "none",
    transition: "none",
    boxShadow:
      "0 12px 24px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
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

function announcementBoardShellStyle(): React.CSSProperties {
  return {
    ...pageCard("#FFFFFF"),
    padding: 0,
    borderRadius: "clamp(22px, 5vw, 28px)",
    overflow: "hidden",
    background: "#FFFFFF",
  };
}

function announcementBoardHeaderStyle(isCompact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "center",
    padding: isCompact ? "16px 16px" : "18px 22px",
    background:
      "linear-gradient(135deg, #0B2D4A 0%, #102F57 52%, #071E36 100%)",
    color: "#FFFFFF",
  };
}

function announcementBoardTitleRowStyle(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  };
}

function announcementBoardIconStyle(): React.CSSProperties {
  return {
    width: 46,
    height: 46,
    borderRadius: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(16,98,181,0.52)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
    flex: "0 0 auto",
  };
}

function announcementBoardPillStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    borderRadius: 999,
    padding: "7px 13px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#EAF3FF",
    fontSize: 13,
    fontWeight: 850,
    whiteSpace: "nowrap",
  };
}

function announcementComposerStyle(isCompact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(150px, 194px)",
    gap: 12,
    alignItems: "stretch",
    padding: isCompact ? "14px 16px" : "18px 28px",
    borderBottom: "1px solid rgba(16,37,59,0.10)",
    background: "#FFFFFF",
  };
}

function announcementComposerPreviewStyle(): React.CSSProperties {
  return {
    minHeight: 74,
    borderRadius: 16,
    border: "1px solid rgba(16,37,59,0.14)",
    background: "#FFFFFF",
    padding: "14px 16px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "end",
    color: "#6B7A8F",
    fontSize: 14,
    fontWeight: 760,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
  };
}

function announcementListPanelStyle(isCompact: boolean): React.CSSProperties {
  return {
    padding: isCompact ? "15px 16px 18px" : "20px 28px 24px",
    background: "linear-gradient(180deg, #FAFCFF 0%, #F5F8FD 100%)",
  };
}

function announcementNoticeRowStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "52px minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "center",
    minHeight: 74,
    padding: "12px 10px",
    borderBottom: "1px solid rgba(16,37,59,0.08)",
  };
}

function announcementNoticeIconStyle(index: number): React.CSSProperties {
  const backgrounds = ["#DCFCE7", "#DBEAFE", "#FEF3C7", "#F3E8FF"];
  return {
    width: 48,
    height: 48,
    borderRadius: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: backgrounds[index % backgrounds.length],
    border: "1px solid rgba(255,255,255,0.74)",
    boxShadow: "0 8px 16px rgba(10,24,49,0.06)",
  };
}

function contactCommunityCardStyle(): React.CSSProperties {
  return {
    ...pageCard("#FFFFFF"),
    borderRadius: "clamp(22px, 5vw, 28px)",
    background: "#FFFFFF",
  };
}

function contactCommunityBodyStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(220px, 320px)",
    gap: 16,
    alignItems: "center",
    paddingTop: 16,
    borderTop: "1px solid rgba(16,37,59,0.10)",
  };
}

function contactIdentityStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "82px minmax(0, 1fr)",
    gap: 14,
    alignItems: "center",
    minWidth: 0,
  };
}

function contactAvatarStyle(): React.CSSProperties {
  return {
    width: 82,
    height: 82,
    borderRadius: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #EAF3FF 0%, #D8E8FA 100%)",
    border: "1px solid rgba(13,95,168,0.10)",
    boxShadow: "0 12px 24px rgba(10,24,49,0.08)",
  };
}

function contactVerifiedStripStyle(ready: boolean): React.CSSProperties {
  return {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    background: ready ? "#ECFDF3" : "#F8FBFF",
    border: ready
      ? "1px solid rgba(22,163,74,0.14)"
      : "1px solid rgba(16,37,59,0.10)",
    color: ready ? "#166534" : "#617085",
    fontWeight: 850,
    fontSize: 13,
  };
}

function getSummaryTotal(payload: any, key: string, fallback = "0.00"): string {
  return firstTruthy(payload?.totals?.[key], payload?.summary?.totals?.[key], fallback);
}

function getSummaryAny(payload: any, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const found = firstTruthy(
      payload?.[key],
      payload?.totals?.[key],
      payload?.summary?.[key],
      payload?.summary?.totals?.[key],
      payload?.finance?.[key],
      payload?.money?.[key]
    );
    if (found) return found;
  }
  return fallback;
}

function moneyNumber(value: any): number {
  const raw = safeStr(value).replace(/,/g, "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatGlobalAmount(value: any): string {
  const amount = moneyNumber(value);

  if (!Number.isFinite(amount)) return "0";

  return Math.round(amount).toLocaleString();
}

function formatSignedGlobalAmount(value: any): string {
  const amount = moneyNumber(value);
  const sign = amount < 0 ? "-" : "";
  return `${sign}${formatGlobalAmount(Math.abs(amount))}`;
}

function wordLimit(text: string, maxWords: number): string {
  const words = safeStr(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function safeDateLabel(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  return date.toLocaleString();
}

function compactDateLabel(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return date.toLocaleDateString();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function noticeExpiryLabel(item: CommunityNoticeItem): string {
  if (safeStr(item?.expiry_policy).toLowerCase() === "pinned") return "Pinned";
  const expiresAt = safeDateLabel(item?.expires_at);
  return expiresAt ? `Visible until ${expiresAt}` : "";
}

function communityContactMessage(clan: ClanItem | null | undefined): string {
  const name = getClanName(clan);
  const code = firstTruthy(clan?.community_code, clan?.clan_code, clan?.code);
  return [
    `Hello ${name}.`,
    code ? `Community ID: ${code}` : "",
    "I am contacting the official GSN community contact.",
  ]
    .filter(Boolean)
    .join("\n");
}

function isCommunityOfficer(clan: ClanItem | null | undefined, user: any): boolean {
  const platformRole = safeStr(firstTruthy(user?.role, user?.account_role)).toLowerCase();
  const communityRole = safeStr(
    firstTruthy(clan?.membership_role, clan?.member_role, clan?.participant_role, clan?.role)
  ).toLowerCase();
  return platformRole === "admin" || communityRole === "admin";
}

function normalizeNoticePostingPolicy(value: unknown): "members" | "admins" {
  return safeStr(value).toLowerCase() === "admins" ? "admins" : "members";
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
    communities: true,
    marketplaceTools: true,
    subscriptions: true,
    trustFinance: true,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    communities: Boolean(raw?.communities ?? base.communities),
    marketplaceTools: Boolean(raw?.marketplaceTools ?? base.marketplaceTools),
    subscriptions: Boolean(raw?.subscriptions ?? base.subscriptions),
    trustFinance: Boolean(raw?.trustFinance ?? base.trustFinance),
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
  const [communityDomainCount, setCommunityDomainCount] = useState<number | null>(null);
  const [communityDomainRows, setCommunityDomainRows] = useState<CommunityDomainListRow[]>([]);
  const [selectedClan, setSelectedClan] = useState<ClanItem | null>(null);
  const [communityNotices, setCommunityNotices] = useState<CommunityNoticeItem[]>([]);
  const [communityNoticesLoading, setCommunityNoticesLoading] = useState(false);
  const [communityNoticePostingPolicy, setCommunityNoticePostingPolicy] =
    useState<"members" | "admins">("members");
  const [communityNoticeSettingsSaving, setCommunityNoticeSettingsSaving] =
    useState(false);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticePosting, setNoticePosting] = useState(false);
  const [whatsappContactChoicesOpen, setWhatsappContactChoicesOpen] =
    useState(false);
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

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(COMMUNITY_HOME_COLLAPSE_KEY, defaultCollapseState())
    )
  );
  const [guidedActionFamilyFocus, setGuidedActionFamilyFocus] = useState<
    string | null
  >(null);
  const communityRevealJobRef = useRef(0);
  const communityRevealFrameRef = useRef<number | null>(null);

  const cancelCommunityReveal = useCallback(() => {
    communityRevealJobRef.current += 1;

    if (communityRevealFrameRef.current !== null) {
      window.cancelAnimationFrame(communityRevealFrameRef.current);
      communityRevealFrameRef.current = null;
    }
  }, []);

  const revealCommunityTarget = useCallback(
    (targetIds: string[]) => {
      cancelCommunityReveal();
      const jobId = communityRevealJobRef.current;

      const tryReveal = (attempt = 0) => {
        if (communityRevealJobRef.current !== jobId) return;

        const target = targetIds
          .map((id) => document.getElementById(id))
          .find((el): el is HTMLElement => el instanceof HTMLElement);

        if (target) {
          revealElementWithoutJump(target, {
            surface: "community-home",
            targetId: target.id || targetIds[0] || "",
            reason: "section-reveal",
          });
          communityRevealFrameRef.current = null;
          return;
        }

        if (attempt >= 12) {
          communityRevealFrameRef.current = null;
          return;
        }

        communityRevealFrameRef.current = window.requestAnimationFrame(() => {
          tryReveal(attempt + 1);
        });
      };

      communityRevealFrameRef.current = window.requestAnimationFrame(() => {
        tryReveal();
      });
    },
    [cancelCommunityReveal]
  );

  const openGuidedSpotlightFamily = useCallback(
    (event?: React.SyntheticEvent<HTMLElement>) => {
      consumeCommunityButtonEvent(event);
      setGuidedActionFamilyFocus("spotlight");
      setCollapsed((prev) => ({
        ...prev,
        marketplaceTools: false,
        subscriptions: true,
        trustFinance: true,
      }));
      revealCommunityTarget(["community-home-spotlight-guided-lane"]);
    },
    [revealCommunityTarget]
  );

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
      cancelCommunityReveal();
    };
  }, [cancelCommunityReveal]);

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
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clansRes, domainsRes] = await Promise.all([
          getMe().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
          listMyCommunityDomains().catch(() => ({ items: null })),
        ]);

        const rows: ClanItem[] = Array.isArray(clansRes)
          ? clansRes
          : Array.isArray(clansRes?.items)
          ? clansRes.items
          : [];
        const domainRows = Array.isArray(domainsRes)
          ? domainsRes
          : Array.isArray(domainsRes?.items)
          ? domainsRes.items
          : null;

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
        const normalizedDomainRows = Array.isArray(domainRows)
          ? domainRows
              .map(normalizeCommunityDomainListRow)
              .filter((row): row is CommunityDomainListRow => Boolean(row))
          : [];

        setCommunityDomainRows(normalizedDomainRows);
        setCommunityDomainCount(Array.isArray(domainRows) ? normalizedDomainRows.length : null);
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
      const summaryRes = await getPoolMeSummary().catch((err) => ({
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

  useEffect(() => {
    let alive = true;

    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setCommunityNotices([]);
      setCommunityNoticePostingPolicy("members");
      setCommunityNoticesLoading(false);
      return;
    }

    setCommunityNoticesLoading(true);

    (async () => {
      const res = await listCommunityNotices({ clan_id: clanId, limit: 3 }).catch(() => null);
      if (!alive) return;

      const rows = Array.isArray(res?.notices) ? res.notices : [];
      setCommunityNotices(rows);
      setCommunityNoticePostingPolicy(
        normalizeNoticePostingPolicy(
          firstTruthy(res?.posting_policy, selectedClan?.notice_posting_policy)
        )
      );
      setCommunityNoticesLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan]);

  const selectedClanName = getClanName(selectedClan);
  const selectedClanId = getClanId(selectedClan);
  const isCommunityNoticeOfficer = isCommunityOfficer(selectedClan, me);
  const activeNoticePostingPolicy = normalizeNoticePostingPolicy(
    firstTruthy(communityNoticePostingPolicy, selectedClan?.notice_posting_policy)
  );
  const canPostCommunityNotice = Boolean(
    selectedClanId &&
      (activeNoticePostingPolicy === "members" || isCommunityNoticeOfficer)
  );
  const canManageCommunityNoticeSettings = Boolean(
    selectedClanId && isCommunityNoticeOfficer
  );

  useEffect(() => {
    setWhatsappContactChoicesOpen(false);
  }, [selectedClanId]);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget(
        "dashboard",
        selectedClanId,
        "community-home.route.dashboard"
      ),
      joinRequests: routeTarget(
        "communityJoinRequests",
        selectedClanId,
        "community-home.route.join-requests"
      ),
      createCommunity: routeTarget(
        "clans",
        selectedClanId,
        "community-home.route.create-community"
      ),
      marketplace: routeTarget(
        "marketplace",
        selectedClanId,
        "community-home.route.marketplace"
      ),
      shop: routeTarget("shop", selectedClanId, "community-home.route.shop"),
      shopSpotlight: routeTarget(
        "shop",
        selectedClanId,
        "community-home.route.shop-spotlight",
        { hash: OWNER_SHOP_HASHES.freeSpotlight }
      ),
      shopOwnerShortcuts: routeTarget(
        "shop",
        selectedClanId,
        "community-home.route.shop-owner-shortcuts",
        { hash: "community-shop-control-owner-shortcuts" }
      ),
      shopGalleryTools: routeTarget(
        "shop",
        selectedClanId,
        "community-home.route.shop-gallery-tools",
        { hash: OWNER_SHOP_HASHES.diaries }
      ),
      merchantRelease: routeTarget(
        "shop",
        selectedClanId,
        "community-home.route.merchant-release",
        { hash: OWNER_SHOP_HASHES.merchantRelease }
      ),
      communityPackages: routeTarget(
        "shop",
        selectedClanId,
        "community-home.route.community-packages",
        { hash: OWNER_SHOP_HASHES.communityPackage }
      ),
      communityDomainPurchase: "/community-domain/purchase",
      freeSpotlight: routeTarget(
        "freeSpotlight",
        selectedClanId,
        "community-home.route.free-spotlight"
      ),
      subscriptionSpotlight: routeTarget(
        "subscriptionSpotlight",
        selectedClanId,
        "community-home.route.subscription-spotlight"
      ),
      paidRepost: routeTarget(
        "marketplace",
        selectedClanId,
        "community-home.route.paid-repost",
        { hash: PAID_REPOST_HASH }
      ),
      rosca: routeTarget(
        "marketplace",
        selectedClanId,
        "community-home.route.rosca",
        { hash: ROSCA_MARKETPLACE_HASH }
      ),
      vaultControl: routeTarget(
        "vaultControl",
        selectedClanId,
        "community-home.route.vault-control"
      ),
      buildFirstCircle: routeTarget(
        "buildFirstCircle",
        selectedClanId,
        "community-home.route.build-first-circle"
      ),
      finance: routeTarget(
        "finance",
        selectedClanId,
        "community-home.route.finance"
      ),
      loans: routeTarget("loans", selectedClanId, "community-home.route.loans"),
      trust: routeTarget("trust", selectedClanId, "community-home.route.trust"),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "community-home.route.notifications"
      ),
      profileSettings: APP_ROUTES.SETTINGS,
    }),
    [selectedClanId]
  );
  const memberGlobalId = firstTruthy(
    me?.gmfn_id,
    me?.global_member_id,
    me?.member_global_id,
    me?.member_id,
    me?.id
  );
  const currentUserId = useMemo(() => getCurrentUserId(me), [me]);
  const currentGmfnKey = useMemo(() => getCurrentGmfnKey(me), [me]);
  const communityNextActionIntro =
    "Tick what you want to do here, or write it in simple words. GSN will check the first required step and lead you from there.";
  const spotlightGuidanceSuspendedView = guidedActionFamilyFocus === "spotlight";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const guide = safeStr(params.get("guide")).toLowerCase();
    if (guide !== "spotlight") return;

    openGuidedSpotlightFamily();
    params.delete("guide");
    const remainingSearch = params.toString();

    navigate(
      {
        pathname: location.pathname,
        search: remainingSearch ? `?${remainingSearch}` : "",
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate, openGuidedSpotlightFamily]);

  const cumulativePoolBalance = getSummaryTotal(
    poolSummary,
    "membership_pool_balance",
    getSummaryTotal(poolSummary, "available_balance", "0.00")
  );
  const explicitMoneyPosition = getSummaryAny(poolSummary, [
    "net_position",
    "net_balance",
    "net_pool_position",
    "account_position",
    "money_position",
    "available_balance",
  ]);
  const visibleOwingTotal = getSummaryAny(
    poolSummary,
    [
      "amount_owed",
      "total_owed",
      "outstanding_balance",
      "active_loan_balance",
      "loan_balance",
      "borrowing_outstanding",
      "current_debt",
      "debt_balance",
    ],
    "0.00"
  );
  const netMoneyPosition =
    explicitMoneyPosition !== ""
      ? moneyNumber(explicitMoneyPosition)
      : moneyNumber(cumulativePoolBalance) - moneyNumber(visibleOwingTotal);
  const moneyPositionLabel = netMoneyPosition < 0 ? "Owing" : "Positive";
  const moneyPositionDetail =
    netMoneyPosition < 0
      ? `${formatGlobalAmount(Math.abs(netMoneyPosition))} visible obligation`
      : `${formatSignedGlobalAmount(netMoneyPosition)} net visible record`;
  const communityHomeOwnerName = resolveMemberName(me);
  const communityHomeNeedsDisplayName = !hasHumanMemberName(me);
  const communityCountFromSummary = Number(poolSummary?.communities_count || clans.length || 0);
  const combinedCommunityDomainCount =
    communityDomainCount === null ? communityDomainRows.length : communityDomainCount;
  const combinedCommunityListCount =
    communityCountFromSummary + combinedCommunityDomainCount;

  const sortedClans = useMemo(() => {
    return [...clans].sort((a, b) => getClanName(a).localeCompare(getClanName(b)));
  }, [clans]);

  const sortedCommunityDomainRows = useMemo(() => {
    return [...communityDomainRows].sort((a, b) => a.name.localeCompare(b.name));
  }, [communityDomainRows]);
  const selectedCommunityDomainRow = useMemo(() => {
    if (!selectedClanId) return null;
    return (
      sortedCommunityDomainRows.find(
        (row) => positiveNumber(row.clanId) === positiveNumber(selectedClanId)
      ) || null
    );
  }, [selectedClanId, sortedCommunityDomainRows]);
  const primaryCommunityDomainRow =
    selectedCommunityDomainRow || sortedCommunityDomainRows[0] || null;

  const communityNextActionItems = useMemo<NextActionGuideItem[]>(
    () => [
      {
        id: "choose-community",
        label: "Choose marketplace",
        detail: "Open your marketplace-community list and pick where you want to work.",
        technical: "Marketplace community list",
        keywords: ["community", "communities", "group", "select", "choose", "work"],
        tone: "primary",
      },
      {
        id: "marketplace",
        label: "Enter marketplace",
        detail: selectedClanId
          ? `Enter ${selectedClanName || "the selected marketplace community"} to work inside that marketplace.`
          : "Select a marketplace community first, then enter its marketplace.",
        technical: "Selected marketplace",
        keywords: ["marketplace", "market", "trade", "work", "open community"],
      },
      {
        id: "create-community",
        label: "Create marketplace",
        detail: "Start a marketplace community and build its first circle.",
        technical: "Create marketplace community",
        keywords: ["create", "new community", "start group", "founder"],
      },
      {
        id: "join-community",
        label: "Join marketplace",
        detail: "Enter an existing marketplace-community path or use an invite.",
        technical: "Join marketplace community",
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
        detail: selectedClanId
          ? "Open the owner-side controls for your one GSN shop in this community."
          : "Choose one community first, then open the shop controls tied to that community.",
        technical: "Shop control",
        keywords: ["shop", "seller", "gallery", "control", "products"],
      },
      {
        id: "community-packages",
        label: "Marketplace capacity",
        detail: selectedClanId
          ? "See the 15-member quota, extra member places, shop blocks, ROSCA, and meeting packs."
          : "Choose one marketplace first, then open its capacity tools.",
        technical: "Marketplace capacity",
        keywords: ["package", "capacity", "members", "15", "shop blocks", "rosca"],
      },
      {
        id: "spotlight",
        label: "Spotlight",
        detail:
          "Open the spotlight work area, then choose the exact spotlight path there.",
        technical: "Shop Control spotlight",
        keywords: ["spotlight", "picture", "video", "advert", "visibility"],
        tone: "primary",
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
        label: "Open Support",
        detail: selectedClanId
          ? `Open Support for ${selectedClanName || "the selected community"}.`
          : "Select a community first, then open its support path.",
        technical: "Support",
        keywords: ["loan", "borrow", "lend", "support", "guarantor"],
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

  const spotlightHandleItems = useMemo<NextActionGuideItem[]>(
    () => [
      {
        id: "spotlight-free",
        label: "Free spotlight",
        detail:
          "Make the normal community spotlight with upload, preview, and publish.",
        technical: "Free spotlight",
        keywords: ["free spotlight", "community spotlight", "normal spotlight"],
        tone: "primary",
      },
      {
        id: "spotlight-paid",
        label: "Subscription spotlight",
        detail:
          "Use the paid spotlight lane when you want subscription-based priority visibility.",
        technical: "Paid spotlight",
        keywords: ["paid spotlight", "subscription spotlight", "priority spotlight"],
      },
      {
        id: "spotlight-repost",
        label: "Paid Repost",
        detail:
          "Send one public shop block into another community's Spotlight lane.",
        technical: "Paid repost",
        keywords: ["paid repost", "repost", "outside spotlight", "target community"],
      },
      {
        id: "spotlight-vault",
        label: "Vault",
        detail:
          "Open private paid blocks under your owner shop and share them by link.",
        technical: "Vault",
        keywords: ["vault", "private offers", "private gallery"],
      },
      {
        id: "spotlight-shop-setup",
        label: "Shop setup",
        detail:
          "Prepare or complete the shop details first before spotlight or Vault work begins.",
        technical: "Shop setup",
        keywords: ["shop setup", "prepare shop", "shop details"],
      },
    ],
    []
  );

  async function resolveCurrentOwnerShop(gmfnId: string) {
    const params = {
      clan_id: selectedClanId,
      header_clan_id: selectedClanId,
    };
    const shopRes =
      (await getMyMarketplaceShop(params).catch(() => null)) ||
      (await getMarketplaceShopByGmfnId(gmfnId, params).catch(() => null));

    return (
      (Array.isArray((shopRes as any)?.items)
        ? (shopRes as any).items?.[0]
        : null) ||
      (shopRes as any)?.shop ||
      shopRes
    );
  }

  async function resolveCommunityNextAction(
    item: NextActionGuideItem
  ): Promise<NextActionGuideResolution | null> {
    switch (item.id) {
      case "choose-community":
        return {
          title: "Choose one community first",
          detail:
            "Open your community list and pick the one you want to work in right now. GSN will keep the next steps inside that same community.",
          firstStep: "Open the community list.",
          continueLabel: "Open community list",
          continueTone: "primary",
          payload: { nextStep: "choose-community" },
        };
      case "marketplace":
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before Marketplace",
            detail:
              "Marketplace belongs to one community at a time. First pick the community you want to work in, then GSN will open its Marketplace.",
            firstStep: "Choose the community you want to enter.",
            continueLabel: "Choose marketplace",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        return {
          title: `${selectedClanName || "This community"} is ready`,
          detail: `GSN will now open the Marketplace for ${selectedClanName || "the selected community"}.`,
          firstStep: "Enter the selected community Marketplace.",
          continueLabel: "Open Marketplace",
          continueTone: "primary",
        };
      case "create-community":
        return {
          title: "Start a new community",
          detail:
            "GSN will open the existing-member create lane so your same GSN ID starts a new community without repeating the full personal record.",
          firstStep: "Open the existing-member create path.",
          continueLabel: "Start community",
          continueTone: "primary",
        };
      case "join-community":
        return {
          title: "Enter an existing community",
          detail:
            "GSN will open the join lane so you can use the right invite or existing-community entry path.",
          firstStep: "Open the join-community lane.",
          continueLabel: "Open join path",
          continueTone: "primary",
        };
      case "circle":
        return {
          title: "Grow your trusted circle",
          detail:
            "GSN will open First Circle so you can prepare the people you already know in real life.",
          firstStep: "Open First Circle.",
          continueLabel: "Open First Circle",
          continueTone: "primary",
        };
      case "shop-control":
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before shop control",
            detail:
              "Your shop work must stay tied to one community. First choose the community you want to work in, then GSN will open its shop controls.",
            firstStep: "Choose the community for this shop work.",
            continueLabel: "Choose marketplace",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        return {
          title: "Shop control is ready",
          detail: `GSN will open the owner-side shop controls for ${selectedClanName || "the selected community"}.`,
          firstStep: "Open the shop control workspace.",
          continueLabel: "Open shop control",
          continueTone: "primary",
        };
      case "spotlight":
        return {
          title: "Choose the spotlight path",
          detail:
            "Free spotlight, subscription spotlight, Vault, and shop setup belong to the same visibility family. Choose the exact one you want next.",
          firstStep: "Choose the exact spotlight path.",
          continueLabel: "Choose spotlight path",
          continueTone: "soft",
        };
      case "spotlight-free": {
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before spotlight",
            detail:
              "Spotlight must belong to one community. First choose the community you want to publish into, then GSN will check the shop requirement for that one.",
            firstStep: "Choose the target community.",
            continueLabel: "Choose marketplace",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        const gmfnId = safeStr(memberGlobalId);
        if (!gmfnId) {
          return {
            title: "Your GSN ID is still loading",
            detail:
              "GSN needs your live member record before it can confirm the shop tied to spotlight. Wait a moment, then try again.",
            firstStep: "Wait for your GSN ID to load.",
            continueLabel: "Choose something else",
            continueTone: "soft",
            payload: { nextStep: "cancel" },
          };
        }

        return {
          title: "Free spotlight is ready",
          detail: `GSN will open the free spotlight publisher for ${selectedClanName || "the selected community"}. If your shop record is missing, GSN will create or confirm it before publishing.`,
          firstStep: "Open the free spotlight publisher.",
          continueLabel: "Open free spotlight",
          continueTone: "primary",
          payload: { nextStep: "open-free-publisher" },
        };
      }
      case "spotlight-paid": {
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before paid spotlight",
            detail:
              "Paid spotlight still belongs to one community. First choose the community, then GSN will open the paid spotlight lane for that one.",
            firstStep: "Choose the target community.",
            continueLabel: "Choose marketplace",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        const gmfnId = safeStr(memberGlobalId);
        if (!gmfnId) {
          return {
            title: "Your GSN ID is still loading",
            detail:
              "GSN needs your live member record before it can confirm the shop tied to paid spotlight. Wait a moment, then try again.",
            firstStep: "Wait for your GSN ID to load.",
            continueLabel: "Choose something else",
            continueTone: "soft",
            payload: { nextStep: "cancel" },
          };
        }

        const resolvedShop = await resolveCurrentOwnerShop(gmfnId);
        const shopId = Number((resolvedShop as any)?.id || 0);

        if (!shopId) {
          return {
            title: "Set up your shop before paid spotlight",
            detail: `Paid spotlight also comes from your shop in ${selectedClanName || "the selected community"}. First prepare the shop details, then GSN will lead you into the subscription spotlight lane.`,
            firstStep: "Open shop setup for this community.",
            continueLabel: "Open shop setup",
            continueTone: "primary",
            payload: { nextStep: "prepare-shop-first" },
          };
        }

        return {
          title: "Your shop is ready for subscription spotlight",
          detail: `GSN has confirmed the shop for ${selectedClanName || "the selected community"}. It can now open the paid spotlight lane and guide you through the subscription path.`,
          firstStep: "Open the paid spotlight lane.",
          continueLabel: "Open subscription spotlight",
          continueTone: "primary",
          payload: { nextStep: "open-paid-spotlight" },
        };
      }
      case "spotlight-repost": {
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before Repost",
            detail:
              "Repost starts from your shop, but GSN still needs the active community context before it can open the paid Repost composer.",
            firstStep: "Choose your active community.",
            continueLabel: "Choose marketplace",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        const gmfnId = safeStr(memberGlobalId);
        if (!gmfnId) {
          return {
            title: "Your GSN ID is still loading",
            detail:
              "GSN needs your live member record before it can find your public shop blocks for Repost. Wait a moment, then try again.",
            firstStep: "Wait for your GSN ID to load.",
            continueLabel: "Choose something else",
            continueTone: "soft",
            payload: { nextStep: "cancel" },
          };
        }

        const resolvedShop = await resolveCurrentOwnerShop(gmfnId);
        const shopId = Number((resolvedShop as any)?.id || 0);

        if (!shopId) {
          return {
            title: "Set up your shop before Repost",
            detail: `Repost moves one public shop block from your shop into another community Spotlight lane. First prepare your shop in ${selectedClanName || "this community"}.`,
            firstStep: "Open shop setup for this community.",
            continueLabel: "Open shop setup",
            continueTone: "primary",
            payload: { nextStep: "prepare-shop-first" },
          };
        }

        return {
          title: "Paid Repost is ready",
          detail:
            "Choose one public shop block, enter the target community ID, and GSN will keep that block identity intact while it uses the paid Spotlight rail.",
          firstStep: "Open the Repost composer.",
          continueLabel: "Open Paid Repost",
          continueTone: "primary",
          payload: { nextStep: "open-paid-repost" },
        };
      }
      case "spotlight-vault": {
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose your active community first",
            detail:
              "Vault belongs under your owner shop, but Community Home still needs an active community context before it can hand you into the private shop lane.",
            firstStep: "Choose the community context you are working from.",
            continueLabel: "Choose marketplace",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        const gmfnId = safeStr(memberGlobalId);
        if (!gmfnId) {
          return {
            title: "Your GSN ID is still loading",
            detail:
              "GSN needs your live member record before it can confirm the shop tied to Vault. Wait a moment, then try again.",
            firstStep: "Wait for your GSN ID to load.",
            continueLabel: "Choose something else",
            continueTone: "soft",
            payload: { nextStep: "cancel" },
          };
        }

        const resolvedShop = await resolveCurrentOwnerShop(gmfnId);
        const shopId = Number((resolvedShop as any)?.id || 0);

        if (!shopId) {
          return {
            title: "Set up your shop before Vault",
            detail:
              "Vault uses the same owner shop signboard as Shop Gallery. First prepare the public shop face, then GSN can open the private paid blocks.",
            firstStep: "Open shop setup for your owner shop.",
            continueLabel: "Open shop setup",
            continueTone: "primary",
            payload: { nextStep: "prepare-shop-first" },
          };
        }

        return {
          title: "Your shop is ready for Vault",
          detail:
            "GSN has confirmed your owner shop. It can now open Vault for private paid offers, expiring links, and controlled access.",
          firstStep: "Open the Vault lane.",
          continueLabel: "Open Vault",
          continueTone: "primary",
          payload: { nextStep: "open-vault" },
        };
      }
      case "spotlight-shop-setup":
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before shop setup",
            detail:
              "The shop must belong to one community. First choose the community, then GSN will open the shop setup lane for that one.",
            firstStep: "Choose the target community.",
            continueLabel: "Choose marketplace",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        return {
          title: "Prepare the shop first",
          detail: `GSN will open the shop setup lane for ${selectedClanName || "the selected community"} so you can complete the shop details before visibility work begins.`,
          firstStep: "Open shop setup.",
          continueLabel: "Open shop setup",
          continueTone: "primary",
          payload: { nextStep: "prepare-shop-first" },
        };
      case "finance":
        return {
          title: "Open your finance file",
          detail:
            "GSN will open your wider finance file so you can see the money record across communities.",
          firstStep: "Open Finance.",
          continueLabel: "Open Finance",
          continueTone: "primary",
        };
      case "support":
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before Support",
            detail:
              "Support belongs to one community at a time. First pick the community, then GSN will open that local support path.",
            firstStep: "Choose the community first.",
            continueLabel: "Choose marketplace",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        return {
          title: "Support is ready",
          detail: `GSN will open the support path for ${selectedClanName || "the selected community"}.`,
          firstStep: "Open Support.",
          continueLabel: "Open Support",
          continueTone: "primary",
        };
      case "trust":
        return {
          title: "Open your Trust Passport",
          detail:
            "GSN will open your wider trust record so you can review your trust story across communities.",
          firstStep: "Open Trust Passport.",
          continueLabel: "Open Trust Passport",
          continueTone: "primary",
        };
      case "notifications":
        return {
          title: "Open your notices",
          detail:
            "GSN will open the action queue so you can see what needs your attention next.",
          firstStep: "Open Notifications.",
          continueLabel: "Open notices",
          continueTone: "primary",
        };
      default:
        return null;
    }
  }

  useEffect(() => {
    activeCommunitySpotlightsRef.current = activeCommunitySpotlights;
  }, [activeCommunitySpotlights]);

  async function refreshActiveCommunitySpotlight(
    clanId: number,
    owner: { userId: number; gmfnKey: string }
  ) {
    if (!clanId || (!owner.userId && !owner.gmfnKey)) {
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

      const ownerRows = rows.filter((row: any) =>
        spotlightBelongsToCurrentUser(row, owner.userId, owner.gmfnKey)
      );
      const normalizedRows = ownerRows
        .map((row: any) => normalizeActiveCommunitySpotlight(row))
        .filter(Boolean) as ActiveCommunitySpotlight[];

      setActiveCommunitySpotlights(normalizedRows);
      setActiveCommunitySpotlightTotal(normalizedRows.length);
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
    const owner = { userId: currentUserId, gmfnKey: currentGmfnKey };

    if (!clanId || (!owner.userId && !owner.gmfnKey)) {
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
      await refreshActiveCommunitySpotlight(clanId, owner);
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
  }, [currentGmfnKey, currentUserId, selectedClan]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function openCommunityWhatsAppContact(event: React.SyntheticEvent<HTMLElement>) {
    consumeCommunityButtonEvent(event);
    const contact = firstTruthy(selectedClan?.official_whatsapp_number);
    const chatUrl = buildWhatsAppChatUrl(contact, communityContactMessage(selectedClan));

    if (!chatUrl || typeof window === "undefined") {
      showNotice(
        "error",
        "This community has not published an official WhatsApp contact yet."
      );
      return;
    }

    window.open(chatUrl, "_blank", "noopener,noreferrer");
    showNotice("success", "WhatsApp chat opened for this community contact.");
  }

  function openNoticeSenderWhatsApp(
    event: React.SyntheticEvent<HTMLElement>,
    noticeItem: CommunityNoticeItem
  ) {
    consumeCommunityButtonEvent(event);
    const contact = firstTruthy(noticeItem?.sender_whatsapp_number);
    const chatUrl = buildWhatsAppChatUrl(
      contact,
      `Hi ${firstTruthy(noticeItem?.sender_whatsapp_label, "there")}. I saw your GSN community announcement for ${selectedClanName}.`
    );

    if (!chatUrl || typeof window === "undefined") {
      showNotice(
        "error",
        "This announcement sender has not published a WhatsApp contact."
      );
      return;
    }

    window.open(chatUrl, "_blank", "noopener,noreferrer");
    showNotice("success", "WhatsApp opened for this announcement sender.");
  }

  function openCommunityCallContact(event: React.SyntheticEvent<HTMLElement>) {
    consumeCommunityButtonEvent(event);
    const contact = firstTruthy(selectedClan?.official_whatsapp_number);
    const callUrl = buildPhoneCallUrl(contact);

    if (!callUrl || typeof window === "undefined") {
      showNotice(
        "error",
        "This community has not published an official call contact yet."
      );
      return;
    }

    window.location.href = callUrl;
    showNotice("success", "Call path opened for this community contact.");
  }

  async function submitCommunityNotice(
    body: string,
    options?: {
      expiry_policy?: "standard" | "urgent" | "event" | "pinned";
      expires_at?: string;
    }
  ) {
    const clanId = getClanId(selectedClan);
    if (!clanId) {
      showNotice("error", "Choose a community before posting an official notice.");
      return;
    }

    setNoticePosting(true);
    try {
      await createCommunityNotice({ clan_id: clanId, body, ...options });
      const res = await listCommunityNotices({ clan_id: clanId, limit: 3 }).catch(() => null);
      const rows = Array.isArray(res?.notices) ? res.notices : [];
      setCommunityNotices(rows);
      setNoticeModalOpen(false);
      showNotice("success", "Community announcement posted.");
    } catch (error: any) {
      showNotice(
        "error",
        error?.message || "This notice could not be posted. Check posting permission and length."
      );
    } finally {
      setNoticePosting(false);
    }
  }

  async function updateCommunityNoticePolicy(
    event: React.SyntheticEvent<HTMLElement>,
    postingPolicy: "members" | "admins"
  ) {
    consumeCommunityButtonEvent(event);
    const clanId = getClanId(selectedClan);

    if (!clanId || !canManageCommunityNoticeSettings) {
      showNotice(
        "error",
        "Only a community officer can change who may post announcements."
      );
      return;
    }
    if (communityNoticeSettingsSaving) {
      showNotice("success", "Saving this notice board setting now.");
      return;
    }
    if (activeNoticePostingPolicy === postingPolicy) {
      showNotice(
        "success",
        postingPolicy === "members"
          ? "Notice board is already open to active members."
          : "Notice board is already admin-only."
      );
      return;
    }

    setCommunityNoticeSettingsSaving(true);
    try {
      const res = await updateCommunityNoticeSettings(clanId, {
        posting_policy: postingPolicy,
      });
      const nextPolicy = normalizeNoticePostingPolicy(res?.posting_policy);
      setCommunityNoticePostingPolicy(nextPolicy);
      showNotice(
        "success",
        nextPolicy === "members"
          ? "Notice board is open to active members."
          : "Notice board is admin-only now."
      );
    } catch (error: any) {
      showNotice(
        "error",
        error?.message || "This notice board setting could not be saved."
      );
    } finally {
      setCommunityNoticeSettingsSaving(false);
    }
  }

  function toggleSection(key: CollapseKey) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function openActionLaneFromButton(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    key: CollapseKey
  ) {
    consumeCommunityButtonEvent(event);
    setGuidedActionFamilyFocus(null);
    setCollapsed((prev) => {
      const willOpen = prev[key];
      const next: CollapseState = {
        ...prev,
        communities: true,
        marketplaceTools: true,
        subscriptions: true,
        trustFinance: true,
      };
      next[key] = !willOpen;
      return next;
    });
    revealCommunityTarget(["community-home-action-lanes", "community-home-community-list"]);
  }

  function toggleSectionFromButton(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    key: CollapseKey
  ) {
    consumeCommunityButtonEvent(event);
    toggleSection(key);
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
    expandKey?: CollapseKey,
    clearGuidedFocus = false
  ) {
    consumeCommunityButtonEvent(event);

    if (clearGuidedFocus) {
      setGuidedActionFamilyFocus(null);
    }

    if (expandKey) {
      setCollapsed((prev) => {
        if (!COMMUNITY_HOME_ACTION_LANES.includes(expandKey)) {
          return { ...prev, [expandKey]: false };
        }

        return {
          ...prev,
          communities: expandKey === "communities" ? false : true,
          marketplaceTools: expandKey === "marketplaceTools" ? false : true,
          subscriptions: expandKey === "subscriptions" ? false : true,
          trustFinance: expandKey === "trustFinance" ? false : true,
        };
      });
    }
    revealCommunityTarget([targetId]);
  }

  function openCommunityShopControl(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    targetId = ""
  ) {
    consumeCommunityButtonEvent(event);
    if (!selectedClanId) {
      showNotice("error", "Choose a community first, then open Shop Control.");
      openCommunityHomeSection(
        undefined,
        "community-home-community-list",
        "communities",
        true
      );
      return;
    }
    const hash =
      targetId === "community-shop-control-owner-shortcuts"
        ? routes.shopOwnerShortcuts
        : targetId === "shop-control-spotlight"
        ? routes.shopSpotlight
        : routes.shop;
    navigateWithOrigin(navigate, hash, location);
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
        navigateWithOrigin(
          navigate,
          routeTarget(
            "marketplace",
            clanId,
            "community-home.select-community.marketplace"
          ),
          location
        );
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
    event?.preventDefault();
    event?.stopPropagation();
  }

  function openCommunityRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeCommunityButtonEvent(event);
    navigateWithOrigin(navigate, to, location);
  }

  function openSelectedCommunityRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string,
    fallbackMessage = "Choose a community first, then open this tool."
  ) {
    consumeCommunityButtonEvent(event);
    if (!selectedClanId) {
      showNotice("error", fallbackMessage);
      openCommunityHomeSection(
        undefined,
        "community-home-community-list",
        "communities",
        true
      );
      return;
    }
    navigateWithOrigin(navigate, to, location);
  }

  async function openCommunityDomainDestination(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    row: CommunityDomainListRow,
    to: string
  ) {
    consumeCommunityButtonEvent(event);
    if (row.clanId) {
      setChangingClanId(row.clanId);
      try {
        await selectClan(row.clanId);
      } catch {
        // The route carries community context too, so a temporary select failure
        // should not trap the owner away from the requested domain area.
      } finally {
        setChangingClanId(0);
      }
    }
    navigateWithOrigin(navigate, to, location);
  }

  async function openCommunityDomainMarketplace(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    row: CommunityDomainListRow
  ) {
    consumeCommunityButtonEvent(event);

    if (!row.marketplaceReady) {
      navigateWithOrigin(navigate, row.dashboardPath, location);
      return;
    }

    if (!row.clanId) {
      showNotice(
        "error",
        "This Community Domain is active, but its marketplace community is not linked yet."
      );
      navigateWithOrigin(navigate, row.dashboardPath, location);
      return;
    }

    setChangingClanId(row.clanId);
    try {
      await selectClan(row.clanId);
      navigateWithOrigin(navigate, row.marketplacePath, location);
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) ||
          "This Community Domain marketplace could not be selected right now."
      );
    } finally {
      setChangingClanId(0);
    }
  }

  function handleCommunityNextAction(
    item: NextActionGuideItem,
    event?: React.SyntheticEvent<HTMLElement>,
    resolution?: NextActionGuideResolution | null
  ) {
    const nextStep = safeStr(resolution?.payload?.nextStep || "");

    switch (item.id) {
      case "choose-community":
        openCommunityHomeSection(event, "community-home-community-list", "communities");
        break;
      case "marketplace":
        if (nextStep === "choose-community") {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities",
            true
          );
          break;
        }
        void openSelectedMarketplace(event);
        break;
      case "create-community":
        openCommunityRoute(event, routes.createCommunity);
        break;
      case "join-community":
        openCommunityRoute(event, "/join");
        break;
      case "circle":
        showNotice("success", "Opening First Circle now.");
        openCommunityRoute(event, routes.buildFirstCircle);
        break;
      case "shop-control":
        if (nextStep === "choose-community") {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities",
            true
          );
          break;
        }
        openCommunityShopControl(event);
        break;
      case "community-packages":
        if (!selectedClanId) {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities",
            true
          );
          break;
        }
        openSelectedCommunityRoute(
          event,
          routes.communityPackages,
          "Choose a marketplace first, then open marketplace capacity."
        );
        break;
      case "spotlight":
        openGuidedSpotlightFamily(event);
        break;
      case "spotlight-free":
        if (nextStep === "cancel") {
          consumeCommunityButtonEvent(event);
          break;
        }
        if (nextStep === "choose-community") {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities",
            true
          );
          break;
        }
        if (nextStep === "open-free-publisher") {
          openSelectedCommunityRoute(
            event,
            routes.freeSpotlight,
            "Choose a community first, then open Free Spotlight."
          );
          break;
        }
        openCommunityHomeSection(
          event,
          "community-home-spotlight-gears",
          "marketplaceTools",
          true
        );
        break;
      case "spotlight-paid":
        if (nextStep === "cancel") {
          consumeCommunityButtonEvent(event);
          break;
        }
        if (nextStep === "choose-community") {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities"
          );
          break;
        }
        if (nextStep === "prepare-shop-first") {
          openSelectedCommunityRoute(
            event,
            routes.shopSpotlight,
            "Choose a community first, then prepare your shop spotlight."
          );
          break;
        }
        openSelectedCommunityRoute(
          event,
          routes.subscriptionSpotlight,
          "Choose a community first, then open Subscription Spotlight."
        );
        break;
      case "spotlight-repost":
        if (nextStep === "cancel") {
          consumeCommunityButtonEvent(event);
          break;
        }
        if (nextStep === "choose-community") {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities"
          );
          break;
        }
        if (nextStep === "prepare-shop-first") {
          openSelectedCommunityRoute(
            event,
            routes.shopSpotlight,
            "Choose a community first, then prepare your shop spotlight."
          );
          break;
        }
        openSelectedCommunityRoute(
          event,
          routes.paidRepost,
          "Choose a community first, then open Paid Repost."
        );
        break;
      case "spotlight-vault":
        if (nextStep === "cancel") {
          consumeCommunityButtonEvent(event);
          break;
        }
        if (nextStep === "choose-community") {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities"
          );
          break;
        }
        if (nextStep === "prepare-shop-first") {
          openSelectedCommunityRoute(
            event,
            routes.shopSpotlight,
            "Choose a community first, then prepare your shop."
          );
          break;
        }
        openSelectedCommunityRoute(
          event,
          routes.vaultControl,
          "Choose a community first, then open Vault."
        );
        break;
      case "spotlight-shop-setup":
        if (nextStep === "choose-community") {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities"
          );
          break;
        }
        openSelectedCommunityRoute(
          event,
          routes.shopSpotlight,
          "Choose a community first, then open Shop Control."
        );
        break;
      case "finance":
        openCommunityRoute(event, routes.finance);
        break;
      case "support":
        if (nextStep === "choose-community") {
          openCommunityHomeSection(
            event,
            "community-home-community-list",
            "communities"
          );
          break;
        }
        openSelectedCommunityRoute(
          event,
          routes.loans,
          "Choose a community first, then open Support."
        );
        break;
      case "trust":
        openCommunityRoute(event, routes.trust);
        break;
      case "notifications":
        openCommunityRoute(event, routes.notifications);
        break;
      default:
        consumeCommunityButtonEvent(event);
        break;
    }
  }

  function openCommunityNextAction(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    actionId: string
  ) {
    const item = communityNextActionItems.find((candidate) => candidate.id === actionId);
    if (!item) {
      consumeCommunityButtonEvent(event);
      return;
    }

    handleCommunityNextAction(item, event);
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
      navigateWithOrigin(
        navigate,
        routes.marketplace,
        location
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Selected community could not be opened."
      );
    } finally {
      setChangingClanId(0);
    }
  }

  async function handleSpotlightHandle(
    item: NextActionGuideItem,
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeCommunityButtonEvent(event);

    const resolution = await resolveCommunityNextAction(item).catch((error: any) => {
      showNotice(
        "error",
        safeStr(error?.message) ||
          "GSN could not check that spotlight step just now."
      );
      return null;
    });

    if (!resolution) return;

    handleCommunityNextAction(item, event, resolution);
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
            subtitle="Loading your marketplace communities..."
            homeTo={routes.dashboard}
            homeLabel="Dashboard"
            backTo={routes.dashboard}
          />

          <section style={communityBlockCard("quiet")}>
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              Loading your marketplace communities...
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
            subtitle="Choose the marketplace community you want to open."
            homeTo={routes.dashboard}
            homeLabel="Dashboard"
            backTo={routes.dashboard}
          />

          <DomainIntroToggle
            title="About Community Home"
            body="Create or join first. Then choose the group you want to open."
            bullets={[
              "Create or join a marketplace community first.",
              "Open one group at a time.",
              "Marketplace and local activity stay inside that group.",
            ]}
            note="Simple rule: choose the group first, then work inside it."
            tone="dark"
          />

          <NextActionGuide
            storageKey="gmfn.communityHome.nextActionGuide.v1"
            compact={isCompact}
            items={communityNextActionItems}
            resolveSelection={resolveCommunityNextAction}
            onSelect={handleCommunityNextAction}
            intro={communityNextActionIntro}
          />

          <section style={communityBlockCard("blue")}>
            <div style={sectionLabel()}>No marketplace communities yet</div>

            <div
              style={{
                marginTop: 12,
                color: "#07172C",
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.15,
                maxWidth: 760,
              }}
            >
              You do not have any visible marketplace communities in Community Home yet.
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.45,
                maxWidth: 680,
              }}
            >
              Create or join first. Your marketplace communities will appear here.
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <StableButton
                type="button"
                debugId="community-home.empty.create-community"
                onClick={(event) => openCommunityRoute(event, routes.createCommunity)}
                style={communityActionStyle("primary")}
              >
                Create marketplace community
              </StableButton>
              <StableButton
                type="button"
                debugId="community-home.empty.purchase-community-domain"
                onClick={(event) =>
                  openCommunityRoute(event, routes.communityDomainPurchase)
                }
                style={communityActionStyle("secondary")}
              >
                Purchase Community Domain
              </StableButton>
              <StableButton
                type="button"
                debugId="community-home.empty.build-first-circle"
                onClick={(event) =>
                  openCommunityRoute(event, routes.buildFirstCircle)
                }
                style={communityActionStyle("secondary")}
              >
                Build Your First Circle
              </StableButton>
              <StableButton
                type="button"
                debugId="community-home.empty.dashboard"
                onClick={(event) => openCommunityRoute(event, routes.dashboard)}
                style={communityActionStyle("secondary")}
              >
                Dashboard
              </StableButton>
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
      <CommunityNoticeModal
        open={noticeModalOpen}
        communityName={selectedClanName}
        busy={noticePosting}
        postingPolicy={activeNoticePostingPolicy}
        onClose={() => setNoticeModalOpen(false)}
        onSubmit={submitCommunityNotice}
      />
      <div style={communityContentStyle(isCompact)}>
      {!spotlightGuidanceSuspendedView ? (
      <section style={{ ...communityHeroStyle(isCompact), order: 8 }}>
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
                <div style={{ ...sectionLabel(), color: "#BFD0E2" }}>
                  GSN Community Home
                </div>
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
                {communityHomeNeedsDisplayName ? (
                  <StableButton
                    type="button"
                    debugId="community-home.identity.add-display-name.compact"
                    onClick={(event) => openCommunityRoute(event, routes.profileSettings)}
                    style={identityNamePromptStyle(true)}
                  >
                    Add display name
                  </StableButton>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            {!isCompact ? (
              <>
                <div style={{ ...sectionLabel(), color: "#BFD0E2" }}>
                  GSN Community Home
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 30,
                    fontWeight: 900,
                    lineHeight: 1.08,
                    letterSpacing: 0,
                  }}
                >
                  {communityHomeOwnerName}
                </div>
                {communityHomeNeedsDisplayName ? (
                  <StableButton
                    type="button"
                    debugId="community-home.identity.add-display-name"
                    onClick={(event) => openCommunityRoute(event, routes.profileSettings)}
                    style={identityNamePromptStyle(false)}
                  >
                    Add display name
                  </StableButton>
                ) : null}
              </>
            ) : null}

            <div
              style={{
                marginTop: isCompact ? 6 : 12,
                color: "#D4E1EE",
                fontSize: isCompact ? 11.5 : 14,
                lineHeight: isCompact ? 1.45 : 1.75,
                maxWidth: 880,
              }}
            >
              Choose your active community and move into its marketplace, tools,
              and trust records.
            </div>

            <div
              style={{
                marginTop: isCompact ? 10 : 16,
                ...innerCard(
                  "linear-gradient(180deg, rgba(9,31,51,0.96) 0%, rgba(6,24,39,0.98) 100%)"
                ),
                padding: isCompact ? 11 : 16,
                border: "1px solid rgba(226,192,106,0.26)",
                boxShadow:
                  "0 18px 34px rgba(2,12,27,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ ...sectionLabel(), color: "#E0B95D" }}>
                    Your GSN Trust Passport
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      color: "#F8FBFF",
                      fontSize: isCompact ? 17 : 20,
                      fontWeight: 950,
                      lineHeight: 1.18,
                    }}
                  >
                    Marketplace Communities / Community Domains
                  </div>
                </div>
                <span
                  style={{
                    ...badge(true),
                    background: "rgba(255,255,255,0.10)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(226,192,106,0.24)",
                  }}
              >
                Live overview
              </span>
            </div>

              <div style={{ marginTop: isCompact ? 10 : 14, display: "grid", gap: 9 }}>
                <StableButton
                  type="button"
                  debugId="community-home.summary.visible-communities"
                  aria-expanded={!collapsed.communities}
                  aria-controls="community-home-communities-panel"
                  onClick={(event) =>
                    openCommunityHomeSection(
                      event,
                      "community-home-community-list",
                      "communities",
                      true
                    )
                  }
                  style={communityToolRowStyle()}
                >
                  <span style={communityActionIcon(true)}>
                    {communityIconGlyph("community", 34)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        ...brandClampLines(1),
                        color: "#07172C",
                        fontSize: isCompact ? 14.5 : 16,
                        fontWeight: 950,
                        lineHeight: 1.2,
                      }}
                    >
                      {combinedCommunityListCount} marketplace{" "}
                      {combinedCommunityListCount === 1 ? "community/domain" : "communities/domains"}
                    </span>
                    <span
                      style={{
                        ...brandClampLines(2),
                        marginTop: 4,
                        color: "#617085",
                        fontSize: isCompact ? 12 : 13,
                        fontWeight: 720,
                        lineHeight: 1.35,
                      }}
                    >
                      Marketplace communities and Community Domains together. Setup and governance stay here; active work opens in Marketplace.
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ color: "#0B2D4A", fontSize: 24 }}>
                    {">"}
                  </span>
                </StableButton>

                <StableButton
                  type="button"
                  debugId="community-home.finance-summary.open"
                  onClick={(event) => openCommunityRoute(event, routes.finance)}
                  style={communityToolRowStyle()}
                >
                  <span style={communityActionIcon(false)}>
                    {communityIconGlyph("financeInstitution", 34)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        ...brandClampLines(1),
                        color: "#07172C",
                        fontSize: isCompact ? 14.5 : 16,
                        fontWeight: 950,
                        lineHeight: 1.2,
                      }}
                    >
                      Finance: {moneyPositionLabel}
                    </span>
                    <span
                      style={{
                        ...brandClampLines(2),
                        marginTop: 4,
                        color: "#617085",
                        fontSize: isCompact ? 12 : 13,
                        fontWeight: 720,
                        lineHeight: 1.35,
                      }}
                    >
                      {moneyPositionDetail}. Open Finance for pool and support detail.
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ color: "#0B2D4A", fontSize: 24 }}>
                    {">"}
                  </span>
                </StableButton>
              </div>

              <StableButton
                type="button"
                debugId="community-home.trust-summary.open"
                onClick={(event) => openCommunityRoute(event, routes.trust)}
                style={{
                  ...communityToolRowStyle(),
                  marginTop: isCompact ? 10 : 14,
                  borderRadius: 18,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(237,245,255,0.94) 100%)",
                  border: "1px solid rgba(226,192,106,0.18)",
                  boxShadow:
                    "0 12px 22px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.92)",
                }}
              >
                <span
                  style={{
                    ...communityActionIcon(true),
                  }}
                >
                  {communityIconGlyph("shield", 34)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      ...brandClampLines(2),
                      color: "#07172C",
                      fontSize: isCompact ? 14.5 : 16,
                      fontWeight: 950,
                      lineHeight: 1.2,
                    }}
                  >
                    Trust summary
                  </span>
                  <span
                    style={{
                      ...brandClampLines(2),
                      marginTop: 4,
                      color: "#617085",
                      fontSize: isCompact ? 12 : 13,
                      fontWeight: 720,
                      lineHeight: 1.35,
                    }}
                  >
                    Trust strength across all communities.
                  </span>
                </span>
                <span aria-hidden="true" style={{ color: "#0B2D4A", fontSize: 24 }}>
                  {">"}
                </span>
              </StableButton>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {!spotlightGuidanceSuspendedView ? (
        <section
          style={{
            order: 2,
            display: "grid",
            gap: isCompact ? 14 : 18,
          }}
        >
          <div style={announcementBoardShellStyle()}>
            <div
              style={announcementBoardHeaderStyle(isCompact)}
              aria-label="Community announcements"
            >
              <div style={announcementBoardTitleRowStyle()}>
                <span style={announcementBoardIconStyle()} aria-hidden="true">
                  <GsnLegacyIcon name="megaphone" size={34} />
                </span>
                <span
                  style={{
                    color: "#FFFFFF",
                    fontSize: isCompact ? 20 : 24,
                    fontWeight: 950,
                    lineHeight: 1.08,
                    textTransform: "uppercase",
                  }}
                >
                  Community Bulletin
                </span>
              </div>
              <span style={announcementBoardPillStyle()}>
                Official announcements
              </span>
            </div>

            <div style={announcementComposerStyle(isCompact)}>
              <div style={announcementComposerPreviewStyle()} aria-hidden="true">
                <span style={{ ...brandClampLines(2), minWidth: 0 }}>
                  What's happening in the community?
                </span>
                <span
                  style={{
                    color: "#48657D",
                    fontSize: 13,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  0 / 50 words
                </span>
              </div>
              {canPostCommunityNotice ? (
                <StableButton
                  type="button"
                  debugId="community-home.notice.post"
                  onClick={(event) => {
                    consumeCommunityButtonEvent(event);
                    setNoticeModalOpen(true);
                  }}
                  style={{
                    ...communityActionStyle("primary"),
                    minHeight: 74,
                    borderRadius: 16,
                    width: "100%",
                    gap: 10,
                    textTransform: "uppercase",
                    fontSize: 15,
                    boxShadow:
                      "0 10px 20px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  <GsnLegacyIcon name="navigation" size={26} />
                  <span>Post Notice</span>
                </StableButton>
              ) : null}
            </div>

            {canManageCommunityNoticeSettings ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  padding: isCompact ? "0 16px 14px" : "0 28px 18px",
                  background: "#FFFFFF",
                }}
              >
                <StableButton
                  type="button"
                  debugId="community-home.notice.policy.members"
                  onClick={(event) => updateCommunityNoticePolicy(event, "members")}
                  aria-disabled={
                    communityNoticeSettingsSaving ||
                    activeNoticePostingPolicy === "members"
                      ? true
                      : undefined
                  }
                  style={communityActionStyle(
                    activeNoticePostingPolicy === "members" ? "primary" : "soft",
                    communityNoticeSettingsSaving
                  )}
                >
                  Open to members
                </StableButton>
                <StableButton
                  type="button"
                  debugId="community-home.notice.policy.admins"
                  onClick={(event) => updateCommunityNoticePolicy(event, "admins")}
                  aria-disabled={
                    communityNoticeSettingsSaving ||
                    activeNoticePostingPolicy === "admins"
                      ? true
                      : undefined
                  }
                  style={communityActionStyle(
                    activeNoticePostingPolicy === "admins" ? "primary" : "soft",
                    communityNoticeSettingsSaving
                  )}
                >
                  Admin only
                </StableButton>
                <span style={badge(false)}>50 words</span>
              </div>
            ) : null}

            <div style={announcementListPanelStyle(isCompact)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    color: "#07172C",
                    fontSize: 14,
                    fontWeight: 950,
                    textTransform: "uppercase",
                  }}
                >
                  Latest notices
                </span>
                <span
                  style={{
                    color: "#0B4F8A",
                    fontSize: 13,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                  aria-hidden="true"
                >
                  Newest first
                </span>
              </div>

              <div
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#FFFFFF",
                  border: "1px solid rgba(16,37,59,0.08)",
                }}
              >
                {communityNoticesLoading ? (
                  <div
                    style={{
                      ...announcementNoticeRowStyle(),
                      gridTemplateColumns: "1fr",
                      color: "#617085",
                      fontWeight: 850,
                    }}
                  >
                    Loading latest notices...
                  </div>
                ) : communityNotices.length > 0 ? (
                  communityNotices.slice(0, 4).map((item, index) => {
                    const title = wordLimit(
                      firstTruthy(item?.title, item?.body, item?.purpose, "Community notice"),
                      50
                    );
                    const when = compactDateLabel(
                      firstTruthy(item?.scheduled_at, item?.created_at)
                    );
                    const expiry = noticeExpiryLabel(item);
                    const senderLabel = firstTruthy(
                      item?.sender_whatsapp_label,
                      item?.source,
                      "Community"
                    );
                    const noticeIcons: GsnIconName[] = [
                      "calendar",
                      "home",
                      "certificate",
                      "megaphone",
                    ];

                    return (
                      <div
                        key={`${item?.notice_id || item?.meeting_id || index}`}
                        style={announcementNoticeRowStyle()}
                      >
                        <span style={announcementNoticeIconStyle(index)} aria-hidden="true">
                          <GsnLegacyIcon name={noticeIcons[index % noticeIcons.length]} size={30} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              ...brandClampLines(2),
                              color: "#07172C",
                              fontSize: 15,
                              fontWeight: 930,
                              lineHeight: 1.25,
                            }}
                          >
                            {title}
                          </span>
                          <span
                            style={{
                              ...brandClampLines(1),
                              marginTop: 4,
                              color: "#617085",
                              fontSize: 12.5,
                              fontWeight: 780,
                            }}
                          >
                            Posted by {senderLabel}
                            {when ? ` - ${when}` : ""}
                            {expiry ? ` - ${expiry}` : ""}
                          </span>
                        </span>
                        {item?.sender_whatsapp_number ? (
                          <StableButton
                            type="button"
                            aria-label={`Message ${senderLabel}`}
                            debugId={`community-home.notice.sender-whatsapp.${item?.notice_id || index}`}
                            onClick={(event) => openNoticeSenderWhatsApp(event, item)}
                            style={{
                              ...communityActionStyle("soft"),
                              minWidth: 44,
                              minHeight: 44,
                              width: 44,
                              height: 44,
                              padding: 0,
                              borderRadius: 14,
                              fontSize: 22,
                              color: "#48657D",
                              boxShadow: "none",
                            }}
                          >
                            {">"}
                          </StableButton>
                        ) : (
                          <span aria-hidden="true" style={{ color: "#48657D", fontSize: 24 }}>
                            {">"}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      ...announcementNoticeRowStyle(),
                      gridTemplateColumns: "1fr",
                      color: "#617085",
                      fontWeight: 850,
                    }}
                  >
                    No community announcement is visible yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={contactCommunityCardStyle()}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#DCFCE7",
                  flex: "0 0 auto",
                }}
                aria-hidden="true"
              >
                <GsnLegacyIcon name="phone" size={30} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    ...brandClampLines(1),
                    color: "#07172C",
                    fontSize: isCompact ? 18 : 21,
                    fontWeight: 950,
                    lineHeight: 1.12,
                    textTransform: "uppercase",
                  }}
                >
                  CONTACT COMMUNITY
                </span>
                <span
                  style={{
                    ...brandClampLines(2),
                    marginTop: 4,
                    color: "#617085",
                    fontSize: 13,
                    fontWeight: 760,
                    lineHeight: 1.35,
                  }}
                >
                  Connect directly with the official community contact.
                </span>
              </span>
              {selectedClan?.official_contact_ready ? (
                <span style={{ marginLeft: "auto", flex: "0 0 auto" }} aria-hidden="true">
                  <GsnLegacyIcon name="shield" size={26} />
                </span>
              ) : null}
            </div>

            <div style={contactCommunityBodyStyle(isCompact)}>
              <div style={contactIdentityStyle()}>
                <span style={contactAvatarStyle()} aria-hidden="true">
                  <GsnLegacyIcon name="user" size={58} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      ...brandClampLines(1),
                      color: "#617085",
                      fontSize: 13,
                      fontWeight: 850,
                    }}
                  >
                    Official Contact
                  </span>
                  <span
                    style={{
                      ...brandClampLines(1),
                      marginTop: 3,
                      color: "#07172C",
                      fontSize: isCompact ? 22 : 25,
                      fontWeight: 950,
                      lineHeight: 1.08,
                    }}
                  >
                    {firstTruthy(selectedClan?.official_whatsapp_label, "Community contact")}
                  </span>
                  <span
                    style={{
                      ...badge(false),
                      marginTop: 10,
                      justifyContent: "flex-start",
                      background: "#EAF3FF",
                    }}
                  >
                    Community Officer
                  </span>
                </span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <StableButton
                  type="button"
                  aria-expanded={whatsappContactChoicesOpen}
                  aria-controls="community-home-contact-whatsapp-actions"
                  debugId="community-home.contact.whatsapp-chat"
                  onClick={(event) => {
                    if (!whatsappContactChoicesOpen) {
                      consumeCommunityButtonEvent(event);
                      if (!firstTruthy(selectedClan?.official_whatsapp_number)) {
                        showNotice(
                          "error",
                          "This community has not published an official WhatsApp contact yet."
                        );
                        return;
                      }
                      setWhatsappContactChoicesOpen(true);
                      return;
                    }

                    openCommunityWhatsAppContact(event);
                    setWhatsappContactChoicesOpen(false);
                  }}
                  style={{
                    ...communityActionStyle(
                      firstTruthy(selectedClan?.official_whatsapp_number)
                        ? "primary"
                        : "secondary",
                      !firstTruthy(selectedClan?.official_whatsapp_number)
                    ),
                    width: "100%",
                    minHeight: 58,
                    borderRadius: 16,
                    background: firstTruthy(selectedClan?.official_whatsapp_number)
                      ? "linear-gradient(180deg, #18B66B 0%, #0E9855 100%)"
                      : undefined,
                    color: firstTruthy(selectedClan?.official_whatsapp_number)
                      ? "#FFFFFF"
                      : undefined,
                    fontSize: 16,
                    gap: 10,
                  }}
                >
                  <GsnLegacyIcon name="phone" size={27} />
                  {whatsappContactChoicesOpen ? "WhatsApp Chat" : "WhatsApp contact"}
                </StableButton>
                <div
                  id="community-home-contact-whatsapp-actions"
                  style={{
                    display: whatsappContactChoicesOpen ? "grid" : "none",
                    gap: 10,
                  }}
                >
                  <StableButton
                    type="button"
                    debugId="community-home.contact.whatsapp-call"
                    onClick={(event) => {
                      openCommunityCallContact(event);
                      setWhatsappContactChoicesOpen(false);
                    }}
                    style={{
                      ...communityActionStyle(
                        "secondary",
                        !firstTruthy(selectedClan?.official_whatsapp_number)
                      ),
                      width: "100%",
                      minHeight: 58,
                      borderRadius: 16,
                      color: firstTruthy(selectedClan?.official_whatsapp_number)
                        ? "#0E9855"
                        : undefined,
                      fontSize: 16,
                      gap: 10,
                    }}
                  >
                    <GsnLegacyIcon name="phone" size={27} />
                    WhatsApp Call
                  </StableButton>
                </div>
              </div>
            </div>

            <div style={contactVerifiedStripStyle(Boolean(selectedClan?.official_contact_ready))}>
              <GsnLegacyIcon name="shield" size={28} />
              <span>
                {selectedClan?.official_contact_ready
                  ? "Official contact verified by GSN"
                  : "Official contact not published yet"}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {!spotlightGuidanceSuspendedView ? (
        <section style={{ ...communityBlockCard("raised"), order: 10 }}>
          <div
            style={{
              display: "grid",
              gap: isCompact ? 10 : 12,
            }}
          >
            <div>
              <div
                style={{
                  color: "#07172C",
                  fontSize: isCompact ? 22 : 26,
                  fontWeight: 950,
                  lineHeight: 1.12,
                }}
              >
                What do you want to do next?
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: isCompact ? 6 : 12,
                alignItems: "stretch",
              }}
            >
              {[
                {
                  id: "communities",
                  lane: "communities",
                  icon: "community",
                  title: "Marketplaces",
                  primary: true,
                },
                {
                  id: "marketplace-tools",
                  lane: "marketplaceTools",
                  icon: "shop",
                  title: "Marketplace & Tools",
                },
                {
                  id: "subscriptions",
                  lane: "subscriptions",
                  icon: "financeInstitution",
                  title: "Subscriptions",
                },
                {
                  id: "trust-finance",
                  lane: "trustFinance",
                  icon: "shield",
                  title: "Trust & Finance",
                },
              ].map((item) => (
                <StableButton
                  key={item.id}
                  type="button"
                  debugId={`community-home.next-action.${item.id}`}
                  aria-expanded={!collapsed[item.lane as CollapseKey]}
                  aria-controls="community-home-action-lanes"
                  onClick={(event) =>
                    openActionLaneFromButton(event, item.lane as CollapseKey)
                  }
                  style={{
                    ...communityQuickActionButton(
                      Boolean(item.primary) || !collapsed[item.lane as CollapseKey],
                      isCompact
                    ),
                  }}
                >
                  <span
                    style={communityQuickActionIcon(
                      Boolean(item.primary),
                      isCompact
                    )}
                  >
                    {communityIconGlyph(item.icon as CommunityIconMark, isCompact ? 16 : 22)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        ...brandClampLines(2),
                        fontSize: isCompact ? 10.5 : 14,
                        fontWeight: 940,
                        lineHeight: isCompact ? 1.05 : 1.15,
                        whiteSpace: "normal",
                        wordBreak: "normal",
                      }}
                    >
                      {item.title}
                    </span>
                  </span>
                </StableButton>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {spotlightGuidanceSuspendedView ? (
        <section
          id="community-home-spotlight-guided-lane"
          style={{ ...communityBlockCard("gold"), order: 18 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div style={sectionLabel()}>What do you want to do next?</div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: isCompact ? "stretch" : "flex-end",
              }}
            >
              <StableButton
                type="button"
                debugId="community-home.spotlight-guided.collapse"
                onClick={() => {
                  setGuidedActionFamilyFocus(null);
                }}
                style={collapseHeaderButton(isCompact)}
              >
                Collapse
              </StableButton>
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              color: "#F8FBFF",
              fontSize: isCompact ? 24 : 28,
              fontWeight: 900,
              lineHeight: 1.15,
              maxWidth: 760,
            }}
          >
            Spotlight
          </div>
          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: isCompact ? 14 : 15,
              lineHeight: 1.45,
              maxWidth: 680,
            }}
          >
            Choose one spotlight path. GSN will check your shop first and guide
            the next step.
          </div>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(true)}>Only spotlight is active here</span>
            <span style={badge(false)}>Back restores Community Home</span>
          </div>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {spotlightHandleItems.map((item) => (
              <StableButton
                key={item.id}
                type="button"
                debugId={`community-home.spotlight-guided.${item.id}`}
                onClick={(event) => {
                  void handleSpotlightHandle(item, event);
                }}
                style={{
                  ...communityActionStyle(item.tone || "secondary"),
                  minHeight: isCompact ? 76 : 86,
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  gap: 6,
                  padding: isCompact ? "12px 14px" : "14px 16px",
                }}
              >
                <span
                  style={{
                    ...brandClampLines(2),
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1.18,
                    color: item.tone === "primary" ? "#F8FBFF" : "#102A43",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    ...brandClampLines(2),
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    fontWeight: 760,
                    color:
                      item.tone === "primary"
                        ? "rgba(248,251,255,0.84)"
                        : "#52677C",
                  }}
                >
                  {item.detail}
                </span>
              </StableButton>
            ))}
          </div>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <StableButton
              type="button"
              debugId="community-home.spotlight-guided.back"
              onClick={() => {
                setGuidedActionFamilyFocus(null);
              }}
              style={communityActionStyle("secondary")}
            >
              Back to Community Home
            </StableButton>
          </div>
        </section>
      ) : null}

      {!spotlightGuidanceSuspendedView ? (
      <>
      {!collapsed.communities ||
      !collapsed.marketplaceTools ||
      !collapsed.subscriptions ||
      !collapsed.trustFinance ? (
        <section
          id="community-home-action-lanes"
          style={{
            ...communityBlockCard("raised"),
            order: 30,
            marginTop: isCompact ? 16 : undefined,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {!collapsed.communities ? (
              <div>
                <div style={sectionLabel()}>Marketplace communities</div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gap: 0,
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid rgba(16,37,59,0.08)",
                  }}
                >
                  {[
                    {
                      icon: "community",
                      id: "choose-community",
                      title: "Choose marketplace",
                      detail: "Pick the marketplace community you want to work inside now.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "choose-community"),
                    },
                    {
                      icon: "home",
                      id: "create-community",
                      title: "Create marketplace",
                      detail: "Start a marketplace community under your same GSN ID.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "create-community"),
                    },
                    {
                      icon: "financeInstitution",
                      id: "create-community-domain",
                      title: "Create Community Domain",
                      detail:
                        "Start the paid institutional domain path for a school, church, union, market, or association.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityRoute(event, routes.communityDomainPurchase),
                    },
                    {
                      icon: "join-person-plus",
                      id: "join-community",
                      title: "Join marketplace",
                      detail: "Use an invite or approval path for an existing marketplace community.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "join-community"),
                    },
                    {
                      icon: "shield",
                      id: "owner-actions",
                      title: "Owner approvals",
                      detail: "Review join requests and owner-side permissions.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openSelectedCommunityRoute(
                          event,
                          routes.joinRequests,
                          "Choose a community first, then review join requests."
                        ),
                    },
                    {
                      icon: "join-person-plus",
                      id: "trusted-circle",
                      title: "Grow trusted circle",
                      detail: "Invite trusted real-life people.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "circle"),
                    },
                  ].map((item, index) => (
                    <StableButton
                      key={item.id}
                      type="button"
                      debugId={`community-home.lane.communities.${item.id}`}
                      onClick={item.onClick}
                      style={{
                        ...communityToolRowStyle(),
                        borderRadius: 0,
                        border: "0",
                        borderTop:
                          index === 0 ? "0" : "1px solid rgba(16,37,59,0.08)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,251,255,0.98) 100%)",
                        boxShadow: "none",
                      }}
                    >
                      <span style={communityActionIcon(index === 0)}>
                        {communityIconGlyph(item.icon as CommunityIconMark, 24)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            ...brandClampLines(2),
                            color: "#07172C",
                            fontSize: isCompact ? 15 : 16,
                            fontWeight: 940,
                            lineHeight: 1.18,
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          style={{
                            ...brandClampLines(2),
                            marginTop: 4,
                            color: "#617085",
                            fontSize: isCompact ? 12.2 : 13,
                            fontWeight: 720,
                            lineHeight: 1.35,
                          }}
                        >
                          {item.detail}
                        </span>
                      </span>
                      <span aria-hidden="true" style={{ color: "#1E5D91", fontSize: 24 }}>
                        {">"}
                      </span>
                    </StableButton>
                  ))}
                </div>
              </div>
            ) : null}

            {!collapsed.marketplaceTools ? (
              <div>
                <div style={sectionLabel()}>Marketplace & Tools</div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gap: 0,
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid rgba(16,37,59,0.08)",
                  }}
                >
                  {[
                    {
                      icon: "shop",
                      id: "marketplace",
                      title: "Enter marketplace",
                      detail: "Open the selected community marketplace.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "marketplace"),
                    },
                    {
                      icon: COMMUNITY_OWNER_HANDLE_ICONS["shop-control"],
                      id: ownerShopHandle("shop-control").id,
                      title: ownerShopHandle("shop-control").label,
                      detail: ownerShopHandle("shop-control").detail,
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityShopControl(event),
                    },
                    {
                      icon: COMMUNITY_OWNER_HANDLE_ICONS["merchant-release"],
                      id: ownerShopHandle("merchant-release").id,
                      title: ownerShopHandle("merchant-release").label,
                      detail: ownerShopHandle("merchant-release").detail,
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openSelectedCommunityRoute(
                          event,
                          routes.merchantRelease,
                          "Choose a community first, then open the Merchant Release rail."
                        ),
                    },
                    {
                      icon: COMMUNITY_OWNER_HANDLE_ICONS["shop-gallery-tools"],
                      id: ownerShopHandle("shop-gallery-tools").id,
                      title: ownerShopHandle("shop-gallery-tools").label,
                      detail: ownerShopHandle("shop-gallery-tools").detail,
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openSelectedCommunityRoute(
                          event,
                          routes.shopGalleryTools,
                          "Choose a community first, then open Shop Gallery Tools."
                        ),
                    },
                    {
                      icon: COMMUNITY_OWNER_HANDLE_ICONS["free-spotlight"],
                      id: ownerShopHandle("free-spotlight").id,
                      title: ownerShopHandle("free-spotlight").label,
                      detail: ownerShopHandle("free-spotlight").detail,
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openSelectedCommunityRoute(
                          event,
                          routes.freeSpotlight,
                          "Choose a community first, then open Free Spotlight."
                        ),
                    },
                    {
                      icon: "repaymentSchedule",
                      id: "rosca",
                      title: "ROSCA",
                      detail: "Open contribution cycles for this community marketplace.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openSelectedCommunityRoute(
                          event,
                          routes.rosca,
                          "Choose a community first, then open ROSCA in Marketplace."
                        ),
                    },
                    {
                      icon: "megaphone",
                      id: "spotlight-status",
                      title: "Owner spotlight status",
                      detail:
                        activeCommunitySpotlightTotal > 0
                          ? "Your spotlight is live."
                          : "No owner spotlight live.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityHomeSection(
                          event,
                          "community-home-spotlight-gears",
                          "marketplaceTools"
                        ),
                    },
                  ].map((item, index) => (
                    <StableButton
                      key={item.id}
                      type="button"
                      debugId={`community-home.lane.marketplace-tools.${item.id}`}
                      onClick={item.onClick}
                      style={{
                        ...communityToolRowStyle(),
                        borderRadius: 0,
                        border: "0",
                        borderTop:
                          index === 0 ? "0" : "1px solid rgba(16,37,59,0.08)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,251,255,0.98) 100%)",
                        boxShadow: "none",
                      }}
                    >
                      <span style={communityActionIcon(index === 0)}>
                        {communityIconGlyph(item.icon as CommunityIconMark, 24)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            ...brandClampLines(2),
                            color: "#07172C",
                            fontSize: isCompact ? 15 : 16,
                            fontWeight: 940,
                            lineHeight: 1.18,
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          style={{
                            ...brandClampLines(2),
                            marginTop: 4,
                            color: "#617085",
                            fontSize: isCompact ? 12.2 : 13,
                            fontWeight: 720,
                            lineHeight: 1.35,
                          }}
                        >
                          {item.detail}
                        </span>
                      </span>
                      <span aria-hidden="true" style={{ color: "#1E5D91", fontSize: 24 }}>
                        {">"}
                      </span>
                    </StableButton>
                  ))}
                </div>
              </div>
            ) : null}

            {!collapsed.subscriptions ? (
              <div>
                <div style={sectionLabel()}>Payments, subscriptions and renewals</div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gap: 0,
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid rgba(16,37,59,0.08)",
                  }}
                >
                  {[
                    {
                      icon: COMMUNITY_OWNER_HANDLE_ICONS["vault-control"],
                      id: ownerShopHandle("vault-control").id,
                      title: "Vault subscription",
                      detail: "Private paid blocks, controlled links, and secure offers.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openSelectedCommunityRoute(
                          event,
                          routes.vaultControl,
                          "Choose a community first, then open Vault."
                        ),
                    },
                    {
                      icon: COMMUNITY_OWNER_HANDLE_ICONS["spotlight-subscription"],
                      id: ownerShopHandle("spotlight-subscription").id,
                      title: ownerShopHandle("spotlight-subscription").label,
                      detail: ownerShopHandle("spotlight-subscription").detail,
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openSelectedCommunityRoute(
                          event,
                          routes.subscriptionSpotlight,
                          "Choose a community first, then open Subscription Spotlight."
                        ),
                    },
                    {
                      icon: COMMUNITY_OWNER_HANDLE_ICONS["paid-repost"],
                      id: ownerShopHandle("paid-repost").id,
                      title: ownerShopHandle("paid-repost").label,
                      detail: ownerShopHandle("paid-repost").detail,
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openSelectedCommunityRoute(
                          event,
                          routes.paidRepost,
                          "Choose a community first, then open Paid Repost."
                        ),
                    },
                    {
                      icon: "financeInstitution",
                      id: "community-packages",
                      title: "Marketplace capacity",
                      detail: "Member places, shop blocks, ROSCA, meeting packs, and capacity upgrades.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "community-packages"),
                    },
                    {
                      icon: "finance-wallet-card",
                      id: "payments-renewals",
                      title: "Market Domain subscriptions",
                      detail: primaryCommunityDomainRow
                        ? `Open ${primaryCommunityDomainRow.name} subscription, renewal, and billing status.`
                        : "Create or select a Community Domain before opening domain subscriptions.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        primaryCommunityDomainRow
                          ? openCommunityDomainDestination(
                              event,
                              primaryCommunityDomainRow,
                              primaryCommunityDomainRow.billingPath
                            )
                          : openCommunityRoute(event, routes.communityDomainPurchase),
                    },
                  ].map((item, index) => (
                    <StableButton
                      key={item.id}
                      type="button"
                      debugId={`community-home.lane.subscriptions.${item.id}`}
                      onClick={item.onClick}
                      style={{
                        ...communityToolRowStyle(),
                        borderRadius: 0,
                        border: "0",
                        borderTop:
                          index === 0 ? "0" : "1px solid rgba(16,37,59,0.08)",
                        background:
                          item.id === "vault-control"
                            ? "linear-gradient(180deg, #FFFFFF 0%, #FFF9EA 100%)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,251,255,0.98) 100%)",
                        boxShadow:
                          item.id === "vault-control"
                            ? "inset 4px 0 0 rgba(201,154,39,0.70), 0 12px 24px rgba(120,84,18,0.08)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          ...communityActionIcon(item.id === "vault-control"),
                          color: item.id === "vault-control" ? "#0B2D4A" : "#135A94",
                        }}
                      >
                        {communityIconGlyph(item.icon as CommunityIconMark, 24)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            ...brandClampLines(2),
                            color: "#07172C",
                            fontSize: isCompact ? 15 : 16,
                            fontWeight: 940,
                            lineHeight: 1.18,
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          style={{
                            ...brandClampLines(2),
                            marginTop: 4,
                            color: "#617085",
                            fontSize: isCompact ? 12.2 : 13,
                            fontWeight: 720,
                            lineHeight: 1.35,
                          }}
                        >
                          {item.detail}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          color: item.id === "vault-control" ? "#8A6518" : "#1E5D91",
                          fontSize: 24,
                        }}
                      >
                        {">"}
                      </span>
                    </StableButton>
                  ))}
                </div>
              </div>
            ) : null}

            {!collapsed.trustFinance ? (
              <div>
                <div style={sectionLabel()}>Trust & Finance</div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gap: 0,
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid rgba(16,37,59,0.08)",
                  }}
                >
                  {[
                    {
                      icon: "financeInstitution",
                      id: "finance",
                      title: `Finance summary: ${moneyPositionLabel}`,
                      detail: `${moneyPositionDetail}. Review the wider money record across your communities.`,
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "finance"),
                    },
                    {
                      icon: "repaymentSchedule",
                      id: "support",
                      title: "Loan Support",
                      detail: "Open borrowing, support, and guarantor work for the selected community.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "support"),
                    },
                    {
                      icon: "shield",
                      id: "trust",
                      title: "Trust Passport",
                      detail: "Review trust strength across your GSN record.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "trust"),
                    },
                    {
                      icon: "evidence",
                      id: "notifications",
                      title: "Notices",
                      detail: "Open the action queue and see what needs attention.",
                      onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                        openCommunityNextAction(event, "notifications"),
                    },
                  ].map((item, index) => (
                    <StableButton
                      key={item.id}
                      type="button"
                      debugId={`community-home.lane.trust-finance.${item.id}`}
                      onClick={item.onClick}
                      style={{
                        ...communityToolRowStyle(),
                        borderRadius: 0,
                        border: "0",
                        borderTop:
                          index === 0 ? "0" : "1px solid rgba(16,37,59,0.08)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,251,255,0.98) 100%)",
                        boxShadow: "none",
                      }}
                    >
                      <span style={communityActionIcon(index === 0)}>
                        {communityIconGlyph(item.icon as CommunityIconMark, 24)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            ...brandClampLines(2),
                            color: "#07172C",
                            fontSize: isCompact ? 15 : 16,
                            fontWeight: 940,
                            lineHeight: 1.18,
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          style={{
                            ...brandClampLines(2),
                            marginTop: 4,
                            color: "#617085",
                            fontSize: isCompact ? 12.2 : 13,
                            fontWeight: 720,
                            lineHeight: 1.35,
                          }}
                        >
                          {item.detail}
                        </span>
                      </span>
                      <span aria-hidden="true" style={{ color: "#1E5D91", fontSize: 24 }}>
                        {">"}
                      </span>
                    </StableButton>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {!collapsed.marketplaceTools ? (
      <section
        id="community-home-spotlight-gears"
        style={{ ...communityBlockCard("summary"), order: 80 }}
      >
        <div>
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
              This shows only Your spotlight in this community. Other members' live spotlights still belong on public Dashboard and Public Shop surfaces, not your personal Community Home.
            </div>
          </div>

          <div style={collapseButtonRow()}>
            <StableButton
              type="button"
              debugId="community-home.spotlight-status.toggle"
              onClick={(event) => toggleSectionFromButton(event, "marketplaceTools")}
              style={collapseHeaderButton(isCompact)}
            >
              {collapsed.marketplaceTools
                ? "Open Marketplace & Tools"
                : "Collapse Marketplace & Tools"}
            </StableButton>
          </div>
        </div>

        {!collapsed.marketplaceTools ? (
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
              <div style={sectionLabel()}>Your spotlight in this community</div>
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
                  owner live / queued
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
                      alt="Your live community spotlight"
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
                      showAudioUnlock={Boolean(activeCommunitySpotlight.videoUrl)}
                      audioUnlockLabel="Sound on"
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
                          Live spotlight has no media yet.
                        </div>
                      }
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#07172C",
                      fontSize: 16,
                      fontWeight: 900,
                      lineHeight: 1.4,
                    }}
                  >
                    {activeCommunitySpotlight.title || "Your spotlight is live."}
                  </div>
                  {activeCommunitySpotlight.description ? (
                    <div
                      style={{
                        marginTop: 6,
                        color: "#526579",
                        fontSize: 13.5,
                        fontWeight: 760,
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: isCompact ? 3 : 2,
                        overflow: "hidden",
                      }}
                    >
                      {activeCommunitySpotlight.description}
                    </div>
                  ) : null}
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(4, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    <span style={badge(false)}>
                      {activeCommunitySpotlight.ownerName || "Owner shown by GSN"}
                    </span>
                    <span style={badge(false)}>
                      {activeCommunitySpotlight.communityName ||
                        selectedClanName ||
                        "Selected community"}
                    </span>
                    <span style={badge(true)}>
                      {spotlightPriceLine(
                        activeCommunitySpotlight.price,
                        activeCommunitySpotlight.currency
                      ) || "Price on request"}
                    </span>
                    <span style={badge(false)}>
                      {activeCommunitySpotlight.availability ||
                        activeCommunitySpotlight.category ||
                        "Availability shown by owner"}
                    </span>
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
                  Spotlight status could not be confirmed.
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
                  You have no spotlight live in this community right now.
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
              <div style={sectionLabel()}>Spotlight controls</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#07172C",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                Publish or replace spotlight from Shop Control
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                Open the spotlight lane to edit message, picture, video, or
                publishing.
              </div>
              <div style={{ marginTop: 14 }}>
                <StableButton
                  type="button"
                  debugId="community-home.spotlight-status.open-free"
                  onClick={(event) =>
                    openSelectedCommunityRoute(
                      event,
                      routes.freeSpotlight,
                      "Choose a community first, then open Free Spotlight."
                    )
                  }
                  style={communityActionStyle("primary")}
                >
                  Open Free Spotlight
                </StableButton>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      <section
        id="community-home-community-list"
        style={{
          ...communityBlockCard("raised"),
          order: 20,
          marginTop: isCompact ? 14 : undefined,
          position: "relative",
          zIndex: 30,
        }}
      >
        <StableButton
          type="button"
          debugId="community-home.communities.header-toggle"
          aria-expanded={!collapsed.communities}
          aria-controls="community-home-communities-panel"
          onClick={toggleCommunitiesSectionFromHeader}
          onKeyDown={handleCommunitiesHeaderKeyDown}
          style={{
            ...communityToolRowStyle(),
            borderRadius: 18,
            boxShadow: "none",
          }}
        >
          <span style={communityActionIcon(false)}>{communityIconGlyph("community", 22)}</span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                ...(isCompact ? brandClampLines(2) : brandSingleLine()),
                color: "#07172C",
                fontSize: isCompact ? 15 : 16,
                fontWeight: 940,
                lineHeight: 1.18,
              }}
            >
              Marketplace Communities / Community Domains
            </span>
            <span
              style={{
                ...(isCompact ? brandClampLines(2) : brandSingleLine()),
                marginTop: 4,
                color: "#617085",
                fontSize: isCompact ? 12.2 : 13,
                fontWeight: 720,
                lineHeight: 1.35,
              }}
            >
              {isCompact
                ? `${sortedClans.length} marketplace${
                    combinedCommunityDomainCount
                      ? ` / ${combinedCommunityDomainCount} ${
                          combinedCommunityDomainCount === 1 ? "domain" : "domains"
                        }`
                      : ""
                  }`
                : `${sortedClans.length} marketplace ${
                    sortedClans.length === 1 ? "community" : "communities"
                  }${
                    combinedCommunityDomainCount
                      ? ` / ${combinedCommunityDomainCount} community ${
                          combinedCommunityDomainCount === 1 ? "domain" : "domains"
                        }`
                      : ""
                  }`}
            </span>
          </span>
          <span aria-hidden="true" style={{ color: "#1E5D91", fontSize: 24 }}>
            {collapsed.communities ? ">" : "v"}
          </span>
        </StableButton>

        {!collapsed.communities ? (
          <div
            id="community-home-communities-panel"
            style={{ marginTop: isCompact ? 10 : 16, display: "grid", gap: 10 }}
          >
            {sortedClans.map((clan, index) => {
              const clanId = getClanId(clan);
              const active = clanId > 0 && clanId === getClanId(selectedClan);
              const working = clanId > 0 && clanId === changingClanId;

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
                        : "42px minmax(0, 1fr) auto",
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
                          color: "#07172C",
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
                        Marketplace workspace for this community
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        justifyContent: isCompact ? "stretch" : "flex-end",
                        gridColumn: isCompact ? "1 / -1" : "auto",
                        marginTop: isCompact ? 2 : 0,
                      }}
                    >
                      <StableButton
                        type="button"
                        debugId={`community-home.communities.${clan.id ?? clan.clan_id ?? clan.name ?? "unknown"}.open-marketplace`}
                        aria-disabled={working || undefined}
                        onClick={(event) => {
                          consumeCommunityButtonEvent(event);
                          if (working) {
                            showNotice("success", "Opening this community now.");
                            return;
                          }
                          void handleSelectCommunity(clan, true);
                        }}
                        style={{
                          ...communityActionStyle("primary", working),
                          width: isCompact ? "100%" : undefined,
                        }}
                      >
                        {working ? "Opening..." : "Open Marketplace"}
                      </StableButton>
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedCommunityDomainRows.map((row, index) => {
              const displayIndex = sortedClans.length + index + 1;

              return (
                <div
                  key={`domain-${row.key}`}
                  style={{
                    ...innerCard(
                      row.marketplaceReady
                        ? "linear-gradient(180deg, #FFFFFF 0%, #FFFDF7 58%, #F8EECF 100%)"
                        : "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 62%, #EFF7FF 100%)"
                    ),
                    border: row.marketplaceReady
                      ? "1px solid rgba(215,162,45,0.26)"
                      : "1px solid rgba(13,95,168,0.13)",
                    boxShadow: row.marketplaceReady
                      ? "0 14px 30px rgba(128,90,15,0.10), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -2px 0 rgba(8,40,72,0.04)"
                      : "0 12px 26px rgba(7,24,39,0.07), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -2px 0 rgba(8,40,72,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "42px minmax(0, 1fr) auto",
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
                          background: row.marketplaceReady
                            ? "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)"
                            : "#EEF6FF",
                          color: row.marketplaceReady ? "#FFFFFF" : "#0B1F33",
                          fontWeight: 950,
                          boxShadow: row.marketplaceReady
                            ? "0 8px 18px rgba(128,90,15,0.18)"
                            : "none",
                        }}
                      >
                        {displayIndex}
                      </div>
                    ) : null}

                    <div style={{ gridColumn: isCompact ? "1 / -1" : "auto" }}>
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 15 : 17,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {isCompact ? `${displayIndex}. ` : ""}
                        {row.name}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#5F7287",
                          fontSize: isCompact ? 12.5 : 14,
                          lineHeight: isCompact ? 1.45 : 1.75,
                        }}
                      >
                        Community Domain marketplace workspace.{" "}
                        {row.marketplaceReady
                          ? "Active work opens in Marketplace."
                          : "Finish setup, rules, and activation first."}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        <span style={badge(row.marketplaceReady)}>
                          {row.marketplaceReady ? "Marketplace ready" : "Setup needed"}
                        </span>
                        <span style={badge(Boolean(row.code))}>
                          {row.code}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 8,
                        justifyContent: isCompact ? "stretch" : "flex-end",
                        gridColumn: isCompact ? "1 / -1" : "auto",
                        marginTop: isCompact ? 2 : 0,
                      }}
                    >
                      <StableButton
                        type="button"
                        debugId={`community-home.domain.${row.id || row.key}.open`}
                        onClick={(event) => openCommunityDomainMarketplace(event, row)}
                        style={{
                          ...communityActionStyle(
                            row.marketplaceReady ? "primary" : "secondary"
                          ),
                          width: isCompact ? "100%" : undefined,
                        }}
                      >
                        {row.marketplaceReady ? "Open Marketplace" : "Open Setup"}
                      </StableButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
      </>
      ) : null}
      </div>
    </div>
  );
}
