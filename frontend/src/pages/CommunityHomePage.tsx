import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DomainIntroToggle from "../components/DomainIntroToggle";
import GSNBrandMark from "../components/GSNBrandMark";
import NextActionGuide, {
  type NextActionGuideItem,
  type NextActionGuideResolution,
} from "../components/NextActionGuide";
import PageTopNav from "../components/PageTopNav";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { navigateWithOrigin } from "../lib/nav";
import {
  createMarketplaceBroadcast,
  createMarketplaceShop,
  getMarketplaceBroadcasts,
  getMarketplaceShopByGmfnId,
  getMe,
  getMyGuarantorEarnings,
  getMyTrustSlip,
  getPoolMeSummary,
  getSelectedClanId,
  listMarketplaceRequests,
  listMyClans,
  safeCopy,
  selectClan,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
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
  SPOTLIGHT_MAX_IMAGE_BYTES,
  SPOTLIGHT_MAX_VIDEO_BYTES,
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_REFRESH_MS,
  SPOTLIGHT_PILOT_ROTATION_MS,
  SPOTLIGHT_PILOT_ROTATION_SECONDS_LABEL,
} from "../lib/spotlightPilot";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";
import {
  actionTapGuardProps,
  brandStableTapTarget,
  stopActionTap,
} from "../styles/gmfnBrand";

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
type SpotlightFeedbackTone = "success" | "error" | "info";
type SpotlightFeedbackState = {
  tone: SpotlightFeedbackTone;
  text: string;
} | null;
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

const COMMUNITY_HOME_COLLAPSE_KEY = "gmfn.communityHome.sections.v5";
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

const SPOTLIGHT_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SPOTLIGHT_ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const SPOTLIGHT_IMAGE_TYPE_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};
const SPOTLIGHT_VIDEO_TYPE_ALIASES: Record<string, string> = {
  "video/mov": "video/quicktime",
};
const SPOTLIGHT_GENERIC_IMAGE_TYPES = [
  "",
  "application/octet-stream",
  "binary/octet-stream",
];
const SPOTLIGHT_GENERIC_VIDEO_TYPES = [
  "",
  "application/octet-stream",
  "binary/octet-stream",
];
const SPOTLIGHT_ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const SPOTLIGHT_ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const SPOTLIGHT_ALLOWED_IMAGE_LABEL = "JPG, PNG, or WebP";
const SPOTLIGHT_ALLOWED_VIDEO_LABEL = "MP4, WebM, or MOV";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function formatFileSize(bytes: number): string {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function spotlightMediaExtension(filename: string): string {
  const raw = safeStr(filename).toLowerCase();
  const dot = raw.lastIndexOf(".");
  return dot >= 0 ? raw.slice(dot) : "";
}

function normalizeSpotlightImageType(contentType: string): string {
  const raw = safeStr(contentType).toLowerCase().split(";")[0]?.trim() || "";
  return SPOTLIGHT_IMAGE_TYPE_ALIASES[raw] || raw;
}

function normalizeSpotlightVideoType(contentType: string): string {
  const raw = safeStr(contentType).toLowerCase().split(";")[0]?.trim() || "";
  return SPOTLIGHT_VIDEO_TYPE_ALIASES[raw] || raw;
}

function validateSpotlightImageFile(
  file: File | null | undefined,
  enforceSize = true
): string {
  if (!file) return "";

  const contentType = normalizeSpotlightImageType(file.type);
  const ext = spotlightMediaExtension(file.name);
  const hasAcceptedType = SPOTLIGHT_ALLOWED_IMAGE_TYPES.includes(contentType);
  const hasAcceptedExtension = SPOTLIGHT_ALLOWED_IMAGE_EXTENSIONS.includes(ext);
  const hasGenericType = SPOTLIGHT_GENERIC_IMAGE_TYPES.includes(contentType);

  if (!hasAcceptedType && !(hasGenericType && hasAcceptedExtension)) {
    return `Use a ${SPOTLIGHT_ALLOWED_IMAGE_LABEL} image. Other formats are not accepted yet.`;
  }

  if (enforceSize && Number(file.size || 0) > SPOTLIGHT_MAX_IMAGE_BYTES) {
    return `Image is ${formatFileSize(
      file.size
    )}. Spotlight images must be 10 MB or smaller.`;
  }

  return "";
}

function validateSpotlightVideoFile(
  file: File | null | undefined,
  enforceSize = true
): string {
  if (!file) return "";

  const contentType = normalizeSpotlightVideoType(file.type);
  const ext = spotlightMediaExtension(file.name);
  const hasAcceptedType = SPOTLIGHT_ALLOWED_VIDEO_TYPES.includes(contentType);
  const hasAcceptedExtension = SPOTLIGHT_ALLOWED_VIDEO_EXTENSIONS.includes(ext);
  const hasGenericType = SPOTLIGHT_GENERIC_VIDEO_TYPES.includes(contentType);

  if (!hasAcceptedType && !(hasGenericType && hasAcceptedExtension)) {
    return `Use a ${SPOTLIGHT_ALLOWED_VIDEO_LABEL} video. Other formats are not accepted yet.`;
  }

  if (enforceSize && Number(file.size || 0) > SPOTLIGHT_MAX_VIDEO_BYTES) {
    return `Video is ${formatFileSize(
      file.size
    )}. Spotlight videos must be 15 MB or smaller.`;
  }

  return "";
}

function uploadedMediaUrl(res: any, key: "image" | "video"): string {
  const directKey = key === "image" ? "image_url" : "video_url";
  return firstTruthy(
    res?.[directKey],
    res?.url,
    res?.file_url,
    res?.path,
    res?.item?.[directKey],
    res?.item?.url,
    res?.data?.[directKey],
    res?.data?.url
  );
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
    border: "1px solid rgba(8,35,58,0.12)",
    isolation: "isolate",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 42%, #EEF5FB 100%)",
    boxShadow:
      "0 20px 44px rgba(6,24,39,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
    overflow: "hidden",
  };
}

function normalizePostedCommunitySpotlight(
  row: any,
  fallback?: {
    imageUrl?: string | null;
    videoUrl?: string | null;
    message?: string | null;
  }
): ActiveCommunitySpotlight | null {
  if (!row && !fallback) return null;

  return normalizeActiveCommunitySpotlight({
    ...(row || {}),
    message: firstTruthy(row?.message, fallback?.message, "Live spotlight is active."),
    image_url: firstTruthy(row?.image_url, fallback?.imageUrl),
    video_url: firstTruthy(row?.video_url, fallback?.videoUrl),
    created_at: firstTruthy(row?.created_at, new Date().toISOString()),
  });
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
  };
}

function sectionLabel(align: "left" | "center" = "left"): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#48657D",
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

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  const stableActionLayer: React.CSSProperties = {
    ...brandStableTapTarget(),
    position: "relative",
    zIndex: 60,
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
        : "1px solid rgba(255,255,255,0.16)",
      background: disabled
        ? "#CBD5E1"
        : "linear-gradient(180deg, #0B2D4A 0%, #08233A 100%)",
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
      minHeight: 46,
      padding: "11px 14px",
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
      whiteSpace: "normal",
      overflowWrap: "anywhere",
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
    minHeight: 46,
    padding: "11px 14px",
    borderRadius: 14,
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
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    opacity: disabled ? 0.86 : 1,
    boxShadow: disabled
      ? "none"
      : "0 8px 18px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
    lineHeight: 1.18,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    ...brandStableTapTarget(),
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
    overflowWrap: "anywhere",
    boxShadow:
      "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    lineHeight: 1.18,
    outline: "none",
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
  };
}

function communityQuickActionButton(
  primary = false,
  isCompact = false
): React.CSSProperties {
  return {
    ...actionBtn("secondary"),
    width: "100%",
    minHeight: isCompact ? 104 : 108,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: isCompact ? "12px 12px" : "12px 8px",
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

function communityActionIcon(primary = false): React.CSSProperties {
  return {
    flex: "0 0 auto",
    width: 44,
    height: 44,
    borderRadius: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: primary
      ? "linear-gradient(180deg, #DDEEFF 0%, #EEF6FF 100%)"
      : "linear-gradient(180deg, #EAF3FF 0%, #F5FAFF 100%)",
    border: primary
      ? "1px solid rgba(13,95,168,0.14)"
      : "1px solid rgba(13,95,168,0.10)",
    color: "#135A94",
    fontSize: 22,
    lineHeight: 1,
    boxShadow: primary
      ? "inset 0 1px 0 rgba(255,255,255,0.08)"
      : "0 8px 16px rgba(13,95,168,0.08)",
  };
}

function communityToolRowStyle(): React.CSSProperties {
  return {
    ...brandStableTapTarget(),
    position: "relative",
    zIndex: 20,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "center",
    minHeight: 72,
    boxSizing: "border-box",
    borderRadius: 18,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,251,255,0.98) 100%)",
    padding: "12px 14px",
    color: "#07172C",
    cursor: "pointer",
    textAlign: "left",
    isolation: "isolate",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
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

function getTrustSummaryValue(payload: any, key: string, fallback = ""): string {
  return firstTruthy(
    payload?.[key],
    payload?.summary?.[key],
    payload?.trust?.[key],
    payload?.merchant_summary?.[key],
    fallback
  );
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

function countRows(rows: any[]): number {
  return Array.isArray(rows) ? rows.length : 0;
}

function trustScoreDisplay(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "Preparing";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return raw;
  return `${Math.round(parsed)}%`;
}

function countRequestRowsByStatus(rows: any[], statuses: string[]): number {
  const wanted = new Set(statuses.map((item) => item.toLowerCase()));
  return rows.filter((row) => wanted.has(safeStr(row?.status).toLowerCase())).length;
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
    spotlight: false,
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
  const [trustSlipSummary, setTrustSlipSummary] = useState<any>(null);
  const [marketplaceRequestRows, setMarketplaceRequestRows] = useState<any[]>([]);
  const [guarantorEarningRows, setGuarantorEarningRows] = useState<any[]>([]);
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
  const [freeSpotlightMessage, setFreeSpotlightMessage] = useState("");
  const [freeSpotlightImageFile, setFreeSpotlightImageFile] =
    useState<File | null>(null);
  const [freeSpotlightVideoFile, setFreeSpotlightVideoFile] =
    useState<File | null>(null);
  const [freeSpotlightImagePreviewUrl, setFreeSpotlightImagePreviewUrl] =
    useState("");
  const [freeSpotlightVideoPreviewUrl, setFreeSpotlightVideoPreviewUrl] =
    useState("");
  const [freeSpotlightVideoDurationSeconds, setFreeSpotlightVideoDurationSeconds] =
    useState<number | null>(null);
  const [freeSpotlightImageInputKey, setFreeSpotlightImageInputKey] =
    useState(0);
  const [freeSpotlightVideoInputKey, setFreeSpotlightVideoInputKey] =
    useState(0);
  const [preparingFreeSpotlightImage, setPreparingFreeSpotlightImage] =
    useState(false);
  const [preparingFreeSpotlightVideo, setPreparingFreeSpotlightVideo] =
    useState(false);
  const [publishingFreeSpotlight, setPublishingFreeSpotlight] = useState(false);
  const [freeSpotlightFeedback, setFreeSpotlightFeedback] =
    useState<SpotlightFeedbackState>(null);

  const [firstCircleDraft, setFirstCircleDraft] = useState(() =>
    loadFirstCircleDraft()
  );

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
          .find((el) => el && typeof el.scrollIntoView === "function");

        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
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
      setCollapsed((prev) => ({ ...prev, spotlight: false }));
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
    if (!freeSpotlightImageFile) {
      setFreeSpotlightImagePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(freeSpotlightImageFile);
    setFreeSpotlightImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [freeSpotlightImageFile]);

  useEffect(() => {
    if (!freeSpotlightVideoFile) {
      setFreeSpotlightVideoPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(freeSpotlightVideoFile);
    setFreeSpotlightVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [freeSpotlightVideoFile]);

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
      setTrustSlipSummary(null);
      setMarketplaceRequestRows([]);
      setGuarantorEarningRows([]);
      return;
    }

    (async () => {
      const [summaryRes, trustSlipRes, requestsRes, guarantorEarningsRes] = await Promise.all([
        getPoolMeSummary().catch((err) => ({
          __failed: String(
            err?.message || err || "Your full finance summary is not ready yet."
          ),
        })),
        getMyTrustSlip().catch(() => null),
        listMarketplaceRequests({
          status: "all",
          mine_only: false,
          clan_id: null,
          limit: 200,
        }).catch(() => []),
        getMyGuarantorEarnings(100).catch(() => ({ items: [] })),
      ]);

      if (!alive) return;

      setPoolSummary(
        summaryRes && !(summaryRes as any).__failed ? summaryRes : null
      );
      setTrustSlipSummary(trustSlipRes || null);
      setMarketplaceRequestRows(Array.isArray(requestsRes) ? requestsRes : []);
      setGuarantorEarningRows(
        Array.isArray((guarantorEarningsRes as any)?.items)
          ? (guarantorEarningsRes as any).items
          : Array.isArray(guarantorEarningsRes)
            ? guarantorEarningsRes
            : []
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
  const communityNextActionIntro =
    "Tick what you want to do here, or write it in simple words. GSN will check the first required step and lead you from there.";
  const spotlightGuidanceSuspendedView = guidedActionFamilyFocus === "spotlight";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const guide = safeStr(params.get("guide")).toLowerCase();
    if (guide !== "spotlight") return;

    openGuidedSpotlightFamily();

    navigate(
      {
        pathname: location.pathname,
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate, openGuidedSpotlightFamily]);

  const cumulativePoolBalance = getSummaryTotal(
    poolSummary,
    "membership_pool_balance",
    getSummaryTotal(poolSummary, "available_balance", "0.00")
  );
  const cumulativeGuaranteeLocked = getSummaryTotal(
    poolSummary,
    "guarantee_locked_as_guarantor",
    "0.00"
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
  const guarantorRecordCount =
    Number(
      getSummaryAny(
        poolSummary,
        [
          "guarantor_record_count",
          "guarantor_records_count",
          "guarantee_count",
          "guarantor_count",
          "guarantees_count",
        ],
        ""
      )
    ) || countRows(guarantorEarningRows);
  const guarantorEarnedTotal = guarantorEarningRows.reduce((sum, row) => {
    const amount = firstTruthy(
      row?.payable_amount,
      row?.earned_payable,
      row?.total_payable,
      row?.share_amount,
      row?.earned_amount,
      row?.amount,
      row?.guarantor_share
    );
    return sum + moneyNumber(amount);
  }, 0);
  const trustScore = trustScoreDisplay(
    getTrustSummaryValue(
      trustSlipSummary,
      "cci_score",
      getTrustSummaryValue(trustSlipSummary, "trust_score", "")
    )
  );
  const trustBand = firstTruthy(
    getTrustSummaryValue(trustSlipSummary, "cci_band"),
    getTrustSummaryValue(trustSlipSummary, "band"),
    "Trust record"
  );
  const activeSupportCount = countRequestRowsByStatus(marketplaceRequestRows, [
    "open",
  ]);
  const trustedTradeCount = countRequestRowsByStatus(marketplaceRequestRows, [
    "fulfilled",
    "completed",
    "closed",
  ]);
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
        detail: selectedClanId
          ? "Open the owner-side controls for your one GSN shop in this community."
          : "Choose one community first, then open the shop controls tied to that community.",
        technical: "Shop control",
        keywords: ["shop", "seller", "gallery", "control", "products"],
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
        label: "Open loans and support",
        detail: selectedClanId
          ? `Open loans and support for ${selectedClanName || "the selected community"}.`
          : "Select a community first, then open its loans and support path.",
        technical: "Loans and support",
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
        id: "spotlight-vault",
        label: "Vault",
        detail:
          "Open the private shop lane for selected people and permission-based access.",
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
            continueLabel: "Choose community",
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
            "GSN will take you into the create-community lane and lead the founder steps from there.",
          firstStep: "Open the create-community path.",
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
            "GSN will open the trusted-circle section so you can prepare the people you already know in real life.",
          firstStep: "Open the trusted-circle section.",
          continueLabel: "Open trusted circle",
          continueTone: "primary",
        };
      case "shop-control":
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before shop control",
            detail:
              "Your shop work must stay tied to one community. First choose the community you want to work in, then GSN will open its shop controls.",
            firstStep: "Choose the community for this shop work.",
            continueLabel: "Choose community",
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
            continueLabel: "Choose community",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        const gmfnId = safeStr(memberGlobalId);
        if (!gmfnId || gmfnId === "Awaiting issue") {
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
            continueLabel: "Choose community",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        const gmfnId = safeStr(memberGlobalId);
        if (!gmfnId || gmfnId === "Awaiting issue") {
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

        const shopRes = await getMarketplaceShopByGmfnId(gmfnId, {
          clan_id: selectedClanId,
          header_clan_id: selectedClanId,
        }).catch(() => null);
        const resolvedShop =
          (Array.isArray((shopRes as any)?.items)
            ? (shopRes as any).items?.[0]
            : null) ||
          (shopRes as any)?.shop ||
          shopRes;
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
      case "spotlight-vault": {
        if (!selectedClanId || !selectedClan) {
          return {
            title: "Choose the community before Vault",
            detail:
              "Vault belongs to one community at a time. First choose the community, then GSN will open the private shop lane for that one.",
            firstStep: "Choose the target community.",
            continueLabel: "Choose community",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        const gmfnId = safeStr(memberGlobalId);
        if (!gmfnId || gmfnId === "Awaiting issue") {
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

        const shopRes = await getMarketplaceShopByGmfnId(gmfnId, {
          clan_id: selectedClanId,
          header_clan_id: selectedClanId,
        }).catch(() => null);
        const resolvedShop =
          (Array.isArray((shopRes as any)?.items)
            ? (shopRes as any).items?.[0]
            : null) ||
          (shopRes as any)?.shop ||
          shopRes;
        const shopId = Number((resolvedShop as any)?.id || 0);

        if (!shopId) {
          return {
            title: "Set up your shop before Vault",
            detail: `Vault belongs to your shop in ${selectedClanName || "the selected community"}. First prepare the shop details, then GSN will open the private offers lane.`,
            firstStep: "Open shop setup for this community.",
            continueLabel: "Open shop setup",
            continueTone: "primary",
            payload: { nextStep: "prepare-shop-first" },
          };
        }

        return {
          title: "Your shop is ready for Vault",
          detail: `GSN has confirmed the shop for ${selectedClanName || "the selected community"}. It can now open the Vault lane for private offers and access links.`,
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
            continueLabel: "Choose community",
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
            title: "Choose the community before loans and support",
            detail:
              "Loans and support belong to one community at a time. First pick the community, then GSN will open that local support path.",
            firstStep: "Choose the community first.",
            continueLabel: "Choose community",
            continueTone: "primary",
            payload: { nextStep: "choose-community" },
          };
        }

        return {
          title: "Loans and support are ready",
          detail: `GSN will open the loans and support path for ${selectedClanName || "the selected community"}.`,
          firstStep: "Open Loans and Support.",
          continueLabel: "Open loans and support",
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

  function clearFreeSpotlightDraft() {
    setFreeSpotlightMessage("");
    setFreeSpotlightImageFile(null);
    setFreeSpotlightVideoFile(null);
    setFreeSpotlightVideoDurationSeconds(null);
    setFreeSpotlightImageInputKey((prev) => prev + 1);
    setFreeSpotlightVideoInputKey((prev) => prev + 1);
  }

  async function handleFreeSpotlightImagePicked(file: File | null) {
    if (!file) return;

    const typeIssue = validateSpotlightImageFile(file, false);
    if (typeIssue) {
      setFreeSpotlightFeedback({ tone: "error", text: typeIssue });
      return;
    }

    setPreparingFreeSpotlightImage(true);
    setFreeSpotlightFeedback({
      tone: "info",
      text: "Preparing picture for spotlight upload...",
    });

    try {
      const prepared = await prepareSpotlightImageFile(file, {
        maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
      });
      const sizeIssue = validateSpotlightImageFile(prepared.file, true);
      if (sizeIssue) throw new Error(sizeIssue);

      setFreeSpotlightImageFile(prepared.file);
      setFreeSpotlightFeedback({
        tone: "success",
        text:
          prepared.message ||
          `Picture ready: ${prepared.file.name} (${formatFileSize(
            prepared.file.size
          )}).`,
      });
    } catch (err: any) {
      setFreeSpotlightImageFile(null);
      setFreeSpotlightFeedback({
        tone: "error",
        text:
          safeStr(err?.message) ||
          `Picture could not be prepared. Use ${SPOTLIGHT_ALLOWED_IMAGE_LABEL}, under 10 MB.`,
      });
    } finally {
      setPreparingFreeSpotlightImage(false);
    }
  }

  async function handleFreeSpotlightVideoPicked(file: File | null) {
    if (!file) return;

    const typeIssue = validateSpotlightVideoFile(file, false);
    if (typeIssue) {
      setFreeSpotlightFeedback({ tone: "error", text: typeIssue });
      return;
    }

    setPreparingFreeSpotlightVideo(true);
    setFreeSpotlightFeedback({
      tone: "info",
      text: `Preparing short video. GSN keeps spotlight clips to ${SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS} seconds.`,
    });

    try {
      const prepared = await prepareSpotlightVideoFile(file, {
        maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
        maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
      });
      const sizeIssue = validateSpotlightVideoFile(prepared.file, true);
      if (sizeIssue) throw new Error(sizeIssue);

      setFreeSpotlightVideoFile(prepared.file);
      setFreeSpotlightVideoDurationSeconds(
        Number(prepared.durationSeconds || 0) || null
      );
      setFreeSpotlightFeedback({
        tone: "success",
        text:
          prepared.message ||
          `Short video ready: ${prepared.file.name} (${formatFileSize(
            prepared.file.size
          )}).`,
      });
    } catch (err: any) {
      const fallbackIssue = validateSpotlightVideoFile(file, true);
      if (!fallbackIssue && Number(file.size || 0) <= SPOTLIGHT_MAX_VIDEO_BYTES) {
        setFreeSpotlightVideoFile(file);
        setFreeSpotlightVideoDurationSeconds(null);
        setFreeSpotlightFeedback({
          tone: "info",
          text:
            "The browser could not trim this video automatically, so GSN will upload the original pilot clip. Keep it short.",
        });
      } else {
        setFreeSpotlightVideoFile(null);
        setFreeSpotlightVideoDurationSeconds(null);
        setFreeSpotlightFeedback({
          tone: "error",
          text:
            safeStr(err?.message) ||
            fallbackIssue ||
            `Video could not be prepared. Use ${SPOTLIGHT_ALLOWED_VIDEO_LABEL}, under 15 MB.`,
        });
      }
    } finally {
      setPreparingFreeSpotlightVideo(false);
    }
  }

  async function ensureFreeSpotlightShopId(): Promise<number> {
    if (!selectedClanId) {
      throw new Error("Choose a community before publishing a spotlight.");
    }

    const gmfnId = safeStr(memberGlobalId);
    if (!gmfnId || gmfnId === "Awaiting issue") {
      throw new Error("Your GSN ID is still loading. Wait a moment, then try again.");
    }

    const resolveShopId = (res: any) => {
      const resolvedShop =
        (Array.isArray(res?.items) ? res.items?.[0] : null) ||
        res?.shop ||
        res?.item ||
        res?.data ||
        res;
      return Number(resolvedShop?.id || resolvedShop?.shop_id || 0);
    };

    const existingShopId = resolveShopId(
      await getMarketplaceShopByGmfnId(gmfnId, {
        clan_id: selectedClanId,
        header_clan_id: selectedClanId,
      }).catch(() => null)
    );

    if (existingShopId > 0) return existingShopId;

    const createdShopId = resolveShopId(
      await createMarketplaceShop({
        clan_id: selectedClanId,
        name: `${resolveMemberName(me)} Shop`,
        description: `Owner spotlight shop for ${selectedClanName || "this community"}.`,
      }).catch(async () =>
        getMarketplaceShopByGmfnId(gmfnId, {
          clan_id: selectedClanId,
          header_clan_id: selectedClanId,
        }).catch(() => null)
      )
    );

    if (createdShopId > 0) return createdShopId;

    throw new Error(
      "GSN could not confirm the shop record for this spotlight yet. Open Shop Control once, then try again."
    );
  }

  async function handlePublishFreeSpotlight(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeCommunityButtonEvent(event);

    if (publishingFreeSpotlight) {
      setFreeSpotlightFeedback({
        tone: "info",
        text: "Spotlight publish is already running. Wait for it to finish.",
      });
      return;
    }

    if (preparingFreeSpotlightImage || preparingFreeSpotlightVideo) {
      setFreeSpotlightFeedback({
        tone: "info",
        text: "Media is still being prepared. Try publish again in a moment.",
      });
      return;
    }

    if (!selectedClanId) {
      setFreeSpotlightFeedback({
        tone: "error",
        text: "Choose a community before publishing a spotlight.",
      });
      return;
    }

    const message = safeStr(freeSpotlightMessage);
    if (!message && !freeSpotlightImageFile && !freeSpotlightVideoFile) {
      setFreeSpotlightFeedback({
        tone: "error",
        text: "Add a short message, picture, or video before publishing.",
      });
      return;
    }

    const imageIssue = validateSpotlightImageFile(freeSpotlightImageFile, true);
    if (imageIssue) {
      setFreeSpotlightFeedback({ tone: "error", text: imageIssue });
      return;
    }

    const videoIssue = validateSpotlightVideoFile(freeSpotlightVideoFile, true);
    if (videoIssue) {
      setFreeSpotlightFeedback({ tone: "error", text: videoIssue });
      return;
    }

    setPublishingFreeSpotlight(true);
    setFreeSpotlightFeedback({
      tone: "info",
      text: "Publishing the free community spotlight...",
    });

    try {
      const shopId = await ensureFreeSpotlightShopId();
      let imageUrl = "";
      let videoUrl = "";

      if (freeSpotlightImageFile) {
        const uploadRes = await uploadMarketplaceImageFile(
          freeSpotlightImageFile,
          selectedClanId
        );
        imageUrl = uploadedMediaUrl(uploadRes, "image");
        if (!imageUrl) {
          throw new Error("Picture uploaded, but the backend did not return a picture URL.");
        }
      }

      if (freeSpotlightVideoFile) {
        const uploadRes = await uploadMarketplaceVideoFile(
          freeSpotlightVideoFile,
          freeSpotlightVideoDurationSeconds || undefined,
          selectedClanId
        );
        videoUrl = uploadedMediaUrl(uploadRes, "video");
        if (!videoUrl) {
          throw new Error("Video uploaded, but the backend did not return a video URL.");
        }
      }

      const createRes = await createMarketplaceBroadcast({
        clan_id: selectedClanId,
        shop_id: shopId,
        message: message || "Community spotlight update",
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        priority_mode: "free",
        visibility_scope: "direct_communities",
      });

      const postedSpotlight = normalizePostedCommunitySpotlight(
        (createRes as any)?.item ||
          (Array.isArray((createRes as any)?.items)
            ? (createRes as any).items?.[0]
            : null),
        {
          imageUrl,
          videoUrl,
          message: message || "Community spotlight update",
        }
      );

      clearFreeSpotlightDraft();
      setCollapsed((prev) => ({ ...prev, spotlight: false }));
      if (postedSpotlight) {
        setActiveCommunitySpotlight(postedSpotlight);
        setActiveCommunitySpotlights((prev) => [
          postedSpotlight,
          ...prev.filter((item) => item.id !== postedSpotlight.id),
        ]);
        setActiveCommunitySpotlightTotal((prev) => Math.max(1, prev));
        setActiveCommunitySpotlightSyncIssue("");
      }
      setFreeSpotlightFeedback({
        tone: "success",
        text: "Free spotlight is live. It will show on Community Home and Dashboard.",
      });
      showNotice("success", "Free spotlight is live on this community.");
      await refreshActiveCommunitySpotlight(selectedClanId);
    } catch (err: any) {
      setFreeSpotlightFeedback({
        tone: "error",
        text: safeStr(err?.message) || "Spotlight could not be published right now.",
      });
    } finally {
      setPublishingFreeSpotlight(false);
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
      setCollapsed((prev) => ({ ...prev, [expandKey]: false }));
    }
    revealCommunityTarget([targetId]);
  }

  function openCommunityShopControl(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    targetId = ""
  ) {
    consumeCommunityButtonEvent(event);
    const hash =
      targetId === "community-shop-control-owner-shortcuts"
        ? "#community-shop-control-owner-shortcuts"
        : "";
    navigateWithOrigin(navigate, `/app/shop-control${hash}`, location);
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
    stopActionTap(event);
  }

function communityButtonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return actionTapGuardProps();
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
        openCommunityRoute(event, "/app/clans");
        break;
      case "join-community":
        openCommunityRoute(event, "/join");
        break;
      case "circle":
        openCommunityHomeSection(event, "community-home-grow-your-circle", "circle");
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
        openCommunityHomeSection(
          event,
          "community-home-spotlight-gears",
          "spotlight",
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
          openCommunityRoute(event, "/app/shop-control#shop-control-spotlight");
          break;
        }
        openCommunityRoute(event, "/app/shop-control#shop-control-paid-spotlight");
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
          openCommunityRoute(event, "/app/shop-control#shop-control-spotlight");
          break;
        }
        openCommunityRoute(event, "/app/vault-control");
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
        openCommunityRoute(event, "/app/shop-control#shop-control-spotlight");
        break;
      case "finance":
        openCommunityRoute(event, "/app/finance");
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
            resolveSelection={resolveCommunityNextAction}
            onSelect={handleCommunityNextAction}
            intro={communityNextActionIntro}
          />

          <section style={communityBlockCard("blue")}>
            <div style={sectionLabel()}>No communities yet</div>

            <div
              style={{
                marginTop: 12,
                color: "#F8FBFF",
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
      {!spotlightGuidanceSuspendedView ? (
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
                    letterSpacing: -0.4,
                  }}
                >
                  {communityHomeOwnerName}
                </div>
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
                    All communities summary
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

              <div
                style={{
                  marginTop: isCompact ? 10 : 14,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: isCompact ? 8 : 10,
                }}
              >
                {[
                  {
                    symbol: "🏘️",
                    title: "Communities",
                    value: String(communityCountFromSummary),
                    detail:
                      communityCountFromSummary === 1
                        ? "1 visible community"
                        : "Visible communities",
                    tone: "#1F5D9F",
                  },
                  {
                    symbol: "💱",
                    title: "Money Position",
                    value: moneyPositionLabel,
                    detail: moneyPositionDetail,
                    tone: netMoneyPosition < 0 ? "#B42318" : "#2E8A58",
                  },
                  {
                    symbol: "🌐",
                    title: "Dues",
                    value: formatGlobalAmount(cumulativePoolBalance),
                    detail:
                      moneyNumber(cumulativeGuaranteeLocked) > 0
                        ? `${formatGlobalAmount(cumulativeGuaranteeLocked)} held as guarantee`
                        : "Across visible community pools",
                    tone: "#1F5D9F",
                  },
                  {
                    symbol: "🤝",
                    title: "Support",
                    value: `${activeSupportCount} active`,
                    detail: "People asking for support",
                    tone: "#2E8A58",
                  },
                  {
                    symbol: "🛒",
                    title: "Guarantees",
                    value: String(guarantorRecordCount),
                    detail:
                      guarantorRecordCount === 1
                        ? "1 guarantor record"
                        : "Guarantor records",
                    tone: "#6F4C00",
                  },
                  {
                    symbol: "💷",
                    title: "Earned",
                    value: formatGlobalAmount(guarantorEarnedTotal),
                    detail:
                      guarantorEarnedTotal > 0
                        ? "From guaranteeing others"
                        : "No earning record yet",
                    tone: "#2E8A58",
                  },
                  {
                    symbol: "ðŸ›’",
                    title: "Trade",
                    value: `${trustedTradeCount} completed`,
                    detail:
                      countRows(marketplaceRequestRows) > 0
                        ? "From visible marketplace records"
                        : "No trade record yet",
                    tone: "#4230A3",
                  },
                  {
                    symbol: "🛡️",
                    title: "Trust",
                    value: trustScore,
                    detail: trustBand,
                    tone: "#A27518",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"),
                      minHeight: isCompact ? 118 : 142,
                      display: "grid",
                      justifyItems: "center",
                      alignContent: "start",
                      gap: 7,
                      textAlign: "center",
                      padding: isCompact ? 10 : 14,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: isCompact ? 38 : 50,
                        height: isCompact ? 38 : 50,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `linear-gradient(180deg, ${item.tone} 0%, #08233A 100%)`,
                        color: "#FFFFFF",
                        fontSize: isCompact ? 20 : 26,
                        fontWeight: 950,
                        lineHeight: 1,
                        boxShadow:
                          "0 10px 20px rgba(10,24,49,0.16), inset 0 1px 0 rgba(255,255,255,0.18)",
                      }}
                    >
                      {item.symbol}
                    </span>
                    <span
                      style={{
                        color: "#07172C",
                        fontSize: isCompact ? 13.5 : 14,
                        fontWeight: 950,
                        lineHeight: 1.2,
                      }}
                    >
                      {item.title}
                    </span>
                    <span
                      style={{
                        color: item.tone,
                        fontSize: isCompact ? 16 : 22,
                        fontWeight: 950,
                        lineHeight: 1.12,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.value}
                    </span>
                    <span
                      style={{
                        color: "#5F7287",
                        fontSize: isCompact ? 10.5 : 12.5,
                        fontWeight: 760,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                {...communityButtonGuardProps()}
                onClick={(event) => openCommunityRoute(event, "/app/trust")}
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
                    background:
                      "linear-gradient(180deg, #10243A 0%, #0B2D4A 100%)",
                    color: "#FFFFFF",
                  }}
                >
                  🛡️
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      color: "#07172C",
                      fontSize: isCompact ? 14.5 : 16,
                      fontWeight: 950,
                      lineHeight: 1.2,
                    }}
                  >
                    Built on trust. Driven by community.
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: "#617085",
                      fontSize: isCompact ? 12 : 13,
                      fontWeight: 720,
                      lineHeight: 1.35,
                    }}
                  >
                    Records, accountability, and support in one place.
                  </span>
                </span>
                <span aria-hidden="true" style={{ color: "#0B2D4A", fontSize: 24 }}>
                  ›
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

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
                  : "repeat(5, minmax(0, 1fr))",
                gap: isCompact ? 8 : 12,
                alignItems: "stretch",
              }}
            >
              {[
                {
                  id: "choose-community",
                  icon: "👥",
                  title: "Choose community",
                  primary: true,
                },
                {
                  id: "marketplace",
                  icon: "🛍️",
                  title: "Enter marketplace",
                },
                {
                  id: "create-community",
                  icon: "➕",
                  title: "Create community",
                },
                {
                  id: "join-community",
                  icon: "🤝",
                  title: "Join community",
                },
                {
                  id: "circle",
                  icon: "🌟",
                  title: "Grow circle",
                },
              ].map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  {...communityButtonGuardProps()}
                  onClick={(event) => openCommunityNextAction(event, item.id)}
                  style={{
                    ...communityQuickActionButton(Boolean(item.primary), isCompact),
                    gridColumn:
                      isCompact && index === 4 ? "1 / -1" : undefined,
                  }}
                >
                  <span style={communityActionIcon(Boolean(item.primary))}>
                    {item.icon}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: isCompact ? 13.5 : 14,
                        fontWeight: 940,
                        lineHeight: isCompact ? 1.18 : 1.15,
                        whiteSpace: "normal",
                        wordBreak: "normal",
                        overflowWrap: "break-word",
                      }}
                    >
                      {item.title}
                    </span>
                  </span>
                </button>
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
              <button
                type="button"
                {...communityButtonGuardProps()}
                onClick={() => {
                  setGuidedActionFamilyFocus(null);
                }}
                style={collapseHeaderButton(isCompact)}
              >
                Collapse
              </button>
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
              lineHeight: 1.8,
              maxWidth: 860,
            }}
          >
            Community Home is suspended for this moment so unrelated tasks do not
            compete for attention. Choose the spotlight path you want, and GSN
            will check what must be done first before it continues.
          </div>
          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: isCompact ? 13 : 14,
              lineHeight: 1.75,
              maxWidth: 860,
            }}
          >
            If your shop is not ready yet, GSN will tell you to prepare the shop
            first before spotlight can begin.
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
              <button
                key={item.id}
                type="button"
                {...communityButtonGuardProps()}
                onClick={(event) => {
                  void handleSpotlightHandle(item, event);
                }}
                style={{
                  ...actionBtn(item.tone || "secondary"),
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
              </button>
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
            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={() => {
                setGuidedActionFamilyFocus(null);
              }}
              style={actionBtn("secondary")}
            >
              Back to Community Home
            </button>
          </div>
        </section>
      ) : null}

      {!spotlightGuidanceSuspendedView ? (
      <>
      <section style={{ ...communityBlockCard("raised"), order: 30 }}>
        <div
          style={{
            display: "grid",
            gap: 0,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(16,37,59,0.08)",
          }}
        >
          {[
            {
              icon: "🛡️",
              title: "Owner Actions",
              detail:
                "Open owner-side tools and permissions",
              onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                openCommunityRoute(event, "/app/clans"),
            },
            {
              icon: "🏪",
              title: "Owner Shop Control",
              detail:
                "Manage shop face, products, and public links",
              onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                openCommunityShopControl(event),
            },
            {
              icon: "🔐",
              title: "Vault Control",
              detail:
                "Manage paid private access and vault links",
              onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                openCommunityRoute(event, "/app/vault-control"),
            },
            {
              icon: "🌟",
              title: "Free Spotlight",
              detail:
                "Publish the normal community spotlight lane",
              onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                openCommunityHomeSection(
                  event,
                  "community-home-spotlight-gears",
                  "spotlight",
                  true
                ),
            },
            {
              icon: "💳",
              title: "Spotlight Subscription",
              detail:
                "Control the paid priority spotlight lane",
              onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                openCommunityRoute(
                  event,
                  "/app/shop-control#shop-control-paid-spotlight"
                ),
            },
            {
              icon: "🤝",
              title: "Grow Your Trusted Circle",
              detail:
                "Invite trusted real-life people",
              onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                openCommunityRoute(event, "/app/build-first-circle"),
            },
            {
              icon: "📡",
              title: "Owner Spotlight Status",
              detail: `${activeCommunitySpotlightTotal || activeCommunitySpotlights.length} live / 0 queued`,
              onClick: (event: React.SyntheticEvent<HTMLElement>) =>
                openCommunityHomeSection(
                  event,
                  "community-home-spotlight-gears",
                  "spotlight"
                ),
            },
          ].map((item, index) => (
            <button
              key={item.title}
              type="button"
              {...communityButtonGuardProps()}
              onClick={item.onClick}
              style={{
                ...communityToolRowStyle(),
                borderRadius: 0,
                border: "0",
                borderTop: index === 0 ? "0" : "1px solid rgba(16,37,59,0.08)",
                boxShadow: "none",
              }}
            >
              <span style={communityActionIcon(false)}>{item.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
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
                    display: "block",
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
                ›
              </span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ ...communityBlockCard("blue"), order: 55, display: "none" }}>
        <div>
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

          <div style={collapseButtonRow()}>
            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={(event) => toggleSectionFromButton(event, "tools")}
              style={collapseHeaderButton(isCompact)}
            >
              {collapsed.tools ? "Open owner actions" : "Collapse owner actions"}
            </button>
          </div>
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

      {null}

      <section
        id="community-home-grow-your-circle"
        style={{ ...communityBlockCard("gold"), order: 70, display: "none" }}
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
                  color: "#F8FBFF",
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
                        <div style={{ color: "#F8FBFF", fontWeight: 900 }}>
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
              See the selected community's spotlight status here. Prepare or
              replace the owner content inside Shop Control.
            </div>
          </div>

          <div style={collapseButtonRow()}>
            <button
              type="button"
              {...communityButtonGuardProps()}
              onClick={(event) => toggleSectionFromButton(event, "spotlight")}
              style={collapseHeaderButton(isCompact)}
            >
              {collapsed.spotlight
                ? "Open spotlight status"
                : "Collapse spotlight status"}
            </button>
          </div>
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
                          The active spotlight is live, but no image or video is attached to it.
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
              <div style={sectionLabel()}>Free spotlight publisher</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#07172C",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                Publish the normal community spotlight here
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Add a short message, picture, or video. GSN will create or
                confirm your shop record, publish the free spotlight, then
                refresh this status card.
              </div>

              <label
                style={{
                  display: "grid",
                  gap: 7,
                  marginTop: 14,
                  color: "#0B2D4A",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                Spotlight message
                <textarea
                  value={freeSpotlightMessage}
                  onChange={(event) => setFreeSpotlightMessage(event.target.value)}
                  maxLength={220}
                  placeholder="Write the one thing people should see first."
                  style={{
                    minHeight: 92,
                    resize: "vertical",
                    borderRadius: 14,
                    border: "1px solid rgba(16,37,59,0.14)",
                    background: "#FFFFFF",
                    color: "#07172C",
                    padding: "12px 13px",
                    fontSize: 14,
                    fontWeight: 750,
                    lineHeight: 1.45,
                    outline: "none",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92)",
                  }}
                />
              </label>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    borderRadius: 14,
                    border: "1px solid rgba(123,161,204,0.16)",
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)",
                    padding: 12,
                    boxShadow:
                      "0 8px 18px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
                  }}
                >
                  <span
                    style={{
                      color:
                        preparingFreeSpotlightImage || publishingFreeSpotlight
                          ? "#94A3B8"
                          : "#0B2D4A",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {preparingFreeSpotlightImage
                      ? "Preparing picture..."
                      : freeSpotlightImageFile
                      ? "Replace picture"
                      : "Pick picture"}
                  </span>
                  <input
                    key={freeSpotlightImageInputKey}
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    disabled={preparingFreeSpotlightImage || publishingFreeSpotlight}
                    aria-label="Pick spotlight picture"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      void handleFreeSpotlightImagePicked(file);
                    }}
                    style={{
                      width: "100%",
                      minHeight: 42,
                      boxSizing: "border-box",
                      borderRadius: 12,
                      border: "1px solid rgba(16,37,59,0.14)",
                      background: "#FFFFFF",
                      color: "#07172C",
                      padding: "9px 10px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor:
                        preparingFreeSpotlightImage || publishingFreeSpotlight
                          ? "not-allowed"
                          : "pointer",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    borderRadius: 14,
                    border: "1px solid rgba(123,161,204,0.16)",
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)",
                    padding: 12,
                    boxShadow:
                      "0 8px 18px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
                  }}
                >
                  <span
                    style={{
                      color:
                        preparingFreeSpotlightVideo || publishingFreeSpotlight
                          ? "#94A3B8"
                          : "#0B2D4A",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {preparingFreeSpotlightVideo
                      ? "Preparing video..."
                      : freeSpotlightVideoFile
                      ? "Replace short video"
                      : "Pick short video"}
                  </span>
                  <input
                    key={freeSpotlightVideoInputKey}
                    type="file"
                    accept="video/*,.mp4,.webm,.mov"
                    disabled={preparingFreeSpotlightVideo || publishingFreeSpotlight}
                    aria-label="Pick spotlight short video"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      void handleFreeSpotlightVideoPicked(file);
                    }}
                    style={{
                      width: "100%",
                      minHeight: 42,
                      boxSizing: "border-box",
                      borderRadius: 12,
                      border: "1px solid rgba(16,37,59,0.14)",
                      background: "#FFFFFF",
                      color: "#07172C",
                      padding: "9px 10px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor:
                        preparingFreeSpotlightVideo || publishingFreeSpotlight
                          ? "not-allowed"
                          : "pointer",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={badge(Boolean(freeSpotlightImageFile))}>
                  {freeSpotlightImageFile
                    ? `Picture: ${formatFileSize(freeSpotlightImageFile.size)}`
                    : "Picture optional"}
                </span>
                <span style={badge(Boolean(freeSpotlightVideoFile))}>
                  {freeSpotlightVideoFile
                    ? `Video: ${formatFileSize(freeSpotlightVideoFile.size)}`
                    : `Video optional, ${SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}s max`}
                </span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 12.5,
                  fontWeight: 750,
                  lineHeight: 1.55,
                }}
              >
                These are native browser file controls. If the chooser does not
                open, refresh this page once so the newest picker code is loaded.
              </div>

              {freeSpotlightImagePreviewUrl || freeSpotlightVideoPreviewUrl ? (
                <div style={{ marginTop: 12 }}>
                  <div style={sectionLabel()}>Draft preview</div>
                  <div style={{ marginTop: 10 }}>
                    <SpotlightMediaFrame
                      imageUrl={freeSpotlightImagePreviewUrl}
                      videoUrl={freeSpotlightVideoPreviewUrl}
                      videoPoster={freeSpotlightImagePreviewUrl}
                      alt="Draft community spotlight"
                      frameStyle={{
                        minHeight: 220,
                        height: 220,
                        borderRadius: 16,
                        border: "1px solid rgba(212,175,55,0.14)",
                      }}
                      mediaStyle={{
                        width: "100%",
                        height: "100%",
                      }}
                      showVideoControls={Boolean(freeSpotlightVideoPreviewUrl)}
                      autoPlayVideo={Boolean(freeSpotlightVideoPreviewUrl)}
                      mutedVideo={Boolean(freeSpotlightVideoPreviewUrl)}
                      loopVideo={Boolean(freeSpotlightVideoPreviewUrl)}
                      showAudioUnlock={Boolean(freeSpotlightVideoPreviewUrl)}
                      audioUnlockLabel="Sound on"
                      maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
                    />
                  </div>
                </div>
              ) : null}

              {freeSpotlightFeedback ? (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    border:
                      freeSpotlightFeedback.tone === "error"
                        ? "1px solid rgba(138,28,28,0.18)"
                        : freeSpotlightFeedback.tone === "success"
                        ? "1px solid rgba(22,101,52,0.18)"
                        : "1px solid rgba(13,95,168,0.18)",
                    background:
                      freeSpotlightFeedback.tone === "error"
                        ? "#FFF5F5"
                        : freeSpotlightFeedback.tone === "success"
                        ? "#F0FDF4"
                        : "#F4F9FF",
                    color:
                      freeSpotlightFeedback.tone === "error"
                        ? "#8A1C1C"
                        : freeSpotlightFeedback.tone === "success"
                        ? "#166534"
                        : "#0B2D4A",
                    padding: "10px 12px",
                    fontSize: 13,
                    fontWeight: 800,
                    lineHeight: 1.55,
                  }}
                >
                  {freeSpotlightFeedback.text}
                </div>
              ) : null}

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
                  aria-disabled={publishingFreeSpotlight}
                  onClick={(event) => void handlePublishFreeSpotlight(event)}
                  style={actionBtn(
                    "primary",
                    publishingFreeSpotlight
                  )}
                >
                  {publishingFreeSpotlight
                    ? "Publishing..."
                    : preparingFreeSpotlightImage || preparingFreeSpotlightVideo
                    ? "Publish after media is ready"
                    : "Publish free spotlight"}
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
        <button
          type="button"
          aria-expanded={!collapsed.communities}
          aria-controls="community-home-communities-panel"
          {...communityButtonGuardProps()}
          onClick={toggleCommunitiesSectionFromHeader}
          onKeyDown={handleCommunitiesHeaderKeyDown}
          style={{
            ...communityToolRowStyle(),
            borderRadius: 18,
            boxShadow: "none",
          }}
        >
          <span style={communityActionIcon(false)}>🏘️</span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                color: "#07172C",
                fontSize: isCompact ? 15 : 16,
                fontWeight: 940,
                lineHeight: 1.18,
              }}
            >
              Your Communities
            </span>
            <span
              style={{
                display: "block",
                marginTop: 4,
                color: "#617085",
                fontSize: isCompact ? 12.2 : 13,
                fontWeight: 720,
                lineHeight: 1.35,
              }}
            >
              {sortedClans.length} {sortedClans.length === 1 ? "community" : "communities"}
            </span>
          </span>
          <span aria-hidden="true" style={{ color: "#1E5D91", fontSize: 24 }}>
            {collapsed.communities ? "›" : "⌄"}
          </span>
        </button>

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
                        Marketplace for this community
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
      </>
      ) : null}
      </div>
    </div>
  );
}
