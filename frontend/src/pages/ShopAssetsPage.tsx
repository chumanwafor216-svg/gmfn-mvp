import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  getMe,
  getSelectedClanId,
  safeCopy,
  uploadMarketplaceImageFile as uploadMarketplaceImageFileApi,
  uploadMarketplaceVideoFile as uploadMarketplaceVideoFileApi,
} from "../lib/api";
import {
  publicShopBlockUrl,
  publicShopUrl,
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
import {
  actionTapGuardProps,
  brandStableTapTarget,
} from "../styles/gmfnBrand";

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
};

const SHOP_ASSETS_UI_STORAGE_KEY = "gmfn.shopAssets.sections.v2";

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
    letterSpacing: 0.35,
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

const stableTapTarget: React.CSSProperties = {
  ...brandStableTapTarget(),
  zIndex: 10,
  flexShrink: 0,
};

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return actionTapGuardProps();
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      ...stableTapTarget,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      textAlign: "center",
      lineHeight: 1.2,
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      ...stableTapTarget,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(122,152,195,0.18)",
      background: "linear-gradient(180deg, #F4F8FF 0%, #E2ECFB 100%)",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      textAlign: "center",
      lineHeight: 1.2,
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    ...stableTapTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(122,152,195,0.20)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    textAlign: "center",
    lineHeight: 1.2,
    opacity: disabled ? 0.86 : 1,
  };
}

function ownerActionGrid(isCompact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(148px, 1fr))",
    gap: isCompact ? 12 : 10,
    alignItems: "stretch",
  };
}

function ownerActionButton(
  style: React.CSSProperties,
  isCompact: boolean
): React.CSSProperties {
  return {
    ...style,
    width: "100%",
    minHeight: isCompact ? 56 : style.minHeight ?? 48,
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

function collapseToggle(): React.CSSProperties {
  return {
    ...stableTapTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(122,152,195,0.20)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    textAlign: "center",
    lineHeight: 1.2,
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
  return publicShopUrl(gmfnId);
}

function buildProductDeepLink(
  gmfnId: string,
  productId: number,
  block?: number
): string {
  if (!gmfnId || !productId) return "";
  return publicShopBlockUrl({ gmfnId, productId, block });
}

function extractProductLabel(description: string): string {
  const match = safeStr(description).match(/^\[LABEL:(.+?)\]\s*/i);
  return match ? safeStr(match[1]) : "";
}

function stripProductLabel(description: string): string {
  return safeStr(description).replace(/^\[LABEL:(.+?)\]\s*/i, "");
}

function composeProductDescription(label: string, description: string): string {
  const cleanLabel = safeStr(label);
  const cleanDescription = safeStr(description);

  if (!cleanLabel) return cleanDescription;
  return `[LABEL:${cleanLabel}] ${cleanDescription}`;
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
  const productImagePrepJobRef = useRef(0);
  const productVideoPrepJobRef = useRef(0);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [collapsed, setCollapsed] = useState<CollapseState>(() => {
    if (embedded) {
      return {
        ...defaultCollapseState(),
        posted: false,
      };
    }

    return normalizeCollapseState(
      readLocalJSON<CollapseState>(
        SHOP_ASSETS_UI_STORAGE_KEY,
        defaultCollapseState()
      )
    );
  });

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

  const selectedClanId = Number(getSelectedClanId() || 0);

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
    if (embedded) return;
    writeLocalJSON(SHOP_ASSETS_UI_STORAGE_KEY, collapsed);
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


  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function showProductFormNotice(tone: NoticeTone, text: string) {
    setProductFormNotice({ tone, text });
    showNotice(tone, text);
  }

  function showGalleryActionNotice(
    tone: NoticeTone,
    text: string,
    slotNumber = selectedPublicSlot
  ) {
    setGalleryActionNotice({ tone, text, slotNumber });
    showNotice(tone, text);
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const loadPage = useCallback(async (): Promise<ProductRecord[]> => {
    setLoading(true);

    try {
      let loadedProducts: ProductRecord[] = [];
      const meRes = await getMe().catch(() => null);
      setMe(meRes || null);

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      if (!gmfnId) {
        setShop(null);
        setProducts([]);
        return [];
      }

      const shopRes = await apiJson<any>(
        `/api/marketplace/shops/by-gmfn/${encodeURIComponent(gmfnId)}?clan_id=${selectedClanId || 0}`
      ).catch(() => null);

      const shopItem = (shopRes?.item || null) as ShopRecord | null;
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

      let nextProducts: ProductRecord[] = Array.isArray(shopRes?.products)
        ? (shopRes.products as ProductRecord[])
        : [];

      if (shopItem?.id) {
        const productsRes = await apiJson<any>(
          `/api/marketplace/products?clan_id=${selectedClanId || 0}&shop_id=${shopItem.id}&include_private_manage=true&only_active=false&limit=200`
        ).catch(() => ({ items: nextProducts }));

        nextProducts = Array.isArray(productsRes?.items)
          ? (productsRes.items as ProductRecord[])
          : nextProducts;
      }

      setProducts(nextProducts);
      loadedProducts = nextProducts;
      return loadedProducts;
    } finally {
      setLoading(false);
    }
  }, [selectedClanId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const gmfnId = useMemo(() => firstTruthy(shop?.gmfn_id, me?.gmfn_id), [shop, me]);
  const shopLink = useMemo(() => buildShopLink(gmfnId), [gmfnId]);

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

  const hiddenProducts = useMemo(
    () => products.filter((item) => item?.is_active === false),
    [products]
  );

  const publicGallerySlots = useMemo(
    () => Array.from({ length: 12 }, (_, index) => publicProducts[index] || null),
    [publicProducts]
  );

  const selectedPublicProduct = publicGallerySlots[selectedPublicSlot - 1] || null;

  function copyText(text: string, successMessage: string) {
    if (!text) {
      showNotice("error", "Nothing to copy yet.");
      return;
    }

    safeCopy(text);
    showNotice("success", successMessage);
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
    if (!shop?.id) {
      showNotice("error", "Shop record is not ready.");
      return;
    }

    setSavingShop(true);

    try {
      let nextImageUrl = safeStr(extra?.image_url ?? shopImageUrlInput) || null;

      if (shopSelectedFile) {
        setUploadingShopImage(true);
        nextImageUrl = await uploadMarketplaceImageFile(shopSelectedFile);
      }

      const body: any = {
        name: safeStr(shopName),
        description: safeStr(shopDescription) || null,
        whatsapp_number: safeStr(shopWhatsApp) || null,
        telegram_handle: safeStr(shopTelegram) || null,
      };

      if (extra?.clear_image) {
        body.clear_image = true;
      } else {
        body.image_url = nextImageUrl;
      }

      const res = await apiJson<any>(`/api/marketplace/shops/${shop.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      const updated = (res?.item || shop) as ShopRecord;
      setShop(updated);
      setShopName(firstTruthy(updated?.name));
      setShopDescription(firstTruthy(updated?.description));
      setShopWhatsApp(firstTruthy(updated?.whatsapp_number));
      setShopTelegram(firstTruthy(updated?.telegram_handle));
      setShopImageUrlInput(firstTruthy(updated?.image_url));
      setShopPreviewUrl(firstTruthy(updated?.image_url));
      setShopSelectedFile(null);
      showNotice("success", "Shop signboard saved.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Shop signboard could not be saved.");
    } finally {
      setSavingShop(false);
      setUploadingShopImage(false);
    }
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
    setProductDescription(stripProductLabel(firstTruthy(item?.description)));
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
    setSelectedPublicSlot(slotNumber);
    setGalleryActionNotice(null);
    resetProductForm();
    setProductFormNotice(null);
    setProductVisibility("community_visible");
    setProductEditorOpen(true);
    setCollapsed((prev) => ({ ...prev, products: false }));
  }

  function openEditForPublicSlot(item: ProductRecord, slotNumber: number) {
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
    if (preparingProductImage || preparingProductVideo) {
      showProductFormNotice(
        "info",
        "Please wait while GSN prepares the selected media, then tap Post again."
      );
      return;
    }

    if (!shop?.id) {
      showProductFormNotice("error", "Shop record is not ready.");
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
      publicProducts.length >= 12
    ) {
      showProductFormNotice(
        "error",
        "The public shop gallery already has 12 live blocks. Edit or remove one before adding another."
      );
      return;
    }

    setSavingProduct(true);

    try {
      const wasEditingProduct = Boolean(editingProductId);
      let nextImageUrl = safeStr(productImageUrlInput) || null;
      let nextVideoUrl = safeStr(productVideoUrlInput) || null;

      if (productSelectedFile) {
        nextImageUrl = await uploadMarketplaceImageFile(productSelectedFile);
      }

      if (productSelectedVideoFile) {
        nextVideoUrl = await uploadMarketplaceVideoFile(
          productSelectedVideoFile,
          productVideoDurationSeconds
        );
      }

      if (!nextImageUrl) {
        if (productSelectedVideoFile) {
          const cover = await createShopGalleryCoverFromVideo(productSelectedVideoFile);
          nextImageUrl = await uploadMarketplaceImageFile(cover.file);
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
        clan_id: Number(shop?.clan_id || selectedClanId || 0),
        shop_id: Number(shop.id),
        name: safeStr(productName),
        description: composeProductDescription(productLabel, productDescription),
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

      const savedId = Number(
        saveRes?.item?.id ||
          saveRes?.product?.id ||
          saveRes?.data?.id ||
          saveRes?.id ||
          editingProductId ||
          0
      );
      const refreshedProducts = await loadPage();
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
        const savedIndex =
          savedId > 0
            ? hydratedProducts.findIndex(
                (item) =>
                  Number(item?.id) === savedId &&
                  item?.is_active !== false &&
                  firstTruthy(item?.visibility_mode, "community_visible") ===
                    "community_visible"
              )
            : -1;
        const savedSlotNumber = savedIndex >= 0 ? savedIndex + 1 : 1;
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
    } catch (err: any) {
      const message =
        safeStr(err?.message) ||
        "Product could not be saved. Check the picture, video format, and file size.";
      showProductFormNotice("error", message);
      showGalleryActionNotice("error", message, selectedPublicSlot);
    } finally {
      setSavingProduct(false);
    }
  }

  async function deleteProduct(productId: number) {
    setDeletingProductId(productId);

    try {
      await apiJson<any>(`/api/marketplace/products/${productId}`, {
        method: "DELETE",
      });
      await loadPage();
      if (editingProductId === productId) {
        closeProductEditor();
      }
      showNotice("success", "Product removed.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Product could not be removed.");
    } finally {
      setDeletingProductId(null);
    }
  }

  async function restoreProduct(productId: number) {
    setRestoringProductId(productId);

    try {
      await apiJson<any>(`/api/marketplace/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: true, status: "active" }),
      });
      await loadPage();
      showNotice("success", "Product restored.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Product could not be restored.");
    } finally {
      setRestoringProductId(null);
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
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/shop-control"
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
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/shop-control"
          backLabel="Shop Control"
        />
      ) : null}

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {!embedded ? (
        <>
      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
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
              <span style={badge(true)}>🖼️ Shop picture: {safeStr(shopPreviewUrl) ? "Ready" : "Needed"}</span>
              <span style={badge(publicProducts.length > 0)}>🛍️ Public products: {publicProducts.length} / 12</span>
              <span style={badge(vaultProducts.length > 0)}>🔐 Vault offers: {vaultProducts.length} / 6</span>
              <span style={badge(false)}>🧾 Hidden: {hiddenProducts.length}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                ...ownerActionGrid(isCompact),
              }}
            >
              <OriginLink
                to="/app/shop-control"
                style={ownerActionButton(actionBtn("secondary"), isCompact)}
              >
                Back to Shop Control
              </OriginLink>

              <button
                type="button"
                {...buttonGuardProps()}
                onClick={() => {
                  if (shopLink) {
                    window.open(shopLink, "_blank", "noopener,noreferrer");
                  }
                }}
                style={ownerActionButton(actionBtn("primary", !shopLink), isCompact)}
                disabled={!shopLink}
              >
                Open public shop
              </button>

              <button
                type="button"
                {...buttonGuardProps()}
                onClick={() => copyText(shopLink, "Shop gallery link copied.")}
                style={ownerActionButton(actionBtn("secondary", !shopLink), isCompact)}
                disabled={!shopLink}
              >
                Copy public link
              </button>
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
                <div style={sectionLabel()}>🛍️ Public</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 22,
                  }}
                >
                  {publicProducts.length}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  Open gallery items
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>🔐 Vault</div>
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
                <div style={sectionLabel()}>🧾 Hidden</div>
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

          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => toggleSection("guidance")}
            style={collapseToggle()}
          >
            {collapsed.guidance ? "Open" : "Collapse"}
          </button>
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
              <div style={sectionLabel()}>🖼️ 1. Public picture</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Make the shop face clear before people see the product shelf.
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>🛍️ 2. Public products</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Add only the items people can browse and share openly.
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>🔐 3. Vault offers</div>
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
            <div style={sectionLabel()}>🖼️ Public shop picture</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This is the first picture people see before opening the shop.
            </div>
          </div>

          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => toggleSection("signboard")}
            style={collapseToggle()}
          >
            {collapsed.signboard ? "Open" : "Collapse"}
          </button>
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
                    {firstTruthy(shop?.gmfn_id, me?.gmfn_id, "GMFN ID awaiting issue")}
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
                Preview the image first, then save it.
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <input
                  type="file"
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
                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() => void saveShopSignboard()}
                    disabled={savingShop || uploadingShopImage}
                    style={ownerActionButton(
                      actionBtn("primary", savingShop || uploadingShopImage),
                      isCompact
                    )}
                  >
                    {savingShop ? "Saving..." : uploadingShopImage ? "Uploading..." : "Save picture"}
                  </button>

                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() => {
                      setShopSelectedFile(null);
                      if (shopPreviewUrl.startsWith("blob:")) {
                        URL.revokeObjectURL(shopPreviewUrl);
                      }
                      setShopPreviewUrl(firstTruthy(shop?.image_url));
                      setShopImageUrlInput(firstTruthy(shop?.image_url));
                    }}
                    style={ownerActionButton(actionBtn("secondary"), isCompact)}
                  >
                    Reset preview
                  </button>

                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() =>
                      void saveShopSignboard({
                        clear_image: true,
                        image_url: null,
                      })
                    }
                    disabled={savingShop || uploadingShopImage || !safeStr(shopPreviewUrl)}
                    style={ownerActionButton(
                      actionBtn(
                        "secondary",
                        savingShop || uploadingShopImage || !safeStr(shopPreviewUrl)
                      ),
                      isCompact
                    )}
                  >
                    Remove picture
                  </button>
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

            <span style={badge(publicProducts.length > 0)}>
              {publicProducts.length} / 12 live blocks
            </span>
          </div>

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
                <button
                  key={slotNumber}
                  type="button"
                  {...buttonGuardProps()}
                  onClick={() => setSelectedPublicSlot(slotNumber)}
                  style={{
                    ...stableTapTarget,
                    minHeight: 104,
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
                    gap: 6,
                  }}
                  aria-label={`Select gallery block ${slotNumber}`}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 950, fontSize: 13 }}>#{slotNumber}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: item ? "#168447" : "#64748B",
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
                </button>
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
                <span style={badge(Boolean(selectedPublicProduct))}>
                  {selectedPublicProduct ? "Live public item" : "Empty block"}
                </span>
                <span style={badge(false)}>Public gallery</span>
                {selectedPublicProduct?.video_url ? <span style={badge(false)}>Video</span> : null}
              </div>

              {galleryActionNotice?.slotNumber === selectedPublicSlot ? (
                <div style={{ marginTop: 12, ...noticeCard(galleryActionNotice.tone) }}>
                  {galleryActionNotice.text}
                </div>
              ) : null}

              <div style={{ marginTop: 12, ...helperText(), maxWidth: 620 }}>
                {selectedPublicProduct
                  ? firstTruthy(
                      stripProductLabel(firstTruthy(selectedPublicProduct.description)),
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
                }}
              >
                {selectedPublicProduct ? (
                  <>
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => openEditForPublicSlot(selectedPublicProduct, selectedPublicSlot)}
                      style={ownerActionButton(actionBtn("primary"), isCompact)}
                    >
                      Edit block #{selectedPublicSlot}
                    </button>

                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => void deleteProduct(Number(selectedPublicProduct.id))}
                      disabled={deletingProductId === Number(selectedPublicProduct.id)}
                      style={ownerActionButton(
                        actionBtn(
                          "secondary",
                          deletingProductId === Number(selectedPublicProduct.id)
                        ),
                        isCompact
                      )}
                    >
                      {deletingProductId === Number(selectedPublicProduct.id)
                        ? "Hiding..."
                        : "Hide block"}
                    </button>

                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() =>
                        copyText(
                          buildProductDeepLink(
                            gmfnId,
                            Number(selectedPublicProduct.id),
                            selectedPublicSlot
                          ),
                          "Block link copied."
                        )
                      }
                      style={ownerActionButton(actionBtn("soft"), isCompact)}
                    >
                      Copy shop link
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() => openAddForPublicSlot(selectedPublicSlot)}
                    style={ownerActionButton(actionBtn("primary"), isCompact)}
                  >
                    Add item to block #{selectedPublicSlot}
                  </button>
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

          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => {
              if (embedded) {
                closeProductEditor();
              } else {
                toggleSection("products");
              }
            }}
            style={collapseToggle()}
          >
            {embedded ? "Close form" : collapsed.products ? "Open" : "Collapse"}
          </button>
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
            ) : null}

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <input
                type="file"
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
                    <option value="community_visible">🛍️ Public gallery</option>
                    <option value="vault_private">🔐 Private Vault</option>
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
                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={() => void submitProduct()}
                  disabled={savingProduct}
                  style={ownerActionButton(
                    actionBtn(
                      "primary",
                      savingProduct || preparingProductImage || preparingProductVideo
                    ),
                    isCompact
                  )}
                >
                  {preparingProductImage || preparingProductVideo
                    ? "Preparing media..."
                    : savingProduct
                    ? editingProductId
                      ? "Updating..."
                      : "Posting..."
                    : editingProductId
                    ? "Update item"
                    : "Post item"}
                </button>

                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={embedded ? closeProductEditor : resetProductForm}
                  style={ownerActionButton(actionBtn("secondary"), isCompact)}
                >
                  {embedded ? "Close form" : "Clear form"}
                </button>

                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() => copyText(shopLink, "Shop gallery link copied.")}
                    style={ownerActionButton(actionBtn("soft", !shopLink), isCompact)}
                    disabled={!shopLink}
                  >
                  Copy shop link
                </button>
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
                  <span style={badge(true)}>
                    {editingProductId ? `Item #${editingProductId}` : "Item number after post"}
                  </span>

                  {safeStr(productLabel) ? (
                    <span style={badge(false)}>Tag: {safeStr(productLabel)}</span>
                  ) : null}

                  <span style={badge(false)}>
                    {firstTruthy(productVisibility, "community_visible") === "vault_private"
                      ? "🔐 Private Vault"
                      : "🛍️ Public gallery"}
                  </span>

                  {safeStr(productVideoPreviewUrl || productVideoUrlInput) ? (
                    <span style={badge(false)}>Video attached</span>
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

          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => toggleSection("posted")}
            style={collapseToggle()}
          >
            {collapsed.posted ? "Open" : "Collapse"}
          </button>
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
              const cleanDescription = stripProductLabel(firstTruthy(item?.description));
              const publicSlotNumber =
                publicProducts.findIndex((product) => product?.id === item?.id) + 1;
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
                    <span style={badge(true)}>Item #{item.id}</span>
                    <span
                      style={{
                        ...badge(false),
                        background: isHidden
                          ? "rgba(248,250,252,0.16)"
                          : "rgba(34,197,94,0.12)",
                        color: isHidden ? "#CBD5E1" : "#BBF7D0",
                      }}
                    >
                      {isHidden ? "Hidden - can restore" : "Live"}
                    </span>
                    {label ? <span style={badge(false)}>Tag: {label}</span> : null}
                    {itemVideo ? <span style={badge(false)}>Video</span> : null}
                    <span
                      style={{
                        ...badge(false),
                        background: "rgba(212,175,55,0.10)",
                        color: "#F6D77A",
                      }}
                    >
                      {firstTruthy(item?.visibility_mode, "community_visible") === "vault_private"
                        ? "🔐 Private Vault"
                        : "🛍️ Public gallery"}
                    </span>
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
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => startEditProduct(item)}
                      style={ownerActionButton(
                        actionBtn(isHidden ? "secondary" : "primary"),
                        isCompact
                      )}
                    >
                      Edit
                    </button>

                    {isHidden ? (
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={() => void restoreProduct(Number(item.id))}
                        disabled={isBusy}
                        style={ownerActionButton(actionBtn("primary", isBusy), isCompact)}
                      >
                        {restoringProductId === Number(item.id) ? "Restoring..." : "Restore"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={() => void deleteProduct(Number(item.id))}
                        disabled={isBusy}
                        style={ownerActionButton(actionBtn("secondary", isBusy), isCompact)}
                      >
                        {deletingProductId === Number(item.id) ? "Removing..." : "Delete"}
                      </button>
                    )}

                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={() => copyText(productLink, "Item link copied.")}
                        style={ownerActionButton(
                          actionBtn("soft", !productLink || isHidden),
                          isCompact
                        )}
                      disabled={!productLink || isHidden}
                    >
                      Copy shop link
                    </button>
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


