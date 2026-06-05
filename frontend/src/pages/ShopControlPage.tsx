import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import ShopAssetsPage from "./ShopAssetsPage";
import {
  createMarketplaceShop,
  getPublicMarketplaceShopByGmfnId,
  getMe,
  getMarketplaceShopByGmfnId,
  getMyIdentityRisk,
  getSelectedClanId,
  createVaultShopAccessLink,
  extendVaultShopAccessLink,
  listVaultShopAccessLinks,
  revokeVaultShopAccessLink,
  safeCopy,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
} from "../lib/api";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  SPOTLIGHT_MAX_IMAGE_BYTES,
  SPOTLIGHT_MAX_VIDEO_BYTES,
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
} from "../lib/spotlightPilot";
import { publicFrontendUrl } from "../lib/publicLinks";
import { institutionalBlueRailShell } from "../lib/institutionalSurface";
import { rememberPublishRecovery } from "../lib/publishRecovery";
import { navigateWithOrigin } from "../lib/nav";

type ShopRecord = {
  id: number;
  clan_id?: number | null;
  owner_user_id?: number | null;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  image_url?: string | null;
  marketplace_name?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type ProductRecord = {
  id: number;
  shop_id: number;
  clan_id?: number;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  visibility_mode?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type BroadcastRecord = {
  id: number;
  shop_id?: number | null;
  message?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  priority_mode?: string | null;
  visibility_scope?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type VaultLinkRecord = {
  id: number;
  shop_id: number;
  product_id?: number | string | null;
  access_url?: string | null;
  token?: string | null;
  status?: string | null;
  expires_at?: string | null;
  max_views?: number | null;
  views_used?: number | null;
  allow_download?: boolean;
  allow_print?: boolean;
  allow_reshare?: boolean;
  watermark_enabled?: boolean;
  frontend_hint_path?: string | null;
  api_view_url?: string | null;
  created_at?: string | null;
  last_opened_at?: string | null;
};

type ExpectedPaymentRecord = {
  id?: number;
  expected_type?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference_display?: string | null;
  status?: string | null;
  due_at?: string | null;
  matched_bank_event_id?: number | null;
  confirmed_at?: string | null;
  meta?: any;
};

type TrustSlipFeatureSummary = {
  merchant_verify_active?: boolean | null;
  merchant_verify_subscription_required?: boolean | null;
  merchant_verify_detail?: string | null;
  public_verify_url?: string | null;
  code?: string | null;
  verification_code?: string | null;
  token?: string | null;
};

type ContinuityReviewState = {
  blocked: boolean;
  score: string;
  reason: string;
};

type NoticeTone = "success" | "error" | "info";

type SpotlightFeedbackState = { tone: NoticeTone; text: string } | null;

const OWNER_PUBLIC_PRODUCT_VISIBILITY_MODES = new Set([
  "community_visible",
  "public",
  "community",
  "public_gallery",
  "shop_gallery",
]);
type SpotlightFlowStep = "setup" | "upload" | "preview";
type SpotlightMediaChoice = "image" | "video" | "both";
type ShopControlLayerKey =
  | "overview"
  | "products"
  | "spotlight"
  | "shop-details"
  | "paid-tools"
  | "vault"
  | "summary";

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
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

const PAID_REPOST_HASH = "marketplace-paid-network-placement";

function shopControlLayerForTarget(targetId: string): ShopControlLayerKey {
  const normalized = safeStr(targetId).replace(/^#/, "").toLowerCase();
  if (normalized.includes("overview")) return "overview";
  if (normalized.includes("products")) return "products";
  if (normalized.includes("spotlight")) return "spotlight";
  if (normalized.includes("picture") || normalized.includes("gallery") || normalized.includes("face")) {
    return "overview";
  }
  if (normalized.includes("details")) return "shop-details";
  if (normalized.includes("vault")) return "vault";
  if (normalized.includes("unlock") || normalized.includes("paid") || normalized.includes("subscription")) {
    return "paid-tools";
  }
  if (normalized.includes("summary")) return "summary";
  return "overview";
}

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

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 26,
    border: "1px solid rgba(18,58,89,0.18)",
    background: bg === "#FFFFFF" ? "linear-gradient(180deg, #FDFEFF 0%, #EEF5FF 100%)" : bg,
    padding: "clamp(14px, 3.3vw, 20px)",
    boxShadow:
      "0 22px 48px rgba(2,12,27,0.15), 0 8px 20px rgba(8,40,72,0.09), inset 0 1px 0 rgba(255,255,255,0.94), inset 0 -2px 0 rgba(8,40,72,0.07)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(18,58,89,0.16)",
    background: bg === "#F8FBFF" ? "linear-gradient(180deg, #F5F9FF 0%, #E5EEFB 100%)" : bg,
    padding: 15,
    boxShadow:
      "0 14px 28px rgba(7,24,39,0.09), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -2px 0 rgba(8,40,72,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(18,58,89,0.16)",
    background: bg === "#F8FBFF" ? "linear-gradient(180deg, #F5F9FF 0%, #E5EEFB 100%)" : bg,
    padding: 12,
    boxShadow:
      "0 12px 26px rgba(7,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -2px 0 rgba(8,40,72,0.05)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4E6680",
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#466078",
    fontSize: 14,
    lineHeight: 1.68,
  };
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString();
}

function featureProofLine(
  payment: ExpectedPaymentRecord | null | undefined,
  options: {
    active: boolean;
    activeText: string;
    awaitingText: string;
    confirmedText: string;
  }
): string {
  if (options.active) return options.activeText;
  if (!payment) return options.awaitingText;
  if (safeStr(payment.confirmed_at)) return options.confirmedText;
  return `Waiting for payment confirmation after reference ${firstTruthy(
    payment.reference_display,
    "is issued"
  )}.`;
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary
      ? "linear-gradient(180deg, #FFF9D8 0%, #F2D16E 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #EAF4FF 100%)",
    color: primary ? "#6F4C00" : "#1D4267",
    border: primary
      ? "1px solid rgba(217,172,51,0.26)"
      : "1px solid rgba(13,95,168,0.11)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    textAlign: "center",
    boxShadow: primary
      ? "0 7px 14px rgba(217,172,51,0.13), inset 0 1px 0 rgba(255,255,255,0.72)"
      : "0 6px 12px rgba(7,24,39,0.06), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function controlGrid(isCompact: boolean, minWidth = 138): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact
      ? "repeat(2, minmax(0, 1fr))"
      : `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gridAutoRows: isCompact ? "64px" : "56px",
    gap: 10,
    alignItems: "stretch",
    overflowAnchor: "none",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 96,
    resize: "vertical",
    lineHeight: 1.6,
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(18,58,89,0.14)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 48%, #EAF4FF 100%)",
    padding: 14,
    boxShadow:
      "0 14px 26px rgba(7,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -2px 0 rgba(8,40,72,0.05)",
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  if (tone === "success") {
    return {
      ...softCard("#F3FBF5"),
      color: "#166534",
      border: "1px solid rgba(34,197,94,0.16)",
      fontWeight: 800,
    };
  }

  if (tone === "error") {
    return {
      ...softCard("#FEF2F2"),
      color: "#991B1B",
      border: "1px solid rgba(239,68,68,0.16)",
      fontWeight: 800,
    };
  }

  return {
    ...softCard("#F8FBFF"),
    color: "#24415C",
    border: "1px solid rgba(11,31,51,0.08)",
    fontWeight: 800,
  };
}

function getToken(): string {
  try {
    return localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiUrl(path: string): string {
  const raw = safeStr(path);
  if (/^https?:\/\//i.test(raw)) return raw;

  let cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (cleanPath.startsWith("/api/")) cleanPath = cleanPath.slice(4);

  return `${apiBase()}${cleanPath}`;
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  const contentType = String(res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    try {
      const parsed = text ? JSON.parse(text) : {};
      throw new Error(parsed?.detail || parsed?.message || text || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  if (!text) return {} as T;
  if (contentType.includes("application/json")) return JSON.parse(text) as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

export default function ShopControlPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [me, setMe] = useState<any>(null);
  const [continuityReview, setContinuityReview] = useState<ContinuityReviewState>({
    blocked: false,
    score: "",
    reason: "",
  });
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [spotlights, setSpotlights] = useState<BroadcastRecord[]>([]);
  const [vaultLinks, setVaultLinks] = useState<VaultLinkRecord[]>([]);
  const [activeOwnerLayer, setActiveOwnerLayer] =
    useState<ShopControlLayerKey>("overview");
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>([]);
  const [trustSlipFeature, setTrustSlipFeature] = useState<TrustSlipFeatureSummary | null>(
    null
  );
  const [creatingVaultInstruction, setCreatingVaultInstruction] = useState(false);
  const [creatingVaultLink, setCreatingVaultLink] = useState(false);
  const [busyVaultLinkId, setBusyVaultLinkId] = useState<number | null>(null);
  const [busyVaultLinkAction, setBusyVaultLinkAction] = useState<"extend" | "revoke" | null>(
    null
  );
  const [creatingMerchantVerifyInstruction, setCreatingMerchantVerifyInstruction] =
    useState(false);
  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [savingShop, setSavingShop] = useState(false);

  const [spotlightProductName, setSpotlightProductName] = useState("");
  const [spotlightPriceNote, setSpotlightPriceNote] = useState("");
  const [spotlightMessage, setSpotlightMessage] = useState("");
  const [spotlightImageUrl, setSpotlightImageUrl] = useState("");
  const [spotlightVideoUrl, setSpotlightVideoUrl] = useState("");
  const [spotlightImageFile, setSpotlightImageFile] = useState<File | null>(null);
  const [spotlightVideoFile, setSpotlightVideoFile] = useState<File | null>(null);
  const [spotlightImagePreviewUrl, setSpotlightImagePreviewUrl] = useState("");
  const [spotlightVideoPreviewUrl, setSpotlightVideoPreviewUrl] = useState("");
  const [spotlightVideoDurationSeconds, setSpotlightVideoDurationSeconds] =
    useState<number | null>(null);
  const [spotlightImageInputKey, setSpotlightImageInputKey] = useState(0);
  const [spotlightVideoInputKey, setSpotlightVideoInputKey] = useState(0);
  const [preparingSpotlightImage, setPreparingSpotlightImage] = useState(false);
  const [preparingSpotlightVideo, setPreparingSpotlightVideo] = useState(false);
  const [creatingSpotlight, setCreatingSpotlight] = useState(false);
  const [creatingSpotlightShop, setCreatingSpotlightShop] = useState(false);
  const [spotlightPriorityMode, setSpotlightPriorityMode] = useState<"free" | "paid">("free");
  const [spotlightPublishFeedback, setSpotlightPublishFeedback] =
    useState<SpotlightFeedbackState>(null);
  const [spotlightFlowStep, setSpotlightFlowStep] = useState<SpotlightFlowStep>("upload");
  const [spotlightMediaChoice, setSpotlightMediaChoice] =
    useState<SpotlightMediaChoice>("image");
  const spotlightImagePrepJobRef = useRef(0);
  const spotlightVideoPrepJobRef = useRef(0);
  const lastAutoScrolledHashRef = useRef("");
  const controlRevealFrameRef = useRef<number | null>(null);
  const controlRevealTargetRef = useRef("");
  const spotlightIdleTimerRef = useRef<number | null>(null);
  const spotlightSuccessTimerRef = useRef<number | null>(null);

  const selectedClanId = Number(getSelectedClanId() || 0);
  const shopActionsLocked = Boolean(continuityReview.blocked);
  const effectiveShopClanId = Number(shop?.clan_id || selectedClanId || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget(
        "dashboard",
        effectiveShopClanId,
        "shop-control.route.dashboard"
      ),
      marketplace: routeTarget(
        "marketplace",
        effectiveShopClanId,
        "shop-control.route.marketplace"
      ),
      shop: routeTarget("shop", effectiveShopClanId, "shop-control.route.shop"),
      shopGallery: routeTarget(
        "shop",
        effectiveShopClanId,
        "shop-control.route.gallery",
        { hash: "shop-control-gallery-tools" }
      ),
      shopAssets: routeTarget(
        "shopAssets",
        effectiveShopClanId,
        "shop-control.route.shop-assets"
      ),
      freeSpotlight: routeTarget(
        "freeSpotlight",
        effectiveShopClanId,
        "shop-control.route.free-spotlight"
      ),
      subscriptionSpotlight: routeTarget(
        "subscriptionSpotlight",
        effectiveShopClanId,
        "shop-control.route.subscription-spotlight"
      ),
      paidRepost: routeTarget(
        "marketplace",
        effectiveShopClanId,
        "shop-control.route.paid-repost",
        { hash: PAID_REPOST_HASH }
      ),
      vaultControl: routeTarget(
        "vaultControl",
        effectiveShopClanId,
        "shop-control.route.vault-control"
      ),
      trustSlip: routeTarget(
        "trustSlip",
        effectiveShopClanId,
        "shop-control.route.trust-slip"
      ),
    }),
    [effectiveShopClanId]
  );
  const shopHeroShortcuts = [
    { label: "Dashboard", icon: "\u{1F4CA}", to: routes.dashboard },
    { label: "Marketplace", icon: "\u{1F6CD}\uFE0F", to: routes.marketplace },
    { label: "Shop gallery", icon: "\u{1F5BC}\uFE0F", to: routes.shopGallery },
    { label: "Free spotlight", icon: "\u2B50", to: routes.freeSpotlight },
    { label: "Subscription spotlight", icon: "\u{1F4B3}", to: routes.subscriptionSpotlight },
    { label: "Paid Repost", icon: "\u{1F501}", to: routes.paidRepost },
    { label: "Vault", icon: "\u{1F510}", to: routes.vaultControl },
  ];

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
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!spotlightImageFile) {
      setSpotlightImagePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(spotlightImageFile);
    setSpotlightImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [spotlightImageFile]);

  useEffect(() => {
    if (!spotlightVideoFile) {
      setSpotlightVideoPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(spotlightVideoFile);
    setSpotlightVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [spotlightVideoFile]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  const cancelPendingControlReveal = useCallback(() => {
    controlRevealTargetRef.current = "";
    if (controlRevealFrameRef.current !== null) {
      window.cancelAnimationFrame(controlRevealFrameRef.current);
      controlRevealFrameRef.current = null;
    }
  }, []);

  const resetSpotlightIdleTimer = useCallback(() => {
    if (typeof window === "undefined") return;
    if (spotlightIdleTimerRef.current !== null) {
      window.clearTimeout(spotlightIdleTimerRef.current);
      spotlightIdleTimerRef.current = null;
    }

    if (!spotlightOpen) return;

    spotlightIdleTimerRef.current = window.setTimeout(() => {
      spotlightIdleTimerRef.current = null;
      setSpotlightOpen(false);
      setSpotlightPublishFeedback({
        tone: "info",
        text: "Spotlight portal closed after inactivity. Open it again when you are ready to continue.",
      });
      showNotice(
        "info",
        "Spotlight portal closed after inactivity. Open it again when you are ready to continue."
      );
    }, 5 * 60 * 1000);
  }, [spotlightOpen]);

  useEffect(() => {
    resetSpotlightIdleTimer();

    return () => {
      if (spotlightIdleTimerRef.current !== null) {
        window.clearTimeout(spotlightIdleTimerRef.current);
        spotlightIdleTimerRef.current = null;
      }
    };
  }, [
    resetSpotlightIdleTimer,
    spotlightOpen,
    spotlightFlowStep,
    spotlightPriorityMode,
    spotlightMediaChoice,
    spotlightProductName,
    spotlightPriceNote,
    spotlightMessage,
    spotlightImageFile,
    spotlightVideoFile,
  ]);

  function clearSpotlightDraft() {
    spotlightImagePrepJobRef.current += 1;
    spotlightVideoPrepJobRef.current += 1;
    setSpotlightProductName("");
    setSpotlightPriceNote("");
    setSpotlightMessage("");
    setSpotlightImageUrl("");
    setSpotlightVideoUrl("");
    setSpotlightImageFile(null);
    setSpotlightVideoFile(null);
    setSpotlightVideoDurationSeconds(null);
    setPreparingSpotlightImage(false);
    setPreparingSpotlightVideo(false);
    setSpotlightImageInputKey((prev) => prev + 1);
    setSpotlightVideoInputKey((prev) => prev + 1);
    setSpotlightPriorityMode("free");
    setSpotlightFlowStep("upload");
    setSpotlightMediaChoice("image");
    setSpotlightPublishFeedback(null);
  }

  const loadPage = useCallback(async (options?: { background?: boolean; preferredClanId?: number | null }) => {
    const background = Boolean(options?.background);
    const preferredClanId = Number(options?.preferredClanId || 0);
    if (!background) {
      setLoading(true);
    }

    try {
      const [meRes, riskRes] = await Promise.all([
        getMe().catch(() => null),
        getMyIdentityRisk().catch(() => null),
      ]);
      setMe(meRes || null);
      const continuity = (riskRes as any)?.continuity || {};
      const continuityStatus = String(continuity?.status || "").trim().toLowerCase();
      const continuityScore = Number(continuity?.score);
      setContinuityReview({
        blocked:
          continuityStatus === "reverify_required" ||
          continuityStatus === "protected_lock",
        score: Number.isFinite(continuityScore)
          ? String(Math.round(continuityScore))
          : "",
        reason: firstTruthy(
          continuity?.reason,
          "Identity continuity needs review before shop changes continue."
        ),
      });

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      if (!gmfnId) {
        setShop(null);
        setProducts([]);
        setSpotlights([]);
        setVaultLinks([]);
        return;
      }

      let shopRes = await getMarketplaceShopByGmfnId(gmfnId, {
        clan_id: preferredClanId > 0 ? preferredClanId : selectedClanId || undefined,
        header_clan_id: preferredClanId > 0 ? preferredClanId : selectedClanId || undefined,
      }).catch(() => null);
      if (!shopRes?.item && (preferredClanId > 0 || selectedClanId > 0)) {
        shopRes = await getMarketplaceShopByGmfnId(gmfnId).catch(() => shopRes);
      }
      if (!shopRes?.item) {
        const publicShopRes = await getPublicMarketplaceShopByGmfnId(gmfnId, {
          product_limit: 200,
          broadcast_limit: 20,
        }).catch(() => null);
        if (publicShopRes?.item) {
          shopRes = publicShopRes;
        }
      }

      const shopItem = (shopRes?.item || null) as ShopRecord | null;
      const shopProducts = Array.isArray(shopRes?.products)
        ? (shopRes.products as ProductRecord[])
        : [];
      const shopContextClanId = Number(
        shopItem?.clan_id || shopRes?.clan_id || preferredClanId || selectedClanId || 0
      );

      setShop(shopItem);
      setProducts(shopProducts);
      setShopName(firstTruthy(shopItem?.name));
      setShopDescription(firstTruthy(shopItem?.description));
      setWhatsApp(firstTruthy(shopItem?.whatsapp_number));
      setTelegramHandle(firstTruthy(shopItem?.telegram_handle));
      setImageUrlInput(firstTruthy(shopItem?.image_url));

      if (shopItem?.id) {
        const expectedPaymentsPath =
          `/api/payment-instructions/my/expected?clan_id=${shopContextClanId || 0}&limit=100`;

        const [broadcastsRes, vaultLinksRes, privateProductsRes, expectedRes, trustSlipRes] =
          await Promise.all([
          apiJson<any>(
            `/api/marketplace/broadcasts?clan_id=${shopContextClanId || 0}&limit=20`
          ).catch(() => ({ items: [] })),
          listVaultShopAccessLinks(shopItem.id).catch(() => []),
          apiJson<any>(
            `/api/marketplace/products?clan_id=${shopContextClanId || 0}&shop_id=${shopItem.id}&include_private_manage=true&limit=200`
          ).catch(() => ({ items: [] })),
          apiJson<any>(expectedPaymentsPath).catch(() => []),
          apiJson<any>("/api/trust-slips/me").catch(() => null),
        ]);

        const visibleSpotlights = Array.isArray(broadcastsRes?.items)
          ? (broadcastsRes.items as BroadcastRecord[]).filter(
              (item) => Number(item?.shop_id || 0) === Number(shopItem.id)
            )
          : [];

        const privateManagedProducts = Array.isArray(privateProductsRes?.items)
          ? (privateProductsRes.items as ProductRecord[])
          : [];

        setProducts(privateManagedProducts.length > 0 ? privateManagedProducts : shopProducts);
        setSpotlights(visibleSpotlights);
        setVaultLinks(
          Array.isArray(vaultLinksRes) ? (vaultLinksRes as VaultLinkRecord[]) : []
        );
        setExpectedPayments(
          Array.isArray(expectedRes)
            ? (expectedRes as ExpectedPaymentRecord[])
            : Array.isArray(expectedRes?.items)
              ? (expectedRes.items as ExpectedPaymentRecord[])
              : []
        );
        setTrustSlipFeature((trustSlipRes || null) as TrustSlipFeatureSummary | null);
      } else {
        setSpotlights([]);
        setVaultLinks([]);
        setExpectedPayments([]);
        setTrustSlipFeature(null);
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [selectedClanId]);

  const revealControlTarget = useCallback(function revealControlTarget(
    targetId: string,
    attempt = 0
  ) {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const target = document.getElementById(targetId);
    if (target) {
      cancelPendingControlReveal();
      target.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
      return;
    }

    if (attempt < 18) {
      controlRevealTargetRef.current = targetId;
      controlRevealFrameRef.current = window.requestAnimationFrame(() => {
        controlRevealFrameRef.current = null;
        if (controlRevealTargetRef.current !== targetId) return;
        revealControlTarget(targetId, attempt + 1);
      });
    }
  }, [cancelPendingControlReveal]);

  useEffect(() => {
    void loadPage();

    const timer = window.setInterval(() => {
      void loadPage({ background: true });
    }, 60000);

    function handleFocusRefresh() {
      void loadPage({ background: true });
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadPage({ background: true });
      }
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [loadPage]);

  useEffect(() => {
    return () => {
      cancelPendingControlReveal();
      if (spotlightSuccessTimerRef.current !== null) {
        window.clearTimeout(spotlightSuccessTimerRef.current);
        spotlightSuccessTimerRef.current = null;
      }
    };
  }, [cancelPendingControlReveal]);

  useEffect(() => {
    if (loading) return;

    const sectionParam = new URLSearchParams(location.search).get("section");
    const rawTargetId =
      safeStr(sectionParam) ||
      String(location.hash || "").replace(/^#/, "").trim();
    if (!rawTargetId) {
      lastAutoScrolledHashRef.current = "";
      return;
    }

    let targetId = rawTargetId;
    try {
      targetId = decodeURIComponent(rawTargetId);
    } catch {
      targetId = rawTargetId;
    }

    if (!targetId) return;
    if (targetId === "summary") targetId = "shop-control-summary";
    if (targetId === "picture-gallery") targetId = "shop-control-gallery-tools";
    if (targetId === "gallery-tools") targetId = "shop-control-gallery-tools";
    if (targetId === "products") targetId = "shop-control-gallery-tools";
    if (targetId === "spotlight") targetId = "shop-control-spotlight";
    if (targetId === "paid-spotlight") targetId = "shop-control-paid-spotlight";
    if (targetId === "vault") targetId = "shop-control-vault";
    if (lastAutoScrolledHashRef.current === targetId) return;

    lastAutoScrolledHashRef.current = targetId;

    if (targetId === "shop-control-paid-spotlight") {
      navigateWithOrigin(navigate, routes.subscriptionSpotlight, location, {
        replace: true,
      });
      return;
    }

    if (targetId === "shop-control-spotlight") {
      setSpotlightPriorityMode("free");
      setSpotlightFlowStep("upload");
      setSpotlightOpen(true);
    }

    if (targetId !== "shop-control-spotlight") {
      setActiveOwnerLayer(shopControlLayerForTarget(targetId));
    }

    cancelPendingControlReveal();
    revealControlTarget(targetId);
  }, [cancelPendingControlReveal, loading, location, location.hash, location.search, navigate, revealControlTarget, routes.subscriptionSpotlight, shop?.id]);

  const publicProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          OWNER_PUBLIC_PRODUCT_VISIBILITY_MODES.has(
            firstTruthy(item?.visibility_mode, "community_visible").toLowerCase()
          ) &&
          item?.is_active !== false
      ),
    [products]
  );

  const vaultProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          firstTruthy(item?.visibility_mode, "community_visible") === "vault_private" &&
          item?.is_active !== false
      ),
    [products]
  );

  const activeSpotlights = useMemo(() => {
    const now = Date.now();
    return spotlights.filter((item) => {
      const expiresRaw = safeStr(item?.expires_at);
      if (!expiresRaw) return true;
      const parsed = new Date(expiresRaw);
      if (Number.isNaN(parsed.getTime())) return true;
      return parsed.getTime() > now;
    });
  }, [spotlights]);

  const currentActiveSpotlight = useMemo(() => {
    if (activeSpotlights.length === 0) return null;

    return [...activeSpotlights].sort((a, b) => {
      const aTime = new Date(safeStr(a?.created_at || "")).getTime();
      const bTime = new Date(safeStr(b?.created_at || "")).getTime();
      const safeATime = Number.isFinite(aTime) ? aTime : 0;
      const safeBTime = Number.isFinite(bTime) ? bTime : 0;
      return safeBTime - safeATime;
    })[0];
  }, [activeSpotlights]);

  const communityName = useMemo(() => {
    return firstTruthy(
      shop?.marketplace_name,
      shop?.clan_id ? `Community ${shop.clan_id}` : "",
      "Selected community"
    );
  }, [shop]);

  const featurePayments = useMemo(() => {
    return expectedPayments.filter((item) =>
      ["vault_subscription", "merchant_verify_subscription", "spotlight_subscription"].includes(
        firstTruthy(item?.expected_type).toLowerCase()
      )
    );
  }, [expectedPayments]);

  const latestVaultPayment = useMemo(
    () =>
      featurePayments.find(
        (item) => firstTruthy(item?.expected_type).toLowerCase() === "vault_subscription"
      ) || null,
    [featurePayments]
  );

  const latestMerchantVerifyPayment = useMemo(
    () =>
      featurePayments.find(
        (item) =>
          firstTruthy(item?.expected_type).toLowerCase() === "merchant_verify_subscription"
      ) || null,
    [featurePayments]
  );

  const latestSpotlightPayment = useMemo(
    () =>
      featurePayments.find(
        (item) => firstTruthy(item?.expected_type).toLowerCase() === "spotlight_subscription"
      ) || null,
    [featurePayments]
  );

  const activePaidSpotlights = useMemo(
    () =>
      activeSpotlights.filter(
        (item) => firstTruthy(item?.priority_mode, "free").toLowerCase() === "paid"
      ),
    [activeSpotlights]
  );

  const vaultProofText = useMemo(
    () =>
      featureProofLine(latestVaultPayment, {
        active: vaultProducts.length > 0 || vaultLinks.length > 0,
        activeText:
          "Vault is active. You can now add private offers and share access links.",
        awaitingText:
          "Vault is not active yet. Start a Vault payment request first.",
        confirmedText:
          "Vault payment is confirmed. You can now add private offers.",
      }),
    [latestVaultPayment, vaultLinks.length, vaultProducts.length]
  );

  const merchantVerifyProofText = useMemo(
    () =>
      featureProofLine(latestMerchantVerifyPayment, {
        active: Boolean(trustSlipFeature?.merchant_verify_active),
        activeText:
          "Shop verification is active. Visitors can now rely on your verification page.",
        awaitingText:
          "Shop verification is not active yet. Start the payment request first.",
        confirmedText:
          "Shop verification payment is confirmed. Your verification page should now be active.",
      }),
    [latestMerchantVerifyPayment, trustSlipFeature?.merchant_verify_active]
  );

  const spotlightProofText = useMemo(
    () =>
      featureProofLine(latestSpotlightPayment, {
        active: activePaidSpotlights.length > 0,
        activeText:
          "Paid spotlight is active. Your shop now has priority visibility.",
        awaitingText:
          "No paid spotlight is active yet. Start the spotlight payment request first.",
        confirmedText:
          "Spotlight payment is confirmed. You can now start one paid spotlight for this shop.",
      }),
    [activePaidSpotlights.length, latestSpotlightPayment]
  );

  const vaultStateLabel = vaultProducts.length > 0 || vaultLinks.length > 0
    ? "Usable now"
    : safeStr(latestVaultPayment?.confirmed_at)
      ? "Confirmed"
      : latestVaultPayment
        ? "Awaiting confirmation"
        : "No payment request";

  const merchantVerifyStateLabel = trustSlipFeature?.merchant_verify_active
    ? "Usable now"
    : safeStr(latestMerchantVerifyPayment?.confirmed_at)
      ? "Confirmed"
      : latestMerchantVerifyPayment
        ? "Awaiting confirmation"
        : "No payment request";

  const canStartPaidSpotlight = Boolean(
    safeStr(latestSpotlightPayment?.confirmed_at) && activePaidSpotlights.length === 0
  );

  const spotlightHasImage = Boolean(spotlightImageFile);
  const spotlightHasVideo = Boolean(spotlightVideoFile);
  const spotlightHasChosenMedia =
    spotlightHasImage || spotlightHasVideo;
  const spotlightHasProductText = Boolean(
    safeStr(spotlightProductName) ||
      safeStr(spotlightPriceNote) ||
      safeStr(spotlightMessage)
  );
  const spotlightCanContinueToPreview =
    spotlightHasProductText ||
    (spotlightMediaChoice === "both"
      ? spotlightHasChosenMedia
      : spotlightMediaChoice === "image"
      ? spotlightHasImage
      : spotlightHasVideo);

  function pinShopControlLinkSection(sectionId?: string | null) {
    const targetId = safeStr(sectionId);
    if (!targetId) return;

    lastAutoScrolledHashRef.current = targetId;
    navigateWithOrigin(
      navigate,
      {
        pathname: location.pathname,
        search: "",
        hash: `#${targetId}`,
      },
      location,
      { replace: true, preventScrollReset: true }
    );
  }

  async function copyText(
    text: string,
    successMessage: string,
    sectionId?: string
  ): Promise<boolean> {
    if (!text) {
      showNotice("error", "Nothing to copy yet.");
      return false;
    }

    pinShopControlLinkSection(sectionId);
    const copied = await safeCopy(text);
    showNotice(
      copied ? "success" : "error",
      copied
        ? successMessage
        : "Clipboard copy was blocked. Select the text and copy it manually."
    );
    return copied;
  }

  function vaultLinkUrl(link: VaultLinkRecord | null | undefined): string {
    const raw = firstTruthy(
      link?.access_url,
      link?.frontend_hint_path,
      link?.api_view_url,
      link?.token ? `/vault/${encodeURIComponent(String(link.token))}` : ""
    );
    if (!raw) return "";
    return publicFrontendUrl(raw);
  }

  function vaultDefaultExpiry(): string {
    const next = new Date();
    next.setHours(next.getHours() + 72);
    return next.toISOString();
  }

  async function createVaultViewingLink() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }
    const firstVaultProduct = vaultProducts[0];
    if (!firstVaultProduct?.id) {
      showNotice("error", "Add a private Vault offer before creating a link.");
      return;
    }

    setCreatingVaultLink(true);
    try {
      const link = await createVaultShopAccessLink({
        shop_id: shop.id,
        product_id: firstVaultProduct.id,
        expires_at: vaultDefaultExpiry(),
        max_views: 20,
        watermark_enabled: true,
      });
      setVaultLinks((prev) => [link as VaultLinkRecord, ...prev]);
      await copyText(
        vaultLinkUrl(link as VaultLinkRecord),
        "Vault viewing link for one private offer created and copied.",
        "shop-control-vault"
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault viewing link could not be created.");
    } finally {
      setCreatingVaultLink(false);
    }
  }

  async function revokeVaultViewingLink(link: VaultLinkRecord) {
    const linkId = Number(link?.id || 0);
    if (!linkId) {
      showNotice("error", "Vault link is not available.");
      return;
    }

    setBusyVaultLinkId(linkId);
    setBusyVaultLinkAction("revoke");
    try {
      const updated = await revokeVaultShopAccessLink(linkId);
      setVaultLinks((prev) =>
        prev.map((item) =>
          Number(item.id) === linkId ? (updated as VaultLinkRecord) : item
        )
      );
      showNotice("success", "Vault viewing link revoked.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault viewing link could not be revoked.");
    } finally {
      setBusyVaultLinkId(null);
      setBusyVaultLinkAction(null);
    }
  }

  async function extendVaultViewingLink(link: VaultLinkRecord) {
    const linkId = Number(link?.id || 0);
    if (!linkId) {
      showNotice("error", "Vault link is not available.");
      return;
    }

    setBusyVaultLinkId(linkId);
    setBusyVaultLinkAction("extend");
    try {
      const updated = await extendVaultShopAccessLink(linkId, vaultDefaultExpiry());
      setVaultLinks((prev) =>
        prev.map((item) =>
          Number(item.id) === linkId ? (updated as VaultLinkRecord) : item
        )
      );
      showNotice("success", "Vault viewing link extended for 72 more hours.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault viewing link could not be extended.");
    } finally {
      setBusyVaultLinkId(null);
      setBusyVaultLinkAction(null);
    }
  }

  function collapseSpotlightTools(event?: React.SyntheticEvent<HTMLElement>) {
    event?.stopPropagation();

    if (spotlightIdleTimerRef.current !== null) {
      window.clearTimeout(spotlightIdleTimerRef.current);
      spotlightIdleTimerRef.current = null;
    }
    if (spotlightSuccessTimerRef.current !== null) {
      window.clearTimeout(spotlightSuccessTimerRef.current);
      spotlightSuccessTimerRef.current = null;
    }
    setSpotlightOpen(false);
    setSpotlightFlowStep("upload");
  }

  function scheduleSpotlightSuccessCollapse() {
    if (typeof window === "undefined") {
      setSpotlightOpen(false);
      setSpotlightFlowStep("upload");
      return;
    }

    if (spotlightIdleTimerRef.current !== null) {
      window.clearTimeout(spotlightIdleTimerRef.current);
      spotlightIdleTimerRef.current = null;
    }
    if (spotlightSuccessTimerRef.current !== null) {
      window.clearTimeout(spotlightSuccessTimerRef.current);
    }

    spotlightSuccessTimerRef.current = window.setTimeout(() => {
      spotlightSuccessTimerRef.current = null;
      setSpotlightOpen(false);
      setSpotlightFlowStep("upload");
      setSpotlightPublishFeedback({
        tone: "success",
        text: "Spotlight published. The spotlight portal closed so you can continue with other shop work.",
      });
    }, 1200);
  }

  function openExternalLink(url?: string | null, sectionId?: string) {
    const resolved = safeStr(url);
    if (!resolved) {
      showNotice("error", "Link is not ready yet.");
      return;
    }
    pinShopControlLinkSection(sectionId);
    const opened = window.open(resolved, "_blank", "noopener,noreferrer");
    if (!opened) {
      showNotice("error", "The browser blocked that window. Copy the link and open it yourself.");
      return;
    }
    showNotice("success", "Opening link now.");
  }

  function paidToolActionLabel(options: {
    locked: boolean;
    busy?: boolean;
    idle: string;
    busyText?: string;
  }) {
    if (options.locked) return "Identity first";
    if (options.busy) return options.busyText || "Working...";
    return options.idle;
  }

  async function createVaultInstruction(quantityTotal: 1 | 6) {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }

    setCreatingVaultInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/vault", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          quantity_total: quantityTotal,
          currency: "GBP",
        }),
      });

      await loadPage();
      const copied = await copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Vault payment reference copied."
      );
      showNotice(
        copied ? "success" : "error",
        copied
          ? `Vault payment request created for ${quantityTotal} slot${quantityTotal > 1 ? "s" : ""}. Reference copied.`
          : `Vault payment request created for ${quantityTotal} slot${quantityTotal > 1 ? "s" : ""}, but clipboard copy was blocked. Copy the reference shown here.`
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault payment request could not be created.");
    } finally {
      setCreatingVaultInstruction(false);
    }
  }

  async function createMerchantVerifyInstruction() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }

    setCreatingMerchantVerifyInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/merchant-verify", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          amount: "1.00",
          currency: "GBP",
        }),
      });

      await loadPage();
      const copied = await copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Shop verification payment reference copied."
      );
      showNotice(
        copied ? "success" : "error",
        copied
          ? "Shop verification payment request created. Reference copied."
          : "Shop verification payment request created, but clipboard copy was blocked. Copy the reference shown here."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Shop verification payment request could not be created."
      );
    } finally {
      setCreatingMerchantVerifyInstruction(false);
    }
  }

  function fallbackShopName(): string {
    return (
      safeStr(shopName) ||
      firstTruthy(me?.display_name, me?.email).replace(/@.*$/, "").trim() ||
      firstTruthy(me?.gmfn_id) ||
      "My GSN Shop"
    );
  }

  async function saveShopDetails(extra?: Partial<ShopRecord> & { clear_image?: boolean }) {
    setSavingShop(true);

    try {
      const body: any = {
        clan_id: Number(shop?.clan_id || selectedClanId || 0) || null,
        name: safeStr(extra?.name ?? shopName) || fallbackShopName(),
        description: safeStr(extra?.description ?? shopDescription) || null,
        whatsapp_number: safeStr(extra?.whatsapp_number ?? whatsApp) || null,
        telegram_handle: safeStr(extra?.telegram_handle ?? telegramHandle) || null,
      };

      if (shop?.id && extra?.clear_image) {
        body.clear_image = true;
      } else if (extra && "image_url" in extra) {
        body.image_url = safeStr(extra.image_url) || null;
      } else {
        body.image_url = safeStr(imageUrlInput) || null;
      }

      const res = await apiJson<any>(shop?.id ? `/api/marketplace/shops/${shop.id}` : "/api/marketplace/shops", {
        method: shop?.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });

      const updated = (res?.item || shop) as ShopRecord;
      setShop(updated);
      setShopName(firstTruthy(updated?.name));
      setShopDescription(firstTruthy(updated?.description));
      setWhatsApp(firstTruthy(updated?.whatsapp_number));
      setTelegramHandle(firstTruthy(updated?.telegram_handle));
      setImageUrlInput(firstTruthy(updated?.image_url));
      setActiveOwnerLayer("overview");
      showNotice("success", "Shop details saved. Shop details control closed.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Shop details could not be saved.");
    } finally {
      setSavingShop(false);
    }
  }

  async function ensureSpotlightShopRecord(): Promise<ShopRecord | null> {
    if (shop?.id) {
      setSpotlightFlowStep("upload");
      return shop;
    }

    const clanId = Number(selectedClanId || 0);
    if (clanId <= 0) {
      const message =
        "Select the community first, then GSN can create the shop record that spotlight belongs to.";
      setSpotlightPublishFeedback({ tone: "error", text: message });
      showNotice("error", message);
      return null;
    }

    const preparedShopName =
      safeStr(shopName) ||
      firstTruthy(me?.display_name, me?.email).replace(/@.*$/, "").trim() ||
      "My GSN Shop";

    setCreatingSpotlightShop(true);
    setSpotlightPublishFeedback(null);

    try {
      const res = await createMarketplaceShop({
        clan_id: clanId,
        name: preparedShopName,
        description: safeStr(shopDescription) || null,
        whatsapp_number: safeStr(whatsApp) || null,
        telegram_handle: safeStr(telegramHandle) || null,
      });

      const created = (res?.item || null) as ShopRecord | null;
      if (!created?.id) {
        throw new Error("GSN could not prepare the shop record for spotlight yet.");
      }

      setShop(created);
      setShopName(firstTruthy(created?.name, preparedShopName));
      setShopDescription(firstTruthy(created?.description, shopDescription));
      setWhatsApp(firstTruthy(created?.whatsapp_number, whatsApp));
      setTelegramHandle(firstTruthy(created?.telegram_handle, telegramHandle));
      setImageUrlInput(firstTruthy(created?.image_url));
      setSpotlightFlowStep("upload");
      const successMessage =
        "Shop record is ready. Continue with the product spotlight.";
      setSpotlightPublishFeedback({ tone: "success", text: successMessage });
      showNotice("success", successMessage);
      await loadPage({ background: true, preferredClanId: Number(created?.clan_id || clanId) });
      return created;
    } catch (err: any) {
      const errorMessage =
        safeStr(err?.message) || "GSN could not create the shop record yet.";
      setSpotlightPublishFeedback({ tone: "error", text: errorMessage });
      showNotice("error", errorMessage);
      return null;
    } finally {
      setCreatingSpotlightShop(false);
    }
  }

  async function handleSpotlightImagePicked(file: File | null) {
    spotlightImagePrepJobRef.current += 1;
    const prepJob = spotlightImagePrepJobRef.current;

    setPreparingSpotlightImage(false);

    if (!file) {
      setSpotlightImageInputKey((prev) => prev + 1);
      return;
    }

    const validationIssue = validateSpotlightImageFile(file, false);
    if (validationIssue) {
      showNotice("error", validationIssue);
      setSpotlightImageInputKey((prev) => prev + 1);
      return;
    }

    try {
      setPreparingSpotlightImage(true);
      const prepared = await prepareSpotlightImageFile(file, {
        maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
      });

      if (spotlightImagePrepJobRef.current !== prepJob) return;

      const preparedValidationIssue = validateSpotlightImageFile(prepared.file, true);
      if (preparedValidationIssue) {
        showNotice("error", preparedValidationIssue);
        setSpotlightImageInputKey((prev) => prev + 1);
        return;
      }

      setSpotlightImageFile(prepared.file);
      setSpotlightPublishFeedback(null);
      if (spotlightMediaChoice === "image" || spotlightMediaChoice === "both") {
        setSpotlightFlowStep("preview");
      }
      if (prepared.message) {
        showNotice("info", prepared.message);
      } else {
        showNotice(
          "info",
          `${safeStr(prepared.file.name) || "Selected image"} is ready for spotlight publish.`
        );
      }
    } catch (err: any) {
      if (spotlightImagePrepJobRef.current !== prepJob) return;
      showNotice(
        "error",
        safeStr(err?.message) || "This image could not be prepared for spotlight publish."
      );
      setSpotlightImageInputKey((prev) => prev + 1);
    } finally {
      if (spotlightImagePrepJobRef.current === prepJob) {
        setPreparingSpotlightImage(false);
      }
    }
  }

  async function handleSpotlightVideoPicked(file: File | null) {
    spotlightVideoPrepJobRef.current += 1;
    const prepJob = spotlightVideoPrepJobRef.current;

    setPreparingSpotlightVideo(false);

    if (!file) {
      setSpotlightVideoInputKey((prev) => prev + 1);
      return;
    }

    const validationIssue = validateSpotlightVideoFile(file, false);
    if (validationIssue) {
      showNotice("error", validationIssue);
      setSpotlightVideoInputKey((prev) => prev + 1);
      return;
    }

    try {
      setPreparingSpotlightVideo(true);
      const prepared = await prepareSpotlightVideoFile(file, {
        maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
        maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
      });

      if (spotlightVideoPrepJobRef.current !== prepJob) return;

      const preparedValidationIssue = validateSpotlightVideoFile(prepared.file, true);
      if (preparedValidationIssue) {
        showNotice("error", preparedValidationIssue);
        setSpotlightVideoInputKey((prev) => prev + 1);
        return;
      }

      setSpotlightVideoFile(prepared.file);
      setSpotlightVideoDurationSeconds(prepared.durationSeconds ?? null);
      setSpotlightPublishFeedback(null);
      if (spotlightMediaChoice === "video" || spotlightMediaChoice === "both") {
        setSpotlightFlowStep("preview");
      }
      if (prepared.message) {
        showNotice("info", prepared.message);
      } else {
        showNotice(
          "info",
          `${safeStr(prepared.file.name) || "Selected video"} is ready for spotlight publish.`
        );
      }
    } catch (err: any) {
      if (spotlightVideoPrepJobRef.current !== prepJob) return;

      const canUseOriginalForPilot =
        Number(file.size || 0) <= SPOTLIGHT_MAX_VIDEO_BYTES &&
        !validateSpotlightVideoFile(file, true);

      if (canUseOriginalForPilot) {
        setSpotlightVideoFile(file);
        setSpotlightVideoDurationSeconds(null);
        setSpotlightPublishFeedback(null);
        if (spotlightMediaChoice === "video") {
          setSpotlightFlowStep("preview");
        }
        showNotice(
          "info",
          "This phone could not trim the video automatically, so GSN will use the uploaded file and play it as a 10-second spotlight clip."
        );
        return;
      }

      showNotice(
        "error",
        safeStr(err?.message) || "This video could not be prepared for spotlight publish."
      );
      setSpotlightVideoInputKey((prev) => prev + 1);
    } finally {
      if (spotlightVideoPrepJobRef.current === prepJob) {
        setPreparingSpotlightVideo(false);
      }
    }
  }

  function composeSpotlightMessage(): string {
    const parts = [
      safeStr(spotlightProductName),
      safeStr(spotlightPriceNote),
      safeStr(spotlightMessage),
    ].filter(Boolean);

    return parts.join(" - ");
  }

  async function handleCreateSpotlight() {
    if (creatingSpotlight) {
      setSpotlightPublishFeedback({
        tone: "info",
        text: "Spotlight publish is already running. Wait for it to finish.",
      });
      return;
    }

    rememberPublishRecovery(
      routes.freeSpotlight,
      "shop-control.spotlight.preview.publish"
    );

    if (shopActionsLocked && spotlightPriorityMode === "paid") {
      const lockMessage =
        "Identity review is blocking paid spotlight right now. Open the identity review first, then return here to publish.";
      setSpotlightPublishFeedback({ tone: "error", text: lockMessage });
      showNotice("error", lockMessage);
      return;
    }

    const activeShop = shop?.id ? shop : await ensureSpotlightShopRecord();
    if (!activeShop?.id) {
      const missingShopMessage =
        "GSN could not connect this spotlight to your shop yet. Check the selected community, then try publish again.";
      setSpotlightPublishFeedback({ tone: "error", text: missingShopMessage });
      showNotice("error", missingShopMessage);
      return;
    }

    const targetClanId = Number(activeShop?.clan_id || selectedClanId || effectiveShopClanId || 0);

    if (preparingSpotlightImage || preparingSpotlightVideo) {
      const preparingMessage =
        "Please wait while the app prepares your spotlight media, then tap Publish again.";
      setSpotlightPublishFeedback({ tone: "info", text: preparingMessage });
      showNotice("error", preparingMessage);
      return;
    }

    const message = composeSpotlightMessage();
    const manualImageUrl = safeStr(spotlightImageUrl);
    const manualVideoUrl = safeStr(spotlightVideoUrl);

    if (!message && !manualImageUrl && !manualVideoUrl && !spotlightImageFile && !spotlightVideoFile) {
      const emptyMessage =
        "Add product details, price, picture, or short video first, then tap Publish.";
      setSpotlightPublishFeedback({ tone: "error", text: emptyMessage });
      showNotice("error", emptyMessage);
      return;
    }

    const imageValidationIssue = validateSpotlightImageFile(spotlightImageFile);
    if (imageValidationIssue) {
      setSpotlightPublishFeedback({ tone: "error", text: imageValidationIssue });
      showNotice("error", imageValidationIssue);
      return;
    }

    const videoValidationIssue = validateSpotlightVideoFile(spotlightVideoFile);
    if (videoValidationIssue) {
      setSpotlightPublishFeedback({ tone: "error", text: videoValidationIssue });
      showNotice("error", videoValidationIssue);
      return;
    }

    setCreatingSpotlight(true);
    setSpotlightPublishFeedback(null);

    try {
      let imageUrl = manualImageUrl;
      let videoUrl = manualVideoUrl;

      if (spotlightImageFile) {
        const uploadRes = await uploadMarketplaceImageFile(
          spotlightImageFile,
          targetClanId || null
        );
        imageUrl = firstTruthy(
          uploadRes?.image_url,
          uploadRes?.url,
          uploadRes?.file_url,
          uploadRes?.path,
          uploadRes?.item?.image_url,
          uploadRes?.data?.image_url
        );

        if (!imageUrl) {
          throw new Error(
            "Image upload completed but the system did not return a usable image link."
          );
        }
      }

      if (spotlightVideoFile) {
        const uploadRes = await uploadMarketplaceVideoFile(
          spotlightVideoFile,
          spotlightVideoDurationSeconds != null &&
            spotlightVideoDurationSeconds <= SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS
            ? spotlightVideoDurationSeconds
            : null,
          targetClanId || null
        );
        videoUrl = firstTruthy(
          uploadRes?.video_url,
          uploadRes?.url,
          uploadRes?.file_url,
          uploadRes?.path,
          uploadRes?.item?.video_url,
          uploadRes?.data?.video_url
        );

        if (!videoUrl) {
          throw new Error(
            "Video upload completed but the system did not return a usable video link."
          );
        }
      }

      const createRes = await apiJson<any>("/api/marketplace/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          clan_id: targetClanId,
          shop_id: Number(activeShop.id),
          message: message || "Spotlight update",
          image_url: imageUrl || null,
          video_url: videoUrl || null,
          priority_mode: spotlightPriorityMode,
          visibility_scope: "direct_communities",
        }),
      });

      const createdSpotlight =
        (createRes as any)?.item ||
        (Array.isArray((createRes as any)?.items)
          ? (createRes as any).items?.[0]
          : null);
      const optimisticSpotlight = {
        ...(createdSpotlight || {}),
        id: Number(createdSpotlight?.id || Date.now()),
        clan_id: Number(createdSpotlight?.clan_id || targetClanId || 0),
        shop_id: Number(createdSpotlight?.shop_id || activeShop.id || 0),
        message: firstTruthy(createdSpotlight?.message, message, "Spotlight update"),
        image_url: firstTruthy(createdSpotlight?.image_url, imageUrl),
        video_url: firstTruthy(createdSpotlight?.video_url, videoUrl),
        priority_mode: firstTruthy(createdSpotlight?.priority_mode, spotlightPriorityMode),
        visibility_scope: firstTruthy(
          createdSpotlight?.visibility_scope,
          "direct_communities"
        ),
        created_at: firstTruthy(createdSpotlight?.created_at, new Date().toISOString()),
        source_shop_name: firstTruthy(createdSpotlight?.source_shop_name, activeShop.name),
      };

      const successMessage =
        `${spotlightPriorityMode === "paid" ? "Paid" : "Free"} spotlight published` +
        `${videoUrl ? " with short video." : "."}`;

      clearSpotlightDraft();
      setSpotlights((prev) => [
        optimisticSpotlight,
        ...prev.filter((item) => Number(item?.id || 0) !== Number(optimisticSpotlight.id)),
      ]);
      setSpotlightPublishFeedback({
        tone: "success",
        text: successMessage,
      });
      showNotice("success", successMessage);
      scheduleSpotlightSuccessCollapse();

      try {
        await loadPage({
          background: true,
          preferredClanId: targetClanId,
        });
      } catch (refreshErr: any) {
        const refreshMessage =
          safeStr(refreshErr?.message) ||
          "Spotlight published, but the page could not refresh immediately.";
        setSpotlightPublishFeedback({
          tone: "info",
          text: refreshMessage,
        });
        showNotice("info", refreshMessage);
      }
    } catch (err: any) {
      const errorMessage =
        safeStr(err?.message) || "Spotlight could not be created.";
      setSpotlightPublishFeedback({
        tone: "error",
        text: errorMessage,
      });
      showNotice("error", errorMessage);
    } finally {
      setCreatingSpotlight(false);
    }
  }

  const spotlightModeIsPaid = spotlightPriorityMode === "paid";
  const spotlightPortalTitle = spotlightModeIsPaid
    ? "Spotlight Subscription"
    : "Free Spotlight";
  const spotlightPortalSubtitle = spotlightModeIsPaid
    ? "Use the paid lane only after the subscription payment is confirmed."
    : "Show one clear shop update to people inside your community.";
  const spotlightLaneEmoji = spotlightModeIsPaid ? "💳" : "📣";
  const spotlightStepBadges = [
    { key: "upload", label: "1. Product update" },
    { key: "preview", label: "2. Publish" },
  ];
  const spotlightPreviewHasPicture = Boolean(spotlightImageFile || safeStr(spotlightImageUrl));
  const spotlightPreviewHasVideo = Boolean(spotlightVideoFile || safeStr(spotlightVideoUrl));
  const spotlightPreviewMessage = composeSpotlightMessage();

  const spotlightWorkflowSection = spotlightOpen ? (
    <section
      id="shop-control-spotlight"
      style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 54%, #EAF3FF 100%)")}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "72px minmax(0, 1fr)",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: 22,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(180deg, #102D4C 0%, #061827 100%)",
            color: "#F8D876",
            fontSize: 30,
            boxShadow:
              "0 18px 34px rgba(6,24,39,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
          }}
        >
          {spotlightLaneEmoji}
        </div>

        <div>
          <div style={sectionLabel()}>Spotlight publisher</div>
          <div
            style={{
              marginTop: 8,
              color: "#07172C",
              fontSize: isCompact ? 23 : 28,
              fontWeight: 950,
              lineHeight: 1.08,
            }}
          >
            {spotlightPortalTitle}
          </div>
          <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
            {spotlightPortalSubtitle}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {spotlightStepBadges.map((item) => (
          <span key={item.key} style={badge(spotlightFlowStep === item.key)}>
            {item.label}
          </span>
        ))}
        <span style={badge(false)}>Community: {communityName}</span>
      </div>

      {currentActiveSpotlight ? (
        <div
          style={{
            marginTop: 14,
            ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
            border: "1px solid rgba(11,31,51,0.08)",
          }}
        >
          <div style={sectionLabel()}>📣 Live now</div>
          <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 16 }}>
            {firstTruthy(currentActiveSpotlight?.message, "Live spotlight is active.")}
          </div>
          <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
            Publishing a new one will replace the current live spotlight for this shop.
          </div>
        </div>
      ) : null}

      {spotlightPublishFeedback ? (
        <div style={{ marginTop: 14, ...noticeCard(spotlightPublishFeedback.tone) }}>
          {spotlightPublishFeedback.text}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 14,
        }}
      >
        {spotlightFlowStep === "setup" ? (
          <>
            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
              <div style={sectionLabel()}>🛍️ Prepare shop</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
                Add the basic shop record first.
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Spotlight must belong to a real shop, so people know who they are seeing.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                  <div style={sectionLabel()}>Shop name</div>
                  <input
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Shop name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>WhatsApp</div>
                  <input
                    value={whatsApp}
                    onChange={(e) => setWhatsApp(e.target.value)}
                    placeholder="WhatsApp number"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Telegram</div>
                  <input
                    value={telegramHandle}
                    onChange={(e) => setTelegramHandle(e.target.value)}
                    placeholder="Telegram handle"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                  <div style={sectionLabel()}>Description</div>
                  <textarea
                    value={shopDescription}
                    onChange={(e) => setShopDescription(e.target.value)}
                    placeholder="Tell people what this shop offers..."
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, ...controlGrid(isCompact, 150) }}>
                <PrimaryButton
                  type="button"
                  onClick={() => ensureSpotlightShopRecord()}
                  disabled={creatingSpotlightShop}
                  busy={creatingSpotlightShop}
                  busyLabel="Preparing shop..."
                  fullWidth
                  debugId="shop-control.spotlight.setup.continue"
                >
                  Continue
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={collapseSpotlightTools}
                  fullWidth
                  debugId="shop-control.spotlight.setup.cancel"
                >
                  Cancel spotlight
                </SecondaryButton>
              </div>
            </div>
          </>
        ) : spotlightFlowStep === "upload" ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  ...innerCard(
                    spotlightPriorityMode === "free"
                      ? "linear-gradient(180deg, #0B2D4A 0%, #061827 100%)"
                      : "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
                  ),
                  border:
                    spotlightPriorityMode === "free"
                      ? "1px solid rgba(242,199,102,0.36)"
                      : "1px solid rgba(13,95,168,0.12)",
                }}
              >
                <div style={{ fontSize: 26, lineHeight: 1 }}>📣</div>
                <div
                  style={{
                    marginTop: 10,
                    color: spotlightPriorityMode === "free" ? "#FFFFFF" : "#07172C",
                    fontSize: 17,
                    fontWeight: 950,
                  }}
                >
                  Free Spotlight
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: spotlightPriorityMode === "free" ? "#D7E3F1" : "#466078",
                    fontSize: 13,
                    lineHeight: 1.45,
                    fontWeight: 700,
                  }}
                >
                  Normal community visibility.
                </div>
                <SecondaryButton
                  type="button"
                  onClick={() => setSpotlightPriorityMode("free")}
                  fullWidth
                  style={{ marginTop: 12 }}
                  debugId="shop-control.spotlight.free-lane"
                >
                  Use free lane
                </SecondaryButton>
              </div>

              <div
                style={{
                  ...innerCard(
                    spotlightPriorityMode === "paid"
                      ? "linear-gradient(180deg, #FFF8DE 0%, #F8E6A6 100%)"
                      : "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
                  ),
                  border:
                    spotlightPriorityMode === "paid"
                      ? "1px solid rgba(183,128,24,0.28)"
                      : "1px solid rgba(13,95,168,0.12)",
                }}
              >
                <div style={{ fontSize: 26, lineHeight: 1 }}>💳</div>
                <div
                  style={{
                    marginTop: 10,
                    color: "#07172C",
                    fontSize: 17,
                    fontWeight: 950,
                  }}
                >
                  Spotlight Subscription
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 13, lineHeight: 1.45 }}>
                  Paid priority opens on its own focused page.
                </div>
                <SecondaryButton
                  type="button"
                  onClick={() =>
                    navigateWithOrigin(navigate, routes.subscriptionSpotlight, location)
                  }
                  fullWidth
                  style={{ marginTop: 12 }}
                  debugId="shop-control.spotlight.paid-lane"
                >
                  Open paid lane
                </SecondaryButton>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                  Payment and paid publishing are kept separate from Free Spotlight.
                </div>
              </div>
            </div>

            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
              <div style={sectionLabel()}>🧭 Choose what people will see</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 17, fontWeight: 900 }}>
                Pick one clear format.
              </div>
              <div style={{ marginTop: 12, ...controlGrid(isCompact, 150) }}>
                <StableButton
                  type="button"
                  kind={spotlightMediaChoice === "image" ? "primary" : "secondary"}
                  onClick={() => setSpotlightMediaChoice("image")}
                  fullWidth
                  debugId="shop-control.spotlight.media.image"
                >
                  🖼️ Picture
                </StableButton>
                <StableButton
                  type="button"
                  kind={spotlightMediaChoice === "video" ? "primary" : "secondary"}
                  onClick={() => setSpotlightMediaChoice("video")}
                  fullWidth
                  debugId="shop-control.spotlight.media.video"
                >
                  🎬 Video
                </StableButton>
                <StableButton
                  type="button"
                  kind={spotlightMediaChoice === "both" ? "primary" : "secondary"}
                  onClick={() => setSpotlightMediaChoice("both")}
                  fullWidth
                  debugId="shop-control.spotlight.media.both"
                >
                  🖼️ + 🎬 Both
                </StableButton>
              </div>
            </div>

            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
              <div style={sectionLabel()}>Product details</div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Your shop is already linked to your GSN ID. Add only the item or update people should see now.
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>Item or offer</div>
                  <input
                    value={spotlightProductName}
                    onChange={(e) => setSpotlightProductName(e.target.value)}
                    placeholder="Fish for sale"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
                <div>
                  <div style={sectionLabel()}>Price or key detail</div>
                  <input
                    value={spotlightPriceNote}
                    onChange={(e) => setSpotlightPriceNote(e.target.value)}
                    placeholder="Quarter box N90k"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <div
                aria-hidden={spotlightMediaChoice === "video" || undefined}
                style={{
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  visibility: spotlightMediaChoice === "video" ? "hidden" : "visible",
                  pointerEvents: spotlightMediaChoice === "video" ? "none" : "auto",
                  minHeight: 170,
                }}
              >
                  <div style={sectionLabel()}>🖼️ Picture</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Choose the picture people should notice first.
                  </div>
                  <input
                    key={spotlightImageInputKey}
                    type="file"
                    data-gmfn-action-root="true"
                    data-cta-id="shop-control.spotlight.image-file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                    aria-disabled={preparingSpotlightImage || creatingSpotlight || undefined}
                    onClick={(e) => {
                      if (preparingSpotlightImage || creatingSpotlight) {
                        e.preventDefault();
                        showNotice("info", "GSN is still preparing the current spotlight media.");
                      }
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      void handleSpotlightImagePicked(file);
                    }}
                    style={{ ...inputStyle(), marginTop: 10 }}
                  />
                  {spotlightImageFile ? (
                    <div style={{ marginTop: 10 }}>
                      <span style={badge(true)}>
                        ✅ Picture ready • {formatFileSize(spotlightImageFile.size)}
                      </span>
                    </div>
                  ) : null}
              </div>

              <div
                aria-hidden={spotlightMediaChoice === "image" || undefined}
                style={{
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  visibility: spotlightMediaChoice === "image" ? "hidden" : "visible",
                  pointerEvents: spotlightMediaChoice === "image" ? "none" : "auto",
                  minHeight: 170,
                }}
              >
                  <div style={sectionLabel()}>🎬 Short video</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Use a short clip when movement explains the shop better.
                  </div>
                  <input
                    key={spotlightVideoInputKey}
                    type="file"
                    data-gmfn-action-root="true"
                    data-cta-id="shop-control.spotlight.video-file"
                    accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime,video/mov"
                    aria-disabled={preparingSpotlightVideo || creatingSpotlight || undefined}
                    onClick={(e) => {
                      if (preparingSpotlightVideo || creatingSpotlight) {
                        e.preventDefault();
                        showNotice("info", "GSN is still preparing the current spotlight media.");
                      }
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      void handleSpotlightVideoPicked(file);
                    }}
                    style={{ ...inputStyle(), marginTop: 10 }}
                  />
                  {spotlightVideoFile ? (
                    <div style={{ marginTop: 10 }}>
                      <span style={badge(true)}>
                        ✅ Video ready • {formatFileSize(spotlightVideoFile.size)}
                        {spotlightVideoDurationSeconds != null
                          ? ` • ${spotlightVideoDurationSeconds.toFixed(1)}s`
                          : ""}
                      </span>
                    </div>
                  ) : null}
              </div>
            </div>

            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
              <div style={sectionLabel()}>✍️ Message</div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Add availability, delivery, WhatsApp instruction, or any short note for this update.
              </div>
              <textarea
                value={spotlightMessage}
                onChange={(e) => setSpotlightMessage(e.target.value)}
                placeholder="Available today. Message me on WhatsApp to order."
                style={{ ...textAreaStyle(), marginTop: 10 }}
              />
            </div>

            <div style={controlGrid(isCompact, 150)}>
              <PrimaryButton
                type="button"
                onClick={() => setSpotlightFlowStep("preview")}
                disabled={
                  preparingSpotlightImage ||
                  preparingSpotlightVideo ||
                  !spotlightCanContinueToPreview
                }
                busy={preparingSpotlightImage || preparingSpotlightVideo}
                busyLabel="Preparing media..."
                fullWidth
                debugId="shop-control.spotlight.upload.preview"
              >
                Preview spotlight
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={collapseSpotlightTools}
                fullWidth
                debugId="shop-control.spotlight.upload.cancel"
              >
                Cancel spotlight
              </SecondaryButton>
            </div>
          </>
        ) : (
          <>
            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
              <div style={sectionLabel()}>👀 Preview</div>
              <div style={{ marginTop: 10 }}>
                {spotlightImagePreviewUrl || spotlightVideoPreviewUrl ? (
                  <SpotlightMediaFrame
                    imageUrl={spotlightImagePreviewUrl}
                    videoUrl={spotlightVideoPreviewUrl}
                    videoPoster={spotlightImagePreviewUrl}
                    alt="Draft spotlight preview"
                    frameStyle={{
                      minHeight: isCompact ? 240 : 280,
                      height: isCompact ? 240 : 280,
                      borderRadius: 18,
                    }}
                    mediaStyle={{
                      width: "100%",
                      height: "100%",
                    }}
                    autoPlayVideo={Boolean(spotlightVideoPreviewUrl)}
                    mutedVideo={Boolean(spotlightVideoPreviewUrl)}
                    loopVideo={Boolean(spotlightVideoPreviewUrl)}
                    showAudioUnlock={Boolean(spotlightVideoPreviewUrl)}
                    audioUnlockLabel="Sound on"
                    maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
                  />
                ) : (
                  <div
                    style={{
                      minHeight: 220,
                      borderRadius: 16,
                      border: "1px solid rgba(13,95,168,0.12)",
                      background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                      padding: 16,
                    }}
                  >
                    <div>
                      <div style={{ color: "#0B1F33", fontSize: 16, fontWeight: 900 }}>
                        No media is ready yet
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13, maxWidth: 260 }}>
                        Go back and add the picture or short video first.
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 12, color: "#0B1F33", fontWeight: 900, fontSize: 16 }}>
                {spotlightPreviewMessage || "Media-only spotlight"}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(true)}>
                  {spotlightPriorityMode === "paid" ? "💳 Paid lane" : "📣 Free lane"}
                </span>
                {spotlightPreviewHasPicture ? <span style={badge(false)}>🖼️ Picture</span> : null}
                {spotlightPreviewHasVideo ? <span style={badge(false)}>🎬 Video</span> : null}
              </div>
            </div>

            <div style={controlGrid(isCompact, 150)}>
              <SecondaryButton
                type="button"
                onClick={() => setSpotlightFlowStep("upload")}
                fullWidth
                debugId="shop-control.spotlight.preview.back"
              >
                Back to upload
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={() => handleCreateSpotlight()}
                disabled={creatingSpotlight}
                busy={creatingSpotlight}
                busyLabel="Publishing..."
                fullWidth
                debugId="shop-control.spotlight.preview.publish"
              >
                {shopActionsLocked && spotlightPriorityMode === "paid"
                  ? "Publish after identity review"
                  : creatingSpotlight
                  ? "Publishing..."
                  : "🚀 Publish spotlight"}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={collapseSpotlightTools}
                fullWidth
                debugId="shop-control.spotlight.preview.cancel"
              >
                Cancel spotlight
              </SecondaryButton>
            </div>
          </>
        )}
      </div>
    </section>
  ) : null;

  if (loading) {
    return (
      <div style={institutionalBlueRailShell(isCompact, { gap: 18 })}>
        <PageTopNav
          sectionLabel="Shop Control"
          title="Shop Control"
          subtitle="Loading shop control..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.marketplace}
          backLabel="Marketplace"
        />
        <section style={pageCard()}>
          <div style={helperText()}>Loading shop control...</div>
        </section>
      </div>
    );
  }

  if (spotlightWorkflowSection) {
    return (
      <div style={institutionalBlueRailShell(isCompact)}>
        <PageTopNav
          sectionLabel="Spotlight Portal"
          title={spotlightPortalTitle}
          subtitle={spotlightPortalSubtitle}
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.shop}
          backLabel="Shop Control"
        />
        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}
        {spotlightWorkflowSection}
      </div>
    );
  }

  return (
    <div style={institutionalBlueRailShell(isCompact)}>
      <PageTopNav
        sectionLabel="Focused Task"
        title="Shop Control"
        subtitle=""
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.marketplace}
        backLabel="Marketplace"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {activeOwnerLayer === "overview" || activeOwnerLayer === "products" ? (
      <section
        id="shop-control-summary"
        style={pageCard(
          "radial-gradient(circle at 12% 0%, rgba(217,172,51,0.14) 0%, rgba(217,172,51,0) 28%), linear-gradient(180deg, #071827 0%, #0B2942 56%, #123A59 100%)"
        )}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#F6D77A" }}>Owner shop control</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
                textTransform: "uppercase",
              }}
            >
              {firstTruthy(shop?.name, "My Shop")}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                maxWidth: 860,
                color: "#D7E3F1",
              }}
            >
              Use only the shop setup tools here: public shop face, products,
              and shop details.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(auto-fit, minmax(138px, 1fr))",
                gap: 8,
              }}
              aria-label="Shop control shortcuts"
            >
              {shopHeroShortcuts.map((item) => (
                <StableCtaLink
                  key={item.label}
                  to={item.to}
                  kind="soft"
                  fullWidth
                  debugId={`shop-control.hero-shortcut.${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  style={{
                    minHeight: 44,
                    padding: "8px 9px",
                    border: "1px solid rgba(246,215,122,0.28)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%)",
                    color: "#F8FBFF",
                    boxShadow:
                      "0 8px 18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.16)",
                    gap: 6,
                  }}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </StableCtaLink>
              ))}
            </div>
          </div>

        </div>
      </section>
      ) : null}

      {activeOwnerLayer === "overview" ||
      activeOwnerLayer === "products" ? (
        <section
          id="shop-control-gallery-tools"
          style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 56%, #EAF4FF 100%)")}
        >
          <ShopAssetsPage
            embedded
            preferredClanId={effectiveShopClanId || selectedClanId || null}
            preferredGmfnId={firstTruthy(shop?.owner_gmfn_id, shop?.gmfn_id, me?.gmfn_id) || null}
            seedShop={shop}
            seedProducts={products}
          />
        </section>
      ) : null}
      {activeOwnerLayer === "paid-tools" ? (
      <section
        id="shop-control-unlocks"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 55%, #EAF4FF 78%, #FFF7D8 100%)")}
      >
        <div style={sectionLabel()}>Optional paid tools</div>

        <div style={{ marginTop: 10, ...helperText(), maxWidth: 900 }}>
          These are optional. Use them only when you need private viewing,
          public verification, or paid spotlight priority.
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div
            id="shop-control-vault-subscription"
            style={{
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #FFF9E7 100%)"),
              border: "1px solid rgba(212,175,55,0.12)",
              boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
            }}
          >
            <div style={sectionLabel()}>🗄️ Vault Control</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 20, fontWeight: 950 }}>
              Private offers, controlled access.
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Pay for private slots, add private offers, then share one secure viewing link.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(vaultProducts.length > 0)}>🗄️ Offers: {vaultProducts.length} / 6</span>
              <span style={badge(vaultLinks.length > 0)}>🔐 Links: {vaultLinks.length}</span>
              <span style={badge(false)}>✅ {vaultStateLabel}</span>
              <span style={badge(false)}>
                💳 Payment: {firstTruthy(latestVaultPayment?.status, "Not started")}
              </span>
            </div>
            {latestVaultPayment ? (
              <div
                style={{
                  marginTop: 12,
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  border: "1px solid rgba(13,95,168,0.10)",
                }}
              >
                <div style={sectionLabel()}>Payment reference</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 17, fontWeight: 950 }}>
                  {firstTruthy(latestVaultPayment.reference_display, "Awaiting reference")}
                </div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  {safeStr(latestVaultPayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestVaultPayment.confirmed_at)}`
                    : firstTruthy(latestVaultPayment.status, "Expected")}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badge(false)}>
                    🌐 {firstTruthy(latestVaultPayment.amount, "0.00")}{" "}
                    {firstTruthy(latestVaultPayment.currency, "GBP")}
                  </span>
                  <span style={badge(Boolean(latestVaultPayment.matched_bank_event_id))}>
                    🏦 Bank check: {latestVaultPayment.matched_bank_event_id ? "Matched" : "Waiting"}
                  </span>
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
              <PrimaryButton
                onClick={() => createVaultInstruction(1)}
                disabled={shopActionsLocked || creatingVaultInstruction}
                busy={creatingVaultInstruction}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.vault.pay-1-slot"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: creatingVaultInstruction,
                  idle: "Pay 1 slot",
                  busyText: "Preparing...",
                })}
              </PrimaryButton>
              <SecondaryButton
                onClick={() => createVaultInstruction(6)}
                disabled={shopActionsLocked || creatingVaultInstruction}
                busy={creatingVaultInstruction}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.vault.pay-6-slots"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: creatingVaultInstruction,
                  idle: "Pay 6 slots",
                  busyText: "Preparing...",
                })}
              </SecondaryButton>
              <StableCtaLink
                to={routes.shopAssets}
                kind="secondary"
                fullWidth
                debugId="shop-control.vault.manage-offers"
              >
                Manage private offers
              </StableCtaLink>
              <SubtleButton
                onClick={() => createVaultViewingLink()}
                disabled={
                  shopActionsLocked ||
                  creatingVaultLink ||
                  vaultProducts.length === 0
                }
                busy={creatingVaultLink}
                busyLabel="Creating link..."
                fullWidth
                debugId="shop-control.vault.create-link"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: creatingVaultLink,
                  idle: "Create access link",
                  busyText: "Creating link...",
                })}
              </SubtleButton>
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 12 }}>
              {vaultProofText}
            </div>
          </div>

          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
            <div style={sectionLabel()}>Verification</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
              Visitor verification
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Let visitors confirm this shop through your TrustSlip page.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>
                {trustSlipFeature?.merchant_verify_active ? "Active" : "Subscription required"}
              </span>
              <span style={badge(false)}>State: {merchantVerifyStateLabel}</span>
              <span style={badge(false)}>
                Payment: {firstTruthy(latestMerchantVerifyPayment?.status, "Not started")}
              </span>
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
              <div style={helperText()}>
                {firstTruthy(
                  trustSlipFeature?.merchant_verify_detail,
                  "Merchant-facing verification is not active yet."
                )}
              </div>
              {latestMerchantVerifyPayment ? (
                <>
                  <div style={helperText()}>
                    Reference: {firstTruthy(latestMerchantVerifyPayment.reference_display, "Awaiting reference")}
                  </div>
                  <div style={helperText()}>
                    Amount: {firstTruthy(latestMerchantVerifyPayment.amount, "0.00")}{" "}
                    {firstTruthy(latestMerchantVerifyPayment.currency, "GBP")}
                  </div>
                  <div style={helperText()}>
                    Confirmation:
                    {" "}
                    {safeStr(latestMerchantVerifyPayment.confirmed_at)
                      ? `Confirmed ${safeDateTime(latestMerchantVerifyPayment.confirmed_at)}`
                      : firstTruthy(latestMerchantVerifyPayment.status, "Expected")}
                  </div>
                  <div style={helperText()}>
                    Bank check: {latestMerchantVerifyPayment.matched_bank_event_id ? "Matched" : "Waiting"}
                  </div>
                </>
              ) : null}
            </div>
            <div style={{ marginTop: 10, ...helperText() }}>{merchantVerifyProofText}</div>
            <div style={{ marginTop: 12, ...helperText() }}>Start or renew verification</div>
            <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
              <PrimaryButton
                onClick={() => createMerchantVerifyInstruction()}
                disabled={shopActionsLocked || creatingMerchantVerifyInstruction}
                busy={creatingMerchantVerifyInstruction}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.verify.pay"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: creatingMerchantVerifyInstruction,
                  idle: "Pay verification",
                  busyText: "Preparing...",
                })}
              </PrimaryButton>
            </div>
            <div style={{ marginTop: 10, ...helperText() }}>Use verification pages</div>
            <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
              <StableCtaLink
                to={routes.trustSlip}
                kind="secondary"
                fullWidth
                debugId="shop-control.verify.trust-slip"
              >
                Open TrustSlip
              </StableCtaLink>
              {safeStr(trustSlipFeature?.public_verify_url) ? (
                <SecondaryButton
                  onClick={() =>
                    openExternalLink(String(trustSlipFeature?.public_verify_url))
                  }
                  fullWidth
                  debugId="shop-control.verify.public"
                >
                  Open public verification
                </SecondaryButton>
              ) : null}
            </div>
          </div>

          <div
            id="shop-control-paid-spotlight"
            style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #FFF8DE 56%, #F7FAFF 100%)")}
          >
            <div style={sectionLabel()}>💳 Spotlight Subscription</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 20, fontWeight: 950 }}>
              Paid priority, kept separate.
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Payment, bank instructions, credits, and the paid publisher now live on the focused Subscription Spotlight page.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(activePaidSpotlights.length > 0)}>
                📣 Active: {activePaidSpotlights.length}
              </span>
              <span style={badge(canStartPaidSpotlight)}>
                ✅ Subscription: {canStartPaidSpotlight ? "Ready" : "Not ready"}
              </span>
              <span style={badge(false)}>
                💳 Payment: {firstTruthy(latestSpotlightPayment?.status, "Not started")}
              </span>
            </div>
            {latestSpotlightPayment ? (
              <div
                style={{
                  marginTop: 12,
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  border: "1px solid rgba(13,95,168,0.10)",
                }}
              >
                <div style={sectionLabel()}>Payment reference</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 17, fontWeight: 950 }}>
                  {firstTruthy(latestSpotlightPayment.reference_display, "Awaiting reference")}
                </div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  {safeStr(latestSpotlightPayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestSpotlightPayment.confirmed_at)}`
                    : firstTruthy(latestSpotlightPayment.status, "Expected")}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badge(false)}>
                    🌐 {firstTruthy(latestSpotlightPayment.amount, "0.00")}{" "}
                    {firstTruthy(latestSpotlightPayment.currency, "GBP")}
                  </span>
                  <span style={badge(Boolean(latestSpotlightPayment.matched_bank_event_id))}>
                    🏦 Bank check: {latestSpotlightPayment.matched_bank_event_id ? "Matched" : "Waiting"}
                  </span>
                </div>
              </div>
            ) : null}
            <div
              style={{
                marginTop: 12,
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #FFF9E7 100%)"),
                border: "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div style={sectionLabel()}>Next action</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                Subscription Spotlight is separate from Free Spotlight.
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Open the focused lane so a paid spotlight never falls back into the free composer.
              </div>
            </div>
            <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
              <PrimaryButton
                onClick={() =>
                  navigateWithOrigin(navigate, routes.subscriptionSpotlight, location)
                }
                disabled={shopActionsLocked}
                fullWidth
                debugId="shop-control.subscription.open"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: false,
                  idle: "Open Subscription Spotlight",
                  busyText: "Opening...",
                })}
              </PrimaryButton>
              <SecondaryButton
                onClick={() =>
                  navigateWithOrigin(navigate, routes.subscriptionSpotlight, location)
                }
                fullWidth
                debugId="shop-control.subscription.publisher"
              >
                Open paid publisher
              </SecondaryButton>
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 12 }}>
              {spotlightProofText}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {activeOwnerLayer === "shop-details" ? (
      <section
        id="shop-control-details"
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 72%, #FFF7D8 100%)")}
      >
        <div style={sectionLabel()}>Shop details</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
            <div style={sectionLabel()}>Shop name</div>
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Shop name"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div>
            <div style={sectionLabel()}>WhatsApp</div>
            <input
              value={whatsApp}
              onChange={(e) => setWhatsApp(e.target.value)}
              placeholder="WhatsApp number"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div>
            <div style={sectionLabel()}>Telegram</div>
            <input
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              placeholder="Telegram handle"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
            <div style={sectionLabel()}>Description</div>
            <textarea
              value={shopDescription}
              onChange={(e) => setShopDescription(e.target.value)}
              placeholder="Tell people what this shop offers..."
              style={{ ...textAreaStyle(), marginTop: 8 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 16, ...controlGrid(isCompact, 150) }}>
          <PrimaryButton
            onClick={() => saveShopDetails()}
            disabled={shopActionsLocked || savingShop}
            busy={savingShop}
            busyLabel="Saving..."
            fullWidth
            debugId="shop-control.details.save"
          >
            {shopActionsLocked ? "Review Identity First" : "Save Shop Details"}
          </PrimaryButton>

          <StableCtaLink
            to={routes.shopAssets}
            kind="secondary"
            fullWidth
            debugId="shop-control.details.manage-products"
          >
            Manage Products
          </StableCtaLink>
        </div>
      </section>
      ) : null}

      {activeOwnerLayer === "summary" ? (
      <section
        id="shop-control-counts"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 82%, #FFF7D8 100%)")}
      >
        <div style={sectionLabel()}>Shop summary</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div style={statTile()}>
            <div style={sectionLabel()}>Public items</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {publicProducts.length} / 12
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Vault</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {vaultProducts.length} / 6
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Spotlights</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {activeSpotlights.length}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Vault links</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {vaultLinks.length}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {activeOwnerLayer === "vault" ? (
      <section
        id="shop-control-vault"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 55%, #EAF3FF 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "72px minmax(0, 1fr)",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              borderRadius: 22,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(180deg, #102D4C 0%, #061827 100%)",
              color: "#F8D876",
              fontSize: 30,
              boxShadow:
                "0 18px 34px rgba(6,24,39,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            🗄️
          </div>

          <div>
            <div style={sectionLabel()}>Vault Control</div>
            <div
              style={{
                marginTop: 8,
                color: "#07172C",
                fontSize: isCompact ? 23 : 28,
                fontWeight: 950,
                lineHeight: 1.08,
              }}
            >
              Private offers and secure links.
            </div>
            <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
              Vault is for selected people only. Add private offers, then create a link for the right viewer.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(vaultProducts.length > 0)}>🗄️ Offers: {vaultProducts.length}</span>
          <span style={badge(vaultLinks.length > 0)}>🔐 Links: {vaultLinks.length}</span>
          <span style={badge(false)}>✅ {vaultStateLabel}</span>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            ["💳", "1. Activate slots", "Pay for one slot or six private slots."],
            ["🗄️", "2. Add private offers", "Put only private products inside Vault."],
            ["🔐", "3. Share access", "Create a link only for the person who should see it."],
          ].map(([icon, title, text]) => (
            <div key={title} style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
              <div style={{ fontSize: 24, lineHeight: 1 }}>{icon}</div>
              <div style={{ marginTop: 10, color: "#0B1F33", fontWeight: 950, fontSize: 16 }}>
                {title}
              </div>
              <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                {text}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1.2fr",
            gap: 12,
          }}
        >
          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 60%, #FFF9E7 100%)")}>
            <div style={sectionLabel()}>🗄️ Private offers</div>
            <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 18, fontWeight: 950 }}>
              {vaultProducts.length} offer{vaultProducts.length === 1 ? "" : "s"} ready
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {vaultProducts.length > 0 ? (
                vaultProducts.slice(0, 5).map((item) => (
                  <div key={item.id} style={{ ...helperText(), fontWeight: 800 }}>
                    {firstTruthy(item?.name, "Private offer")}
                  </div>
                ))
              ) : (
                <div style={helperText()}>
                  No private offer is ready yet. Add one before creating a viewing link.
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, ...controlGrid(isCompact, 160) }}>
              <StableCtaLink
                to={routes.shopAssets}
                kind="secondary"
                fullWidth
                debugId="shop-control.vault-layer.manage-offers"
              >
                Manage private offers
              </StableCtaLink>
              <PrimaryButton
                onClick={() => createVaultViewingLink()}
                disabled={
                  shopActionsLocked ||
                  creatingVaultLink ||
                  vaultProducts.length === 0
                }
                busy={creatingVaultLink}
                busyLabel="Creating..."
                fullWidth
                debugId="shop-control.vault-layer.create-link"
              >
                {shopActionsLocked
                  ? "Review Identity First"
                  : creatingVaultLink
                  ? "Creating..."
                  : vaultProducts.length === 0
                    ? "Add private offer first"
                    : "Create viewing link"}
              </PrimaryButton>
            </div>
          </div>

          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
            <div style={sectionLabel()}>🔐 Access links</div>
            <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 18, fontWeight: 950 }}>
              {vaultLinks.length} link{vaultLinks.length === 1 ? "" : "s"} ready
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {vaultLinks.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...innerCard("rgba(255,255,255,0.08)"),
                    border: "1px solid rgba(212,175,55,0.16)",
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>🔐 Link #{item.id}</span>
                    <span
                      style={{
                        ...badge(false),
                        background: "rgba(217,172,51,0.12)",
                        color: "#6F4C00",
                      }}
                    >
                      {firstTruthy(item?.status, "active")}
                    </span>
                    <span style={badge(false)}>
                      👁️ {Number(item.views_used || 0)} / {Number(item.max_views || 0) || "∞"}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    Access ends: {safeDateTime(item?.expires_at) || "No expiry set"}
                  </div>
                  <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
                    <SubtleButton
                      onClick={() =>
                        copyText(vaultLinkUrl(item), "Vault viewing link copied.", "shop-control-vault")
                      }
                      disabled={!vaultLinkUrl(item)}
                      fullWidth
                      debugId={`shop-control.vault-link.${item.id}.copy`}
                    >
                      Copy link
                    </SubtleButton>
                    <SecondaryButton
                      onClick={() => openExternalLink(vaultLinkUrl(item), "shop-control-vault")}
                      disabled={!vaultLinkUrl(item)}
                      fullWidth
                      debugId={`shop-control.vault-link.${item.id}.open`}
                    >
                      Open link
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => extendVaultViewingLink(item)}
                      disabled={busyVaultLinkId === Number(item.id)}
                      busy={busyVaultLinkId === Number(item.id) && busyVaultLinkAction === "extend"}
                      busyLabel="Extending..."
                      fullWidth
                      debugId={`shop-control.vault-link.${item.id}.extend`}
                    >
                      Extend 72 hours
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => revokeVaultViewingLink(item)}
                      disabled={
                        busyVaultLinkId === Number(item.id) ||
                        firstTruthy(item?.status).toLowerCase() === "revoked"
                      }
                      busy={busyVaultLinkId === Number(item.id) && busyVaultLinkAction === "revoke"}
                      busyLabel="Revoking..."
                      fullWidth
                      debugId={`shop-control.vault-link.${item.id}.revoke`}
                    >
                      Revoke
                    </SecondaryButton>
                  </div>
                </div>
              ))}

              {vaultLinks.length === 0 ? (
                <div style={helperText()}>
                  No access link is ready yet. Create a link after at least one private offer is ready.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}

