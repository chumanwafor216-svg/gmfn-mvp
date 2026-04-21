import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import PageTopNav from "../components/PageTopNav";
import {
  getMe,
  getMyIdentityRisk,
  getSelectedClanId,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
} from "../lib/api";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";

type ShopRecord = {
  id: number;
  clan_id?: number | null;
  owner_user_id?: number | null;
  gmfn_id?: string | null;
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

const SHOP_BRAND = {
  ink: "#0B1F33",
  blueDeep: "#071827",
  blue: "#0B2942",
  blueSoft: "#EAF4FF",
  gold: "#D9AC33",
  goldSoft: "#FFF4C7",
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
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
const SPOTLIGHT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SPOTLIGHT_MAX_VIDEO_BYTES = 10 * 1024 * 1024;

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
    )}. Spotlight videos must be 10 MB or smaller.`;
  }

  return "";
}

function resolveSpotlightAssetUrl(path: string): string {
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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 30,
    border: "1px solid rgba(212,175,55,0.22)",
    background: bg,
    padding: "clamp(14px, 3.8vw, 22px)",
    boxShadow:
      "0 26px 60px rgba(2,12,27,0.17), 0 8px 22px rgba(8,40,72,0.10), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -3px 0 rgba(8,40,72,0.07)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(13,95,168,0.16)",
    background: bg,
    padding: 16,
    boxShadow:
      "0 16px 34px rgba(7,24,39,0.10), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -2px 0 rgba(8,40,72,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(13,95,168,0.15)",
    background: bg,
    padding: 13,
    boxShadow:
      "0 16px 34px rgba(7,24,39,0.09), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -2px 0 rgba(8,40,72,0.06)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#315A80",
    fontWeight: 900,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
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
    background: primary ? SHOP_BRAND.goldSoft : "rgba(13,95,168,0.08)",
    color: primary ? "#6F4C00" : "#1E4063",
    border: primary
      ? "1px solid rgba(217,172,51,0.26)"
      : "1px solid rgba(13,95,168,0.11)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    textAlign: "center",
    boxShadow: primary
      ? "0 7px 14px rgba(217,172,51,0.13), inset 0 1px 0 rgba(255,255,255,0.72)"
      : "inset 0 1px 0 rgba(255,255,255,0.78)",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      padding: "10px 16px",
      borderRadius: 16,
      border: disabled ? "1px solid rgba(148,163,184,0.45)" : "1px solid rgba(112,74,14,0.52)",
      background: disabled
        ? "#CBD5E1"
        : "linear-gradient(180deg, #FFF6C8 0%, #E6BE4D 42%, #B78018 76%, #815407 100%)",
      color: disabled ? "#FFFFFF" : "#172033",
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow: disabled
        ? "none"
        : "0 7px 0 rgba(92,64,18,0.34), 0 18px 32px rgba(11,31,51,0.20), inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -2px 0 rgba(72,45,4,0.30)",
      lineHeight: 1.15,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
      padding: "9px 13px",
      borderRadius: 14,
      border: disabled ? "1px solid rgba(148,163,184,0.38)" : "1px solid rgba(212,175,55,0.32)",
      background: disabled
        ? "linear-gradient(180deg, #F1F5F9 0%, #CBD5E1 100%)"
        : "linear-gradient(180deg, #FFFFFF 0%, #FFF7D8 48%, #E1B33D 100%)",
      color: disabled ? "#94A3B8" : "#172033",
      fontWeight: 900,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      lineHeight: 1.15,
      boxShadow:
        "0 5px 0 rgba(92,64,18,0.20), 0 13px 24px rgba(7,24,39,0.11), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -2px 0 rgba(83,56,0,0.14)",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 15,
    border: disabled ? "1px solid rgba(148,163,184,0.38)" : "1px solid rgba(212,175,55,0.30)",
    background: disabled
      ? "linear-gradient(180deg, #F1F5F9 0%, #CBD5E1 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #FFF9E7 50%, #EAC75E 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
    lineHeight: 1.15,
    boxShadow:
      "0 5px 0 rgba(92,64,18,0.18), 0 13px 24px rgba(7,24,39,0.10), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -2px 0 rgba(83,56,0,0.12)",
  };
}

function controlGrid(isCompact: boolean, minWidth = 138): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact
      ? "repeat(2, minmax(0, 1fr))"
      : `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gap: 10,
    alignItems: "stretch",
  };
}

function fullButton(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    width: "100%",
    minWidth: 0,
  };
}

function readinessPill(ready: boolean): React.CSSProperties {
  return {
    borderRadius: 16,
    border: ready
      ? "1px solid rgba(217,172,51,0.30)"
      : "1px solid rgba(13,95,168,0.14)",
    background: ready
      ? "linear-gradient(180deg, #FFF9D8 0%, #EFD16B 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #EAF4FF 100%)",
    padding: "10px 11px",
    boxShadow:
      "0 10px 20px rgba(7,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -2px 0 rgba(8,40,72,0.05)",
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
    border: "1px solid rgba(13,95,168,0.16)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 48%, #EAF4FF 100%)",
    padding: 14,
    boxShadow:
      "0 16px 30px rgba(7,24,39,0.09), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -2px 0 rgba(8,40,72,0.06)",
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

  const res = await fetch(path, {
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

async function uploadShopImageFile(file: File): Promise<string> {
  const token = getToken();
  const routes = [
    "/api/marketplace-media/upload-image",
    "/api/marketplace-media/images",
    "/api/marketplace-media/upload",
  ];

  for (const route of routes) {
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(route, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
        credentials: "include",
      });

      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      const url =
        firstTruthy(
          data?.image_url,
          data?.url,
          data?.path,
          data?.item?.image_url,
          data?.item?.url,
          data?.data?.image_url,
          data?.data?.url
        ) || "";

      if (url) return url;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "We could not prepare an image from that upload. Paste an image URL instead and continue."
  );
}

export default function ShopControlPage() {
  const location = useLocation();

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
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>([]);
  const [trustSlipFeature, setTrustSlipFeature] = useState<TrustSlipFeatureSummary | null>(
    null
  );
  const [creatingVaultInstruction, setCreatingVaultInstruction] = useState(false);
  const [creatingMerchantVerifyInstruction, setCreatingMerchantVerifyInstruction] =
    useState(false);
  const [creatingSpotlightInstruction, setCreatingSpotlightInstruction] = useState(false);

  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [savingShop, setSavingShop] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
  const [spotlightPriorityMode, setSpotlightPriorityMode] = useState<"free" | "paid">("free");
  const spotlightImagePrepJobRef = useRef(0);
  const spotlightVideoPrepJobRef = useRef(0);

  const selectedClanId = Number(getSelectedClanId() || 0);
  const shopActionsLocked = Boolean(continuityReview.blocked);

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

  function clearSpotlightDraft() {
    spotlightImagePrepJobRef.current += 1;
    spotlightVideoPrepJobRef.current += 1;
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
  }

  async function loadPage() {
    setLoading(true);

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

      const shopRes = await apiJson<any>(
        `/api/marketplace/shops/by-gmfn/${encodeURIComponent(gmfnId)}?clan_id=${selectedClanId || 0}`
      ).catch(() => null);

      const shopItem = (shopRes?.item || null) as ShopRecord | null;
      const shopProducts = Array.isArray(shopRes?.products)
        ? (shopRes.products as ProductRecord[])
        : [];

      setShop(shopItem);
      setProducts(shopProducts);
      setShopName(firstTruthy(shopItem?.name));
      setShopDescription(firstTruthy(shopItem?.description));
      setWhatsApp(firstTruthy(shopItem?.whatsapp_number));
      setTelegramHandle(firstTruthy(shopItem?.telegram_handle));
      setImageUrlInput(firstTruthy(shopItem?.image_url));

      if (shopItem?.id) {
        const expectedPaymentsPath =
          `/api/bank-reconciliation/expected?clan_id=${selectedClanId || 0}&limit=100` +
          (Number(meRes?.id || 0) > 0 ? `&user_id=${Number(meRes?.id)}` : "");

        const [broadcastsRes, vaultLinksRes, privateProductsRes, expectedRes, trustSlipRes] =
          await Promise.all([
          apiJson<any>(
            `/api/marketplace/broadcasts?clan_id=${selectedClanId || 0}&limit=20`
          ).catch(() => ({ items: [] })),
          apiJson<any>(
            `/api/vault-access/links?shop_id=${shopItem.id}`
          ).catch(() => ({ items: [] })),
          apiJson<any>(
            `/api/marketplace/products?clan_id=${selectedClanId || 0}&shop_id=${shopItem.id}&include_private_manage=true&limit=200`
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
          Array.isArray(vaultLinksRes?.items) ? (vaultLinksRes.items as VaultLinkRecord[]) : []
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
      setLoading(false);
    }
  }

  function scrollToControlTarget(targetId: string, attempt = 0) {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    if (attempt < 10) {
      window.setTimeout(() => scrollToControlTarget(targetId, attempt + 1), 100);
    }
  }

  useEffect(() => {
    void loadPage();

    const timer = window.setInterval(() => {
      void loadPage();
    }, 60000);

    function handleFocusRefresh() {
      void loadPage();
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadPage();
      }
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [selectedClanId]);

  useEffect(() => {
    if (loading) return;

    const targetId = String(location.hash || "").replace(/^#/, "");
    if (!targetId) return;

    if (targetId === "shop-control-spotlight") {
      setSpotlightOpen(true);
    }

    window.setTimeout(() => {
      scrollToControlTarget(targetId);
    }, targetId === "shop-control-spotlight" ? 140 : 40);
  }, [loading, location.hash]);

  const publicProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          firstTruthy(item?.visibility_mode, "community_visible") === "community_visible" &&
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

  const publicShopLink = useMemo(() => {
    const gmfnId = firstTruthy(shop?.gmfn_id, me?.gmfn_id);
    if (!gmfnId || typeof window === "undefined") return "";
    return `${window.location.origin}/shop/${encodeURIComponent(gmfnId)}`;
  }, [shop, me]);

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

  const spotlightStateLabel = activePaidSpotlights.length > 0
    ? "Usable now"
    : safeStr(latestSpotlightPayment?.confirmed_at)
      ? "Confirmed"
      : latestSpotlightPayment
        ? "Awaiting confirmation"
        : "No payment request";

  const canStartPaidSpotlight = Boolean(
    safeStr(latestSpotlightPayment?.confirmed_at) && activePaidSpotlights.length === 0
  );

  const spotlightNextAction = useMemo(() => {
    if (activePaidSpotlights.length > 0) {
      return {
        title: "Wait for the current paid spotlight to conclude",
        detail:
          "A paid spotlight is already live for this shop. Keep monitoring the live view until it expires, then start another paid run if needed.",
      };
    }

    if (canStartPaidSpotlight) {
      return {
        title: "Open spotlight tools and publish the paid run",
        detail:
          "Payment has been confirmed. Switch the spotlight composer to paid mode and publish when the message and image are ready.",
      };
    }

    if (latestSpotlightPayment) {
      return {
        title: "Complete payment and wait for reconciliation",
        detail:
          "Paid spotlight is not active yet. Use the payment reference, then return here after confirmation.",
      };
    }

    return {
      title: "Start a paid spotlight payment request",
      detail:
        "Create the payment instruction first. After confirmation, this page will unlock the paid publish path for the shop.",
    };
  }, [activePaidSpotlights.length, canStartPaidSpotlight, latestSpotlightPayment]);

  const shopReadiness = useMemo(
    () => [
      {
        label: "Shop face",
        value: safeStr(imageUrlInput) ? "Ready" : "Needs picture",
        ready: Boolean(safeStr(imageUrlInput)),
      },
      {
        label: "Products",
        value: `${publicProducts.length} / 12`,
        ready: publicProducts.length > 0,
      },
      {
        label: "Public link",
        value: publicShopLink ? "Ready" : "Waiting",
        ready: Boolean(publicShopLink),
      },
      {
        label: "Spotlight",
        value: activeSpotlights.length ? `${activeSpotlights.length} live` : "Not live",
        ready: activeSpotlights.length > 0,
      },
    ],
    [activeSpotlights.length, imageUrlInput, publicProducts.length, publicShopLink]
  );

  const recommendedShopMove = useMemo(() => {
    if (!safeStr(imageUrlInput)) {
      return {
        title: "Add the shop picture first",
        detail:
          "A clear shop face helps visitors recognise the shop before they open the gallery.",
        kind: "picture" as const,
      };
    }

    if (publicProducts.length === 0) {
      return {
        title: "Add the first public product",
        detail:
          "Products make the gallery useful. Start with the items people can see publicly.",
        kind: "products" as const,
      };
    }

    if (activeSpotlights.length === 0) {
      return {
        title: "Publish a spotlight when ready",
        detail:
          "The shop is presentable. Spotlight can now help people notice it from the dashboard.",
        kind: "spotlight" as const,
      };
    }

    return {
      title: "Shop is ready to monitor",
      detail:
        "Keep products current, watch the live spotlight, and open Vault only for private offers.",
      kind: "monitor" as const,
    };
  }, [activeSpotlights.length, imageUrlInput, publicProducts.length]);

  useEffect(() => {
    if (spotlightPriorityMode === "paid" && !canStartPaidSpotlight) {
      setSpotlightPriorityMode("free");
    }
  }, [canStartPaidSpotlight, spotlightPriorityMode]);

  function copyText(text: string, successMessage: string) {
    if (!text) {
      showNotice("error", "Nothing to copy yet.");
      return;
    }

    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    }
    showNotice("success", successMessage);
  }

  function openSpotlightTools() {
    setSpotlightOpen(true);

    window.setTimeout(() => {
      scrollToControlTarget("shop-control-spotlight");
    }, 80);
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
      copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Vault payment reference copied."
      );
      showNotice(
        "success",
        `Vault payment request created for ${quantityTotal} slot${quantityTotal > 1 ? "s" : ""}.`
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
      copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Shop verification payment reference copied."
      );
      showNotice("success", "Shop verification payment request created.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Shop verification payment request could not be created."
      );
    } finally {
      setCreatingMerchantVerifyInstruction(false);
    }
  }

  async function createSpotlightInstruction() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }

    setCreatingSpotlightInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/spotlight", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          amount: "1.00",
          quantity_total: 1,
          currency: "GBP",
          visibility_scope: "direct_communities",
        }),
      });

      await loadPage();
      copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Spotlight payment reference copied."
      );
      showNotice("success", "Paid spotlight payment request created.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Paid spotlight payment request could not be created."
      );
    } finally {
      setCreatingSpotlightInstruction(false);
    }
  }

  async function saveShopDetails(extra?: Partial<ShopRecord> & { clear_image?: boolean }) {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available yet.");
      return;
    }

    setSavingShop(true);

    try {
      const body: any = {
        name: safeStr(extra?.name ?? shopName),
        description: safeStr(extra?.description ?? shopDescription) || null,
        whatsapp_number: safeStr(extra?.whatsapp_number ?? whatsApp) || null,
        telegram_handle: safeStr(extra?.telegram_handle ?? telegramHandle) || null,
      };

      if (extra?.clear_image) {
        body.clear_image = true;
      } else if (extra && "image_url" in extra) {
        body.image_url = safeStr(extra.image_url) || null;
      } else {
        body.image_url = safeStr(imageUrlInput) || null;
      }

      const res = await apiJson<any>(`/api/marketplace/shops/${shop.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      const updated = (res?.item || shop) as ShopRecord;
      setShop(updated);
      setShopName(firstTruthy(updated?.name));
      setShopDescription(firstTruthy(updated?.description));
      setWhatsApp(firstTruthy(updated?.whatsapp_number));
      setTelegramHandle(firstTruthy(updated?.telegram_handle));
      setImageUrlInput(firstTruthy(updated?.image_url));
      showNotice("success", "Shop details saved.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Shop details could not be saved.");
    } finally {
      setSavingShop(false);
    }
  }

  async function handleFilePicked(file: File | null) {
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadShopImageFile(file);
      setImageUrlInput(uploadedUrl);
      await saveShopDetails({ image_url: uploadedUrl });
      showNotice("success", "Shop picture uploaded.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Shop picture upload failed."
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSpotlightImagePicked(file: File | null) {
    spotlightImagePrepJobRef.current += 1;
    const prepJob = spotlightImagePrepJobRef.current;

    setSpotlightImageFile(null);
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

    setSpotlightVideoFile(null);
    setSpotlightVideoDurationSeconds(null);
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
        maxDurationSeconds: 5,
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

  async function handleCreateSpotlight() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }

    if (preparingSpotlightImage || preparingSpotlightVideo) {
      showNotice("error", "Please wait while the app prepares your spotlight media.");
      return;
    }

    const message = safeStr(spotlightMessage);
    const manualImageUrl = safeStr(spotlightImageUrl);
    const manualVideoUrl = safeStr(spotlightVideoUrl);

    if (!message && !manualImageUrl && !manualVideoUrl && !spotlightImageFile && !spotlightVideoFile) {
      showNotice("error", "Add a spotlight message, image, or short video first.");
      return;
    }

    const imageValidationIssue = validateSpotlightImageFile(spotlightImageFile);
    if (imageValidationIssue) {
      showNotice("error", imageValidationIssue);
      return;
    }

    const videoValidationIssue = validateSpotlightVideoFile(spotlightVideoFile);
    if (videoValidationIssue) {
      showNotice("error", videoValidationIssue);
      return;
    }

    setCreatingSpotlight(true);

    try {
      let imageUrl = manualImageUrl;
      let videoUrl = manualVideoUrl;

      if (spotlightImageFile) {
        const uploadRes = await uploadMarketplaceImageFile(spotlightImageFile, selectedClanId || null);
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
          spotlightVideoDurationSeconds,
          selectedClanId || null
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

      await apiJson<any>("/api/marketplace/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          message: message || "Spotlight update",
          image_url: imageUrl || null,
          video_url: videoUrl || null,
          priority_mode: spotlightPriorityMode,
          visibility_scope: "direct_communities",
        }),
      });

      clearSpotlightDraft();
      setSpotlightOpen(false);
      await loadPage();
      showNotice(
        "success",
        `${spotlightPriorityMode === "paid" ? "Paid" : "Free"} spotlight created${videoUrl ? " with short video" : ""}.`
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Spotlight could not be created."
      );
    } finally {
      setCreatingSpotlight(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 18 }}>
        <PageTopNav
          sectionLabel="Shop Control"
          title="Shop Control"
          subtitle="Loading shop control..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
        />
        <section style={pageCard()}>
          <div style={helperText()}>Loading shop control...</div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: isCompact ? "0 10px 40px" : "0 18px 44px",
        display: "grid",
        gap: 16,
        background:
          "radial-gradient(circle at 9% 3%, rgba(217,172,51,0.26) 0%, rgba(217,172,51,0) 30%), radial-gradient(circle at 94% 4%, rgba(38,132,205,0.24) 0%, rgba(38,132,205,0) 32%), linear-gradient(90deg, #071827 0%, #0B2942 4%, #EAF4FF 4.1%, #F8FBFF 12%, #F8FBFF 88%, #EAF4FF 95.9%, #0B2942 96%, #071827 100%)",
        borderRadius: isCompact ? 26 : 36,
        boxShadow:
          "inset 16px 0 28px rgba(7,24,39,0.14), inset -16px 0 28px rgba(7,24,39,0.14)",
      }}
    >
      <PageTopNav
        sectionLabel="Shop Control"
        title="Shop Control"
        subtitle="Keep your shop picture, products, Vault, and spotlight together under your GSN ID."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[
          { label: "Shop Assets", to: "/app/shop-assets" },
          { label: "TrustSlip", to: "/app/trust-slip" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        id="shop-control-summary"
        style={pageCard(
          "radial-gradient(circle at 12% 0%, rgba(217,172,51,0.18) 0%, rgba(217,172,51,0) 30%), linear-gradient(180deg, #071827 0%, #0B2942 58%, #123A59 100%)"
        )}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.08fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#F6D77A" }}>Your shop room</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
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
              Use this page to update your shop face, manage products, prepare spotlight,
              and keep Vault private until you choose to open it.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community: {communityName}</span>
              <span style={badge(false)}>
                Community no: {firstTruthy(shop?.clan_id, selectedClanId, "Pending")}
              </span>
              <span style={badge(false)}>
                GSN ID: {firstTruthy(shop?.gmfn_id, me?.gmfn_id, "Pending")}
              </span>
              <span style={badge(false)}>Public items: {publicProducts.length} / 12</span>
              <span style={badge(false)}>Vault items: {vaultProducts.length} / 6</span>
              <span style={badge(false)}>Active spotlights: {activeSpotlights.length}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                ...controlGrid(isCompact, 150),
              }}
            >
              <OriginLink to="/app/shop-assets" style={fullButton(actionBtn("primary"))}>
                Manage Products
              </OriginLink>

              <button
                type="button"
                onClick={() => {
                  if (publicShopLink) {
                    window.open(publicShopLink, "_blank", "noopener,noreferrer");
                  }
                }}
                style={fullButton(actionBtn("secondary", !publicShopLink))}
                disabled={!publicShopLink}
              >
                View Public Shop
              </button>

              <button
                type="button"
                onClick={() => copyText(publicShopLink, "Shop gallery link copied.")}
                style={fullButton(actionBtn("secondary", !publicShopLink))}
                disabled={!publicShopLink}
              >
                Copy Shop Link
              </button>

              <OriginLink to="/app/trust-slip" style={fullButton(actionBtn("soft"))}>
                Verify Shop
              </OriginLink>
            </div>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.16)",
            }}
          >
            <div style={sectionLabel()}>Control status</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.35,
              }}
            >
              {recommendedShopMove.title}
            </div>

            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              {recommendedShopMove.detail}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {shopReadiness.map((item) => (
                <div key={item.label} style={readinessPill(item.ready)}>
                  <div style={{ ...sectionLabel(), fontSize: 10, letterSpacing: 1.2 }}>
                    {item.label}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      color: item.ready ? "#6F4C00" : "#0B1F33",
                      fontSize: 13,
                      fontWeight: 900,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, ...controlGrid(isCompact, 132) }}>
              {recommendedShopMove.kind === "picture" ? (
                <a
                  href="#shop-control-picture-gallery"
                  style={fullButton(actionBtn("primary"))}
                >
                  Open Picture Tools
                </a>
              ) : recommendedShopMove.kind === "products" ? (
                <OriginLink to="/app/shop-assets" style={fullButton(actionBtn("primary"))}>
                  Add Products
                </OriginLink>
              ) : recommendedShopMove.kind === "spotlight" ? (
                <button
                  type="button"
                  onClick={openSpotlightTools}
                  style={fullButton(actionBtn("primary"))}
                >
                  Open Ordinary Spotlight
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (publicShopLink) {
                      window.open(publicShopLink, "_blank", "noopener,noreferrer");
                    }
                  }}
                  style={fullButton(actionBtn("primary", !publicShopLink))}
                  disabled={!publicShopLink}
                >
                  View Shop
                </button>
              )}

            </div>
          </div>
        </div>
      </section>

      <section
        id="shop-control-unlocks"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 55%, #EAF4FF 78%, #FFF7D8 100%)")}
      >
        <div style={sectionLabel()}>Paid access</div>

        <div style={{ marginTop: 10, ...helperText(), maxWidth: 900 }}>
          Start only the paid feature you need. Use the exact reference, then return
          here after payment so GSN can open the feature when it is confirmed.
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
            <div style={sectionLabel()}>Vault</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
              Private shop gallery
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Activate Vault when you want selected people to see private offers.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Vault items: {vaultProducts.length} / 6</span>
              <span style={badge(false)}>Vault links: {vaultLinks.length}</span>
              <span style={badge(false)}>State: {vaultStateLabel}</span>
              <span style={badge(false)}>
                Payment: {firstTruthy(latestVaultPayment?.status, "Not started")}
              </span>
            </div>
            {latestVaultPayment ? (
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Reference: {firstTruthy(latestVaultPayment.reference_display, "Awaiting reference")}
                </div>
                <div style={helperText()}>
                  Amount: {firstTruthy(latestVaultPayment.amount, "0.00")}{" "}
                  {firstTruthy(latestVaultPayment.currency, "GBP")}
                </div>
                <div style={helperText()}>
                  Confirmation:
                  {" "}
                  {safeStr(latestVaultPayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestVaultPayment.confirmed_at)}`
                    : firstTruthy(latestVaultPayment.status, "Expected")}
                </div>
                <div style={helperText()}>
                  Bank check: {latestVaultPayment.matched_bank_event_id ? "Matched" : "Waiting"}
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 10, ...helperText() }}>{vaultProofText}</div>
            <div style={{ marginTop: 12, ...controlGrid(isCompact, 132) }}>
              <button
                type="button"
                onClick={() => void createVaultInstruction(1)}
                disabled={shopActionsLocked || creatingVaultInstruction}
                style={fullButton(actionBtn("primary", shopActionsLocked || creatingVaultInstruction))}
              >
                {shopActionsLocked
                  ? "Review Identity First"
                  : creatingVaultInstruction
                  ? "Creating..."
                  : "Start 1-slot payment"}
              </button>
              <button
                type="button"
                onClick={() => void createVaultInstruction(6)}
                disabled={shopActionsLocked || creatingVaultInstruction}
                style={fullButton(actionBtn("secondary", shopActionsLocked || creatingVaultInstruction))}
              >
                Start 6-slot payment
              </button>
              <OriginLink to="/app/shop-assets" style={fullButton(actionBtn("secondary"))}>
                Manage Products
              </OriginLink>
            </div>
          </div>

          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
            <div style={sectionLabel()}>Verify shop</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
              Public verification
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Let visitors confirm this shop through your TrustSlip verification page.
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
            <div style={{ marginTop: 12, ...controlGrid(isCompact, 132) }}>
              <button
                type="button"
                onClick={() => void createMerchantVerifyInstruction()}
                disabled={shopActionsLocked || creatingMerchantVerifyInstruction}
                style={fullButton(actionBtn(
                  "primary",
                  shopActionsLocked || creatingMerchantVerifyInstruction
                ))}
              >
                {shopActionsLocked
                  ? "Review Identity First"
                  : creatingMerchantVerifyInstruction
                  ? "Creating..."
                  : "Start verification payment"}
              </button>
              <OriginLink to="/app/trust-slip" style={fullButton(actionBtn("secondary"))}>
                Open TrustSlip
              </OriginLink>
              {safeStr(trustSlipFeature?.public_verify_url) ? (
                <a
                  href={String(trustSlipFeature?.public_verify_url)}
                  target="_blank"
                  rel="noreferrer"
                  style={fullButton(actionBtn("secondary"))}
                >
                  Open verification link
                </a>
              ) : null}
            </div>
          </div>

          <div
            id="shop-control-paid-spotlight"
            style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}
          >
            <div style={sectionLabel()}>Paid spotlight</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
              Paid spotlight
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Use paid spotlight when you want priority visibility after confirmation.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Active paid spotlights: {activePaidSpotlights.length}</span>
              <span style={badge(false)}>State: {spotlightStateLabel}</span>
              <span style={badge(false)}>
                Payment: {firstTruthy(latestSpotlightPayment?.status, "Not started")}
              </span>
            </div>
            {latestSpotlightPayment ? (
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Reference: {firstTruthy(latestSpotlightPayment.reference_display, "Awaiting reference")}
                </div>
                <div style={helperText()}>
                  Confirmation:
                  {" "}
                  {safeStr(latestSpotlightPayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestSpotlightPayment.confirmed_at)}`
                    : firstTruthy(latestSpotlightPayment.status, "Expected")}
                </div>
                <div style={helperText()}>
                  Amount: {firstTruthy(latestSpotlightPayment.amount, "0.00")}{" "}
                  {firstTruthy(latestSpotlightPayment.currency, "GBP")}
                </div>
                <div style={helperText()}>
                  Bank check: {latestSpotlightPayment.matched_bank_event_id ? "Matched" : "Waiting"}
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 10, ...helperText() }}>{spotlightProofText}</div>
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
                {spotlightNextAction.title}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                {spotlightNextAction.detail}
              </div>
            </div>
            <div style={{ marginTop: 12, ...controlGrid(isCompact, 132) }}>
              <button
                type="button"
                onClick={() => void createSpotlightInstruction()}
                disabled={shopActionsLocked || creatingSpotlightInstruction}
                style={fullButton(actionBtn("primary", shopActionsLocked || creatingSpotlightInstruction))}
              >
                {shopActionsLocked
                  ? "Review Identity First"
                  : creatingSpotlightInstruction
                  ? "Creating..."
                  : "Start spotlight payment"}
              </button>
              <button
                type="button"
                onClick={openSpotlightTools}
                style={fullButton(actionBtn("secondary"))}
              >
                Open Spotlight Publisher
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="shop-control-picture-gallery"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 82%, #FFF7D8 100%)")}
      >
        <div style={sectionLabel()}>Picture and public gallery</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "300px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: "100%",
                minHeight: 240,
                borderRadius: 28,
                border: "1px solid rgba(212,175,55,0.16)",
                background:
                  "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: 10,
                boxShadow:
                  "0 22px 48px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  minHeight: 220,
                  borderRadius: 22,
                  border: "1px solid rgba(212,175,55,0.14)",
                  overflow: "hidden",
                  background:
                    "linear-gradient(180deg, #11263B 0%, #193A58 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    zIndex: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 30,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(7,16,28,0.72)",
                    border: "1px solid rgba(212,175,55,0.22)",
                    color: "#F6D77A",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.24,
                    textTransform: "uppercase",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Public preview
                </div>
                {safeStr(imageUrlInput) ? (
                  <img
                    src={imageUrlInput}
                    alt={firstTruthy(shop?.name, "Shop")}
                    style={{
                      width: "100%",
                      height: 240,
                      borderRadius: 16,
                      border: "1px solid rgba(212,175,55,0.14)",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: 18,
                      textAlign: "center",
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.35,
                    }}
                  >
                    <div>Add your shop picture</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#D7E3F1",
                        fontSize: 13,
                        lineHeight: 1.7,
                        maxWidth: 220,
                      }}
                    >
                      This is the picture people see before they open the shop.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #FFF9E7 100%)"),
                border: "1px solid rgba(212,175,55,0.12)",
                boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
              }}
            >
              <div style={sectionLabel()}>Upload picture</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Upload a file or paste an image URL. Save when the picture is ready.
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <input
                  type="file"
                  accept="image/*"
                  disabled={shopActionsLocked}
                  onChange={(e) => void handleFilePicked(e.target.files?.[0] || null)}
                  style={inputStyle()}
                />

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={sectionLabel()}>Image URL</div>
                  <input
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste image URL"
                    style={inputStyle()}
                  />
                </div>

                <div style={controlGrid(isCompact, 132)}>
                  <button
                    type="button"
                    onClick={() => void saveShopDetails({ image_url: imageUrlInput })}
                    disabled={shopActionsLocked || savingShop || uploadingImage}
                    style={fullButton(actionBtn("primary", shopActionsLocked || savingShop || uploadingImage))}
                  >
                    {shopActionsLocked
                      ? "Review Identity First"
                      : savingShop
                      ? "Saving..."
                      : uploadingImage
                      ? "Uploading..."
                      : "Save Picture"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void saveShopDetails({ clear_image: true, image_url: null })}
                    disabled={
                      shopActionsLocked || savingShop || uploadingImage || !safeStr(imageUrlInput)
                    }
                    style={fullButton(actionBtn(
                      "secondary",
                      shopActionsLocked || savingShop || uploadingImage || !safeStr(imageUrlInput)
                    ))}
                  >
                    Remove Picture
                  </button>
                </div>
              </div>
            </div>

            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
              <div style={sectionLabel()}>Gallery</div>

              <div style={{ marginTop: 12, ...controlGrid(isCompact, 132) }}>
                <OriginLink to="/app/shop-assets" style={fullButton(actionBtn("secondary"))}>
                  Manage Products
                </OriginLink>

                <button
                  type="button"
                  onClick={() => {
                    if (publicShopLink) {
                      window.open(publicShopLink, "_blank", "noopener,noreferrer");
                    }
                  }}
                  style={fullButton(actionBtn("secondary", !publicShopLink))}
                  disabled={!publicShopLink}
                >
                  View Public Shop
                </button>

                <button
                  type="button"
                    onClick={() => copyText(publicShopLink, "Shop gallery link copied.")}
                  style={fullButton(actionBtn("soft", !publicShopLink))}
                  disabled={!publicShopLink}
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 72%, #FFF7D8 100%)")}>
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
          <button
            type="button"
            onClick={() => void saveShopDetails()}
            disabled={shopActionsLocked || savingShop}
            style={fullButton(actionBtn("primary", shopActionsLocked || savingShop))}
          >
            {shopActionsLocked ? "Review Identity First" : savingShop ? "Saving..." : "Save Shop Details"}
          </button>

          <OriginLink to="/app/shop-assets" style={fullButton(actionBtn("secondary"))}>
            Manage Products
          </OriginLink>
        </div>
      </section>

      <section style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 82%, #FFF7D8 100%)")}>
        <div style={sectionLabel()}>Slot usage</div>

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

      {spotlightOpen ? (
        <section
          id="shop-control-spotlight"
          style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 82%, #FFF7D8 100%)")}
        >
          <div style={sectionLabel()}>Spotlight</div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              maxWidth: 860,
            }}
          >
            Prepare the message, image, or short video people will see. Close this section
            when the spotlight is ready.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)"),
                border: "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div style={sectionLabel()}>Live spotlight</div>
              {currentActiveSpotlight ? (
                <>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                      lineHeight: 1.4,
                    }}
                  >
                    {firstTruthy(currentActiveSpotlight?.message, "Spotlight is active.")}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>
                      {firstTruthy(currentActiveSpotlight?.priority_mode, "free")}
                    </span>
                    <span style={badge(false)}>
                      Scope: {firstTruthy(currentActiveSpotlight?.visibility_scope, "direct_communities")}
                    </span>
                    {safeStr(currentActiveSpotlight?.video_url) ? (
                      <span style={badge(false)}>Short video live</span>
                    ) : null}
                    <span style={badge(false)}>
                      {safeStr(currentActiveSpotlight?.expires_at)
                        ? `Expires: ${safeDateTime(currentActiveSpotlight?.expires_at) || safeStr(currentActiveSpotlight?.expires_at)}`
                        : "No expiry set"}
                    </span>
                  </div>
                  {safeStr(currentActiveSpotlight?.image_url || currentActiveSpotlight?.video_url) ? (
                    <div style={{ marginTop: 12 }}>
                      <SpotlightMediaFrame
                        imageUrl={resolveSpotlightAssetUrl(
                          safeStr(currentActiveSpotlight?.image_url)
                        )}
                        videoUrl={resolveSpotlightAssetUrl(
                          safeStr(currentActiveSpotlight?.video_url)
                        )}
                        videoPoster={resolveSpotlightAssetUrl(
                          safeStr(currentActiveSpotlight?.image_url)
                        )}
                        alt={firstTruthy(currentActiveSpotlight?.message, "Live spotlight")}
                        frameStyle={{
                          minHeight: 220,
                          height: 220,
                          borderRadius: 16,
                        }}
                        mediaStyle={{
                          width: "100%",
                          height: "100%",
                        }}
                        showVideoControls={false}
                        autoPlayVideo={Boolean(safeStr(currentActiveSpotlight?.video_url))}
                        mutedVideo={Boolean(safeStr(currentActiveSpotlight?.video_url))}
                        loopVideo={Boolean(safeStr(currentActiveSpotlight?.video_url))}
                      />
                    </div>
                  ) : null}
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    This spotlight stays visible until it expires or is replaced.
                  </div>
                  <div style={{ marginTop: 12, ...controlGrid(isCompact, 132) }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (publicShopLink) {
                          window.open(publicShopLink, "_blank", "noopener,noreferrer");
                        }
                      }}
                      style={fullButton(actionBtn("secondary", !publicShopLink))}
                      disabled={!publicShopLink}
                    >
                      Open live shop view
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(publicShopLink, "Shop gallery link copied.")}
                      style={fullButton(actionBtn("soft", !publicShopLink))}
                      disabled={!publicShopLink}
                    >
                      Copy live link
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 10, ...helperText() }}>
                    No spotlight is live for this shop right now.
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Publish a free spotlight now, or start paid spotlight after payment confirmation.
                  </div>
                </>
              )}
            </div>

            <div style={{ ...controlGrid(isCompact, 132), alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setSpotlightPriorityMode("free")}
                style={
                  spotlightPriorityMode === "free"
                    ? fullButton(actionBtn("primary"))
                    : fullButton(actionBtn("secondary"))
                }
              >
                Free spotlight
              </button>
              <button
                type="button"
                onClick={() => setSpotlightPriorityMode("paid")}
                disabled={shopActionsLocked || !canStartPaidSpotlight}
                style={
                  spotlightPriorityMode === "paid"
                    ? fullButton(actionBtn("primary", shopActionsLocked || !canStartPaidSpotlight))
                    : fullButton(actionBtn("secondary", shopActionsLocked || !canStartPaidSpotlight))
                }
              >
                Paid spotlight
              </button>
              <span style={badge(false)}>
                Publishing as: {spotlightPriorityMode === "paid" ? "paid priority" : "free"}
              </span>
            </div>

            <div style={{ ...helperText(), fontSize: 13 }}>
              {spotlightPriorityMode === "paid"
                ? "This publish will use your confirmed paid spotlight for priority visibility."
                : canStartPaidSpotlight
                ? "A paid spotlight is available, but you can still publish a normal free spotlight if you prefer."
                : safeStr(latestSpotlightPayment?.confirmed_at)
                ? "A paid spotlight is already active for this shop. Start another one only after the current paid run ends."
                : "Free spotlight is available now. Paid spotlight opens after payment confirmation."}
            </div>

            <textarea
              value={spotlightMessage}
              onChange={(e) => setSpotlightMessage(e.target.value)}
              placeholder="Spotlight message"
              style={textAreaStyle()}
            />

            <div style={{ ...helperText(), fontSize: 13 }}>
              Upload a picture, a short video, or both. The picture stays as the cover when
              a short video is live.
            </div>

            <input
              key={spotlightImageInputKey}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
              disabled={shopActionsLocked}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                void handleSpotlightImagePicked(file);
              }}
              style={inputStyle()}
            />
            {spotlightImageFile ? (
              <div style={{ ...helperText(), fontSize: 12 }}>
                Selected image: {safeStr(spotlightImageFile.name) || "image"} |{" "}
                {formatFileSize(spotlightImageFile.size)} |{" "}
                {safeStr(spotlightImageFile.type) || "unknown type"}
              </div>
            ) : null}

            <input
              value={spotlightImageUrl}
              onChange={(e) => setSpotlightImageUrl(e.target.value)}
              placeholder="Spotlight image URL (optional)"
              style={inputStyle()}
            />

            <input
              key={spotlightVideoInputKey}
              type="file"
              accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime,video/mov"
              disabled={shopActionsLocked}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                void handleSpotlightVideoPicked(file);
              }}
              style={inputStyle()}
            />
            {spotlightVideoFile ? (
              <div style={{ ...helperText(), fontSize: 12 }}>
                Selected video: {safeStr(spotlightVideoFile.name) || "video"} |{" "}
                {formatFileSize(spotlightVideoFile.size)} |{" "}
                {safeStr(spotlightVideoFile.type) || "unknown type"}
                {spotlightVideoDurationSeconds != null
                  ? ` | ${spotlightVideoDurationSeconds.toFixed(1)}s`
                  : ""}
              </div>
            ) : null}

            <input
              value={spotlightVideoUrl}
              onChange={(e) => setSpotlightVideoUrl(e.target.value)}
              placeholder="Spotlight video URL (optional)"
              style={inputStyle()}
            />

            {spotlightImagePreviewUrl || spotlightVideoPreviewUrl || spotlightImageUrl || spotlightVideoUrl ? (
              <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
                <div style={sectionLabel()}>Draft media preview</div>
                <div style={{ marginTop: 10 }}>
                  <SpotlightMediaFrame
                    imageUrl={
                      spotlightImagePreviewUrl ||
                      resolveSpotlightAssetUrl(spotlightImageUrl)
                    }
                    videoUrl={
                      spotlightVideoPreviewUrl ||
                      resolveSpotlightAssetUrl(spotlightVideoUrl)
                    }
                    videoPoster={
                      spotlightImagePreviewUrl ||
                      resolveSpotlightAssetUrl(spotlightImageUrl)
                    }
                    alt="Draft spotlight preview"
                    frameStyle={{
                      minHeight: 220,
                      height: 220,
                      borderRadius: 16,
                    }}
                    mediaStyle={{
                      width: "100%",
                      height: "100%",
                    }}
                    autoPlayVideo={Boolean(spotlightVideoPreviewUrl || spotlightVideoUrl)}
                    mutedVideo={Boolean(spotlightVideoPreviewUrl || spotlightVideoUrl)}
                    loopVideo={Boolean(spotlightVideoPreviewUrl || spotlightVideoUrl)}
                  />
                </div>
              </div>
            ) : null}

            <div style={controlGrid(isCompact, 150)}>
              <button
                type="button"
                onClick={() => void handleCreateSpotlight()}
                disabled={
                  shopActionsLocked ||
                  creatingSpotlight ||
                  preparingSpotlightImage ||
                  preparingSpotlightVideo
                }
                style={fullButton(actionBtn(
                  "primary",
                  shopActionsLocked ||
                    creatingSpotlight ||
                    preparingSpotlightImage ||
                    preparingSpotlightVideo
                ))}
              >
                {shopActionsLocked
                  ? "Review Identity First"
                  : creatingSpotlight
                  ? "Publishing..."
                  : preparingSpotlightImage || preparingSpotlightVideo
                  ? "Preparing media..."
                  : "Publish Spotlight"}
              </button>

              <button
                type="button"
                onClick={() => setSpotlightOpen(false)}
                style={fullButton(actionBtn("secondary"))}
              >
                Collapse Spotlight
              </button>
            </div>

            {activeSpotlights.length > 0 ? (
              <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
                {activeSpotlights.slice(0, 4).map((item) => (
                  <div key={item.id} style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 15,
                        lineHeight: 1.35,
                      }}
                    >
                      {firstTruthy(item?.message, "Spotlight")}
                    </div>

                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(false)}>
                        {firstTruthy(item?.priority_mode, "free")}
                      </span>
                      <span style={badge(false)}>
                        {firstTruthy(item?.visibility_scope, "direct_communities")}
                      </span>
                      {safeStr(item?.video_url) ? (
                        <span style={badge(false)}>Short video</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section
        id="shop-control-vault"
        style={pageCard(
          "radial-gradient(circle at 16% 0%, rgba(217,172,51,0.16) 0%, rgba(217,172,51,0) 30%), linear-gradient(180deg, #071827 0%, #0B2942 56%, #123A59 100%)"
        )}
      >
        <div style={{ ...sectionLabel(), color: "#F6D77A" }}>Vault and private access</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 60%, #FFF9E7 100%)")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Community-visible products
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {publicProducts.length > 0 ? (
                publicProducts.slice(0, 5).map((item) => (
                  <div key={item.id} style={helperText()}>
                    {firstTruthy(item?.name, "Product")}
                  </div>
                ))
              ) : (
                <div style={helperText()}>
                  Public products have not been released yet.
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              ...innerCard(
                "radial-gradient(circle at 16% 0%, rgba(217,172,51,0.16) 0%, rgba(217,172,51,0) 32%), linear-gradient(180deg, #071827 0%, #0B2942 58%, #123A59 100%)"
              ),
              border: "1px solid rgba(212,175,55,0.22)",
              boxShadow:
                "0 20px 44px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.16)",
            }}
          >
            <div
              style={{
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Vault private offers
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div style={{ ...helperText(), color: "#D7E3F1" }}>
                Private offers ready: {vaultProducts.length}
              </div>
              <div style={{ ...helperText(), color: "#D7E3F1" }}>
                Access links ready: {vaultLinks.length}
              </div>

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
                    <span style={badge(true)}>Link #{item.id}</span>
                    <span
                      style={{
                        ...badge(false),
                        background: "rgba(212,175,55,0.10)",
                        color: "#F6D77A",
                      }}
                    >
                      {firstTruthy(item?.status, "active")}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#D7E3F1" }}>
                    Access ends: {safeDateTime(item?.expires_at)}
                  </div>
                </div>
              ))}

              {vaultProducts.length === 0 && vaultLinks.length === 0 ? (
                <div style={{ ...helperText(), color: "#D7E3F1" }}>
                  Vault is not open yet. Private offers and permission-based access links will show
                  here after you activate Vault and release access.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}



