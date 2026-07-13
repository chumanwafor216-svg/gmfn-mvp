import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import GSNBrandMark from "../components/GSNBrandMark";
import {
  PrimaryButton,
  SecondaryButton,
  StableButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  buildGsnPublicShopLinkMessage,
} from "../lib/gsnSnapshotPaper";
import { PAID_REPOST_HASH } from "../lib/ownerShopHandles";
import {
  getMe,
  getMyMarketplaceShop,
  getPublicMarketplaceShopByGmfnId,
  getSelectedClanId,
  listMyCommunityDomains,
  safeCopy,
  uploadMarketplaceImageFile as uploadMarketplaceImageFileApi,
  uploadMarketplaceVideoFile as uploadMarketplaceVideoFileApi,
} from "../lib/api";
import {
  communityDomainFeatureIsOff,
  communityDomainFeatureModeFromPayload,
  communityDomainFeatureOffMessage,
} from "../lib/communityDomainFeaturePolicy";
import {
  publicShopShareUrl,
} from "../lib/publicLinks";
import { createShopGalleryCoverFromVideo } from "../lib/shopGalleryMediaProtocol";
import { rememberShopProductMedia } from "../lib/shopProductMediaCache";
import {
  SPOTLIGHT_MAX_IMAGE_BYTES,
  SPOTLIGHT_MAX_VIDEO_BYTES,
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
} from "../lib/spotlightPilot";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";

type ShopRecord = {
  id: number;
  clan_id?: number | null;
  owner_user_id?: number | null;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  owner_name?: string | null;
  owner_display_name?: string | null;
  name?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  image_url?: string | null;
  marketplace_name?: string | null;
  clan_name?: string | null;
  community_name?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type ProductRecord = {
  id: number;
  shop_id: number;
  clan_id?: number;
  seller_user_id?: number;
  seller_gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  visibility_mode?: string | null;
  public_block_number?: number | string | null;
  slot_number?: number | string | null;
  is_active?: boolean;
  created_at?: string | null;
  origin_clan_id?: number;
  origin_shop_id?: number;
  origin_shop_name?: string | null;
};

type NoticeTone = "success" | "error" | "info";
type CollapseState = {
  guidance: boolean;
  signboard: boolean;
  products: boolean;
  posted: boolean;
};

type ShopAssetsPageProps = {
  embedded?: boolean;
  preferredClanId?: number | null;
  preferredGmfnId?: string | null;
  seedShop?: ShopRecord | null;
  seedProducts?: ProductRecord[] | null;
};

const SHOP_ASSETS_UI_STORAGE_KEY = "gmfn.shopAssets.sections.v2";
const PUBLIC_GALLERY_VISIBILITY_MODES = new Set([
  "community_visible",
  "public",
  "community",
  "public_gallery",
  "shop_gallery",
]);
function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.24)",
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.12), 0 8px 18px rgba(7,20,36,0.045), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(20,52,83,0.20)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(20,52,83,0.18)",
  };
}

function statTile(): React.CSSProperties {
  return {
    ...institutionalStatTile(),
    border: "1px solid rgba(20,52,83,0.16)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4E6680",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4E6680",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(29,95,212,0.12)" : "rgba(160,178,201,0.18)",
    color: primary ? "#0B63D1" : "#31506D",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function iconBadge(
  icon: GsnIconName,
  label: React.ReactNode,
  primary = false
) {
  return (
    <span style={badge(primary)}>
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 20,
          height: 20,
          borderRadius: 7,
          display: "inline-grid",
          placeItems: "center",
          color: primary ? "#F8D876" : "#0B63D1",
          background: "rgba(255,255,255,0.94)",
          border: primary
            ? "1px solid rgba(226,192,106,0.30)"
            : "1px solid rgba(13,95,168,0.14)",
          boxShadow:
            "0 7px 14px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        }}
      >
        <GsnLegacyIcon name={icon} size={18} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function labelWithIcon(icon: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        minWidth: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 22,
          height: 22,
          borderRadius: 8,
          display: "inline-grid",
          placeItems: "center",
          color: "#0B63D1",
          background: "rgba(255,255,255,0.94)",
          border: "1px solid rgba(13,95,168,0.14)",
          boxShadow:
            "0 8px 16px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        }}
      >
        <GsnLegacyIcon name={icon} size={18} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function ownerActionGrid(isCompact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(148px, 1fr))",
    gridAutoRows: isCompact ? "56px" : "48px",
    gap: isCompact ? 12 : 10,
    alignItems: "stretch",
    overflowAnchor: "none",
  };
}

function workbenchActionGrid(isCompact: boolean): React.CSSProperties {
  return {
    ...ownerActionGrid(isCompact),
    gridTemplateColumns: isCompact
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(auto-fit, minmax(148px, 1fr))",
    gap: isCompact ? 8 : 10,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(122,152,195,0.20)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
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

function writeLocalJSON(key: string, value: unknown) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function defaultCollapseState(): CollapseState {
  return {
    guidance: true,
    signboard: false,
    products: false,
    posted: true,
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function normalizeCollapseState(raw: unknown): CollapseState {
  const src = (raw ?? {}) as Partial<CollapseState>;
  const base = defaultCollapseState();

  return {
    guidance: Boolean(src.guidance ?? base.guidance),
    signboard: Boolean(src.signboard ?? base.signboard),
    products: Boolean(src.products ?? base.products),
    posted: Boolean(src.posted ?? base.posted),
  };
}

function initialCollapseState(embedded: boolean): CollapseState {
  const stored = normalizeCollapseState(
    readLocalJSON<Partial<CollapseState>>(
      SHOP_ASSETS_UI_STORAGE_KEY,
      defaultCollapseState()
    )
  );

  if (!embedded) return stored;

  return {
    ...stored,
    posted: false,
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

  const base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base || !/^https?:\/\//i.test(base)) return base;

  try {
    const url = new URL(base);
    const path = url.pathname.replace(/\/+$/, "");
    if (path.toLowerCase() === "/api") {
      return url.origin;
    }

    url.search = "";
    url.hash = "";
    url.pathname = path;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return base;
  }
}

function apiUrl(path: string): string {
  const raw = safeStr(path);
  if (/^https?:\/\//i.test(raw)) return raw;

  let cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (cleanPath.startsWith("/api/")) cleanPath = cleanPath.slice(4);

  return `${apiBase()}${cleanPath}`;
}

function shopAssetsRequestErrorMessage(error: any): string {
  const message = safeStr(error?.message || error);
  const lower = message.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("server did not finish") ||
    lower.includes("check your connection")
  ) {
    return (
      "GSN could not save from this browser yet. Check your connection, reopen GSN if needed, then try again."
    );
  }
  return message || "Shop Gallery Tools could not complete that request.";
}

const SHOP_ASSETS_JSON_TIMEOUT_MS = 30000;

async function fetchShopAssetsJson(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(
    () => controller.abort(),
    SHOP_ASSETS_JSON_TIMEOUT_MS
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        "The server did not finish this request. Please check your connection and try again."
      );
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
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

  let res: Response;
  try {
    res = await fetchShopAssetsJson(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });
  } catch (err: any) {
    throw new Error(shopAssetsRequestErrorMessage(err));
  }

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

async function uploadMarketplaceImageFile(file: File): Promise<string> {
  const data = await uploadMarketplaceImageFileApi(file);
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

  throw new Error(
    "We could not prepare an image from that upload. Paste an image URL instead and continue."
  );
}

async function uploadMarketplaceVideoFile(
  file: File,
  durationSeconds?: number | null
): Promise<string> {
  const data = await uploadMarketplaceVideoFileApi(file, durationSeconds ?? null);
  const url =
    firstTruthy(
      data?.video_url,
      data?.url,
      data?.path,
      data?.item?.video_url,
      data?.item?.url,
      data?.data?.video_url,
      data?.data?.url
    ) || "";

  if (url) return url;

  throw new Error(
    "We could not prepare a video from that upload. Paste a video URL instead and continue."
  );
}

function buildShopLink(gmfnId: string): string {
  if (!gmfnId) return "";
  return publicShopShareUrl({ gmfnId });
}

function buildProductDeepLink(
  gmfnId: string,
  productId: number,
  block?: number
): string {
  if (!gmfnId || !productId) return "";
  return publicShopShareUrl({ gmfnId, productId, block });
}

function extractProductLabel(description: string): string {
  const match = safeStr(description).match(/^\[LABEL:(.+?)\]\s*/i);
  return match ? safeStr(match[1]) : "";
}

function stripProductLabel(description: string): string {
  return safeStr(description).replace(/^\[LABEL:(.+?)\]\s*/i, "");
}

function extractPublicBlockNumber(description: string): number {
  const match = safeStr(description).match(/^\[BLOCK:(\d{1,2})\]\s*/i);
  const blockNumber = Number(match?.[1] || 0);
  return blockNumber >= 1 && blockNumber <= 12 ? blockNumber : 0;
}

function stripPublicBlockNumber(description: string): string {
  return safeStr(description).replace(/^\[BLOCK:\d{1,2}\]\s*/i, "");
}

function stripProductMetadata(description: string): string {
  return stripProductLabel(stripPublicBlockNumber(description));
}

function composeProductDescription(
  label: string,
  description: string,
  publicBlockNumber = 0
): string {
  const cleanBlock =
    publicBlockNumber >= 1 && publicBlockNumber <= 12
      ? `[BLOCK:${publicBlockNumber}]`
      : "";
  const cleanLabel = safeStr(label);
  const cleanDescription = safeStr(description);
  const parts: string[] = [];

  if (cleanBlock) parts.push(cleanBlock);
  if (cleanLabel) parts.push(`[LABEL:${cleanLabel}]`);
  if (cleanDescription) parts.push(cleanDescription);

  return parts.join(" ").trim();
}

function publicBlockNumberForProduct(item: ProductRecord | null | undefined): number {
  const explicitBlock = Number(
    firstTruthy(
      item?.public_block_number,
      item?.slot_number,
      (item as any)?.source_product_slot_number,
      (item as any)?.sourceProductSlotNumber,
      (item as any)?.block,
      (item as any)?.block_number
    )
  );
  if (explicitBlock >= 1 && explicitBlock <= 12) return explicitBlock;

  return extractPublicBlockNumber(firstTruthy(item?.description));
}

function unwrapProductRecord(raw: any): any {
  return raw?.item || raw?.product || raw?.data || raw;
}

function normalizeProductRecord(raw: any): ProductRecord | null {
  if (!raw) return null;
  const src = unwrapProductRecord(raw);
  if (!src) return null;

  const id = Number(src?.id || 0);
  const shopId = Number(src?.shop_id || src?.shopId || 0);
  const publicBlockNumber = Number(
    firstTruthy(
      src?.public_block_number,
      src?.slot_number,
      src?.source_product_slot_number,
      src?.sourceProductSlotNumber,
      src?.block,
      src?.block_number
    )
  );
  const rawDescription = firstTruthy(src?.description, src?.detail, src?.summary);

  return {
    ...src,
    id,
    shop_id: shopId,
    clan_id: Number(src?.clan_id || src?.community_id || 0) || undefined,
    seller_user_id: Number(src?.seller_user_id || 0) || undefined,
    seller_gmfn_id: firstTruthy(src?.seller_gmfn_id, src?.owner_gmfn_id),
    name: firstTruthy(src?.name, src?.title, src?.product_name),
    description: rawDescription,
    price: firstTruthy(src?.price, src?.amount),
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    image_url: firstTruthy(
      src?.image_url,
      src?.thumbnail_url,
      src?.photo_url,
      src?.cover_image_url
    ),
    video_url: firstTruthy(src?.video_url),
    visibility_mode: firstTruthy(src?.visibility_mode, "community_visible"),
    public_block_number:
      publicBlockNumber >= 1 && publicBlockNumber <= 12
        ? publicBlockNumber
        : extractPublicBlockNumber(rawDescription),
    slot_number: firstTruthy(src?.slot_number),
    is_active: src?.is_active,
    created_at: firstTruthy(src?.created_at),
    origin_clan_id: Number(src?.origin_clan_id || src?.source_clan_id || 0) || undefined,
    origin_shop_id: Number(src?.origin_shop_id || src?.source_shop_id || 0) || undefined,
    origin_shop_name: firstTruthy(src?.origin_shop_name, src?.source_shop_name),
  };
}

function normalizeProductRecords(items: any[]): ProductRecord[] {
  return items
    .map((item) => normalizeProductRecord(item))
    .filter(Boolean) as ProductRecord[];
}

function productDisplayRank(item: ProductRecord | null | undefined): {
  createdMs: number;
  id: number;
} {
  const createdMs = Date.parse(firstTruthy(item?.created_at));
  return {
    createdMs: Number.isFinite(createdMs) ? createdMs : 0,
    id: Number(item?.id || 0),
  };
}

function isNewerProductCandidate(
  candidate: ProductRecord,
  current: ProductRecord | null | undefined
): boolean {
  if (!current) return true;

  const candidateRank = productDisplayRank(candidate);
  const currentRank = productDisplayRank(current);
  if (candidateRank.createdMs !== currentRank.createdMs) {
    return candidateRank.createdMs > currentRank.createdMs;
  }

  return candidateRank.id > currentRank.id;
}

function arrangePublicProductsIntoSlots(items: ProductRecord[]): (ProductRecord | null)[] {
  const slots: (ProductRecord | null)[] = Array.from({ length: 12 }, () => null);
  const overflow: ProductRecord[] = [];

  items.forEach((item) => {
    const blockNumber = publicBlockNumberForProduct(item);
    if (blockNumber >= 1 && blockNumber <= 12) {
      if (isNewerProductCandidate(item, slots[blockNumber - 1])) {
        slots[blockNumber - 1] = item;
      }
      return;
    }

    overflow.push(item);
  });

  overflow.forEach((item) => {
    const emptyIndex = slots.findIndex((slot) => slot === null);
    if (emptyIndex >= 0) {
      slots[emptyIndex] = item;
    }
  });

  return slots;
}

function isPublicGalleryProduct(item: ProductRecord | null | undefined): boolean {
  const mode = firstTruthy(item?.visibility_mode, "community_visible").toLowerCase();
  return PUBLIC_GALLERY_VISIBILITY_MODES.has(mode) && item?.is_active !== false;
}

function mergeProductsById(...groups: ProductRecord[][]): ProductRecord[] {
  const out: ProductRecord[] = [];
  const seen = new Map<number, number>();
  const seenFallback = new Set<string>();

  groups.forEach((items) => {
    items.forEach((item) => {
      const id = Number(item?.id || 0);
      if (id > 0) {
        const existingIndex = seen.get(id);
        if (existingIndex !== undefined) {
          const existing = out[existingIndex] || {};
          const enriched: ProductRecord = { ...existing };
          Object.entries(item || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              (enriched as any)[key] = value;
            }
          });
          out[existingIndex] = enriched;
          return;
        }
        seen.set(id, out.length);
      } else {
        const fallbackKey = [
          Number(item?.shop_id || 0),
          publicBlockNumberForProduct(item),
          firstTruthy(item?.name),
          firstTruthy(item?.image_url, item?.video_url),
        ].join("|");
        if (seenFallback.has(fallbackKey)) return;
        seenFallback.add(fallbackKey);
      }
      out.push(item);
    });
  });

  return out;
}

function apiAssetOrigin(): string {
  if (typeof window === "undefined") return "";

  const configured =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env?.VITE_API_BASE_URL) ||
    "/api";
  const trimmed = String(configured || "").trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return window.location.origin;
    }
  }

  return window.location.origin;
}

function resolveAssetSrc(raw: unknown): string {
  const value = safeStr(raw);
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  const origin = apiAssetOrigin();
  if (!origin) return value;

  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

export default function ShopAssetsPage(props: ShopAssetsPageProps = {}) {
  const embedded = Boolean(props.embedded);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );
  const mountedRef = useRef(false);
  const loadSeqRef = useRef(0);
  const productImagePrepJobRef = useRef(0);
  const productVideoPrepJobRef = useRef(0);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    initialCollapseState(embedded)
  );

  const [me, setMe] = useState<any>(null);
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);

  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [shopWhatsApp, setShopWhatsApp] = useState("");
  const [shopTelegram, setShopTelegram] = useState("");
  const [shopImageUrlInput, setShopImageUrlInput] = useState("");
  const [shopSelectedFile, setShopSelectedFile] = useState<File | null>(null);
  const [shopPreviewUrl, setShopPreviewUrl] = useState("");
  const [savingShop, setSavingShop] = useState(false);
  const [uploadingShopImage, setUploadingShopImage] = useState(false);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [productLabel, setProductLabel] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCurrency, setProductCurrency] = useState("NGN");
  const [productVisibility, setProductVisibility] = useState("community_visible");
  const [productImageUrlInput, setProductImageUrlInput] = useState("");
  const [productSelectedFile, setProductSelectedFile] = useState<File | null>(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState("");
  const [productVideoUrlInput, setProductVideoUrlInput] = useState("");
  const [productSelectedVideoFile, setProductSelectedVideoFile] = useState<File | null>(null);
  const [productVideoDurationSeconds, setProductVideoDurationSeconds] = useState<number | null>(null);
  const [productVideoPreviewUrl, setProductVideoPreviewUrl] = useState("");
  const [selectedPublicSlot, setSelectedPublicSlot] = useState(1);
  const selectedPublicSlotRef = useRef(selectedPublicSlot);
  selectedPublicSlotRef.current = selectedPublicSlot;
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [productFormNotice, setProductFormNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);
  const [galleryActionNotice, setGalleryActionNotice] = useState<{
    tone: NoticeTone;
    text: string;
    slotNumber: number;
  } | null>(null);
  const [preparingProductImage, setPreparingProductImage] = useState(false);
  const [preparingProductVideo, setPreparingProductVideo] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [restoringProductId, setRestoringProductId] = useState<number | null>(null);
  const [communityDomainPolicyPayload, setCommunityDomainPolicyPayload] =
    useState<any>(null);

  const selectedClanId = Number(props.preferredClanId || getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "shop-assets.route.dashboard"),
      shop: routeTarget("shop", selectedClanId, "shop-assets.route.shop-control"),
    }),
    [selectedClanId]
  );
  const domainPolicyFallbackName = useMemo(
    () =>
      firstTruthy(
        shop?.marketplace_name,
        shop?.community_name,
        shop?.clan_name,
        "this Community Domain"
      ),
    [shop?.clan_name, shop?.community_name, shop?.marketplace_name]
  );
  const marketplaceShopsDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        selectedClanId,
        "marketplace_shops"
      ),
    [communityDomainPolicyPayload, selectedClanId]
  );
  const marketplaceShopsFeatureOff = communityDomainFeatureIsOff(
    marketplaceShopsDomainFeatureMatch
  );
  const marketplaceShopsFeatureOffText = communityDomainFeatureOffMessage(
    "Marketplace Shops",
    marketplaceShopsDomainFeatureMatch?.domainName || domainPolicyFallbackName
  );
  const shopDiaryDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        selectedClanId,
        "shop_diary"
      ),
    [communityDomainPolicyPayload, selectedClanId]
  );
  const shopDiaryFeatureOff = communityDomainFeatureIsOff(
    shopDiaryDomainFeatureMatch
  );
  const shopDiaryFeatureOffText = communityDomainFeatureOffMessage(
    "Shop Diary",
    shopDiaryDomainFeatureMatch?.domainName || domainPolicyFallbackName
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadSeqRef.current += 1;
      productImagePrepJobRef.current += 1;
      productVideoPrepJobRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    if (!selectedClanId) {
      setCommunityDomainPolicyPayload(null);
      return () => {
        alive = false;
      };
    }

    listMyCommunityDomains()
      .then((payload) => {
        if (alive) setCommunityDomainPolicyPayload(payload);
      })
      .catch(() => {
        if (alive) setCommunityDomainPolicyPayload(null);
      });

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

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
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!embedded) {
      writeLocalJSON(SHOP_ASSETS_UI_STORAGE_KEY, collapsed);
      return;
    }

    const stored = readLocalJSON<Partial<CollapseState>>(
      SHOP_ASSETS_UI_STORAGE_KEY,
      defaultCollapseState()
    );
    writeLocalJSON(SHOP_ASSETS_UI_STORAGE_KEY, {
      ...stored,
      signboard: collapsed.signboard,
    });
  }, [collapsed, embedded]);

  useEffect(() => {
    return () => {
      if (shopPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(shopPreviewUrl);
      if (productPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(productPreviewUrl);
      if (productVideoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(productVideoPreviewUrl);
      }
    };
  }, [shopPreviewUrl, productPreviewUrl, productVideoPreviewUrl]);


  const showNotice = useCallback((tone: NoticeTone, text: string) => {
    setNotice({ tone, text });
  }, []);

  const showProductFormNotice = useCallback((tone: NoticeTone, text: string) => {
    setProductFormNotice({ tone, text });
    showNotice(tone, text);
  }, [showNotice]);

  const showGalleryActionNotice = useCallback((
    tone: NoticeTone,
    text: string,
    slotNumber = selectedPublicSlotRef.current
  ) => {
    setGalleryActionNotice({ tone, text, slotNumber });
    showNotice(tone, text);
  }, [showNotice]);

  function fallbackShopName(): string {
    return (
      safeStr(shopName) ||
      firstTruthy(me?.display_name, me?.email).replace(/@.*$/, "").trim() ||
      firstTruthy(me?.gmfn_id) ||
      "My GSN Shop"
    );
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function setSectionCollapsed(key: keyof CollapseState, value: boolean) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function canApplyLoad(seq: number): boolean {
    return mountedRef.current && loadSeqRef.current === seq;
  }

  const loadPage = useCallback(async (): Promise<ProductRecord[]> => {
    const loadSeq = loadSeqRef.current + 1;
    loadSeqRef.current = loadSeq;
    const seedProducts = normalizeProductRecords(props.seedProducts || []);
    const seedShop = (props.seedShop || null) as ShopRecord | null;
    setLoading(true);
    setShop(seedShop);
    setProducts(seedProducts);

    try {
      let loadedProducts: ProductRecord[] = [];
      const meRes = await getMe().catch(() => null);
      if (!canApplyLoad(loadSeq)) return seedProducts;
      setMe(meRes || null);

      const gmfnId = firstTruthy(
        props.preferredGmfnId,
        seedShop?.owner_gmfn_id,
        seedShop?.gmfn_id,
        meRes?.gmfn_id
      );

      let shopRes = await getMyMarketplaceShop({
        clan_id: selectedClanId || undefined,
        header_clan_id: selectedClanId || undefined,
        product_limit: 300,
      }).catch(() => null);
      if (!canApplyLoad(loadSeq)) return seedProducts;
      if (!shopRes?.item && selectedClanId > 0) {
        shopRes = await getMyMarketplaceShop({
          product_limit: 300,
        }).catch(() => shopRes);
        if (!canApplyLoad(loadSeq)) return seedProducts;
      }

      if (!shopRes?.item && gmfnId) {
        shopRes = await apiJson<any>(
          `/api/marketplace/shops/by-gmfn/${encodeURIComponent(gmfnId)}?clan_id=${selectedClanId || 0}`
        ).catch(() => shopRes);
        if (!canApplyLoad(loadSeq)) return seedProducts;
        if (!shopRes?.item && selectedClanId > 0) {
          shopRes = await apiJson<any>(
            `/api/marketplace/shops/by-gmfn/${encodeURIComponent(gmfnId)}`
          ).catch(() => shopRes);
          if (!canApplyLoad(loadSeq)) return seedProducts;
        }
      }

      if (!shopRes?.item && !gmfnId) {
        if (!canApplyLoad(loadSeq)) return seedProducts;
        setShop(seedShop);
        setProducts(seedProducts);
        return seedProducts;
      }

      let shopItem = (shopRes?.item || seedShop || null) as ShopRecord | null;
      let nextProducts: ProductRecord[] = mergeProductsById(
        seedProducts,
        Array.isArray(shopRes?.products)
          ? normalizeProductRecords(shopRes.products)
          : []
      );
      const effectiveGmfnId = firstTruthy(
        shopRes?.gmfn_id,
        shopRes?.item?.owner_gmfn_id,
        shopRes?.item?.gmfn_id,
        gmfnId
      );

      let publicShopRes = effectiveGmfnId
        ? await getPublicMarketplaceShopByGmfnId(effectiveGmfnId, {
            clan_id: selectedClanId || undefined,
            product_limit: 200,
            broadcast_limit: 1,
          }).catch(() => null)
        : null;
      if (!canApplyLoad(loadSeq)) return seedProducts;
      if (!publicShopRes && effectiveGmfnId && selectedClanId > 0) {
        publicShopRes = await getPublicMarketplaceShopByGmfnId(effectiveGmfnId, {
          product_limit: 200,
          broadcast_limit: 1,
        }).catch(() => null);
      }
      if (!canApplyLoad(loadSeq)) return seedProducts;
      const publicShopItem = (publicShopRes?.item || null) as ShopRecord | null;
      const publicShopProducts: ProductRecord[] = Array.isArray(publicShopRes?.products)
        ? normalizeProductRecords(publicShopRes.products)
        : [];
      if (!shopItem && publicShopItem) {
        shopItem = publicShopItem;
      }

      if (shopItem?.id) {
        const productsRes = await apiJson<any>(
          `/api/marketplace/products?clan_id=${selectedClanId || 0}&shop_id=${shopItem.id}&include_private_manage=true&only_active=false&limit=200`
        ).catch(() => ({ items: nextProducts }));

        if (!canApplyLoad(loadSeq)) return seedProducts;
        const managedProducts = Array.isArray(productsRes?.items)
          ? normalizeProductRecords(productsRes.items)
          : [];
        nextProducts = mergeProductsById(nextProducts, managedProducts);
      }

      nextProducts = mergeProductsById(nextProducts, publicShopProducts);
      setShop(shopItem);

      if (shopItem) {
        setShopName(firstTruthy(shopItem?.name));
        setShopDescription(firstTruthy(shopItem?.description));
        setShopWhatsApp(firstTruthy(shopItem?.whatsapp_number));
        setShopTelegram(firstTruthy(shopItem?.telegram_handle));
        setShopImageUrlInput(firstTruthy(shopItem?.image_url));
        setShopPreviewUrl(firstTruthy(shopItem?.image_url));
      } else {
        setShopName("");
        setShopDescription("");
        setShopWhatsApp("");
        setShopTelegram("");
        setShopImageUrlInput("");
        setShopPreviewUrl("");
      }

      setProducts(nextProducts);
      loadedProducts = nextProducts;
      return loadedProducts;
    } catch (err: any) {
      if (!canApplyLoad(loadSeq)) return seedProducts;
      const message = shopAssetsRequestErrorMessage(err);
      setShop(seedShop);
      setProducts(seedProducts);
      showGalleryActionNotice(
        "error",
        message,
        selectedPublicSlotRef.current
      );
      return seedProducts;
    } finally {
      if (canApplyLoad(loadSeq)) setLoading(false);
    }
  }, [
    props.preferredGmfnId,
    props.seedProducts,
    props.seedShop,
    selectedClanId,
    showGalleryActionNotice,
  ]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const gmfnIdValue = useMemo(
    () => firstTruthy(shop?.owner_gmfn_id, shop?.gmfn_id),
    [shop]
  );
  const gmfnId = useMemo(() => firstTruthy(gmfnIdValue, "Not issued yet"), [gmfnIdValue]);
  const shopLink = useMemo(() => buildShopLink(gmfnIdValue), [gmfnIdValue]);
  const marketplaceBasePath = useMemo(
    () =>
      routeTarget(
        "marketplace",
        selectedClanId,
        "shop-assets.route.paid-repost"
      ),
    [selectedClanId]
  );

  function buildPaidRepostPath(product: ProductRecord, blockNumber: number): string {
    const productId = Number(product?.id || 0);
    const params = new URLSearchParams();
    if (productId > 0) params.set("repost_product_id", String(productId));
    if (blockNumber >= 1 && blockNumber <= 12) params.set("block", String(blockNumber));
    params.set("source", "shop-control-gallery");
    const joiner = marketplaceBasePath.includes("?") ? "&" : "?";
    return `${marketplaceBasePath}${joiner}${params.toString()}#${PAID_REPOST_HASH}`;
  }

  function buildPublicShopMessage(
    link: string,
    product?: ProductRecord | null,
    blockNumber?: number
  ): string {
    if (!link) return "";

    const visibleBlock =
      blockNumber ||
      Number(product?.public_block_number || product?.slot_number || 0);
    const itemName = firstTruthy(
      product?.name,
      extractProductLabel(firstTruthy(product?.description)),
      product ? "Public shop item" : "",
      visibleBlock > 0 ? `Block ${visibleBlock}` : ""
    );

    return buildGsnPublicShopLinkMessage({
      shopName: firstTruthy(shopName, shop?.name, "My GSN Shop"),
      ownerName: firstTruthy(shop?.owner_display_name, shop?.owner_name, me?.display_name),
      gsnId: gmfnIdValue,
      communityName: firstTruthy(
        shop?.marketplace_name,
        shop?.community_name,
        shop?.clan_name
      ),
      itemName,
      shopLink: link,
    });
  }

  const publicProducts = useMemo(
    () => products.filter((item) => isPublicGalleryProduct(item)),
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

  const hiddenProducts = useMemo(
    () => products.filter((item) => item?.is_active === false),
    [products]
  );

  const publicGallerySlots = useMemo(
    () => arrangePublicProductsIntoSlots(publicProducts),
    [publicProducts]
  );
  const occupiedPublicSlotCount = useMemo(
    () => publicGallerySlots.filter(Boolean).length,
    [publicGallerySlots]
  );

  const selectedPublicProduct = publicGallerySlots[selectedPublicSlot - 1] || null;

  async function copyText(
    text: string,
    successMessage: string,
    missingMessage = "Nothing to copy yet."
  ) {
    if (!text) {
      showNotice("error", missingMessage);
      return;
    }

    const copied = await safeCopy(text);
    showNotice(
      copied ? "success" : "error",
      copied
        ? successMessage
        : "Clipboard copy was blocked. Refresh the public shop link before sharing."
    );
  }

  function openShopLink() {
    if (!shopLink) {
      showNotice(
        "error",
        "Public shop link is not ready yet. Refresh the shop identity, then try again."
      );
      return;
    }

    const opened = window.open(shopLink, "_blank", "noopener,noreferrer");
    showNotice(
      opened ? "success" : "error",
      opened
        ? "Opening public shop now."
        : "The browser blocked the public shop window. Copy the public link and open it manually."
    );
  }

  function setShopPreviewFromFile(file: File | null) {
    setShopSelectedFile(file);

    if (shopPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(shopPreviewUrl);
    }

    if (file) {
      const next = URL.createObjectURL(file);
      setShopPreviewUrl(next);
    } else {
      setShopPreviewUrl(firstTruthy(shopImageUrlInput));
    }
  }

  async function setProductPreviewFromFile(file: File | null) {
    productImagePrepJobRef.current += 1;
    const prepJob = productImagePrepJobRef.current;
    setProductFormNotice(null);
    setPreparingProductImage(false);

    if (productPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productPreviewUrl);
    }

    if (!file) {
      setProductSelectedFile(null);
      setProductPreviewUrl(firstTruthy(productImageUrlInput));
      return;
    }

    try {
      setPreparingProductImage(true);
      const prepared = await prepareSpotlightImageFile(file, {
        maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
      });

      if (productImagePrepJobRef.current !== prepJob) return;

      setProductSelectedFile(prepared.file);
      const next = URL.createObjectURL(prepared.file);
      setProductPreviewUrl(next);
      showProductFormNotice(
        "info",
        prepared.message ||
          `${safeStr(prepared.file.name) || "Selected picture"} is ready for this gallery block.`
      );
    } catch (err: any) {
      if (productImagePrepJobRef.current !== prepJob) return;
      setProductSelectedFile(null);
      setProductPreviewUrl(firstTruthy(productImageUrlInput));
      showProductFormNotice(
        "error",
        safeStr(err?.message) || "This picture could not be prepared for the shop gallery."
      );
    } finally {
      if (productImagePrepJobRef.current === prepJob) {
        setPreparingProductImage(false);
      }
    }
  }

  async function setProductVideoPreviewFromFile(file: File | null) {
    productVideoPrepJobRef.current += 1;
    const prepJob = productVideoPrepJobRef.current;
    setProductFormNotice(null);
    setPreparingProductVideo(false);

    if (productVideoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productVideoPreviewUrl);
    }

    if (!file) {
      setProductSelectedVideoFile(null);
      setProductVideoDurationSeconds(null);
      setProductVideoPreviewUrl(firstTruthy(productVideoUrlInput));
      return;
    }

    try {
      setPreparingProductVideo(true);
      const prepared = await prepareSpotlightVideoFile(file, {
        maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
        maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
      });

      if (productVideoPrepJobRef.current !== prepJob) return;

      setProductSelectedVideoFile(prepared.file);
      setProductVideoDurationSeconds(prepared.durationSeconds ?? null);
      const next = URL.createObjectURL(prepared.file);
      setProductVideoPreviewUrl(next);
      let coverMessage = "";

      if (!safeStr(productImageUrlInput) && !safeStr(productPreviewUrl)) {
        const cover = await createShopGalleryCoverFromVideo(prepared.file);
        if (productVideoPrepJobRef.current === prepJob) {
          setProductSelectedFile(cover.file);
          const coverPreview = URL.createObjectURL(cover.file);
          setProductPreviewUrl(coverPreview);
          coverMessage = ` ${cover.message}`;
        }
      }

      showProductFormNotice(
        "info",
        prepared.message
          ? `${prepared.message.replace("spotlight-ready", "shop-gallery-ready")}${coverMessage}`
          : `${safeStr(prepared.file.name) || "Selected video"} is ready for this gallery block.${coverMessage}`
      );
    } catch (err: any) {
      if (productVideoPrepJobRef.current !== prepJob) return;
      setProductSelectedVideoFile(null);
      setProductVideoDurationSeconds(null);
      setProductVideoPreviewUrl(firstTruthy(productVideoUrlInput));
      showProductFormNotice(
        "error",
        safeStr(err?.message) ||
          "This phone could not prepare that video for the shop gallery."
      );
    } finally {
      if (productVideoPrepJobRef.current === prepJob) {
        setPreparingProductVideo(false);
      }
    }
  }

  async function saveShopSignboard(extra?: { clear_image?: boolean; image_url?: string | null }) {
    if (marketplaceShopsFeatureOff) {
      showNotice("error", marketplaceShopsFeatureOffText);
      return;
    }

    setSavingShop(true);

    try {
      let nextImageUrl = safeStr(extra?.image_url ?? shopImageUrlInput) || null;

      if (shopSelectedFile) {
        setUploadingShopImage(true);
        nextImageUrl = await uploadMarketplaceImageFile(shopSelectedFile);
        if (!mountedRef.current) return;
      }

      const body: any = {
        clan_id: Number(shop?.clan_id || selectedClanId || 0) || null,
        name: fallbackShopName(),
        description: safeStr(shopDescription) || null,
        whatsapp_number: safeStr(shopWhatsApp) || null,
        telegram_handle: safeStr(shopTelegram) || null,
      };

      if (shop?.id && extra?.clear_image) {
        body.clear_image = true;
      } else {
        body.image_url = nextImageUrl;
      }

      const res = await apiJson<any>(shop?.id ? `/api/marketplace/shops/${shop.id}` : "/api/marketplace/shops", {
        method: shop?.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });

      if (!mountedRef.current) return;
      const updated = (res?.item || shop) as ShopRecord;
      setShop(updated);
      setShopName(firstTruthy(updated?.name));
      setShopDescription(firstTruthy(updated?.description));
      setShopWhatsApp(firstTruthy(updated?.whatsapp_number));
      setShopTelegram(firstTruthy(updated?.telegram_handle));
      setShopImageUrlInput(firstTruthy(updated?.image_url));
      setShopPreviewUrl(firstTruthy(updated?.image_url));
      setShopSelectedFile(null);
      setCollapsed((prev) => ({
        ...prev,
        signboard: true,
        products: false,
      }));
      showNotice("success", "Shop information saved. Shop info control closed.");
    } catch (err: any) {
      if (!mountedRef.current) return;
      showNotice("error", safeStr(err?.message) || "Shop signboard could not be saved.");
    } finally {
      if (mountedRef.current) {
        setSavingShop(false);
        setUploadingShopImage(false);
      }
    }
  }

  async function ensureShopRecordForProduct(): Promise<ShopRecord | null> {
    if (shop?.id) return shop;

    if (marketplaceShopsFeatureOff) {
      showProductFormNotice("error", marketplaceShopsFeatureOffText);
      showGalleryActionNotice("error", marketplaceShopsFeatureOffText);
      return null;
    }

    const body = {
      clan_id: Number(selectedClanId || 0) || null,
      name: fallbackShopName(),
      description: safeStr(shopDescription) || null,
      whatsapp_number: safeStr(shopWhatsApp) || null,
      telegram_handle: safeStr(shopTelegram) || null,
      image_url: safeStr(shopImageUrlInput) || null,
    };

    const res = await apiJson<any>("/api/marketplace/shops", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!mountedRef.current) return null;
    const nextShop = (res?.item || null) as ShopRecord | null;
    if (!nextShop?.id) return null;

    setShop(nextShop);
    setShopName(firstTruthy(nextShop?.name, body.name));
    setShopDescription(firstTruthy(nextShop?.description, shopDescription));
    setShopWhatsApp(firstTruthy(nextShop?.whatsapp_number, shopWhatsApp));
    setShopTelegram(firstTruthy(nextShop?.telegram_handle, shopTelegram));
    setShopImageUrlInput(firstTruthy(nextShop?.image_url, shopImageUrlInput));
    setShopPreviewUrl(firstTruthy(nextShop?.image_url, shopPreviewUrl));
    return nextShop;
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setProductLabel("");
    setProductDescription("");
    setProductPrice("");
    setProductCurrency("NGN");
    setProductVisibility("community_visible");
    setProductImageUrlInput("");
    setProductSelectedFile(null);
    setProductVideoUrlInput("");
    setProductSelectedVideoFile(null);
    setProductVideoDurationSeconds(null);

    if (productPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productPreviewUrl);
    }
    setProductPreviewUrl("");

    if (productVideoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productVideoPreviewUrl);
    }
    setProductVideoPreviewUrl("");
    setProductFormNotice(null);
  }

  function startEditProduct(item: ProductRecord) {
    setEditingProductId(Number(item.id));
    setProductName(firstTruthy(item?.name));
    setProductLabel(extractProductLabel(firstTruthy(item?.description)));
    setProductDescription(stripProductMetadata(firstTruthy(item?.description)));
    setProductPrice(firstTruthy(item?.price));
    setProductCurrency(firstTruthy(item?.currency, "NGN"));
    setProductVisibility(firstTruthy(item?.visibility_mode, "community_visible"));
    setProductImageUrlInput(firstTruthy(item?.image_url));
    setProductSelectedFile(null);
    setProductVideoUrlInput(firstTruthy(item?.video_url));
    setProductSelectedVideoFile(null);
    setProductVideoDurationSeconds(null);

    if (productPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productPreviewUrl);
    }
    setProductPreviewUrl(firstTruthy(item?.image_url));

    if (productVideoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productVideoPreviewUrl);
    }
    setProductVideoPreviewUrl(firstTruthy(item?.video_url));
  }

  function openAddForPublicSlot(slotNumber: number) {
    if (shopDiaryFeatureOff) {
      setSelectedPublicSlot(slotNumber);
      showGalleryActionNotice("error", shopDiaryFeatureOffText, slotNumber);
      return;
    }

    setSelectedPublicSlot(slotNumber);
    setGalleryActionNotice(null);
    resetProductForm();
    setProductFormNotice(null);
    setProductVisibility("community_visible");
    setProductEditorOpen(true);
    setCollapsed((prev) => ({ ...prev, products: false }));
  }

  function openEditForPublicSlot(item: ProductRecord, slotNumber: number) {
    if (shopDiaryFeatureOff) {
      setSelectedPublicSlot(slotNumber);
      showGalleryActionNotice("error", shopDiaryFeatureOffText, slotNumber);
      return;
    }

    setSelectedPublicSlot(slotNumber);
    setGalleryActionNotice(null);
    startEditProduct(item);
    setProductFormNotice(null);
    setProductEditorOpen(true);
    setCollapsed((prev) => ({ ...prev, products: false }));
  }

  function closeProductEditor() {
    resetProductForm();
    setProductEditorOpen(false);
  }

  async function submitProduct() {
    if (shopDiaryFeatureOff) {
      showProductFormNotice("error", shopDiaryFeatureOffText);
      showGalleryActionNotice("error", shopDiaryFeatureOffText, selectedPublicSlot);
      return;
    }

    if (preparingProductImage || preparingProductVideo) {
      showProductFormNotice(
        "info",
        "Please wait while GSN prepares the selected media, then tap Post again."
      );
      return;
    }

    if (!safeStr(productName)) {
      showProductFormNotice("error", "Add the product title first.");
      return;
    }

    if (!safeStr(productPrice)) {
      showProductFormNotice("error", "Add the product price first.");
      return;
    }

    const targetVisibility = safeStr(productVisibility || "community_visible");
    const editingProduct = editingProductId
      ? products.find((item) => Number(item.id) === Number(editingProductId))
      : null;
    const editingAlreadyPublic =
      editingProduct?.is_active !== false &&
      firstTruthy(editingProduct?.visibility_mode, "community_visible") ===
        "community_visible";

    if (
      targetVisibility === "community_visible" &&
      !editingAlreadyPublic &&
      occupiedPublicSlotCount >= 12
    ) {
      showProductFormNotice(
        "error",
        "The public shop gallery already has 12 live blocks. Edit or remove one before adding another."
      );
      return;
    }

    setSavingProduct(true);

    try {
      const activeShop = await ensureShopRecordForProduct();
      if (!mountedRef.current) return;
      if (!activeShop?.id) {
        showProductFormNotice(
          "error",
          "GSN could not prepare your public shop yet. Save shop info once, then post the item again."
        );
        setSavingProduct(false);
        return;
      }

      const wasEditingProduct = Boolean(editingProductId);
      let nextImageUrl = safeStr(productImageUrlInput) || null;
      let nextVideoUrl = safeStr(productVideoUrlInput) || null;

      if (productSelectedFile) {
        nextImageUrl = await uploadMarketplaceImageFile(productSelectedFile);
        if (!mountedRef.current) return;
      }

      if (productSelectedVideoFile) {
        nextVideoUrl = await uploadMarketplaceVideoFile(
          productSelectedVideoFile,
          productVideoDurationSeconds
        );
        if (!mountedRef.current) return;
      }

      if (!nextImageUrl) {
        if (productSelectedVideoFile) {
          const cover = await createShopGalleryCoverFromVideo(productSelectedVideoFile);
          if (!mountedRef.current) return;
          nextImageUrl = await uploadMarketplaceImageFile(cover.file);
          if (!mountedRef.current) return;
          showProductFormNotice("info", cover.message);
        } else if (nextVideoUrl) {
          nextImageUrl = nextVideoUrl;
        } else {
          showProductFormNotice(
            "error",
            `Block #${selectedPublicSlot} needs a picture or a video before it can be posted.`
          );
          setSavingProduct(false);
          return;
        }
      }

      const body = {
        clan_id: Number(activeShop?.clan_id || selectedClanId || 0),
        shop_id: Number(activeShop.id),
        name: safeStr(productName),
        description: composeProductDescription(
          productLabel,
          productDescription,
          targetVisibility === "community_visible" ? selectedPublicSlot : 0
        ),
        price: safeStr(productPrice),
        currency: safeStr(productCurrency || "NGN"),
        image_url: nextImageUrl,
        video_url: nextVideoUrl,
        visibility_mode: targetVisibility,
      };

      const path = editingProductId
        ? `/api/marketplace/products/${editingProductId}`
        : "/api/marketplace/products";

      const method = editingProductId ? "PATCH" : "POST";

      const saveRes = await apiJson<any>(path, {
        method,
        body: JSON.stringify(body),
      });

      if (!mountedRef.current) return;
      const savedId = Number(
        saveRes?.item?.id ||
          saveRes?.product?.id ||
          saveRes?.data?.id ||
          saveRes?.id ||
          editingProductId ||
          0
      );
      const refreshedProducts = await loadPage();
      if (!mountedRef.current) return;
      let hydratedProducts = refreshedProducts;
      if (savedId > 0 && (nextImageUrl || nextVideoUrl)) {
        rememberShopProductMedia(savedId, {
          image_url: nextImageUrl,
          video_url: nextVideoUrl,
        });
        hydratedProducts = refreshedProducts.map((item) =>
          Number(item?.id) === savedId
            ? {
                ...item,
                image_url: firstTruthy(item?.image_url, nextImageUrl),
                video_url: firstTruthy(item?.video_url, nextVideoUrl),
              }
            : item
        );
        setProducts(hydratedProducts);
      }
      if (targetVisibility === "community_visible") {
        const savedSlotNumber = selectedPublicSlot;
        setSelectedPublicSlot(savedSlotNumber);
        showGalleryActionNotice(
          "success",
          nextVideoUrl
            ? `Block #${savedSlotNumber} saved with video. Open the public shop, open the item, then tap Sound on to hear the audio.`
            : `Block #${savedSlotNumber} saved with picture. It is now visible in the public shop gallery.`,
          savedSlotNumber
        );
      } else {
        showGalleryActionNotice(
          "success",
          wasEditingProduct ? "Private item updated." : "Private item posted.",
          selectedPublicSlot
        );
      }
      resetProductForm();
      setProductEditorOpen(false);
      setCollapsed((prev) => ({
        ...prev,
        products: true,
        posted: false,
      }));
    } catch (err: any) {
      if (!mountedRef.current) return;
      const message =
        safeStr(err?.message) ||
        "Product could not be saved. Check the picture, video format, and file size.";
      showProductFormNotice("error", message);
      showGalleryActionNotice("error", message, selectedPublicSlot);
    } finally {
      if (mountedRef.current) setSavingProduct(false);
    }
  }

  async function deleteProduct(productId: number) {
    if (shopDiaryFeatureOff) {
      showNotice("error", shopDiaryFeatureOffText);
      showGalleryActionNotice("error", shopDiaryFeatureOffText, selectedPublicSlot);
      return;
    }

    setDeletingProductId(productId);

    try {
      await apiJson<any>(`/api/marketplace/products/${productId}`, {
        method: "DELETE",
      });
      if (!mountedRef.current) return;
      await loadPage();
      if (!mountedRef.current) return;
      if (editingProductId === productId) {
        closeProductEditor();
      }
      showNotice("success", "Product removed.");
    } catch (err: any) {
      if (!mountedRef.current) return;
      showNotice("error", safeStr(err?.message) || "Product could not be removed.");
    } finally {
      if (mountedRef.current) setDeletingProductId(null);
    }
  }

  async function restoreProduct(productId: number) {
    if (shopDiaryFeatureOff) {
      showNotice("error", shopDiaryFeatureOffText);
      return;
    }

    setRestoringProductId(productId);

    try {
      await apiJson<any>(`/api/marketplace/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: true, status: "active" }),
      });
      if (!mountedRef.current) return;
      await loadPage();
      if (!mountedRef.current) return;
      showNotice("success", "Product restored.");
    } catch (err: any) {
      if (!mountedRef.current) return;
      showNotice("error", safeStr(err?.message) || "Product could not be restored.");
    } finally {
      if (mountedRef.current) setRestoringProductId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: embedded ? "none" : 1180, margin: "0 auto", display: "grid", gap: 18 }}>
        {!embedded ? (
          <PageTopNav
            sectionLabel="Shop Control"
            title="Pictures & Products"
            subtitle="Loading shop picture and product lanes..."
            homeTo={routes.dashboard}
            homeLabel="Dashboard"
            backTo={routes.shop}
            backLabel="Shop Control"
          />
        ) : null}
        <section style={pageCard()}>
          <div style={helperText()}>Loading shop assets...</div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: embedded ? "none" : 1180,
        margin: "0 auto",
        paddingBottom: embedded ? 0 : 40,
        display: "grid",
        gap: 18,
      }}
    >
      {!embedded ? (
        <PageTopNav
          sectionLabel="Shop Control"
          title="Pictures & Products"
          subtitle="Prepare the public shop face, then add public products or private Vault offers."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.shop}
          backLabel="Shop Control"
        />
      ) : null}

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {!embedded ? (
        <>
      <section
        style={{
          ...pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          ),
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: isCompact ? -26 : 10,
            top: isCompact ? 8 : -18,
            opacity: 0.075,
            pointerEvents: "none",
            transform: isCompact ? "rotate(-6deg)" : "rotate(-4deg)",
          }}
        >
          <GSNBrandMark width={isCompact ? 116 : 172} height={isCompact ? 144 : 216} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.08fr) 320px",
            gap: 16,
            alignItems: "start",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#D8B95B" }}>Owner workbench</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              {firstTruthy(shop?.name, "Your shop face")}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                maxWidth: 860,
                color: "#D7E3F1",
              }}
            >
              Keep the public picture, public products, and private Vault offers in their own lanes.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {iconBadge("image", <>Shop picture: {safeStr(shopPreviewUrl) ? "Ready" : "Needed"}</>, true)}
              {iconBadge("shop", <>Public products: {occupiedPublicSlotCount} / 12</>, occupiedPublicSlotCount > 0)}
              {iconBadge("lock", <>Vault offers: {vaultProducts.length} / 6</>, vaultProducts.length > 0)}
              {iconBadge("document", <>Hidden: {hiddenProducts.length}</>)}
            </div>

            <div
              style={{
                marginTop: 16,
                ...workbenchActionGrid(isCompact),
              }}
            >
              <StableCtaLink
                to={routes.shop}
                fullWidth
                stableHeight={isCompact ? 56 : 48}
                debugId="shop-assets.back-shop-control"
              >
                Back to Shop Control
              </StableCtaLink>

              <PrimaryButton
                onClick={openShopLink}
                fullWidth
                stableHeight={isCompact ? 56 : 48}
                debugId="shop-assets.open-public-shop"
              >
                Open public shop
              </PrimaryButton>

              <SecondaryButton
                onClick={() =>
                  copyText(
                    buildPublicShopMessage(shopLink),
                    "Public shop package copied.",
                    "Public shop link is not ready yet. Refresh the shop identity, then try again."
                  )
                }
                fullWidth
                stableHeight={isCompact ? 56 : 48}
                style={isCompact ? { gridColumn: "1 / -1" } : undefined}
                debugId="shop-assets.copy-public-link"
              >
                Copy public link
              </SecondaryButton>
            </div>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.16)",
            }}
          >
            <div style={sectionLabel()}>Shop readiness</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>{labelWithIcon("shop", "Public")}</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 22,
                  }}
                >
                  {occupiedPublicSlotCount}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  Open gallery items
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>{labelWithIcon("lock", "Vault")}</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 22,
                  }}
                >
                  {vaultProducts.length}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  Private offers
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>{labelWithIcon("document", "Hidden")}</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 22,
                  }}
                >
                  {hiddenProducts.length}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  Restorable hidden items
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Simple order</div>
            <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
              Follow one clean order: public picture first, public products second, private Vault offers last.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("guidance")}
            debugId="shop-assets.toggle-guidance"
          >
            {collapsed.guidance ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.guidance ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>{labelWithIcon("image", "1. Public picture")}</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Make the shop face clear before people see the product shelf.
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>{labelWithIcon("shop", "2. Public products")}</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Add only the items people can browse and share openly.
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>{labelWithIcon("lock", "3. Vault offers")}</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Use Vault only for private offers shared by controlled access.
              </div>
            </div>
          </div>
        ) : null}
      </section>
        </>
      ) : null}

      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>{labelWithIcon("image", "Public shop picture")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This picture belongs to this shop only. It does not change the
              community picture or any other member's shop.
            </div>
          </div>

          <SubtleButton
            onClick={() => setSectionCollapsed("signboard", !collapsed.signboard)}
            stableHeight={48}
            fullWidth={isCompact}
            debugId="shop-assets.toggle-signboard"
          >
            {collapsed.signboard ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.signboard ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "340px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: "100%",
                height: 260,
                borderRadius: 28,
                overflow: "hidden",
                border: "1px solid rgba(212,175,55,0.18)",
                background:
                  "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)",
                position: "relative",
                padding: 10,
                boxShadow:
                  "0 22px 48px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  minHeight: 240,
                  borderRadius: 22,
                  overflow: "hidden",
                  border: "1px solid rgba(212,175,55,0.14)",
                  background:
                    "linear-gradient(180deg, #11263B 0%, #193A58 100%)",
                }}
              >
                {safeStr(shopPreviewUrl) ? (
                  <img
                    src={shopPreviewUrl}
                    alt={firstTruthy(shop?.name, "Shop signboard")}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : null}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: safeStr(shopPreviewUrl)
                      ? "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.56) 100%)"
                      : "linear-gradient(180deg, rgba(17,38,59,0.20) 0%, rgba(10,22,37,0.42) 100%)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: 18,
                    color: "#FFFFFF",
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>
                    {firstTruthy(shopName, shop?.name, "My Shop")}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.95 }}>
                    {firstTruthy(shop?.marketplace_name, shop?.community_name, "Selected community")}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.95 }}>
                    {gmfnId}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                ...innerCard("rgba(255,255,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
                boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
              }}
            >
              <div style={sectionLabel()}>Picture control</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Save the shop name, contact handles, note, and optional picture
                together. You can save this information without adding a
                picture.
              </div>

              {marketplaceShopsFeatureOff ? (
                <div style={{ marginTop: 12, ...noticeCard("error") }}>
                  {marketplaceShopsFeatureOffText}
                </div>
              ) : null}

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <input
                  type="file"
                  data-gmfn-action-root="true"
                  data-cta-id="shop-assets.profile.image-file"
                  accept="image/*"
                  onChange={(e) => setShopPreviewFromFile(e.target.files?.[0] || null)}
                  style={inputStyle()}
                />

                <input
                  value={shopImageUrlInput}
                  onChange={(e) => {
                    setShopImageUrlInput(e.target.value);
                    if (!shopSelectedFile) {
                      setShopPreviewUrl(e.target.value);
                    }
                  }}
                  placeholder="Or paste public shop image URL"
                  style={inputStyle()}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
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
                      value={shopWhatsApp}
                      onChange={(e) => setShopWhatsApp(e.target.value)}
                      placeholder="WhatsApp number"
                      style={{ ...inputStyle(), marginTop: 8 }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Telegram</div>
                    <input
                      value={shopTelegram}
                      onChange={(e) => setShopTelegram(e.target.value)}
                      placeholder="Telegram handle"
                      style={{ ...inputStyle(), marginTop: 8 }}
                    />
                  </div>

                  <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                    <div style={sectionLabel()}>Short shop note</div>
                    <textarea
                      value={shopDescription}
                      onChange={(e) => setShopDescription(e.target.value)}
                      placeholder="Say what this shop offers in one short note."
                      style={{ ...textAreaStyle(), marginTop: 8 }}
                    />
                  </div>
                </div>

                <div style={ownerActionGrid(isCompact)}>
                  <PrimaryButton
                    onClick={() => void saveShopSignboard()}
                    disabled={savingShop || uploadingShopImage || marketplaceShopsFeatureOff}
                    busy={savingShop || uploadingShopImage}
                    busyLabel={savingShop ? "Saving..." : "Uploading..."}
                    fullWidth
                    stableHeight={isCompact ? 56 : 48}
                    debugId="shop-assets.signboard.save"
                  >
                    Save shop info
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={() => {
                      setShopSelectedFile(null);
                      if (shopPreviewUrl.startsWith("blob:")) {
                        URL.revokeObjectURL(shopPreviewUrl);
                      }
                      setShopPreviewUrl(firstTruthy(shop?.image_url));
                      setShopImageUrlInput(firstTruthy(shop?.image_url));
                    }}
                    fullWidth
                    stableHeight={isCompact ? 56 : 48}
                    debugId="shop-assets.signboard.reset-preview"
                  >
                    Reset preview
                  </SecondaryButton>

                  <SecondaryButton
                    onClick={() =>
                      void saveShopSignboard({
                        clear_image: true,
                        image_url: null,
                      })
                    }
                    disabled={
                      savingShop ||
                      uploadingShopImage ||
                      marketplaceShopsFeatureOff ||
                      !safeStr(shopPreviewUrl)
                    }
                    busy={savingShop || uploadingShopImage}
                    busyLabel={savingShop ? "Saving..." : "Uploading..."}
                    fullWidth
                    stableHeight={isCompact ? 56 : 48}
                    debugId="shop-assets.signboard.remove-picture"
                  >
                    Remove picture
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </section>

      {embedded ? (
        <section style={pageCard("#FFFFFF")}>
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
              <div style={sectionLabel()}>Public gallery block control</div>
              <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
                Choose one numbered block. Confirm the picture or video, then edit,
                hide, copy, or add only that block.
              </div>
            </div>

            {iconBadge(
              "shop",
              <>{occupiedPublicSlotCount} / 12 live blocks</>,
              occupiedPublicSlotCount > 0
            )}
          </div>

          {shopDiaryFeatureOff ? (
            <div style={{ marginTop: 14, ...noticeCard("error") }}>
              {shopDiaryFeatureOffText}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(3, minmax(0, 1fr))"
                : "repeat(6, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {publicGallerySlots.map((item, index) => {
              const slotNumber = index + 1;
              const isSelected = selectedPublicSlot === slotNumber;
              const itemImage = resolveAssetSrc(item?.image_url);
              const itemVideo = resolveAssetSrc(item?.video_url);
              const itemName = firstTruthy(item?.name, `Block #${slotNumber}`);

              return (
                <StableButton
                  key={slotNumber}
                  kind="secondary"
                  onClick={() => setSelectedPublicSlot(slotNumber)}
                  stableHeight={isCompact ? 126 : 118}
                  style={{
                    borderRadius: 18,
                    padding: 8,
                    border: isSelected
                      ? "2px solid rgba(212,175,55,0.92)"
                      : "1px solid rgba(20,52,83,0.16)",
                    background: item
                      ? "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
                      : "linear-gradient(180deg, #F8FBFF 0%, #EDF5FF 100%)",
                    boxShadow: isSelected
                      ? "0 16px 30px rgba(212,175,55,0.18)"
                      : "0 10px 24px rgba(7,20,36,0.08)",
                    color: "#0B1F33",
                    textAlign: "left",
                    display: "grid",
                    gridTemplateRows: "18px 48px minmax(0, 1fr)",
                    gap: 6,
                  }}
                  debugId={`shop-assets.public-slot.${slotNumber}.select`}
                  aria-label={`Select gallery block ${slotNumber}`}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 6,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 950,
                        fontSize: 12,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      #{slotNumber}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        color: item ? "#168447" : "#64748B",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                      }}
                    >
                      {item ? "Live" : "Empty"}
                    </span>
                  </div>

                  <div
                    style={{
                      height: 48,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: item
                        ? "linear-gradient(180deg, #0A1625 0%, #193A58 100%)"
                        : "rgba(122,152,195,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(20,52,83,0.12)",
                    }}
                  >
                    {itemVideo ? (
                      <video
                        src={itemVideo}
                        poster={itemImage || undefined}
                        muted
                        playsInline
                        preload="metadata"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : itemImage ? (
                      <img
                        src={itemImage}
                        alt={itemName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <span style={{ color: "#4E6680", fontWeight: 900 }}>Add</span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: "#31506D",
                      lineHeight: 1.25,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {item ? itemName : "Ready for item"}
                  </div>
                </StableButton>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "280px minmax(0, 1fr)",
              gap: 14,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                minHeight: 190,
                background:
                  "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)",
                border: "1px solid rgba(212,175,55,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selectedPublicProduct?.video_url ? (
                <video
                  src={resolveAssetSrc(selectedPublicProduct.video_url)}
                  poster={resolveAssetSrc(selectedPublicProduct.image_url) || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    background: "#0B1F33",
                  }}
                />
              ) : selectedPublicProduct?.image_url ? (
                <img
                  src={resolveAssetSrc(selectedPublicProduct.image_url)}
                  alt={firstTruthy(selectedPublicProduct.name, `Block #${selectedPublicSlot}`)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{ color: "#D7E3F1", fontWeight: 900 }}>
                  Block #{selectedPublicSlot} is empty
                </div>
              )}
            </div>

            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Selected block</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 950,
                  fontSize: isCompact ? 24 : 28,
                  lineHeight: 1.12,
                }}
              >
                Block #{selectedPublicSlot}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {iconBadge(
                  selectedPublicProduct ? "check" : "hash",
                  selectedPublicProduct ? "Live public item" : "Empty block",
                  Boolean(selectedPublicProduct)
                )}
                {iconBadge("shop", "Public gallery")}
                {selectedPublicProduct?.video_url ? iconBadge("video", "Video") : null}
              </div>

              {galleryActionNotice?.slotNumber === selectedPublicSlot ? (
                <div style={{ marginTop: 12, ...noticeCard(galleryActionNotice.tone) }}>
                  {galleryActionNotice.text}
                </div>
              ) : null}

              <div style={{ marginTop: 12, ...helperText(), maxWidth: 620 }}>
                {selectedPublicProduct
                  ? firstTruthy(
                      stripProductMetadata(firstTruthy(selectedPublicProduct.description)),
                      firstTruthy(selectedPublicProduct.name, "This block has no description yet.")
                    )
                  : "Add a public item here. You can use a picture or a short video; if you choose video only, GSN creates the cover automatically."}
              </div>

              {selectedPublicProduct ? (
                <div
                  style={{
                    marginTop: 12,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  {firstTruthy(selectedPublicProduct.name, "Public item")}{" "}
                  {firstTruthy(selectedPublicProduct.price, "0")}{" "}
                  {firstTruthy(selectedPublicProduct.currency, "NGN")}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 14,
                  ...ownerActionGrid(isCompact),
                  minHeight: isCompact ? 260 : 108,
                }}
              >
                {selectedPublicProduct ? (
                  <>
                    <PrimaryButton
                      onClick={() => openEditForPublicSlot(selectedPublicProduct, selectedPublicSlot)}
                      fullWidth
                      stableHeight={isCompact ? 56 : 48}
                      debugId={`shop-assets.public-slot.${selectedPublicSlot}.edit`}
                    >
                      Edit block #{selectedPublicSlot}
                    </PrimaryButton>

                    <SecondaryButton
                      onClick={() => void deleteProduct(Number(selectedPublicProduct.id))}
                      disabled={
                        shopDiaryFeatureOff ||
                        deletingProductId === Number(selectedPublicProduct.id)
                      }
                      busy={deletingProductId === Number(selectedPublicProduct.id)}
                      busyLabel="Hiding..."
                      fullWidth
                      stableHeight={isCompact ? 56 : 48}
                      debugId={`shop-assets.public-slot.${selectedPublicSlot}.hide`}
                    >
                      Hide block
                    </SecondaryButton>

                    <SubtleButton
                      onClick={() =>
                        copyText(
                          buildPublicShopMessage(
                            buildProductDeepLink(
                              gmfnIdValue,
                              Number(selectedPublicProduct.id),
                              selectedPublicSlot
                            ),
                            selectedPublicProduct,
                            selectedPublicSlot
                          ),
                          "Public shop block package copied. It opens this block inside the Shop Diaries."
                        )
                      }
                      fullWidth
                      stableHeight={isCompact ? 56 : 48}
                      debugId={`shop-assets.public-slot.${selectedPublicSlot}.copy-link`}
                    >
                      Copy shop link
                    </SubtleButton>

                    {Number(selectedPublicProduct.id || 0) > 0 ? (
                      <StableCtaLink
                        to={buildPaidRepostPath(
                          selectedPublicProduct,
                          selectedPublicSlot
                        )}
                        fullWidth
                        stableHeight={isCompact ? 56 : 48}
                        debugId={`shop-assets.public-slot.${selectedPublicSlot}.paid-repost`}
                        aria-label={`Repost block ${selectedPublicSlot} into another community Spotlight`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          minHeight: isCompact ? 56 : 48,
                          borderRadius: 999,
                          padding: "0 14px",
                          textDecoration: "none",
                          fontSize: isCompact ? 15 : 14,
                          fontWeight: 950,
                          background:
                            "linear-gradient(180deg, #123A63 0%, #0B2544 100%)",
                          color: "#FFFFFF",
                          border: "1px solid rgba(12, 44, 78, 0.22)",
                          boxShadow:
                            "0 12px 24px rgba(8, 30, 54, 0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
                          whiteSpace: "nowrap",
                          boxSizing: "border-box",
                        }}
                      >
                        Repost
                      </StableCtaLink>
                    ) : (
                      <SecondaryButton
                        disabled
                        fullWidth
                        stableHeight={isCompact ? 56 : 48}
                        debugId={`shop-assets.public-slot.${selectedPublicSlot}.paid-repost-unavailable`}
                      >
                        Repost unavailable
                      </SecondaryButton>
                    )}
                  </>
                ) : (
                  <PrimaryButton
                    onClick={() => openAddForPublicSlot(selectedPublicSlot)}
                    fullWidth
                    stableHeight={isCompact ? 56 : 48}
                    debugId={`shop-assets.public-slot.${selectedPublicSlot}.add`}
                  >
                    Add item to block #{selectedPublicSlot}
                  </PrimaryButton>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {(!embedded || productEditorOpen) ? (
      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>
              {embedded ? "Shop gallery item" : "Products and Vault offers"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {embedded
                ? "Add or update one public gallery block at a time."
                : "Add one item at a time. Choose public gallery or private Vault before saving."}
            </div>
          </div>

          <SubtleButton
            onClick={() => {
              if (embedded) {
                closeProductEditor();
              } else {
                toggleSection("products");
              }
            }}
            debugId="shop-assets.toggle-products"
          >
            {embedded ? "Close form" : collapsed.products ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {(!collapsed.products || embedded) ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 340px",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>
              {embedded
                ? editingProductId
                  ? `Edit block #${selectedPublicSlot}`
                  : `Add block #${selectedPublicSlot}`
                : editingProductId
                ? `Edit item #${editingProductId}`
                : "Add item"}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              Add a picture or short video, name, price, and choose where the item belongs.
            </div>

            {productFormNotice ? (
              <div style={{ marginTop: 12, ...noticeCard(productFormNotice.tone) }}>
                {productFormNotice.text}
              </div>
            ) : shopDiaryFeatureOff ? (
              <div style={{ marginTop: 12, ...noticeCard("error") }}>
                {shopDiaryFeatureOffText}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <input
                type="file"
                data-gmfn-action-root="true"
                data-cta-id="shop-assets.product.image-file"
                accept="image/*"
                onChange={(e) => void setProductPreviewFromFile(e.target.files?.[0] || null)}
                style={inputStyle()}
              />

              <input
                value={productImageUrlInput}
                onChange={(e) => {
                  setProductFormNotice(null);
                  setProductImageUrlInput(e.target.value);
                  if (!productSelectedFile) {
                    setProductPreviewUrl(e.target.value);
                  }
                }}
                placeholder="Or paste item image URL"
                style={inputStyle()}
              />

              <input
                type="file"
                data-gmfn-action-root="true"
                data-cta-id="shop-assets.product.video-file"
                accept="video/*,.mp4,.webm,.mov"
                onChange={(e) => void setProductVideoPreviewFromFile(e.target.files?.[0] || null)}
                style={inputStyle()}
              />

              <div style={{ ...helperText(), fontSize: 13 }}>
                If the picture or video is too heavy, GSN prepares a lighter version before upload.
                Video-only blocks get an automatic cover frame.
              </div>

              <input
                value={productVideoUrlInput}
                onChange={(e) => {
                  setProductFormNotice(null);
                  setProductVideoUrlInput(e.target.value);
                  if (!productSelectedVideoFile) {
                    setProductVideoPreviewUrl(e.target.value);
                  }
                }}
                placeholder="Or paste item video URL"
                style={inputStyle()}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>Item name</div>
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Item name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Short tag</div>
                  <input
                    value={productLabel}
                    onChange={(e) => setProductLabel(e.target.value)}
                    placeholder="Optional tag"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Price</div>
                  <input
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="Price"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Currency code</div>
                  <input
                    value={productCurrency}
                    onChange={(e) => setProductCurrency(e.target.value)}
                    placeholder="USD / GBP / NGN"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                {!embedded ? (
                <div>
                  <div style={sectionLabel()}>Where should it appear?</div>
                  <select
                    value={productVisibility}
                    onChange={(e) => setProductVisibility(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="community_visible">Public gallery</option>
                    <option value="vault_private">Private Vault</option>
                  </select>
                </div>

                ) : null}

                <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                  <div style={sectionLabel()}>Short description</div>
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Describe the item in simple words."
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div
                style={{
                  ...ownerActionGrid(isCompact),
                }}
              >
                <PrimaryButton
                  onClick={() => void submitProduct()}
                  disabled={
                    shopDiaryFeatureOff ||
                    savingProduct ||
                    preparingProductImage ||
                    preparingProductVideo
                  }
                  busy={savingProduct || preparingProductImage || preparingProductVideo}
                  busyLabel={
                    preparingProductImage || preparingProductVideo
                      ? "Preparing media..."
                      : editingProductId
                      ? "Updating..."
                      : "Posting..."
                  }
                  fullWidth
                  stableHeight={isCompact ? 56 : 48}
                  debugId="shop-assets.product.submit"
                >
                  {editingProductId ? "Update item" : "Post item"}
                </PrimaryButton>

                <SecondaryButton
                  onClick={embedded ? closeProductEditor : resetProductForm}
                  fullWidth
                  stableHeight={isCompact ? 56 : 48}
                  debugId="shop-assets.product.clear-or-close"
                >
                  {embedded ? "Close form" : "Clear form"}
                </SecondaryButton>

                <SubtleButton
                  onClick={() =>
                    copyText(
                      buildPublicShopMessage(shopLink),
                      "Public shop package copied.",
                      "Public shop link is not ready yet. Refresh the shop identity, then try again."
                    )
                  }
                  fullWidth
                  stableHeight={isCompact ? 56 : 48}
                  debugId="shop-assets.product.copy-shop-link"
                >
                  Copy shop link
                </SubtleButton>
              </div>
            </div>
          </div>

          <div
            style={{
              ...innerCard("rgba(255,255,255,0.98)"),
              border: "1px solid rgba(212,175,55,0.12)",
              boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
            }}
          >
            <div style={sectionLabel()}>Preview before saving</div>

            <div
              style={{
                marginTop: 12,
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(212,175,55,0.16)",
                background:
                  "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)",
                padding: 10,
                boxShadow:
                  "0 20px 42px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 220,
                  background:
                    "linear-gradient(180deg, #11263B 0%, #193A58 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  borderRadius: 18,
                  border: "1px solid rgba(212,175,55,0.12)",
                }}
              >
                {safeStr(productPreviewUrl) ? (
                  <img
                    src={resolveAssetSrc(productPreviewUrl)}
                    alt={firstTruthy(productName, "Preview")}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div style={{ color: "#D7E3F1", fontWeight: 800 }}>
                    Item preview
                  </div>
                )}
              </div>

              {safeStr(productVideoPreviewUrl || productVideoUrlInput) ? (
                <div style={{ marginTop: 10 }}>
                  <SpotlightMediaFrame
                    imageUrl={resolveAssetSrc(productPreviewUrl)}
                    videoUrl={resolveAssetSrc(productVideoPreviewUrl || productVideoUrlInput)}
                    videoPoster={resolveAssetSrc(productPreviewUrl)}
                    alt={firstTruthy(productName, "Item video preview")}
                    frameStyle={{
                      height: 180,
                      minHeight: 180,
                      borderRadius: 18,
                      border: "1px solid rgba(212,175,55,0.12)",
                    }}
                    mediaStyle={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    showVideoControls
                  />
                </div>
              ) : null}

              <div style={{ padding: 14, color: "#F8FBFF" }}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  {iconBadge(
                    "tag",
                    editingProductId ? `Item #${editingProductId}` : "Item number after post",
                    true
                  )}

                  {safeStr(productLabel) ? (
                    iconBadge("tag", <>Tag: {safeStr(productLabel)}</>)
                  ) : null}

                  {iconBadge(
                    firstTruthy(productVisibility, "community_visible") === "vault_private"
                      ? "lock"
                      : "shop",
                    firstTruthy(productVisibility, "community_visible") === "vault_private"
                      ? "Private Vault"
                      : "Public gallery"
                  )}

                  {safeStr(productVideoPreviewUrl || productVideoUrlInput) ? (
                    iconBadge("video", "Video attached")
                  ) : null}
                </div>

                <div
                  style={{
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.35,
                  }}
                >
                  {firstTruthy(productName, "Item name")}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    ...helperText(),
                    fontSize: 13,
                    color: "#D7E3F1",
                  }}
                >
                  {firstTruthy(productDescription, "Short description preview")}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  {firstTruthy(productPrice, "0")} {firstTruthy(productCurrency, "NGN")}
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </section>
      ) : null}

      {!embedded ? (
      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Posted items</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Open this only when you need to edit, hide, restore, or copy an item link.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("posted")}
            debugId="shop-assets.toggle-posted"
          >
            {collapsed.posted ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.posted ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {products.length === 0 ? (
            <div style={{ ...helperText(), gridColumn: "1 / -1" }}>
              No item has been posted yet.
            </div>
          ) : (
            products.map((item) => {
              const label = extractProductLabel(firstTruthy(item?.description));
              const cleanDescription = stripProductMetadata(firstTruthy(item?.description));
              const explicitPublicSlotNumber = publicBlockNumberForProduct(item);
              const fallbackPublicSlotNumber =
                publicGallerySlots.findIndex((product) => product?.id === item?.id) + 1;
              const publicSlotNumber =
                explicitPublicSlotNumber || fallbackPublicSlotNumber;
              const productLink = buildProductDeepLink(
                gmfnId,
                Number(item.id),
                publicSlotNumber > 0 ? publicSlotNumber : undefined
              );
              const isHidden = item?.is_active === false;
              const itemName = firstTruthy(item?.name, "Product");
              const itemImage = resolveAssetSrc(item?.image_url);
              const itemVideo = resolveAssetSrc(item?.video_url);
              const isBusy =
                deletingProductId === Number(item.id) ||
                restoringProductId === Number(item.id);

              return (
                <div
                  key={item.id}
                  style={{
                    ...innerCard(
                      isHidden
                        ? "linear-gradient(180deg, #243244 0%, #2F4054 56%, #405267 100%)"
                        : "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)"
                    ),
                    border: isHidden
                      ? "1px solid rgba(148,163,184,0.26)"
                      : "1px solid rgba(212,175,55,0.16)",
                    boxShadow: isHidden
                      ? "0 18px 38px rgba(15,23,42,0.16)"
                      : "0 18px 40px rgba(2,12,27,0.20)",
                    opacity: isHidden ? 0.92 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 220,
                      borderRadius: 16,
                      overflow: "hidden",
                      background:
                        isHidden
                          ? "linear-gradient(180deg, #334155 0%, #475569 100%)"
                          : "linear-gradient(180deg, #11263B 0%, #193A58 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(212,175,55,0.12)",
                    }}
                  >
                    {itemVideo ? (
                      <video
                        src={itemVideo}
                        poster={itemImage || undefined}
                        controls
                        playsInline
                        preload="metadata"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          background: "#0B1F33",
                        }}
                      />
                    ) : itemImage ? (
                      <img
                        src={itemImage}
                        alt={itemName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div style={{ color: "#D7E3F1", fontWeight: 800 }}>
                        No image
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {iconBadge("tag", <>Item #{item.id}</>, true)}
                    {publicSlotNumber > 0 &&
                    firstTruthy(item?.visibility_mode, "community_visible") !== "vault_private" ? (
                      iconBadge("hash", <>Block #{publicSlotNumber}</>)
                    ) : null}
                    {iconBadge(
                      isHidden ? "document" : "check",
                      isHidden ? "Hidden - can restore" : "Live",
                      !isHidden
                    )}
                    {label ? iconBadge("tag", <>Tag: {label}</>) : null}
                    {itemVideo ? iconBadge("video", "Video") : null}
                    {iconBadge(
                      firstTruthy(item?.visibility_mode, "community_visible") === "vault_private"
                        ? "lock"
                        : "shop",
                      firstTruthy(item?.visibility_mode, "community_visible") === "vault_private"
                        ? "Private Vault"
                        : "Public gallery"
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                      lineHeight: 1.35,
                    }}
                  >
                    {itemName}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      ...helperText(),
                      fontSize: 13,
                      color: "#D7E3F1",
                    }}
                  >
                    {firstTruthy(cleanDescription, "No description")}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 15,
                    }}
                  >
                    {firstTruthy(item?.price, "0")} {firstTruthy(item?.currency, "NGN")}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      ...ownerActionGrid(isCompact),
                    }}
                  >
                    <StableButton
                      onClick={() => {
                        if (
                          firstTruthy(item?.visibility_mode, "community_visible") !==
                          "vault_private"
                        ) {
                          setSelectedPublicSlot(publicSlotNumber > 0 ? publicSlotNumber : 1);
                        }
                        startEditProduct(item);
                      }}
                      kind={isHidden ? "secondary" : "primary"}
                      fullWidth
                      stableHeight={isCompact ? 56 : 48}
                      debugId={`shop-assets.product.${item.id}.edit`}
                    >
                      Edit
                    </StableButton>

                    {isHidden ? (
                      <PrimaryButton
                        onClick={() => void restoreProduct(Number(item.id))}
                        disabled={isBusy}
                        busy={restoringProductId === Number(item.id)}
                        busyLabel="Restoring..."
                        fullWidth
                        stableHeight={isCompact ? 56 : 48}
                        debugId={`shop-assets.product.${item.id}.restore`}
                      >
                        Restore
                      </PrimaryButton>
                    ) : (
                      <SecondaryButton
                        onClick={() => void deleteProduct(Number(item.id))}
                        disabled={isBusy}
                        busy={deletingProductId === Number(item.id)}
                        busyLabel="Removing..."
                        fullWidth
                        stableHeight={isCompact ? 56 : 48}
                        debugId={`shop-assets.product.${item.id}.delete`}
                      >
                        Delete
                      </SecondaryButton>
                    )}

                    <SubtleButton
                      onClick={() => {
                        if (isHidden) {
                          showNotice(
                            "error",
                            "This item is hidden. Restore it before copying a public shop link."
                          );
                          return;
                        }
                        void copyText(
                          buildPublicShopMessage(
                            productLink,
                            item,
                            publicSlotNumber > 0 ? publicSlotNumber : undefined
                          ),
                          "Public shop item package copied. It opens this item inside the Shop Diaries.",
                          "This item link is not ready yet. Refresh the shop identity, then try again."
                        );
                      }}
                      fullWidth
                      stableHeight={isCompact ? 56 : 48}
                      debugId={`shop-assets.product.${item.id}.copy-link`}
                    >
                      Copy shop link
                    </SubtleButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}


