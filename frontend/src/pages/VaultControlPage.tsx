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
  getVaultShopStatus,
  listVaultShopAccessLinks,
  revokeVaultShopAccessLink,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
  type VaultLinkItem,
  type VaultShopStatus,
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
  vault_slot_number?: number | string | null;
  vault_block_id?: number | string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type ExpectedPaymentRecord = {
  id?: number;
  expected_type?: string | null;
  amount?: string | null;
  currency?: string | null;
  due_at?: string | null;
  reference_display?: string | null;
  status?: string | null;
  confirmed_at?: string | null;
  matched_bank_event_id?: number | null;
  meta?: any;
  meta_json?: any;
  quantity_total?: number | string | null;
};

type SettlementRecord = {
  rail_name?: string | null;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  routing_number?: string | null;
  ach_routing_number?: string | null;
  wire_routing_number?: string | null;
  iban?: string | null;
  swift_bic?: string | null;
  bank_code?: string | null;
  branch_code?: string | null;
  branch_name?: string | null;
  ifsc_code?: string | null;
  mobile_money_provider?: string | null;
  mobile_money_number?: string | null;
  country?: string | null;
  region_code?: string | null;
  payment_networks?: string[] | null;
  regional_requirements?: Record<string, string[]> | null;
  missing_field_text?: string | null;
  support_note?: string | null;
};

type VaultConfigRecord = {
  max_slots?: number | string | null;
  unit_price_gbp?: number | string | null;
  bundle_slot_count?: number | string | null;
  bundle_price_gbp?: number | string | null;
  payment_instruction_expiry_days?: number | string | null;
  vault_slot_duration_days?: number | string | null;
  default_link_expiry_hours?: number | string | null;
  payment_method?: string | null;
  payment_beneficiary_scope?: string | null;
  billing_cycle?: string | null;
};

const VAULT_SLOT_LIMIT = 6;
const VAULT_PAYMENT_DUE_DAYS = 7;
const VAULT_LINK_DEFAULT_HOURS = 72;
const VAULT_SLOT_STORAGE_PREFIX = "gmfn.vaultControl.slotMap.v1";

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

function vaultSlotPaymentAmount(slotCount: unknown): number {
  const slots = Math.min(VAULT_SLOT_LIMIT, Math.max(1, Number(slotCount || 1)));
  return slots === VAULT_SLOT_LIMIT ? 5 : slots;
}

function vaultPaymentQuoteKey(slotCount: unknown): string {
  const slots = Math.min(VAULT_SLOT_LIMIT, Math.max(1, Number(slotCount || 1)));
  return `${slots}:${vaultSlotPaymentAmount(slots)}:GBP`;
}

function formatMoney(amount: unknown, currency = "GBP"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    const text = safeStr(amount);
    return text ? `${currency} ${text}` : "";
  }
  const hasPence = Math.abs(n % 1) > 0;
  return `${currency} ${n.toFixed(hasPence ? 2 : 0)}`;
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  try {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return raw;
  }
}

function vaultSlotStorageKey(shopId: unknown): string {
  return `${VAULT_SLOT_STORAGE_PREFIX}.${safeStr(shopId) || "unknown"}`;
}

function readVaultSlotMap(shopId: unknown): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(vaultSlotStorageKey(shopId));
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const next: Record<string, number> = {};
    Object.entries(parsed).forEach(([id, slot]) => {
      const safeId = safeStr(id);
      const safeSlot = Number(slot);
      if (safeId && Number.isInteger(safeSlot) && safeSlot >= 1 && safeSlot <= VAULT_SLOT_LIMIT) {
        next[safeId] = safeSlot;
      }
    });
    return next;
  } catch {
    return {};
  }
}

function writeVaultSlotMap(shopId: unknown, map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(vaultSlotStorageKey(shopId), JSON.stringify(map));
  } catch {
    // Slot memory is a frontend stabilizer only; backend data still saves without it.
  }
}

function productSortValue(item: ProductRecord): number {
  const created = Date.parse(safeStr(item.created_at));
  if (Number.isFinite(created)) return created;
  return Number(item.id || 0);
}

function orderedVaultProducts(items: ProductRecord[]): ProductRecord[] {
  return [...items].sort((a, b) => {
    const byCreated = productSortValue(a) - productSortValue(b);
    if (byCreated !== 0) return byCreated;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function normalizeVaultSlotMap(
  shopId: unknown,
  items: ProductRecord[],
  slotCount: number
): Record<string, number> {
  const safeSlotCount = Math.min(VAULT_SLOT_LIMIT, Math.max(0, Number(slotCount || 0)));
  const liveIds = new Set(items.map((item) => safeStr(item.id)).filter(Boolean));
  const previous = readVaultSlotMap(shopId);
  const next: Record<string, number> = {};
  const used = new Set<number>();

  orderedVaultProducts(items).forEach((item) => {
    const id = safeStr(item.id);
    const slot = previous[id];
    if (!id || !liveIds.has(id)) return;
    if (slot >= 1 && slot <= safeSlotCount && !used.has(slot)) {
      next[id] = slot;
      used.add(slot);
    }
  });

  orderedVaultProducts(items).forEach((item) => {
    const id = safeStr(item.id);
    if (!id || next[id]) return;
    for (let slot = 1; slot <= safeSlotCount; slot += 1) {
      if (!used.has(slot)) {
        next[id] = slot;
        used.add(slot);
        break;
      }
    }
  });

  writeVaultSlotMap(shopId, next);
  return next;
}

function rememberVaultProductSlot(
  shopId: unknown,
  productId: unknown,
  slotNumber: number
): Record<string, number> {
  const id = safeStr(productId);
  const safeSlot = Math.min(VAULT_SLOT_LIMIT, Math.max(1, Number(slotNumber || 1)));
  const next = readVaultSlotMap(shopId);
  Object.keys(next).forEach((key) => {
    if (next[key] === safeSlot) delete next[key];
  });
  if (id) next[id] = safeSlot;
  writeVaultSlotMap(shopId, next);
  return next;
}

function forgetVaultProductSlot(shopId: unknown, productId: unknown): Record<string, number> {
  const id = safeStr(productId);
  const next = readVaultSlotMap(shopId);
  if (id) delete next[id];
  writeVaultSlotMap(shopId, next);
  return next;
}

function buildVaultSlots(
  items: ProductRecord[],
  slotCount: number,
  slotMap: Record<string, number>
): Array<ProductRecord | null> {
  const safeSlotCount = Math.min(VAULT_SLOT_LIMIT, Math.max(0, Number(slotCount || 0)));
  const next = Array.from({ length: safeSlotCount }, () => null as ProductRecord | null);
  const placed = new Set<string>();

  orderedVaultProducts(items).forEach((item) => {
    const id = safeStr(item.id);
    const slot = slotMap[id];
    if (!id || slot < 1 || slot > safeSlotCount || next[slot - 1]) return;
    next[slot - 1] = item;
    placed.add(id);
  });

  orderedVaultProducts(items).forEach((item) => {
    const id = safeStr(item.id);
    if (!id || placed.has(id)) return;
    const emptyIndex = next.findIndex((slot) => slot === null);
    if (emptyIndex >= 0) {
      next[emptyIndex] = item;
      placed.add(id);
    }
  });

  return next;
}

function productFromVaultBlock(block: any): ProductRecord | null {
  const src = block?.product || {};
  const id = Number(src?.id || block?.product_id || 0);
  if (!id) return null;
  return {
    ...src,
    id,
    shop_id: Number(src?.shop_id || block?.shop_id || 0),
    clan_id: Number(src?.clan_id || 0),
    visibility_mode: firstTruthy(src?.visibility_mode, "vault_private"),
    is_active: src?.is_active !== false,
    vault_slot_number: Number(block?.slot_number || 0) || null,
    vault_block_id: Number(block?.id || 0) || null,
  };
}

function mergeVaultStatusProducts(
  baseProducts: ProductRecord[],
  status: VaultShopStatus | null
): ProductRecord[] {
  const byId = new Map<string, ProductRecord>();
  baseProducts.forEach((item) => {
    const id = safeStr(item?.id);
    if (id) byId.set(id, item);
  });
  rowsOf<any>(status?.blocks).forEach((block) => {
    const item = productFromVaultBlock(block);
    const id = safeStr(item?.id);
    if (!item || !id) return;
    byId.set(id, {
      ...(byId.get(id) || {}),
      ...item,
      image_url: firstTruthy(item.image_url, byId.get(id)?.image_url),
      video_url: firstTruthy(item.video_url, byId.get(id)?.video_url),
    });
  });
  return Array.from(byId.values());
}

function buildBackendVaultSlots(status: VaultShopStatus | null): Array<ProductRecord | null> | null {
  const activeBlocks = rowsOf<any>(status?.blocks)
    .filter((block) => firstTruthy(block?.state).toLowerCase() === "active")
    .sort((a, b) => Number(a?.slot_number || 0) - Number(b?.slot_number || 0));
  if (activeBlocks.length <= 0) return null;
  return activeBlocks.map((block) => productFromVaultBlock(block));
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

function settlementValue(settlement: SettlementRecord | null, key: keyof SettlementRecord): string {
  return firstTruthy(settlement?.[key]);
}

function settlementListValue(settlement: SettlementRecord | null, key: keyof SettlementRecord): string {
  const value = settlement?.[key];
  return Array.isArray(value) ? value.map((item) => safeStr(item)).filter(Boolean).join(", ") : "";
}

function paymentLine(label: string, value: unknown): string {
  const text = firstTruthy(value);
  return text ? `${label}: ${text}` : "";
}

function vaultPaymentStatusLabel(payment?: ExpectedPaymentRecord | null): string {
  if (!payment) return "Not started";
  if (isConfirmedPayment(payment)) return "Confirmed";
  return firstTruthy(payment.status, "Awaiting transfer");
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
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (root.endsWith("/api") && cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.slice(4);
  }
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

function slotChoiceGrid(isCompact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
    gap: 10,
  };
}

function slotChoiceButton(selected: boolean): React.CSSProperties {
  return {
    ...brandActionButton(selected ? "primary" : "secondary"),
    minHeight: 68,
    width: "100%",
    borderRadius: 18,
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    gap: 3,
    padding: "12px 8px",
    position: "relative",
    zIndex: 2,
    touchAction: "manipulation",
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

function vaultDefaultExpiry(hours = VAULT_LINK_DEFAULT_HOURS): string {
  const next = new Date();
  next.setHours(next.getHours() + Math.max(1, Number(hours || VAULT_LINK_DEFAULT_HOURS)));
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
  const [vaultInstruction, setVaultInstruction] = useState<ExpectedPaymentRecord | null>(null);
  const [vaultSettlement, setVaultSettlement] = useState<SettlementRecord | null>(null);
  const [vaultConfig, setVaultConfig] = useState<VaultConfigRecord | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultShopStatus | null>(null);
  const [vaultSlotMap, setVaultSlotMap] = useState<Record<string, number>>({});
  const [identityBlocked, setIdentityBlocked] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string>("");
  const [paymentSlots, setPaymentSlots] = useState(1);
  const [confirmedPaymentQuoteKey, setConfirmedPaymentQuoteKey] = useState("");
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
      const [meRes, riskRes, instructionConfigRes] = await Promise.all([
        getMe().catch(() => null),
        getMyIdentityRisk().catch(() => null),
        apiJson<any>("/api/payment-instructions/my").catch(() => null),
      ]);
      setMe(meRes || null);
      setVaultSettlement((instructionConfigRes?.settlement || null) as SettlementRecord | null);
      setVaultConfig((instructionConfigRes?.vault_config || null) as VaultConfigRecord | null);
      const continuity = (riskRes as any)?.continuity || {};
      const status = safeStr(continuity?.status).toLowerCase();
      setIdentityBlocked(status === "reverify_required" || status === "protected_lock");

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      if (!gmfnId) {
        setShop(null);
        setProducts([]);
        setVaultLinks([]);
        setExpectedPayments([]);
        setVaultStatus(null);
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
        setVaultStatus(null);
        return;
      }

      const clanId = Number(shopItem.clan_id || shopRes?.clan_id || selectedClanId || 0);
      const expectedPath =
        `/api/bank/expected?clan_id=${clanId}&limit=100` +
        (Number(meRes?.id || 0) > 0 ? `&user_id=${Number(meRes.id)}` : "");

      const [productsRes, linksRes, expectedRes, vaultStatusRes] = await Promise.all([
        apiJson<any>(
          `/api/marketplace/products?clan_id=${clanId}&shop_id=${shopItem.id}&include_private_manage=true&only_active=false&limit=200`
        ).catch(() => ({ items: [] })),
        listVaultShopAccessLinks(shopItem.id).catch(() => []),
        apiJson<any>(expectedPath).catch(() => []),
        getVaultShopStatus(shopItem.id).catch(() => null),
      ]);

      setVaultStatus(vaultStatusRes || null);
      setProducts(mergeVaultStatusProducts(rowsOf<ProductRecord>(productsRes), vaultStatusRes || null));
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
    const backendSlots = Number(vaultStatus?.active_paid_slots ?? 0);
    if (Number.isFinite(backendSlots) && backendSlots > 0) {
      return Math.min(VAULT_SLOT_LIMIT, backendSlots);
    }
    const confirmedSlots = vaultPayments
      .filter(isConfirmedPayment)
      .reduce((total, item) => total + paymentQuantity(item), 0);
    return Math.min(VAULT_SLOT_LIMIT, Math.max(confirmedSlots, vaultProducts.length));
  }, [vaultPayments, vaultProducts.length, vaultStatus?.active_paid_slots]);

  const latestVaultPayment = vaultPayments[0] || null;
  useEffect(() => {
    if (!shop?.id || confirmedVaultSlots <= 0) {
      setVaultSlotMap({});
      return;
    }

    setVaultSlotMap(normalizeVaultSlotMap(shop.id, vaultProducts, confirmedVaultSlots));
  }, [shop?.id, vaultProducts, confirmedVaultSlots]);

  const slots = useMemo(() => {
    const backendSlots = buildBackendVaultSlots(vaultStatus);
    if (backendSlots) return backendSlots;
    return buildVaultSlots(vaultProducts, confirmedVaultSlots, vaultSlotMap);
  }, [confirmedVaultSlots, vaultProducts, vaultSlotMap, vaultStatus]);
  useEffect(() => {
    if (slots.length > 0 && selectedSlot > slots.length) {
      setSelectedSlot(1);
    }
  }, [selectedSlot, slots.length]);
  const selectedProduct = slots[selectedSlot - 1] || null;
  const shopImageUrl = resolveAssetSrc(shop?.image_url);
  const shopName = firstTruthy(shop?.name, me?.display_name, me?.gmfn_id, "Your shop");
  const publicShopLink = firstTruthy(shop?.gmfn_id, me?.gmfn_id)
    ? publicFrontendUrl(`/shop/${encodeURIComponent(firstTruthy(shop?.gmfn_id, me?.gmfn_id))}`)
    : "";
  const activeVaultPayment = vaultInstruction || latestVaultPayment;
  const vaultPaymentDueDays = Math.max(
    1,
    Number(vaultConfig?.payment_instruction_expiry_days || VAULT_PAYMENT_DUE_DAYS)
  );
  const vaultLinkDefaultHours = Math.max(
    1,
    Number(vaultConfig?.default_link_expiry_hours || VAULT_LINK_DEFAULT_HOURS)
  );
  const activeVaultPaymentReference = firstTruthy(
    activeVaultPayment?.reference_display,
    (activeVaultPayment as any)?.reference
  );
  const activeVaultPaymentAmount = firstTruthy(activeVaultPayment?.amount);
  const activeVaultPaymentCurrency = firstTruthy(activeVaultPayment?.currency, "GBP");
  const activeVaultPaymentDueAt = firstTruthy(activeVaultPayment?.due_at);
  const selectedVaultSlotCount = Math.min(VAULT_SLOT_LIMIT, Math.max(1, Number(paymentSlots || 1)));
  const selectedVaultPaymentAmount = vaultSlotPaymentAmount(selectedVaultSlotCount);
  const selectedVaultPaymentLabel = formatMoney(selectedVaultPaymentAmount, "GBP");
  const selectedVaultQuoteKey = vaultPaymentQuoteKey(selectedVaultSlotCount);
  const paymentQuoteConfirmed = confirmedPaymentQuoteKey === selectedVaultQuoteKey;
  const selectedVaultAgreementText = `${selectedVaultSlotCount} slot${selectedVaultSlotCount === 1 ? "" : "s"} = ${selectedVaultPaymentLabel}`;
  const selectedVaultBundleText =
    selectedVaultSlotCount === VAULT_SLOT_LIMIT
      ? "This uses the 6-slot bundle, so the total stays at GBP 5."
      : selectedVaultSlotCount >= 3
        ? `You can also choose 6 slots for GBP 5 instead of ${selectedVaultPaymentLabel}.`
        : "The 6-slot bundle is available for GBP 5 when you need the full private rack.";
  const settlementMissingText = settlementValue(vaultSettlement, "missing_field_text") || "Not configured for this pilot rail yet.";
  const vaultPaymentRegionCode = settlementValue(vaultSettlement, "region_code").toLowerCase();
  const vaultPaymentCountryCode = settlementValue(vaultSettlement, "country").toUpperCase();
  const vaultPaymentUsesUkSortCode =
    vaultPaymentRegionCode === "uk" || ["GB", "UK", "IM", "JE", "GG"].includes(vaultPaymentCountryCode);
  const vaultPaymentUsesUsRouting =
    vaultPaymentRegionCode === "united_states" || ["US", "USA"].includes(vaultPaymentCountryCode);
  const vaultPaymentUsesIban =
    vaultPaymentRegionCode === "europe_mena" ||
    ["AE", "BH", "DE", "EG", "ES", "FR", "GB", "IE", "IT", "NL", "QA", "SA", "TR", "UK"].includes(vaultPaymentCountryCode) ||
    Boolean(settlementValue(vaultSettlement, "iban"));
  const vaultPaymentUsesAfricaLocalCode =
    vaultPaymentRegionCode === "africa" ||
    ["GH", "KE", "NG", "RW", "UG", "ZA"].includes(vaultPaymentCountryCode) ||
    Boolean(firstTruthy(
      settlementValue(vaultSettlement, "bank_code"),
      settlementValue(vaultSettlement, "branch_code"),
      settlementValue(vaultSettlement, "mobile_money_number")
    ));
  const vaultPaymentUsesAsiaLocalCode =
    vaultPaymentRegionCode === "asia" ||
    ["BD", "CN", "HK", "ID", "IN", "JP", "MY", "PH", "PK", "SG", "TH", "VN"].includes(vaultPaymentCountryCode) ||
    Boolean(firstTruthy(
      settlementValue(vaultSettlement, "ifsc_code"),
      settlementValue(vaultSettlement, "bank_code"),
      settlementValue(vaultSettlement, "branch_code")
    ));
  const vaultPaymentRegionLabel = firstTruthy(
    settlementValue(vaultSettlement, "region_code").replace(/_/g, " "),
    settlementValue(vaultSettlement, "country")
  );
  const vaultPaymentAfricaIdentifier = firstTruthy(
    settlementValue(vaultSettlement, "bank_code"),
    settlementValue(vaultSettlement, "branch_code"),
    settlementValue(vaultSettlement, "mobile_money_number")
  );
  const vaultPaymentAsiaIdentifier = firstTruthy(
    settlementValue(vaultSettlement, "ifsc_code"),
    settlementValue(vaultSettlement, "bank_code"),
    settlementValue(vaultSettlement, "branch_code"),
    settlementValue(vaultSettlement, "swift_bic")
  );
  const vaultPaymentSortOrBankCode = firstTruthy(
    settlementValue(vaultSettlement, "sort_code"),
    settlementValue(vaultSettlement, "bank_code"),
    settlementValue(vaultSettlement, "branch_code"),
    settlementValue(vaultSettlement, "ifsc_code"),
    settlementValue(vaultSettlement, "mobile_money_number")
  );
  const vaultPaymentTransferLines = [
    paymentLine("Rail", settlementValue(vaultSettlement, "rail_name")),
    paymentLine("Payment networks", settlementListValue(vaultSettlement, "payment_networks")),
    paymentLine("Bank", settlementValue(vaultSettlement, "bank_name")),
    paymentLine("Account name", settlementValue(vaultSettlement, "account_name")),
    paymentLine("Account number", settlementValue(vaultSettlement, "account_number")),
    paymentLine("Country", settlementValue(vaultSettlement, "country")),
    paymentLine("Region profile", vaultPaymentRegionLabel),
    paymentLine("Sort code / bank code", vaultPaymentSortOrBankCode || settlementMissingText),
    vaultPaymentUsesUkSortCode ? paymentLine("UK sort code", settlementValue(vaultSettlement, "sort_code") || settlementMissingText) : "",
    vaultPaymentUsesUsRouting ? paymentLine("US routing number", settlementValue(vaultSettlement, "routing_number") || settlementMissingText) : "",
    paymentLine("ACH routing", settlementValue(vaultSettlement, "ach_routing_number")),
    paymentLine("Wire routing", settlementValue(vaultSettlement, "wire_routing_number")),
    vaultPaymentUsesIban ? paymentLine("IBAN", settlementValue(vaultSettlement, "iban") || settlementMissingText) : "",
    vaultPaymentUsesIban || settlementValue(vaultSettlement, "swift_bic")
      ? paymentLine("SWIFT/BIC", settlementValue(vaultSettlement, "swift_bic") || settlementMissingText)
      : "",
    vaultPaymentUsesAfricaLocalCode ? paymentLine("Africa bank/mobile code", vaultPaymentAfricaIdentifier || settlementMissingText) : "",
    vaultPaymentUsesAsiaLocalCode ? paymentLine("Asia local code", vaultPaymentAsiaIdentifier || settlementMissingText) : "",
    paymentLine("Branch name", settlementValue(vaultSettlement, "branch_name")),
    paymentLine("Amount", activeVaultPaymentAmount ? formatMoney(activeVaultPaymentAmount, activeVaultPaymentCurrency) : ""),
    paymentLine("Payment code", activeVaultPaymentReference),
    paymentLine("Expires", safeDateTime(activeVaultPaymentDueAt) || `${vaultPaymentDueDays} days after generation`),
  ].filter(Boolean);

  function copyVaultPaymentInstruction() {
    const text = vaultPaymentTransferLines.join("\n");
    if (navigator?.clipboard?.writeText && text) {
      void navigator.clipboard.writeText(text);
      showNotice("success", "Vault bank transfer instruction copied.");
      return;
    }
    showNotice("info", "Copy is not available in this browser. Use the payment details shown here.");
  }

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
    const safeQuantity = Math.min(VAULT_SLOT_LIMIT, Math.max(1, Number(quantityTotal || 1)));
    const quoteKey = vaultPaymentQuoteKey(safeQuantity);
    if (confirmedPaymentQuoteKey !== quoteKey) {
      showNotice(
        "info",
        `Confirm the Vault quote first: ${safeQuantity} slot${safeQuantity === 1 ? "" : "s"} = ${formatMoney(vaultSlotPaymentAmount(safeQuantity), "GBP")}.`
      );
      return;
    }
    setCreatingPayment(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/vault", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          quantity_total: safeQuantity,
          currency: "GBP",
        }),
      });
      setVaultInstruction(result as ExpectedPaymentRecord);
      setVaultSettlement((result?.settlement || vaultSettlement || null) as SettlementRecord | null);
      await loadPage();
      const reference = firstTruthy(result?.reference_display, result?.reference);
      showNotice(
        "success",
        reference
          ? `Vault payment code is ready: ${reference}. Use that exact code in the bank transfer.`
          : `Vault payment request created for ${safeQuantity} slot${safeQuantity === 1 ? "" : "s"} at ${formatMoney(vaultSlotPaymentAmount(safeQuantity), "GBP")}.`
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
        vault_slot_number: selectedSlot,
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
        setVaultSlotMap(
          rememberVaultProductSlot(shop.id, savedId, selectedSlot)
        );
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
      if (shop?.id) {
        setVaultSlotMap(forgetVaultProductSlot(shop.id, item.id));
      }
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
    if (!selectedProduct?.id) {
      showNotice("error", "Choose the Vault block you want to share, then create its private link.");
      return;
    }
    setCreatingLink(true);
    try {
      const link = await createVaultShopAccessLink({
        shop_id: shop.id,
        product_id: selectedProduct.id,
        expires_at: vaultDefaultExpiry(vaultLinkDefaultHours),
        max_views: 20,
        watermark_enabled: true,
      });
      setVaultLinks((prev) => [link, ...prev]);
      const url = vaultLinkUrl(link);
      if (navigator?.clipboard?.writeText && url) void navigator.clipboard.writeText(url);
      showNotice("success", `Vault link for block #${selectedSlot} created and copied.`);
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
      const updated = await extendVaultShopAccessLink(id, vaultDefaultExpiry(vaultLinkDefaultHours));
      setVaultLinks((prev) => prev.map((item) => firstTruthy(item.id) === id ? updated : item));
      showNotice("success", `Vault link extended for ${vaultLinkDefaultHours} more hours.`);
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
          Pay for the number of Vault blocks you want to use. The current rail is bank transfer with a matching reference. Card payment is not connected in this pilot yet.
        </div>
        <div style={{ marginTop: 8, ...helperText(), fontWeight: 800 }}>
          Pricing: 1-5 slots are GBP 1 each. 6 slots use the GBP 5 bundle.
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: isCompact ? "1fr" : "280px minmax(0, 1fr)", gap: 12 }}>
          <div>
            <div style={sectionLabel()}>Slots to activate</div>
            <div
              role="radiogroup"
              aria-label="Slots to activate"
              style={{ marginTop: 8, ...slotChoiceGrid(isCompact) }}
            >
              {[1, 2, 3, 4, 5, 6].map((slot) => {
                const selected = Number(paymentSlots) === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    {...buttonGuardProps()}
                    onClick={() => {
                      setPaymentSlots(slot);
                      setConfirmedPaymentQuoteKey("");
                    }}
                    style={slotChoiceButton(selected)}
                  >
                    <span>{slot}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.9 }}>
                      slot{slot === 1 ? "" : "s"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ ...innerCard("#F8FBFF") }}>
            <div style={sectionLabel()}>Payment preview</div>
            <div style={{ marginTop: 6, color: gmfnBrand.colors.ink, fontSize: 22, fontWeight: 950 }}>
              {selectedVaultSlotCount} slot{selectedVaultSlotCount === 1 ? "" : "s"} selected = {selectedVaultPaymentLabel}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {selectedVaultBundleText}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Confirm this quote first. GSN will generate the payment code against this exact slot count and amount, then the bank rail can cross-check the code and amount before Vault opens.
            </div>
            <div style={{ marginTop: 10, ...noticeCard(paymentQuoteConfirmed ? "success" : "info") }}>
              {paymentQuoteConfirmed
                ? `Agreed: ${selectedVaultAgreementText}. The payment code will be created for this exact quote.`
                : `Review: ${selectedVaultAgreementText}. Agree to this quote before generating the payment code.`}
            </div>
            <button
              type="button"
              {...buttonGuardProps()}
              onClick={() => {
                setConfirmedPaymentQuoteKey(selectedVaultQuoteKey);
                showNotice("success", `Vault quote confirmed: ${selectedVaultAgreementText}.`);
              }}
              style={{
                ...brandActionButton(paymentQuoteConfirmed ? "secondary" : "primary"),
                marginTop: 10,
                minHeight: 56,
                width: "100%",
              }}
            >
              {paymentQuoteConfirmed ? "Quote confirmed" : `Agree: ${selectedVaultAgreementText}`}
            </button>
            <div style={{ marginTop: 8, ...helperText(), fontWeight: 800 }}>
              Payment instructions expire {vaultPaymentDueDays} days after generation unless the bank rail returns a different due time.
            </div>
          </div>
          {identityBlocked ? (
            <div style={{ gridColumn: isCompact ? "auto" : "1 / -1", ...noticeCard("info") }}>
              Your identity continuity needs review, so private sharing may stay limited. You can still generate the Vault payment code here because the bank-transfer rail will match the payment by amount and code.
            </div>
          ) : null}
          <div style={{ alignSelf: "end", ...actionGrid(isCompact, 170), gridColumn: isCompact ? "auto" : "1 / -1" }}>
            <button
              type="button"
              {...buttonGuardProps()}
              onClick={() => {
                if (!paymentQuoteConfirmed) {
                  showNotice("info", `Confirm this Vault quote first: ${selectedVaultAgreementText}.`);
                  return;
                }
                void createVaultInstruction(paymentSlots);
              }}
              disabled={creatingPayment || !shop?.id}
              style={{
                ...brandActionButton("primary", creatingPayment || !shop?.id),
                minHeight: 64,
                width: "100%",
                position: "relative",
                zIndex: 2,
                touchAction: "manipulation",
              }}
            >
              {creatingPayment ? "Generating payment code..." : paymentQuoteConfirmed ? "Generate payment code" : "Confirm quote first"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(isConfirmedPayment(activeVaultPayment))}>
            Payment: {vaultPaymentStatusLabel(activeVaultPayment)}
          </span>
          {activeVaultPayment ? (
            <span style={badge(false)}>
              Code: {firstTruthy(activeVaultPaymentReference, "Awaiting code")}
            </span>
          ) : null}
        </div>
        {activeVaultPayment ? (
          <div style={{ marginTop: 14, ...innerCard("#FCFEFF") }}>
            <div style={sectionLabel()}>Payment code and bank transfer</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Transfer the exact amount into the account below and use the exact payment code. Use the identifier your country or bank asks for: sort code in the UK, routing in the US, IBAN and SWIFT/BIC for Europe, Egypt, MENA or international wires, and local bank, branch, IFSC or mobile-money codes where configured.
            </div>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {vaultPaymentTransferLines.map((line) => {
                const [label, ...rest] = line.split(":");
                const value = rest.join(":").trim();
                return (
                  <div key={line} style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>{label}</div>
                    <div style={{ marginTop: 6, color: gmfnBrand.colors.ink, fontWeight: 950, overflowWrap: "anywhere" }}>
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>
            {settlementValue(vaultSettlement, "support_note") ? (
              <div style={{ marginTop: 10, ...helperText() }}>
                {settlementValue(vaultSettlement, "support_note")}
              </div>
            ) : null}
            <div style={{ marginTop: 12, ...actionGrid(isCompact, 170) }}>
              <button
                type="button"
                {...buttonGuardProps()}
                onClick={copyVaultPaymentInstruction}
                style={brandActionButton("secondary", vaultPaymentTransferLines.length === 0)}
                disabled={vaultPaymentTransferLines.length === 0}
              >
                Copy payment details
              </button>
              <button
                type="button"
                {...buttonGuardProps()}
                onClick={() => void loadPage()}
                style={brandActionButton("soft")}
              >
                Check payment status
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, ...noticeCard("info") }}>
            Select the number of slots, confirm the preview amount, then tap Generate payment code to open the exact account details and payment code.
          </div>
        )}
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
                    style={brandActionButton("primary", savingProduct)}
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
          A Vault block is private until you create and share a link. The link opens only the selected block, and it can expire, be extended, or be revoked.
        </div>
        <div style={{ marginTop: 12, ...actionGrid(isCompact, 170) }}>
          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => void createViewingLink()}
            disabled={identityBlocked || creatingLink || vaultProducts.length === 0}
            style={brandActionButton("primary", identityBlocked || creatingLink || vaultProducts.length === 0)}
          >
            {identityBlocked ? "Review identity first" : creatingLink ? "Creating link..." : vaultProducts.length === 0 ? "Add private offer first" : selectedProduct ? `Create link for block #${selectedSlot}` : "Choose block to share"}
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
              const productId = firstTruthy(link.product_id);
              const blockId = firstTruthy((link as any).block_id);
              const linkedSlot =
                slots.findIndex((item) => {
                  if (!item) return false;
                  return (
                    (productId && safeStr(item.id) === productId) ||
                    (blockId && safeStr(item.vault_block_id) === blockId)
                  );
                }) + 1;
              return (
                <div key={id} style={innerCard("#FCFEFF")}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>Link #{id}</span>
                    <span style={badge(Boolean(linkedSlot))}>{linkedSlot ? `Block #${linkedSlot}` : "Legacy shop-scope link"}</span>
                    <span style={badge(false)}>{firstTruthy(link.status, "active")}</span>
                    <span style={badge(false)}>{Number(link.views_used || 0)} / {Number(link.max_views || 0) || "unlimited"} views</span>
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>Expires: {firstTruthy(link.expires_at, "No expiry")}</div>
                  <div style={{ marginTop: 10, ...actionGrid(isCompact, 150) }}>
                    <button type="button" {...buttonGuardProps()} onClick={() => { if (navigator?.clipboard?.writeText && url) void navigator.clipboard.writeText(url); showNotice("success", "Vault link copied."); }} disabled={!url} style={brandActionButton("soft", !url)}>Copy link</button>
                    <button type="button" {...buttonGuardProps()} onClick={() => { if (url) window.open(url, "_blank", "noopener,noreferrer"); }} disabled={!url} style={brandActionButton("secondary", !url)}>Open link</button>
                    <button type="button" {...buttonGuardProps()} onClick={() => void extendLink(link)} disabled={busyLinkId === id} style={brandActionButton("secondary", busyLinkId === id)}>Extend {vaultLinkDefaultHours} hours</button>
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
