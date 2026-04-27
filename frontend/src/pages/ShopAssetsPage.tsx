import React, { useCallback, useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getMe,
  getSelectedClanId,
  uploadMarketplaceImageFile as uploadMarketplaceImageFileApi,
} from "../lib/api";
import { publicFrontendUrl } from "../lib/publicLinks";

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

const SHOP_ASSETS_UI_STORAGE_KEY = "gmfn.shopAssets.sections.v1";

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
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
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

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

const stableTapTarget: React.CSSProperties = {
  position: "relative",
  zIndex: 10,
  isolation: "isolate",
  pointerEvents: "auto",
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
  userSelect: "none",
  appearance: "none",
  WebkitAppearance: "none",
  boxSizing: "border-box",
  outlineOffset: 4,
  transform: "translateZ(0)",
};

function guardButtonPress(event?: React.SyntheticEvent<HTMLElement>) {
  event?.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onTouchStart" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onTouchStart: guardButtonPress,
    onMouseDown: guardButtonPress,
  };
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
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
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
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
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
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
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
    guidance: false,
    signboard: false,
    products: false,
    posted: false,
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

function buildShopLink(gmfnId: string): string {
  if (!gmfnId) return "";
  return publicFrontendUrl(`/shop/${encodeURIComponent(gmfnId)}`);
}

function buildProductDeepLink(gmfnId: string, productId: number): string {
  const base = buildShopLink(gmfnId);
  if (!base || !productId) return "";
  return `${base}#product-${productId}`;
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

export default function ShopAssetsPage() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON<CollapseState>(
        SHOP_ASSETS_UI_STORAGE_KEY,
        defaultCollapseState()
      )
    )
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
    writeLocalJSON(SHOP_ASSETS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    return () => {
      if (shopPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(shopPreviewUrl);
      if (productPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(productPreviewUrl);
    };
  }, [shopPreviewUrl, productPreviewUrl]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const meRes = await getMe().catch(() => null);
      setMe(meRes || null);

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      if (!gmfnId) {
        setShop(null);
        setProducts([]);
        return;
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

  function setProductPreviewFromFile(file: File | null) {
    setProductSelectedFile(file);

    if (productPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productPreviewUrl);
    }

    if (file) {
      const next = URL.createObjectURL(file);
      setProductPreviewUrl(next);
    } else {
      setProductPreviewUrl(firstTruthy(productImageUrlInput));
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

    if (productPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productPreviewUrl);
    }
    setProductPreviewUrl("");
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

    if (productPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(productPreviewUrl);
    }
    setProductPreviewUrl(firstTruthy(item?.image_url));
  }

  async function submitProduct() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not ready.");
      return;
    }

    if (!safeStr(productName)) {
      showNotice("error", "Add the product title first.");
      return;
    }

    if (!safeStr(productPrice)) {
      showNotice("error", "Add the product price first.");
      return;
    }

    setSavingProduct(true);

    try {
      let nextImageUrl = safeStr(productImageUrlInput) || null;

      if (productSelectedFile) {
        nextImageUrl = await uploadMarketplaceImageFile(productSelectedFile);
      }

      if (!nextImageUrl) {
        showNotice("error", "Add a product picture first.");
        setSavingProduct(false);
        return;
      }

      const body = {
        clan_id: Number(shop?.clan_id || selectedClanId || 0),
        shop_id: Number(shop.id),
        name: safeStr(productName),
        description: composeProductDescription(productLabel, productDescription),
        price: safeStr(productPrice),
        currency: safeStr(productCurrency || "NGN"),
        image_url: nextImageUrl,
        visibility_mode: safeStr(productVisibility || "community_visible"),
      };

      const path = editingProductId
        ? `/api/marketplace/products/${editingProductId}`
        : "/api/marketplace/products";

      const method = editingProductId ? "PATCH" : "POST";

      await apiJson<any>(path, {
        method,
        body: JSON.stringify(body),
      });

      await loadPage();
      resetProductForm();
      showNotice("success", editingProductId ? "Product updated." : "Product posted.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Product could not be saved.");
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
        resetProductForm();
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
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 18 }}>
        <PageTopNav
          sectionLabel="Shop Assets"
          title="Shop Assets"
          subtitle="Loading shop assets..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/shop-control"
          backLabel="Shop Control"
        />
        <section style={pageCard()}>
          <div style={helperText()}>Loading shop assets...</div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Shop Assets"
        title="Shop Assets"
        subtitle="Keep the signboard lane and the product picture lane separate. Restore preview-before-post, edit, delete, and shop gallery access."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/shop-control"
        backLabel="Shop Control"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page manages the visual assets for your shop: the main signboard and the separate product picture blocks."
        why="It keeps the public shop identity and the product gallery clear so the shop does not become visually confusing."
        next="Start with the signboard first, then move into the product blocks after the main identity frame looks right."
        tone="blue"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

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
            <div style={sectionLabel()}>Asset overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              {firstTruthy(shop?.name, "My Shop Assets")}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                maxWidth: 860,
                color: "#D7E3F1",
              }}
            >
              The visual assets are handled properly again here: the signboard / identity picture
              is separate from the product picture blocks.
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
                GMFN ID: {firstTruthy(shop?.gmfn_id, me?.gmfn_id, "Awaiting issue")}
              </span>
              <span style={badge(true)}>
                Community slots used: {publicProducts.length} / 12
              </span>
              <span style={badge(false)}>
                Vault slots used: {vaultProducts.length} / 6
              </span>
              <span style={badge(false)}>
                Hidden blocks: {hiddenProducts.length}
              </span>
              <span style={badge(false)}>
                Community: {firstTruthy(shop?.marketplace_name, shop?.community_name, "Selected community")}
              </span>
              <span style={badge(false)}>Current page: Shop assets</span>
              <span style={badge(false)}>Current step: Prepare signboard and product blocks</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <OriginLink to="/app/shop-control" style={actionBtn("secondary")}>
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
                style={actionBtn("primary", !shopLink)}
                disabled={!shopLink}
              >
                Open Shop Gallery
              </button>

                <button
                  type="button"
                  onClick={() => copyText(shopLink, "Shop gallery link copied.")}
                  style={actionBtn("secondary", !shopLink)}
                  disabled={!shopLink}
                >
                Copy Shop Link
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
            <div style={sectionLabel()}>Quick counts</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>Community</div>
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
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Vault</div>
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
                  Private offers by permission
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Hidden</div>
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
                  Restorable owner-only blocks
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
            <div style={sectionLabel()}>Guided release order</div>
            <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
              Keep one real publishing decision visible at a time: prepare the signboard first,
              release community-visible product blocks second, and keep Vault products distinct so
              private access never leaks into the public gallery.
            </div>
          </div>

          <button
            type="button"
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
              <div style={sectionLabel()}>1. Signboard first</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Finish the executive identity frame first so the shop looks credible before product
                blocks start competing for attention.
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>2. Public blocks next</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Community-visible products belong in the ordinary gallery. They should remain polished,
                intentional, and ready to share by direct public link.
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>3. Vault stays separate</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Use the Vault visibility mode only when the offer is meant for private access by
                permission. Private inventory should not appear inside the public gallery lane.
              </div>
            </div>
          </div>
        ) : null}
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
            <div style={sectionLabel()}>1. Shop signboard / identity picture</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This public identity frame represents the shop.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("signboard")}
            style={collapseToggle()}
          >
            {collapsed.signboard ? "Open" : "Collapse"}
          </button>
        </div>

        <ExplainToggle
          label="What this signboard is for"
          what="This section controls the main public identity image for the shop."
          why="It is the first visual anchor people see before they decide whether to trust or open the rest of the gallery."
          next="Make the signboard credible and clear first, then move to the product lanes once the shop identity is stable."
          tone="light"
          style={{ marginTop: 12 }}
        />

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
              <div style={sectionLabel()}>Signboard controls</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Preview the signboard first, then save it.
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
                  placeholder="Or paste signboard image URL"
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
                    <div style={sectionLabel()}>Shop description</div>
                    <textarea
                      value={shopDescription}
                      onChange={(e) => setShopDescription(e.target.value)}
                      placeholder="Describe the shop..."
                      style={{ ...textAreaStyle(), marginTop: 8 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() => void saveShopSignboard()}
                    disabled={savingShop || uploadingShopImage}
                    style={actionBtn("primary", savingShop || uploadingShopImage)}
                  >
                    {savingShop ? "Saving..." : uploadingShopImage ? "Uploading..." : "Save Signboard"}
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
                    style={actionBtn("secondary")}
                  >
                    Reset Preview
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
                    style={actionBtn(
                      "secondary",
                      savingShop || uploadingShopImage || !safeStr(shopPreviewUrl)
                    )}
                  >
                    Remove Signboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : null}
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
            <div style={sectionLabel()}>2. Product picture blocks</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Use this lane for public gallery products and Vault-bound products without flattening
              them into the same meaning.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("products")}
            style={collapseToggle()}
          >
            {collapsed.products ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.products ? (
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
              {editingProductId ? `Edit Product Block #${editingProductId}` : "Create Product Block"}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
                Upload the product image, preview it first, then post or update the block.
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProductPreviewFromFile(e.target.files?.[0] || null)}
                style={inputStyle()}
              />

              <input
                value={productImageUrlInput}
                onChange={(e) => {
                  setProductImageUrlInput(e.target.value);
                  if (!productSelectedFile) {
                    setProductPreviewUrl(e.target.value);
                  }
                }}
                placeholder="Or paste product image URL"
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
                  <div style={sectionLabel()}>Product title</div>
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Product title"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Product tag / label</div>
                  <input
                    value={productLabel}
                    onChange={(e) => setProductLabel(e.target.value)}
                    placeholder="Optional display tag"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Price</div>
                  <input
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="Product price"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Currency</div>
                  <input
                    value={productCurrency}
                    onChange={(e) => setProductCurrency(e.target.value)}
                    placeholder="NGN / GBP"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Visibility</div>
                  <select
                    value={productVisibility}
                    onChange={(e) => setProductVisibility(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="community_visible">Community Visible</option>
                    <option value="vault_private">Vault Private</option>
                  </select>
                </div>

                <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                  <div style={sectionLabel()}>Description</div>
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Product description"
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={() => void submitProduct()}
                  disabled={savingProduct}
                  style={actionBtn("primary", savingProduct)}
                >
                  {savingProduct
                    ? editingProductId
                      ? "Updating..."
                      : "Posting..."
                    : editingProductId
                    ? "Update Product"
                    : "Post Product"}
                </button>

                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={resetProductForm}
                  style={actionBtn("secondary")}
                >
                  Clear Form
                </button>

                  <button
                    type="button"
                    onClick={() => copyText(shopLink, "Shop gallery link copied.")}
                    style={actionBtn("soft", !shopLink)}
                    disabled={!shopLink}
                  >
                  Copy Shop Link
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
            <div style={sectionLabel()}>Preview before post</div>

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
                    Product preview
                  </div>
                )}
              </div>

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
                    {editingProductId ? `Block #${editingProductId}` : "Block assigned after post"}
                  </span>

                  {safeStr(productLabel) ? (
                    <span style={badge(false)}>Tag: {safeStr(productLabel)}</span>
                  ) : null}

                  <span style={badge(false)}>
                    {firstTruthy(productVisibility, "community_visible")}
                  </span>
                </div>

                <div
                  style={{
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.35,
                  }}
                >
                  {firstTruthy(productName, "Product title")}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    ...helperText(),
                    fontSize: 13,
                    color: "#D7E3F1",
                  }}
                >
                  {firstTruthy(productDescription, "Product description preview")}
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
            <div style={sectionLabel()}>Posted product blocks</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Review everything the shop already has, including hidden blocks that can be restored
              without rebuilding the shop from scratch.
            </div>
          </div>

          <button
            type="button"
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
              No product has been posted yet.
            </div>
          ) : (
            products.map((item) => {
              const label = extractProductLabel(firstTruthy(item?.description));
              const cleanDescription = stripProductLabel(firstTruthy(item?.description));
              const productLink = buildProductDeepLink(gmfnId, Number(item.id));
              const isHidden = item?.is_active === false;
              const itemName = firstTruthy(item?.name, "Product");
              const itemImage = resolveAssetSrc(item?.image_url);
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
                    {itemImage ? (
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
                    <span style={badge(true)}>Block #{item.id}</span>
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
                    <span
                      style={{
                        ...badge(false),
                        background: "rgba(212,175,55,0.10)",
                        color: "#F6D77A",
                      }}
                    >
                      {firstTruthy(item?.visibility_mode, "community_visible")}
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

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => startEditProduct(item)}
                      style={actionBtn(isHidden ? "secondary" : "primary")}
                    >
                      Edit
                    </button>

                    {isHidden ? (
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={() => void restoreProduct(Number(item.id))}
                        disabled={isBusy}
                        style={actionBtn("primary", isBusy)}
                      >
                        {restoringProductId === Number(item.id) ? "Restoring..." : "Restore"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={() => void deleteProduct(Number(item.id))}
                        disabled={isBusy}
                        style={actionBtn("secondary", isBusy)}
                      >
                        {deletingProductId === Number(item.id) ? "Removing..." : "Delete"}
                      </button>
                    )}

                      <button
                        type="button"
                        onClick={() =>
                          copyText(productLink, "Product gallery link copied.")
                        }
                        style={actionBtn("soft", !productLink || isHidden)}
                      disabled={!productLink || isHidden}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        ) : null}
      </section>
    </div>
  );
}


