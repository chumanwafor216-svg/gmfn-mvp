import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OriginLink from "../components/OriginLink";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import {
  createVaultShopAccessLink,
  extendVaultShopAccessLink,
  getAccessToken,
  getMarketplaceShopByGmfnId,
  getMe,
  getMyIdentityRisk,
  getSelectedClanId,
  listVaultShopAccessLinks,
  revokeVaultShopAccessLink,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
  type VaultLinkItem,
} from "../lib/api";
import { publicFrontendUrl } from "../lib/publicLinks";
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
  brandActionButton,
  brandBadge,
  brandHelperText,
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  gmfnBrand,
} from "../styles/gmfnBrand";

type NoticeTone = "success" | "error" | "info";

type ShopRecord = {
  id: number;
  clan_id?: number | null;
  gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  marketplace_name?: string | null;
  clan_name?: string | null;
  community_name?: string | null;
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
  video_url?: string | null;
  visibility_mode?: string | null;
  is_active?: boolean;
};

type ExpectedPaymentRecord = {
  id?: number;
  expected_type?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference_display?: string | null;
  status?: string | null;
  confirmed_at?: string | null;
  matched_bank_event_id?: number | null;
  meta?: any;
  meta_json?: any;
  quantity_total?: number | string | null;
};

const VAULT_SLOT_LIMIT = 6;

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

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function numberLike(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function paymentMeta(payment?: ExpectedPaymentRecord | null): any {
  const raw = payment?.meta ?? payment?.meta_json ?? {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? raw : {};
}

function paymentQuantity(payment?: ExpectedPaymentRecord | null): number {
  const meta = paymentMeta(payment);
  return Math.max(
    0,
    numberLike(payment?.quantity_total ?? meta?.quantity_total ?? meta?.slots, 0)
  );
}

function isConfirmedPayment(payment?: ExpectedPaymentRecord | null): boolean {
  const status = safeStr(payment?.status).toLowerCase();
  return Boolean(payment?.confirmed_at) || status === "confirmed" || status === "matched";
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
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch {
      return typeof window !== "undefined"
        ? String(window.location.origin || "").trim().replace(/\/+$/, "")
        : "";
    }
  }

  return typeof window !== "undefined"
    ? String(window.location.origin || "").trim().replace(/\/+$/, "")
    : "";
}

function resolveAssetSrc(raw: unknown): string {
  const value = safeStr(raw);
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }
  if (value.startsWith("/")) return `${apiOrigin()}${value}`;
  return `${apiOrigin()}/${value.replace(/^\/+/, "")}`;
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const root = apiBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${root}${cleanPath}`;
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.detail || parsed?.message || text || `HTTP ${res.status}`);
    } catch (err: any) {
      if (err instanceof SyntaxError) throw new Error(text || `HTTP ${res.status}`);
      throw err;
    }
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return actionTapGuardProps();
}

function pageCard(bg?: string): React.CSSProperties {
  return {
    ...brandPageCard(bg),
    borderRadius: 24,
  };
}

function innerCard(bg?: string): React.CSSProperties {
  return brandInnerCard(bg);
}

function sectionLabel(): React.CSSProperties {
  return brandSectionLabel();
}

function helperText(): React.CSSProperties {
  return brandHelperText();
}

function badge(primary = false): React.CSSProperties {
  return brandBadge(primary);
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background: "#FFFFFF",
    color: gmfnBrand.colors.ink,
    padding: "10px 12px",
    boxSizing: "border-box",
    fontSize: 15,
    fontWeight: 800,
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 104,
    resize: "vertical",
    lineHeight: 1.55,
  };
}

function actionGrid(isCompact: boolean, min = 150): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 10,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...pageCard(
      tone === "error"
        ? "#FEF2F2"
        : tone === "success"
          ? "#F0FDF4"
          : "#F8FBFF"
    ),
    padding: 14,
    color:
      tone === "error"
        ? "#991B1B"
        : tone === "success"
          ? "#166534"
          : gmfnBrand.colors.inkSoft,
  };
}

function vaultDefaultExpiry(): string {
  const next = new Date();
  next.setDate(next.getDate() + 7);
  return next.toISOString();
}

function vaultLinkUrl(link: VaultLinkItem | null | undefined): string {
  const raw = firstTruthy(
    link?.access_url,
    (link as any)?.frontend_hint_path,
    (link as any)?.api_view_url,
    link?.token ? `/vault/${encodeURIComponent(String(link.token))}` : ""
  );
  return raw ? publicFrontendUrl(raw) : "";
}

export default function VaultControlPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const [isCompact, setIsCompact] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth <= 860
  );
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const [me, setMe] = useState<any>(null);
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [vaultLinks, setVaultLinks] = useState<VaultLinkItem[]>([]);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>([]);
  const [identityBlocked, setIdentityBlocked] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string>("");
  const [paymentSlots, setPaymentSlots] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCurrency, setProductCurrency] = useState("NGN");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [formNotice, setFormNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const imagePrepJobRef = useRef(0);
  const videoPrepJobRef = useRef(0);

  useEffect(() => {
    function onResize() {
      setIsCompact(window.innerWidth <= 860);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, riskRes] = await Promise.all([
        getMe().catch(() => null),
        getMyIdentityRisk().catch(() => null),
      ]);
      setMe(meRes || null);
      const continuity = (riskRes as any)?.continuity || {};
      const status = safeStr(continuity?.status).toLowerCase();
      setIdentityBlocked(status === "reverify_required" || status === "protected_lock");

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      if (!gmfnId) {
        setShop(null);
        setProducts([]);
        setVaultLinks([]);
        setExpectedPayments([]);
        return;
      }

      const shopRes = await getMarketplaceShopByGmfnId(gmfnId, {
        clan_id: selectedClanId || undefined,
        header_clan_id: selectedClanId || undefined,
      }).catch(() => null);
      const shopItem = (shopRes?.item || null) as ShopRecord | null;
      setShop(shopItem);

      if (!shopItem?.id) {
        setProducts([]);
        setVaultLinks([]);
        setExpectedPayments([]);
        return;
      }

      const clanId = Number(shopItem.clan_id || shopRes?.clan_id || selectedClanId || 0);
      const expectedPath =
        `/api/bank/expected?clan_id=${clanId}&limit=100` +
        (Number(meRes?.id || 0) > 0 ? `&user_id=${Number(meRes.id)}` : "");

      const [productsRes, linksRes, expectedRes] = await Promise.all([
        apiJson<any>(
          `/api/marketplace/products?clan_id=${clanId}&shop_id=${shopItem.id}&include_private_manage=true&only_active=false&limit=200`
        ).catch(() => ({ items: [] })),
        listVaultShopAccessLinks(shopItem.id).catch(() => []),
        apiJson<any>(expectedPath).catch(() => []),
      ]);

      setProducts(rowsOf<ProductRecord>(productsRes));
      setVaultLinks(Array.isArray(linksRes) ? linksRes : []);
      setExpectedPayments(rowsOf<ExpectedPaymentRecord>(expectedRes));
    } finally {
      setLoading(false);
    }
  }, [selectedClanId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const vaultProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          firstTruthy(item.visibility_mode, "community_visible") === "vault_private" &&
          item.is_active !== false
      ),
    [products]
  );

  const vaultPayments = useMemo(
    () =>
      expectedPayments.filter(
        (item) => firstTruthy(item.expected_type).toLowerCase() === "vault_subscription"
      ),
    [expectedPayments]
  );

  const confirmedVaultSlots = useMemo(() => {
    const confirmedSlots = vaultPayments
      .filter(isConfirmedPayment)
      .reduce((total, item) => total + paymentQuantity(item), 0);
    return Math.min(VAULT_SLOT_LIMIT, Math.max(confirmedSlots, vaultProducts.length));
  }, [vaultPayments, vaultProducts.length]);

  const latestVaultPayment = vaultPayments[0] || null;
  const slots = useMemo(
    () => Array.from({ length: Math.max(confirmedVaultSlots, 0) }, (_, index) => vaultProducts[index] || null),
    [confirmedVaultSlots, vaultProducts]
  );
  const selectedProduct = slots[selectedSlot - 1] || null;
  const shopImageUrl = resolveAssetSrc(shop?.image_url);
  const shopName = firstTruthy(shop?.name, me?.display_name, me?.gmfn_id, "Your shop");
  const publicShopLink = firstTruthy(shop?.gmfn_id, me?.gmfn_id)
    ? publicFrontendUrl(`/shop/${encodeURIComponent(firstTruthy(shop?.gmfn_id, me?.gmfn_id))}`)
    : "";

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductCurrency("NGN");
    setImageUrlInput("");
    setVideoUrlInput("");
    setSelectedImageFile(null);
    setSelectedVideoFile(null);
    setVideoDurationSeconds(null);
    setImagePreviewUrl("");
    setVideoPreviewUrl("");
    setFormNotice(null);
  }

  function startAdd(slotNumber: number) {
    setSelectedSlot(slotNumber);
    resetProductForm();
    setEditorOpen(true);
  }

  function startEdit(item: ProductRecord, slotNumber: number) {
    setSelectedSlot(slotNumber);
    setEditingProductId(Number(item.id));
    setProductName(firstTruthy(item.name));
    setProductDescription(firstTruthy(item.description));
    setProductPrice(firstTruthy(item.price));
    setProductCurrency(firstTruthy(item.currency, "NGN"));
    setImageUrlInput(firstTruthy(item.image_url));
    setVideoUrlInput(firstTruthy(item.video_url));
    setImagePreviewUrl(firstTruthy(item.image_url));
    setVideoPreviewUrl(firstTruthy(item.video_url));
    setSelectedImageFile(null);
    setSelectedVideoFile(null);
    setVideoDurationSeconds(null);
    setFormNotice(null);
    setEditorOpen(true);
  }

  async function prepareImage(file: File | null) {
    imagePrepJobRef.current += 1;
    const job = imagePrepJobRef.current;
    setFormNotice(null);
    if (!file) {
      setSelectedImageFile(null);
      setImagePreviewUrl(firstTruthy(imageUrlInput));
      return;
    }
    try {
      setPreparingImage(true);
      const prepared = await prepareSpotlightImageFile(file, {
        maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
      });
      if (imagePrepJobRef.current !== job) return;
      setSelectedImageFile(prepared.file);
      setImagePreviewUrl(URL.createObjectURL(prepared.file));
      setFormNotice({
        tone: "info",
        text:
          prepared.message ||
          `${safeStr(prepared.file.name) || "Selected picture"} is ready for Vault.`,
      });
    } catch (err: any) {
      if (imagePrepJobRef.current !== job) return;
      setSelectedImageFile(null);
      setFormNotice({
        tone: "error",
        text: safeStr(err?.message) || "This picture could not be prepared for Vault.",
      });
    } finally {
      if (imagePrepJobRef.current === job) setPreparingImage(false);
    }
  }

  async function prepareVideo(file: File | null) {
    videoPrepJobRef.current += 1;
    const job = videoPrepJobRef.current;
    setFormNotice(null);
    if (!file) {
      setSelectedVideoFile(null);
      setVideoPreviewUrl(firstTruthy(videoUrlInput));
      setVideoDurationSeconds(null);
      return;
    }
    try {
      setPreparingVideo(true);
      const prepared = await prepareSpotlightVideoFile(file, {
        maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
        maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
      });
      if (videoPrepJobRef.current !== job) return;
      setSelectedVideoFile(prepared.file);
      setVideoDurationSeconds(prepared.durationSeconds ?? null);
      setVideoPreviewUrl(URL.createObjectURL(prepared.file));
      let coverMessage = "";
      if (!firstTruthy(imageUrlInput, imagePreviewUrl)) {
        const cover = await createShopGalleryCoverFromVideo(prepared.file);
        if (videoPrepJobRef.current === job) {
          setSelectedImageFile(cover.file);
          setImagePreviewUrl(URL.createObjectURL(cover.file));
          coverMessage = ` ${cover.message}`;
        }
      }
      setFormNotice({
        tone: "info",
        text:
          (prepared.message ||
            `${safeStr(prepared.file.name) || "Selected video"} is ready for Vault.`) +
          coverMessage,
      });
    } catch (err: any) {
      if (videoPrepJobRef.current !== job) return;
      setSelectedVideoFile(null);
      setVideoDurationSeconds(null);
      setFormNotice({
        tone: "error",
        text: safeStr(err?.message) || "This video could not be prepared for Vault.",
      });
    } finally {
      if (videoPrepJobRef.current === job) setPreparingVideo(false);
    }
  }

  async function createVaultInstruction(quantityTotal: number) {
    if (!shop?.id) {
      showNotice("error", "Shop record is not ready.");
      return;
    }
    setCreatingPayment(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/vault", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          quantity_total: Math.min(VAULT_SLOT_LIMIT, Math.max(1, Number(quantityTotal || 1))),
          currency: "GBP",
        }),
      });
      await loadPage();
      const reference = firstTruthy(result?.reference_display, result?.reference);
      showNotice(
        "success",
        reference
          ? `Vault payment reference ready: ${reference}`
          : `Vault payment request created for ${quantityTotal} slot${quantityTotal === 1 ? "" : "s"}.`
      );
      if (navigator?.clipboard?.writeText && reference) {
        void navigator.clipboard.writeText(reference);
      }
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault payment request could not be created.");
    } finally {
      setCreatingPayment(false);
    }
  }

  async function submitProduct() {
    if (preparingImage || preparingVideo) {
      setFormNotice({
        tone: "info",
        text: "Please wait while GSN prepares the selected media, then tap save again.",
      });
      return;
    }
    if (!shop?.id) {
      setFormNotice({ tone: "error", text: "Shop record is not ready." });
      return;
    }
    if (!confirmedVaultSlots) {
      setFormNotice({ tone: "error", text: "Activate at least one Vault slot before adding private offers." });
      return;
    }
    if (!editingProductId && vaultProducts.length >= confirmedVaultSlots) {
      setFormNotice({ tone: "error", text: "All paid Vault slots are already in use. Edit an existing block or activate more slots." });
      return;
    }
    if (!firstTruthy(productName)) {
      setFormNotice({ tone: "error", text: "Add the private offer name first." });
      return;
    }
    if (!firstTruthy(productPrice)) {
      setFormNotice({ tone: "error", text: "Add the price first." });
      return;
    }

    setSavingProduct(true);
    try {
      let nextImageUrl = firstTruthy(imageUrlInput) || null;
      let nextVideoUrl = firstTruthy(videoUrlInput) || null;

      if (selectedImageFile) {
        nextImageUrl = await uploadMarketplaceImageFile(selectedImageFile);
      }
      if (selectedVideoFile) {
        nextVideoUrl = await uploadMarketplaceVideoFile(
          selectedVideoFile,
          videoDurationSeconds
        );
      }
      if (!nextImageUrl) {
        if (selectedVideoFile) {
          const cover = await createShopGalleryCoverFromVideo(selectedVideoFile);
          nextImageUrl = await uploadMarketplaceImageFile(cover.file);
        } else if (nextVideoUrl) {
          nextImageUrl = nextVideoUrl;
        } else {
          setFormNotice({ tone: "error", text: "Add a picture or a short video for this Vault block." });
          setSavingProduct(false);
          return;
        }
      }

      const body = {
        clan_id: Number(shop.clan_id || selectedClanId || 0),
        shop_id: Number(shop.id),
        name: firstTruthy(productName),
        description: firstTruthy(productDescription) || null,
        price: firstTruthy(productPrice),
        currency: firstTruthy(productCurrency, "NGN"),
        image_url: nextImageUrl,
        video_url: nextVideoUrl,
        visibility_mode: "vault_private",
      };
      const path = editingProductId
        ? `/api/marketplace/products/${editingProductId}`
        : "/api/marketplace/products";
      const method = editingProductId ? "PATCH" : "POST";
      const saved = await apiJson<any>(path, {
        method,
        body: JSON.stringify(body),
      });
      const savedId = Number(
        saved?.item?.id || saved?.product?.id || saved?.id || editingProductId || 0
      );
      if (savedId > 0) {
        rememberShopProductMedia(savedId, {
          image_url: nextImageUrl || undefined,
          video_url: nextVideoUrl || undefined,
        });
      }
      await loadPage();
      resetProductForm();
      setEditorOpen(false);
      showNotice("success", nextVideoUrl ? "Vault block saved with video." : "Vault block saved.");
    } catch (err: any) {
      const text = safeStr(err?.message) || "Vault block could not be saved.";
      setFormNotice({ tone: "error", text });
      showNotice("error", text);
    } finally {
      setSavingProduct(false);
    }
  }

  async function hideProduct(item: ProductRecord) {
    setSavingProduct(true);
    try {
      await apiJson<any>(`/api/marketplace/products/${Number(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: false, status: "inactive" }),
      });
      await loadPage();
      showNotice("success", "Vault block hidden.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault block could not be hidden.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function createViewingLink() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not ready.");
      return;
    }
    if (vaultProducts.length === 0) {
      showNotice("error", "Add at least one private Vault block before creating a link.");
      return;
    }
    setCreatingLink(true);
    try {
      const link = await createVaultShopAccessLink({
        shop_id: shop.id,
        expires_at: vaultDefaultExpiry(),
        max_views: 20,
        watermark_enabled: true,
      });
      setVaultLinks((prev) => [link, ...prev]);
      const url = vaultLinkUrl(link);
      if (navigator?.clipboard?.writeText && url) void navigator.clipboard.writeText(url);
      showNotice("success", "Vault access link created and copied.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault access link could not be created.");
    } finally {
      setCreatingLink(false);
    }
  }

  async function extendLink(link: VaultLinkItem) {
    const id = firstTruthy(link.id);
    if (!id) return;
    setBusyLinkId(id);
    try {
      const updated = await extendVaultShopAccessLink(id, vaultDefaultExpiry());
      setVaultLinks((prev) => prev.map((item) => firstTruthy(item.id) === id ? updated : item));
      showNotice("success", "Vault link extended for 7 more days.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault link could not be extended.");
    } finally {
      setBusyLinkId("");
    }
  }

  async function revokeLink(link: VaultLinkItem) {
    const id = firstTruthy(link.id);
    if (!id) return;
    setBusyLinkId(id);
    try {
      const updated = await revokeVaultShopAccessLink(id);
      setVaultLinks((prev) => prev.map((item) => firstTruthy(item.id) === id ? updated : item));
      showNotice("success", "Vault link revoked.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault link could not be revoked.");
    } finally {
      setBusyLinkId("");
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 16 }}>
        <section style={pageCard()}>
          <div style={helperText()}>Loading Vault Control...</div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 16, paddingBottom: 36 }}>
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section style={pageCard(gmfnBrand.gradients.hero)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0,1fr) 260px",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: gmfnBrand.colors.gold }}>Vault Control</div>
            <h1
              style={{
                margin: "10px 0 0",
                color: "#FFFFFF",
                fontSize: isCompact ? 30 : 40,
                lineHeight: 1.05,
                fontWeight: 950,
              }}
            >
              {shopName}
            </h1>
            <div style={{ marginTop: 10, ...helperText(), color: gmfnBrand.colors.darkMuted, maxWidth: 720 }}>
              Same shop signboard. Private paid blocks. Access only through a link you create.
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Vault</span>
              <span style={badge(confirmedVaultSlots > 0)}>{confirmedVaultSlots} / {VAULT_SLOT_LIMIT} paid slots</span>
              <span style={badge(vaultProducts.length > 0)}>{vaultProducts.length} private offers</span>
              <span style={badge(vaultLinks.length > 0)}>{vaultLinks.length} links</span>
            </div>
          </div>

          <div
            style={{
              borderRadius: 24,
              overflow: "hidden",
              minHeight: 190,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(212,175,55,0.22)",
              position: "relative",
            }}
          >
            {shopImageUrl ? (
              <img
                src={shopImageUrl}
                alt={shopName}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(5,15,28,0.08) 0%, rgba(5,15,28,0.72) 100%)",
                display: "flex",
                alignItems: "flex-end",
                padding: 14,
                boxSizing: "border-box",
              }}
            >
              <div style={{ color: "#FFFFFF", fontWeight: 950, fontSize: 18 }}>
                Private Vault
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Activate private blocks</div>
        <div style={{ marginTop: 8, ...helperText(), maxWidth: 780 }}>
          Pay for the number of Vault blocks you want to use. Public Shop Gallery keeps 12 free blocks; Vault opens up to 6 private paid blocks.
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: isCompact ? "1fr" : "180px minmax(0, 1fr)", gap: 12 }}>
          <div>
            <div style={sectionLabel()}>Slots to activate</div>
            <select
              value={paymentSlots}
              onChange={(event) => setPaymentSlots(Number(event.target.value))}
              style={{ ...inputStyle(), marginTop: 8 }}
            >
              {[1, 2, 3, 4, 5, 6].map((slot) => (
                <option key={slot} value={slot}>{slot} slot{slot === 1 ? "" : "s"}</option>
              ))}
            </select>
          </div>
          <div style={{ alignSelf: "end", ...actionGrid(isCompact, 170) }}>
            <button
              type="button"
              {...buttonGuardProps()}
              onClick={() => void createVaultInstruction(paymentSlots)}
              disabled={identityBlocked || creatingPayment || !shop?.id}
              style={brandActionButton("primary", identityBlocked || creatingPayment || !shop?.id)}
            >
              {identityBlocked ? "Review identity first" : creatingPayment ? "Preparing payment..." : "Create Vault payment"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(isConfirmedPayment(latestVaultPayment))}>
            Payment: {firstTruthy(latestVaultPayment?.status, confirmedVaultSlots ? "Confirmed" : "Not started")}
          </span>
          {latestVaultPayment ? (
            <span style={badge(false)}>
              Ref: {firstTruthy(latestVaultPayment.reference_display, "Awaiting reference")}
            </span>
          ) : null}
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Private Vault blocks</div>
        <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
          Only paid slots appear here. Choose one block, then add or edit one private picture/video offer.
        </div>

        {confirmedVaultSlots <= 0 ? (
          <div style={{ marginTop: 14, ...noticeCard("info") }}>
            No Vault block is active yet. Create the payment request above, complete payment, then return here after confirmation.
          </div>
        ) : (
          <>
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(6, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {slots.map((item, index) => {
                const slotNumber = index + 1;
                const selected = selectedSlot === slotNumber;
                return (
                  <button
                    key={slotNumber}
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() => setSelectedSlot(slotNumber)}
                    style={{
                      ...brandActionButton(selected ? "primary" : "secondary"),
                      minHeight: 92,
                      display: "grid",
                      alignContent: "center",
                      gap: 5,
                      borderRadius: 18,
                    }}
                  >
                    <span>Block #{slotNumber}</span>
                    <span style={{ fontSize: 12, opacity: 0.9 }}>{item ? "Private offer" : "Empty"}</span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "300px minmax(0,1fr)",
                gap: 14,
              }}
            >
              <div
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  minHeight: 220,
                  background: gmfnBrand.gradients.hero,
                }}
              >
                {selectedProduct ? (
                  <SpotlightMediaFrame
                    imageUrl={resolveAssetSrc(selectedProduct.image_url)}
                    videoUrl={resolveAssetSrc(selectedProduct.video_url)}
                    videoPoster={resolveAssetSrc(selectedProduct.image_url) || undefined}
                    alt={firstTruthy(selectedProduct.name, `Vault block #${selectedSlot}`)}
                    frameStyle={{ width: "100%", height: "100%", minHeight: 220, borderRadius: 22, border: "none" }}
                    mediaStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
                    autoPlayVideo={Boolean(selectedProduct.video_url)}
                    mutedVideo={Boolean(selectedProduct.video_url)}
                    loopVideo={Boolean(selectedProduct.video_url)}
                    showAudioUnlock={Boolean(selectedProduct.video_url)}
                    audioUnlockLabel="Sound on"
                  />
                ) : (
                  <div style={{ height: 220, display: "grid", placeItems: "center", color: "#FFFFFF", fontWeight: 900 }}>
                    Block #{selectedSlot} is empty
                  </div>
                )}
              </div>

              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>Selected private block</div>
                <div style={{ marginTop: 8, color: gmfnBrand.colors.ink, fontSize: 26, fontWeight: 950 }}>
                  Block #{selectedSlot}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badge(Boolean(selectedProduct))}>{selectedProduct ? "In use" : "Empty"}</span>
                  <span style={badge(false)}>Private Vault</span>
                  {selectedProduct?.video_url ? <span style={badge(false)}>Video</span> : null}
                </div>
                <div style={{ marginTop: 12, ...helperText() }}>
                  {selectedProduct
                    ? firstTruthy(selectedProduct.description, "This private block has no description yet.")
                    : "Add a private offer. It can use a picture or a short video."}
                </div>
                {selectedProduct ? (
                  <div style={{ marginTop: 10, color: gmfnBrand.colors.ink, fontWeight: 900 }}>
                    {firstTruthy(selectedProduct.name, "Private offer")}{" "}
                    {firstTruthy(selectedProduct.price, "0")}{" "}
                    {firstTruthy(selectedProduct.currency, "NGN")}
                  </div>
                ) : null}
                <div style={{ marginTop: 14, ...actionGrid(isCompact, 160) }}>
                  {selectedProduct ? (
                    <>
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={() => startEdit(selectedProduct, selectedSlot)}
                        style={brandActionButton("primary")}
                      >
                        Edit block #{selectedSlot}
                      </button>
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={() => void hideProduct(selectedProduct)}
                        disabled={savingProduct}
                        style={brandActionButton("secondary", savingProduct)}
                      >
                        Hide block
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => startAdd(selectedSlot)}
                      style={brandActionButton("primary")}
                    >
                      Add private offer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {editorOpen ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>
            {editingProductId ? `Edit Vault block #${selectedSlot}` : `Add Vault block #${selectedSlot}`}
          </div>
          <div style={{ marginTop: 8, ...helperText() }}>
            Add one private offer at a time. Picture or video is accepted; oversized media is prepared before upload.
          </div>
          {formNotice ? <div style={{ marginTop: 12, ...noticeCard(formNotice.tone) }}>{formNotice.text}</div> : null}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0,1fr) 320px", gap: 14 }}>
            <div style={innerCard("#FCFEFF")}>
              <div style={{ display: "grid", gap: 12 }}>
                <input type="file" accept="image/*" onChange={(event) => void prepareImage(event.target.files?.[0] || null)} style={inputStyle()} />
                <input value={imageUrlInput} onChange={(event) => { setImageUrlInput(event.target.value); if (!selectedImageFile) setImagePreviewUrl(event.target.value); }} placeholder="Or paste image link" style={inputStyle()} />
                <input type="file" accept="video/*,.mp4,.webm,.mov" onChange={(event) => void prepareVideo(event.target.files?.[0] || null)} style={inputStyle()} />
                <input value={videoUrlInput} onChange={(event) => { setVideoUrlInput(event.target.value); if (!selectedVideoFile) setVideoPreviewUrl(event.target.value); }} placeholder="Or paste video link" style={inputStyle()} />
                <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Private offer name" style={inputStyle()} />
                <input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} placeholder="Price" style={inputStyle()} />
                <input value={productCurrency} onChange={(event) => setProductCurrency(event.target.value)} placeholder="Currency code" style={inputStyle()} />
                <textarea value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder="Short private description" style={textAreaStyle()} />
                <div style={actionGrid(isCompact, 160)}>
                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() => void submitProduct()}
                    disabled={savingProduct}
                    style={brandActionButton("primary", savingProduct || preparingImage || preparingVideo)}
                  >
                    {preparingImage || preparingVideo ? "Preparing media..." : savingProduct ? "Saving..." : "Save Vault block"}
                  </button>
                  <button
                    type="button"
                    {...buttonGuardProps()}
                    onClick={() => { resetProductForm(); setEditorOpen(false); }}
                    style={brandActionButton("secondary")}
                  >
                    Close form
                  </button>
                </div>
              </div>
            </div>
            <div style={innerCard(gmfnBrand.gradients.hero)}>
              <div style={{ ...sectionLabel(), color: gmfnBrand.colors.gold }}>Preview</div>
              <div style={{ marginTop: 12, borderRadius: 18, overflow: "hidden", minHeight: 220, background: "#061827" }}>
                {firstTruthy(videoPreviewUrl, videoUrlInput) ? (
                  <SpotlightMediaFrame
                    imageUrl={resolveAssetSrc(firstTruthy(imagePreviewUrl, imageUrlInput))}
                    videoUrl={resolveAssetSrc(firstTruthy(videoPreviewUrl, videoUrlInput))}
                    videoPoster={resolveAssetSrc(firstTruthy(imagePreviewUrl, imageUrlInput)) || undefined}
                    alt={firstTruthy(productName, "Vault preview")}
                    frameStyle={{ width: "100%", minHeight: 220, height: 220, borderRadius: 18, border: "none" }}
                    mediaStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
                    showVideoControls
                    showAudioUnlock
                    audioUnlockLabel="Sound on"
                  />
                ) : firstTruthy(imagePreviewUrl, imageUrlInput) ? (
                  <img src={resolveAssetSrc(firstTruthy(imagePreviewUrl, imageUrlInput))} alt="Vault preview" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ height: 220, display: "grid", placeItems: "center", color: "#FFFFFF", fontWeight: 900 }}>Preview appears here</div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Access links</div>
        <div style={{ marginTop: 8, ...helperText(), maxWidth: 780 }}>
          A Vault block is private until you create and share a link. Links can expire, be extended, or be revoked.
        </div>
        <div style={{ marginTop: 12, ...actionGrid(isCompact, 170) }}>
          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => void createViewingLink()}
            disabled={identityBlocked || creatingLink || vaultProducts.length === 0}
            style={brandActionButton("primary", identityBlocked || creatingLink || vaultProducts.length === 0)}
          >
            {identityBlocked ? "Review identity first" : creatingLink ? "Creating link..." : vaultProducts.length === 0 ? "Add private offer first" : "Create access link"}
          </button>
          {publicShopLink ? (
            <OriginLink to={publicShopLink} style={brandActionButton("secondary")}>
              Open public shop
            </OriginLink>
          ) : null}
        </div>
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {vaultLinks.length === 0 ? (
            <div style={helperText()}>No Vault link yet.</div>
          ) : (
            vaultLinks.map((link) => {
              const url = vaultLinkUrl(link);
              const id = firstTruthy(link.id);
              return (
                <div key={id} style={innerCard("#FCFEFF")}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>Link #{id}</span>
                    <span style={badge(false)}>{firstTruthy(link.status, "active")}</span>
                    <span style={badge(false)}>{Number(link.views_used || 0)} / {Number(link.max_views || 0) || "unlimited"} views</span>
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>Expires: {firstTruthy(link.expires_at, "No expiry")}</div>
                  <div style={{ marginTop: 10, ...actionGrid(isCompact, 150) }}>
                    <button type="button" {...buttonGuardProps()} onClick={() => { if (navigator?.clipboard?.writeText && url) void navigator.clipboard.writeText(url); showNotice("success", "Vault link copied."); }} disabled={!url} style={brandActionButton("soft", !url)}>Copy link</button>
                    <button type="button" {...buttonGuardProps()} onClick={() => { if (url) window.open(url, "_blank", "noopener,noreferrer"); }} disabled={!url} style={brandActionButton("secondary", !url)}>Open link</button>
                    <button type="button" {...buttonGuardProps()} onClick={() => void extendLink(link)} disabled={busyLinkId === id} style={brandActionButton("secondary", busyLinkId === id)}>Extend 7 days</button>
                    <button type="button" {...buttonGuardProps()} onClick={() => void revokeLink(link)} disabled={busyLinkId === id || firstTruthy(link.status).toLowerCase() === "revoked"} style={brandActionButton("secondary", busyLinkId === id || firstTruthy(link.status).toLowerCase() === "revoked")}>Revoke</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
