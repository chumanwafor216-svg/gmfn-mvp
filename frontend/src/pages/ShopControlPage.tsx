import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";

type ShopRecord = {
  id?: number;
  user_id?: number;
  owner_user_id?: number;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  owner_name?: string | null;
  owner_display_name?: string | null;
  owner_nickname?: string | null;
  trust_band?: string | null;
  name?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  shop_logo_url?: string | null;
};

type ShopProduct = {
  id?: number;
  name?: string | null;
  description?: string | null;
  price?: string | number | null;
  currency?: string | null;
  display_price?: string | null;
  image_url?: string | null;
  video_url?: string | null;
};

type FeedbackTone = "success" | "error";

type CollapseState = {
  identity: boolean;
  actions: boolean;
  profile: boolean;
  composer: boolean;
  products: boolean;
};

type ProfileDraft = {
  name: string;
  description: string;
  whatsapp: string;
  telegram: string;
  imageUrl: string;
};

type ProductDraft = {
  id?: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
};

const SECTION_STORAGE_KEY = "gmfn.shopControl.sections.v1";
const PROFILE_DRAFT_PREFIX = "gmfn.shopControl.profileDraft.";
const PRODUCT_DRAFT_PREFIX = "gmfn.shopControl.productDraft.";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstDefined(...values: any[]): any {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function dedupeStrings(values: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = safeStr(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function browserOrigin(): string {
  try {
    if (typeof window === "undefined") return "";
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function getMediaOrigins(): string[] {
  const out: string[] = [];
  const base = apiBase();
  const webOrigin = browserOrigin();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      out.push(`${u.protocol}//${u.host}`);
    } catch {
      // ignore
    }
  }

  if (webOrigin) {
    out.push(webOrigin);

    try {
      const u = new URL(webOrigin);
      if (u.hostname) {
        out.push(`${u.protocol}//${u.hostname}:8012`);
      }
    } catch {
      // ignore
    }
  }

  out.push("http://127.0.0.1:8012");
  out.push("http://localhost:8012");

  return dedupeStrings(out);
}

function buildResolvedMediaCandidates(src: string): string[] {
  const raw = safeStr(src);
  if (!raw) return [];

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return [raw];
  }

  const origins = getMediaOrigins();
  const trimmed = raw.replace(/^\/+/, "");
  const out: string[] = [];

  if (raw.startsWith("/")) {
    for (const origin of origins) out.push(`${origin}${raw}`);
  } else {
    for (const origin of origins) out.push(`${origin}/${trimmed}`);
  }

  out.push(raw);
  return dedupeStrings(out);
}

function normalizeShopRecord(raw: any): ShopRecord | null {
  if (!raw) return null;

  const src = raw?.shop || raw?.item || raw;

  return {
    id: positiveNumber(
      firstDefined(src?.id, src?.shop_id, src?.marketplace_shop_id)
    ),
    user_id: positiveNumber(firstDefined(src?.user_id)),
    owner_user_id: positiveNumber(
      firstDefined(src?.owner_user_id, src?.owner_id)
    ),
    gmfn_id: firstTruthy(src?.gmfn_id, src?.gmfnId),
    owner_gmfn_id: firstTruthy(
      src?.owner_gmfn_id,
      src?.owner_gmfn,
      src?.ownerGmfnId
    ),
    owner_name: firstTruthy(src?.owner_name, src?.seller_name),
    owner_display_name: firstTruthy(
      src?.owner_display_name,
      src?.display_name,
      src?.shop_owner_display_name
    ),
    owner_nickname: firstTruthy(src?.owner_nickname, src?.nickname),
    trust_band: firstTruthy(
      src?.trust_band,
      src?.trust_status,
      src?.credibility_status,
      src?.verification_status
    ),
    name: firstTruthy(
      src?.name,
      src?.shop_name,
      src?.title,
      src?.display_name
    ),
    description: firstTruthy(
      src?.description,
      src?.shop_description,
      src?.about,
      src?.summary
    ),
    whatsapp_number: firstTruthy(
      src?.whatsapp_number,
      src?.whatsapp,
      src?.phone_whatsapp
    ),
    telegram_handle: firstTruthy(
      src?.telegram_handle,
      src?.telegram,
      src?.telegram_username
    ),
    image_url: firstTruthy(src?.image_url, src?.image),
    photo_url: firstTruthy(src?.photo_url, src?.photo),
    cover_image_url: firstTruthy(src?.cover_image_url, src?.cover_photo_url),
    banner_url: firstTruthy(src?.banner_url, src?.banner_image_url),
    logo_url: firstTruthy(src?.logo_url, src?.logo),
    shop_logo_url: firstTruthy(src?.shop_logo_url, src?.shop_logo),
  };
}

function normalizeProductRecord(raw: any): ShopProduct | null {
  if (!raw) return null;

  const src = raw?.product || raw?.item || raw?.marketplace_product || raw;

  return {
    id: positiveNumber(firstDefined(src?.id, src?.product_id, raw?.product_id)),
    name: firstTruthy(
      src?.name,
      src?.title,
      src?.product_name,
      raw?.name,
      raw?.title,
      raw?.product_name
    ),
    description: firstTruthy(
      src?.description,
      src?.product_description,
      src?.details,
      src?.summary,
      src?.short_description,
      raw?.description,
      raw?.product_description,
      raw?.details,
      raw?.summary,
      raw?.short_description
    ),
    price: firstDefined(
      src?.price,
      src?.amount,
      src?.unit_price,
      src?.selling_price,
      src?.price_value,
      raw?.price,
      raw?.amount,
      raw?.unit_price,
      raw?.selling_price,
      raw?.price_value
    ),
    currency: firstTruthy(
      src?.currency,
      src?.currency_code,
      raw?.currency,
      raw?.currency_code
    ),
    display_price: firstTruthy(
      src?.display_price,
      src?.formatted_price,
      raw?.display_price,
      raw?.formatted_price
    ),
    image_url: firstTruthy(
      raw?.image_url,
      raw?.photo_url,
      raw?.thumbnail_url,
      raw?.cover_image_url,
      raw?.banner_url,
      raw?.media_url,
      raw?.image,
      src?.image_url,
      src?.photo_url,
      src?.thumbnail_url,
      src?.cover_image_url,
      src?.banner_url,
      src?.media_url,
      src?.image
    ),
    video_url: firstTruthy(
      raw?.video_url,
      raw?.video,
      src?.video_url,
      src?.video
    ),
  };
}

function getShopImage(shop: ShopRecord | null): string {
  return firstTruthy(
    shop?.image_url,
    shop?.photo_url,
    shop?.cover_image_url,
    shop?.banner_url,
    shop?.logo_url,
    shop?.shop_logo_url
  );
}

function displayPrice(product: ShopProduct): string {
  const display = safeStr(product?.display_price);
  if (display) return display;

  const value = safeStr(product?.price);
  const currency = safeStr(product?.currency);

  if (!value && !currency) return "Price not shown";
  if (value && currency) return `${value} ${currency}`;
  return value || currency || "Price not shown";
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase" as const,
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
    whiteSpace: "nowrap" as const,
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
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
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
    boxSizing: "border-box" as const,
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 108,
    resize: "vertical" as const,
    lineHeight: 1.6,
  };
}

function mediaBox(minHeight = 220): React.CSSProperties {
  return {
    width: "100%",
    minHeight,
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function feedbackCard(tone: FeedbackTone): React.CSSProperties {
  return {
    ...pageCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
    padding: 14,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
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
    identity: false,
    actions: true,
    profile: false,
    composer: false,
    products: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    identity: Boolean(raw?.identity ?? base.identity),
    actions: Boolean(raw?.actions ?? base.actions),
    profile: Boolean(raw?.profile ?? base.profile),
    composer: Boolean(raw?.composer ?? base.composer),
    products: Boolean(raw?.products ?? base.products),
  };
}

function defaultProfileDraft(): ProfileDraft {
  return {
    name: "",
    description: "",
    whatsapp: "",
    telegram: "",
    imageUrl: "",
  };
}

function defaultProductDraft(): ProductDraft {
  return {
    name: "",
    description: "",
    price: "",
    currency: "NGN",
    imageUrl: "",
  };
}

function hasAnyApi(names: string[]): boolean {
  return names.some((name) => typeof (api as any)[name] === "function");
}

async function callFirstAvailable<T = any>(
  names: string[],
  ...args: any[]
): Promise<T | undefined> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn === "function") {
      return (await fn(...args)) as T;
    }
  }

  return undefined;
}

function profileDraftStorageKey(gmfnId: string): string {
  return `${PROFILE_DRAFT_PREFIX}${gmfnId || "me"}`;
}

function productDraftStorageKey(gmfnId: string): string {
  return `${PRODUCT_DRAFT_PREFIX}${gmfnId || "me"}`;
}

function RotatingImage(props: {
  candidates: string[];
  alt: string;
  style: React.CSSProperties;
  fallback: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [props.candidates.join("|")]);

  const src = props.candidates[index] || "";

  if (!src) return <>{props.fallback}</>;

  return (
    <img
      src={src}
      alt={props.alt}
      onError={() =>
        setIndex((prev) => {
          const next = prev + 1;
          return next <= props.candidates.length ? next : prev;
        })
      }
      style={props.style}
    />
  );
}

export default function ShopControlPage() {
  const selectedClanId = Number(api.getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(readLocalJSON(SECTION_STORAGE_KEY, defaultCollapseState()))
  );

  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(defaultProfileDraft());
  const [productDraft, setProductDraft] = useState<ProductDraft>(defaultProductDraft());

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number>(0);

  const [editingProductId, setEditingProductId] = useState<number>(0);

  const hasShopSaveApi = useMemo(
    () =>
      hasAnyApi([
        "updateMarketplaceShop",
        "saveMarketplaceShop",
        "updateShopProfile",
        "upsertMarketplaceShop",
        "createMarketplaceShop",
      ]),
    []
  );

  const hasCreateProductApi = useMemo(
    () =>
      hasAnyApi([
        "createMarketplaceProduct",
        "createShopProduct",
        "createMarketplaceListing",
        "createShopListing",
      ]),
    []
  );

  const hasUpdateProductApi = useMemo(
    () =>
      hasAnyApi([
        "updateMarketplaceProduct",
        "updateShopProduct",
        "updateMarketplaceListing",
      ]),
    []
  );

  const hasDeleteProductApi = useMemo(
    () =>
      hasAnyApi([
        "deleteMarketplaceProduct",
        "removeMarketplaceProduct",
        "archiveMarketplaceProduct",
        "deleteShopProduct",
      ]),
    []
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
    writeLocalJSON(SECTION_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!profileImageFile) {
      setProfileImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(profileImageFile);
    setProfileImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [profileImageFile]);

  useEffect(() => {
    if (!productImageFile) {
      setProductImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(productImageFile);
    setProductImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [productImageFile]);

  async function loadShopContext() {
    setLoading(true);

    try {
      const [meRes, clanRes] = await Promise.all([
        api.getMe().catch(() => null),
        api.getCurrentClan().catch(() => null),
      ]);

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      let resolvedShop: ShopRecord | null = null;

      if (gmfnId) {
        const directShopRes = await api
          .getMarketplaceShopByGmfnId(gmfnId, {
            clan_id: selectedClanId || undefined,
          })
          .catch(() => null);

        resolvedShop = normalizeShopRecord(directShopRes);
      }

      if (!resolvedShop) {
        const listRes = await api
          .getMarketplaceShops({
            clan_id: selectedClanId || undefined,
            only_active: true,
            limit: 200,
          })
          .catch(() => ({ items: [] }));

        const rows = rowsOf<any>(listRes)
          .map((row) => normalizeShopRecord(row))
          .filter(Boolean) as ShopRecord[];

        const targetGmfn = safeStr(gmfnId).toUpperCase();

        resolvedShop =
          rows.find((row) => {
            const rowGmfn = safeStr(row?.gmfn_id || row?.owner_gmfn_id).toUpperCase();
            return targetGmfn && rowGmfn === targetGmfn;
          }) || null;
      }

      let productRows: ShopProduct[] = [];

      if (resolvedShop?.id) {
        const productsRes = await api
          .getMarketplaceProducts({
            clan_id: selectedClanId || undefined,
            shop_id: resolvedShop.id,
            only_active: true,
            include_reposted: true,
            limit: 200,
          })
          .catch(() => ({ items: [] }));

        productRows = rowsOf<any>(productsRes)
          .map((row) => normalizeProductRecord(row))
          .filter(Boolean) as ShopProduct[];
      }

      setMe(meRes || null);
      setCurrentClan(clanRes || null);
      setShop(resolvedShop || null);
      setProducts(productRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadShopContext();
  }, [selectedClanId]);

  const gmfnId = useMemo(
    () => firstTruthy(me?.gmfn_id, shop?.gmfn_id, shop?.owner_gmfn_id, "Pending"),
    [me, shop]
  );

  const memberName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email,
        shop?.owner_name,
        shop?.owner_display_name,
        shop?.owner_nickname
      ) || "Member"
    );
  }, [me, shop]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [currentClan, selectedClanId]);

  const myShopLink = safeStr(gmfnId) && gmfnId !== "Pending"
    ? `/app/shop/${encodeURIComponent(gmfnId)}`
    : "/app/shop/me";

  const shopImageCandidates = useMemo(() => {
    return buildResolvedMediaCandidates(getShopImage(shop));
  }, [shop]);

  useEffect(() => {
    const key = profileDraftStorageKey(gmfnId);
    const saved = readLocalJSON<ProfileDraft>(key, defaultProfileDraft());

    setProfileDraft({
      name: firstTruthy(shop?.name, saved.name),
      description: firstTruthy(shop?.description, saved.description),
      whatsapp: firstTruthy(shop?.whatsapp_number, saved.whatsapp),
      telegram: firstTruthy(shop?.telegram_handle, saved.telegram),
      imageUrl: firstTruthy(getShopImage(shop), saved.imageUrl),
    });
  }, [gmfnId, shop]);

  useEffect(() => {
    const key = profileDraftStorageKey(gmfnId);
    writeLocalJSON(key, profileDraft);
  }, [gmfnId, profileDraft]);

  useEffect(() => {
    const key = productDraftStorageKey(gmfnId);
    const saved = readLocalJSON<ProductDraft>(key, defaultProductDraft());
    setProductDraft((prev) => {
      if (editingProductId > 0) return prev;
      return saved;
    });
  }, [gmfnId, editingProductId]);

  useEffect(() => {
    if (editingProductId > 0) return;
    const key = productDraftStorageKey(gmfnId);
    writeLocalJSON(key, productDraft);
  }, [gmfnId, productDraft, editingProductId]);

  function showFeedback(tone: FeedbackTone, text: string) {
    setFeedback({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function copyShopLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${myShopLink}`
        : myShopLink;

    api.safeCopy(url);
    showFeedback("success", "Shop gallery link copied.");
  }

  function copyGmfnId() {
    if (!gmfnId || gmfnId === "Pending") {
      showFeedback("error", "GMFN ID is not ready yet.");
      return;
    }

    api.safeCopy(gmfnId);
    showFeedback("success", "GMFN ID copied.");
  }

  function clearProfileDraft() {
    setProfileDraft({
      name: firstTruthy(shop?.name),
      description: firstTruthy(shop?.description),
      whatsapp: firstTruthy(shop?.whatsapp_number),
      telegram: firstTruthy(shop?.telegram_handle),
      imageUrl: firstTruthy(getShopImage(shop)),
    });
    setProfileImageFile(null);
  }

  function beginEditProduct(product: ShopProduct) {
    setEditingProductId(positiveNumber(product?.id));
    setProductDraft({
      id: positiveNumber(product?.id) || undefined,
      name: firstTruthy(product?.name),
      description: firstTruthy(product?.description),
      price: safeStr(product?.price),
      currency: firstTruthy(product?.currency, "NGN"),
      imageUrl: firstTruthy(product?.image_url),
    });
    setProductImageFile(null);
  }

  function clearProductDraft() {
    setEditingProductId(0);
    setProductDraft(defaultProductDraft());
    setProductImageFile(null);
  }

  async function maybeUploadImage(file: File | null): Promise<string> {
    if (!file) return "";

    const uploadFn = (api as any).uploadMarketplaceImageFile;
    if (typeof uploadFn !== "function") {
      throw new Error("Image upload is not wired in the API yet.");
    }

    const uploadRes = await uploadFn(file, selectedClanId || undefined);

    return firstTruthy(
      uploadRes?.image_url,
      uploadRes?.url,
      uploadRes?.file_url,
      uploadRes?.path,
      uploadRes?.item?.image_url,
      uploadRes?.data?.image_url
    );
  }

  async function saveProfile() {
    setSavingProfile(true);

    try {
      const uploadedImageUrl = await maybeUploadImage(profileImageFile).catch((err: any) => {
        if (profileImageFile) throw err;
        return "";
      });

      const payload = {
        shop_id: shop?.id || undefined,
        clan_id: selectedClanId || undefined,
        gmfn_id: gmfnId !== "Pending" ? gmfnId : undefined,
        name: safeStr(profileDraft.name),
        description: safeStr(profileDraft.description),
        whatsapp_number: safeStr(profileDraft.whatsapp),
        telegram_handle: safeStr(profileDraft.telegram),
        image_url: uploadedImageUrl || safeStr(profileDraft.imageUrl) || undefined,
      };

      const saved =
        shop?.id || hasShopSaveApi
          ? await callFirstAvailable(
              [
                "updateMarketplaceShop",
                "saveMarketplaceShop",
                "updateShopProfile",
                "upsertMarketplaceShop",
                "createMarketplaceShop",
              ],
              payload
            )
          : undefined;

      if (!saved) {
        const nextProfileDraft = {
          ...profileDraft,
          imageUrl: uploadedImageUrl || profileDraft.imageUrl,
        };
        setProfileDraft(nextProfileDraft);
        showFeedback(
          "success",
          "Shop profile draft saved locally. Backend shop save API is not wired in this build yet."
        );
      } else {
        showFeedback("success", "Shop profile updated.");
        await loadShopContext();
      }

      setProfileImageFile(null);
    } catch (err: any) {
      showFeedback(
        "error",
        safeStr(err?.message) || "Shop profile could not be saved right now."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveProduct() {
    if (!safeStr(productDraft.name)) {
      showFeedback("error", "Add the product name first.");
      return;
    }

    setSavingProduct(true);

    try {
      const uploadedImageUrl = await maybeUploadImage(productImageFile).catch((err: any) => {
        if (productImageFile) throw err;
        return "";
      });

      const payload = {
        id: editingProductId || undefined,
        product_id: editingProductId || undefined,
        shop_id: shop?.id || undefined,
        clan_id: selectedClanId || undefined,
        gmfn_id: gmfnId !== "Pending" ? gmfnId : undefined,
        name: safeStr(productDraft.name),
        description: safeStr(productDraft.description),
        price: safeStr(productDraft.price),
        currency: safeStr(productDraft.currency) || "NGN",
        image_url: uploadedImageUrl || safeStr(productDraft.imageUrl) || undefined,
      };

      const saved =
        editingProductId > 0
          ? await callFirstAvailable(
              [
                "updateMarketplaceProduct",
                "updateShopProduct",
                "updateMarketplaceListing",
              ],
              payload
            )
          : await callFirstAvailable(
              [
                "createMarketplaceProduct",
                "createShopProduct",
                "createMarketplaceListing",
                "createShopListing",
              ],
              payload
            );

      if (!saved) {
        const nextDraft = {
          ...productDraft,
          imageUrl: uploadedImageUrl || productDraft.imageUrl,
        };
        setProductDraft(nextDraft);
        showFeedback(
          "success",
          editingProductId > 0
            ? "Product draft changes saved locally. Backend product update API is not wired in this build yet."
            : "Product draft saved locally. Backend product create API is not wired in this build yet."
        );
      } else {
        showFeedback(
          "success",
          editingProductId > 0
            ? "Product block updated."
            : "Product block published."
        );
        clearProductDraft();
        await loadShopContext();
      }

      setProductImageFile(null);
    } catch (err: any) {
      showFeedback(
        "error",
        safeStr(err?.message) || "Product block could not be saved right now."
      );
    } finally {
      setSavingProduct(false);
    }
  }

  async function deleteProduct(product: ShopProduct) {
    const productId = positiveNumber(product?.id);

    if (!productId) {
      showFeedback("error", "This product is missing a usable ID.");
      return;
    }

    const proceed =
      typeof window === "undefined"
        ? true
        : window.confirm("Remove this visible block from the shop?");

    if (!proceed) return;

    setDeletingProductId(productId);

    try {
      const payload = {
        id: productId,
        product_id: productId,
        shop_id: shop?.id || undefined,
        clan_id: selectedClanId || undefined,
      };

      const removed = await callFirstAvailable(
        [
          "deleteMarketplaceProduct",
          "removeMarketplaceProduct",
          "archiveMarketplaceProduct",
          "deleteShopProduct",
        ],
        payload
      );

      if (!removed) {
        showFeedback(
          "error",
          "Product delete API is not wired in this build yet."
        );
      } else {
        showFeedback("success", "Product block removed.");
        if (editingProductId === productId) {
          clearProductDraft();
        }
        await loadShopContext();
      }
    } catch (err: any) {
      showFeedback(
        "error",
        safeStr(err?.message) || "Product block could not be removed right now."
      );
    } finally {
      setDeletingProductId(0);
    }
  }

  if (loading) {
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
          sectionLabel="Shop Control"
          title="Shop Control"
          subtitle="Preparing your shop control surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Shop Gallery", to: "/app/shop/me" },
            { label: "Marketplace", to: "/app/marketplace" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
          utilityLinks={[
            { label: "Trust", to: "/app/trust" },
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading shop control...
          </div>
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
        sectionLabel="Shop Control"
        title="Shop Control"
        subtitle="A calmer control room for your shop identity, visible blocks, and direct movement into your gallery and marketplace."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Shop Gallery", to: myShopLink },
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {feedback ? <div style={feedbackCard(feedback.tone)}>{feedback.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
      >
        <div style={sectionLabel()}>Shop identity</div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "280px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={mediaBox(230)}>
            <RotatingImage
              candidates={shopImageCandidates}
              alt={firstTruthy(shop?.name, "Shop")}
              style={{
                width: "100%",
                height: "100%",
                minHeight: 230,
                objectFit: "cover",
                display: "block",
              }}
              fallback={
                <div
                  style={{
                    padding: 18,
                    textAlign: "center",
                    color: "#37506A",
                    fontWeight: 900,
                    fontSize: 20,
                    lineHeight: 1.3,
                  }}
                >
                  {firstTruthy(shop?.name, "Shop not fully set up yet")}
                </div>
              }
            />
          </div>

          <div>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.08,
              }}
            >
              {firstTruthy(shop?.name, "Your shop control room")}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 820 }}>
              {firstTruthy(
                shop?.description,
                "This page controls your shop identity and the visible selling blocks that appear in Shop Gallery."
              )}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Community: {communityLabel}</span>
              <span style={badge(false)}>
                Trust: {firstTruthy(shop?.trust_band, "Visible seller")}
              </span>
              <span style={badge(false)}>Visible blocks: {products.length}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button type="button" onClick={copyShopLink} style={actionBtn("primary")}>
                Copy Shop Link
              </button>

              <button type="button" onClick={copyGmfnId} style={actionBtn("secondary")}>
                Copy GMFN ID
              </button>

              <Link to={myShopLink} style={actionBtn("secondary")}>
                Open Shop Gallery
              </Link>
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
            <div style={sectionLabel()}>Quick actions</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the main movements together and easy to find.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCollapsed((prev) => ({ ...prev, actions: !prev.actions }))
            }
            style={collapseToggle()}
          >
            {collapsed.actions ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.actions ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
            }}
          >
            <Link to={myShopLink} style={actionBtn("primary")}>
              Shop Gallery
            </Link>
            <Link to="/app/marketplace" style={actionBtn("secondary")}>
              Marketplace
            </Link>
            <Link to="/app/notifications" style={actionBtn("secondary")}>
              Notifications
            </Link>
            <Link to="/app/trust" style={actionBtn("secondary")}>
              Trust
            </Link>
            <Link to="/app/demand-box" style={actionBtn("secondary")}>
              Demand Box
            </Link>
            <Link to="/app/my-gmfn-and-i" style={actionBtn("soft")}>
              My GMFN and I
            </Link>
            <Link to="/app/my-gmfn-and-i?tab=settings" style={actionBtn("soft")}>
              Settings
            </Link>
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
            <div style={sectionLabel()}>Shop profile</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Calmly update the visible identity of your shop.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCollapsed((prev) => ({ ...prev, profile: !prev.profile }))
            }
            style={collapseToggle()}
          >
            {collapsed.profile ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.profile ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.02fr) minmax(320px, 0.98fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Edit profile</div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div>
                  <div style={sectionLabel()}>Shop name</div>
                  <input
                    value={profileDraft.name}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter shop name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Shop description</div>
                  <textarea
                    value={profileDraft.description}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe the shop in calm, plain language..."
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={sectionLabel()}>WhatsApp</div>
                    <input
                      value={profileDraft.whatsapp}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          whatsapp: e.target.value,
                        }))
                      }
                      placeholder="WhatsApp number"
                      style={{ ...inputStyle(), marginTop: 8 }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Telegram</div>
                    <input
                      value={profileDraft.telegram}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          telegram: e.target.value,
                        }))
                      }
                      placeholder="Telegram handle"
                      style={{ ...inputStyle(), marginTop: 8 }}
                    />
                  </div>
                </div>

                <div>
                  <div style={sectionLabel()}>Profile / cover image</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                    style={{ ...inputStyle(), marginTop: 8, paddingTop: 10 }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void saveProfile()}
                    disabled={savingProfile}
                    style={actionBtn("primary", savingProfile)}
                  >
                    {savingProfile
                      ? "Saving..."
                      : hasShopSaveApi
                      ? "Save Shop Profile"
                      : "Save Draft Locally"}
                  </button>

                  <button
                    type="button"
                    onClick={clearProfileDraft}
                    style={actionBtn("secondary")}
                  >
                    Reset Draft
                  </button>
                </div>

                {!hasShopSaveApi ? (
                  <div style={{ ...helperText(), fontSize: 13 }}>
                    This build will preserve the draft locally if the backend shop-save API is not yet wired.
                  </div>
                ) : null}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Preview</div>

              <div style={{ marginTop: 14, ...mediaBox(220) }}>
                <RotatingImage
                  candidates={
                    profileImagePreview
                      ? [profileImagePreview]
                      : buildResolvedMediaCandidates(profileDraft.imageUrl)
                  }
                  alt={safeStr(profileDraft.name || "Shop preview")}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 220,
                    objectFit: "cover",
                    display: "block",
                  }}
                  fallback={
                    <div
                      style={{
                        padding: 18,
                        textAlign: "center",
                        color: "#37506A",
                        fontWeight: 900,
                        fontSize: 18,
                        lineHeight: 1.4,
                      }}
                    >
                      {safeStr(profileDraft.name || "No image selected yet")}
                    </div>
                  }
                />
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 20,
                  lineHeight: 1.3,
                }}
              >
                {safeStr(profileDraft.name || "Shop name")}
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                {safeStr(
                  profileDraft.description ||
                    "Shop description preview will appear here."
                )}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {safeStr(profileDraft.whatsapp) ? (
                  <span style={badge(true)}>WhatsApp ready</span>
                ) : (
                  <span style={badge(false)}>No WhatsApp yet</span>
                )}

                {safeStr(profileDraft.telegram) ? (
                  <span style={badge(true)}>Telegram ready</span>
                ) : (
                  <span style={badge(false)}>No Telegram yet</span>
                )}
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
            <div style={sectionLabel()}>Visible block composer</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Prepare one calm selling block at a time.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCollapsed((prev) => ({ ...prev, composer: !prev.composer }))
            }
            style={collapseToggle()}
          >
            {collapsed.composer ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.composer ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.02fr) minmax(320px, 0.98fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>
                {editingProductId > 0 ? "Edit visible block" : "New visible block"}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div>
                  <div style={sectionLabel()}>Name</div>
                  <input
                    value={productDraft.name}
                    onChange={(e) =>
                      setProductDraft((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Product or service name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Description</div>
                  <textarea
                    value={productDraft.description}
                    onChange={(e) =>
                      setProductDraft((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe the visible block clearly..."
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 160px",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={sectionLabel()}>Price</div>
                    <input
                      value={productDraft.price}
                      onChange={(e) =>
                        setProductDraft((prev) => ({ ...prev, price: e.target.value }))
                      }
                      placeholder="Enter price"
                      style={{ ...inputStyle(), marginTop: 8 }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Currency</div>
                    <input
                      value={productDraft.currency}
                      onChange={(e) =>
                        setProductDraft((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                      placeholder="NGN"
                      style={{ ...inputStyle(), marginTop: 8 }}
                    />
                  </div>
                </div>

                <div>
                  <div style={sectionLabel()}>Image</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProductImageFile(e.target.files?.[0] || null)}
                    style={{ ...inputStyle(), marginTop: 8, paddingTop: 10 }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void saveProduct()}
                    disabled={savingProduct}
                    style={actionBtn("primary", savingProduct)}
                  >
                    {savingProduct
                      ? "Saving..."
                      : editingProductId > 0
                      ? hasUpdateProductApi
                        ? "Update Block"
                        : "Save Edit Draft"
                      : hasCreateProductApi
                      ? "Publish Block"
                      : "Save Draft"}
                  </button>

                  <button
                    type="button"
                    onClick={clearProductDraft}
                    style={actionBtn("secondary")}
                  >
                    Clear
                  </button>
                </div>

                {!hasCreateProductApi && editingProductId === 0 ? (
                  <div style={{ ...helperText(), fontSize: 13 }}>
                    This build will preserve the draft locally if the backend create-product API is not yet wired.
                  </div>
                ) : null}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Block preview</div>

              <div style={{ marginTop: 14, ...mediaBox(190) }}>
                <RotatingImage
                  candidates={
                    productImagePreview
                      ? [productImagePreview]
                      : buildResolvedMediaCandidates(productDraft.imageUrl)
                  }
                  alt={safeStr(productDraft.name || "Block preview")}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 190,
                    objectFit: "cover",
                    display: "block",
                  }}
                  fallback={
                    <div
                      style={{
                        padding: 18,
                        textAlign: "center",
                        color: "#37506A",
                        fontWeight: 800,
                        fontSize: 16,
                        lineHeight: 1.45,
                      }}
                    >
                      {safeStr(productDraft.name || "No image selected yet")}
                    </div>
                  }
                />
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.35,
                }}
              >
                {safeStr(productDraft.name || "Product name")}
              </div>

              <div style={{ marginTop: 8, ...helperText() }}>
                {safeStr(
                  productDraft.description ||
                    "Visible product description preview will appear here."
                )}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  {productDraft.price || productDraft.currency
                    ? `${safeStr(productDraft.price)} ${safeStr(productDraft.currency)}`
                    : "Price not entered yet"}
                </span>

                {editingProductId > 0 ? (
                  <span style={badge(false)}>Editing existing block</span>
                ) : (
                  <span style={badge(false)}>New block</span>
                )}
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
            <div style={sectionLabel()}>Visible selling blocks</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Edit or review the blocks already visible in your gallery.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>{products.length} blocks</span>
            <button
              type="button"
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, products: !prev.products }))
              }
              style={collapseToggle()}
            >
              {collapsed.products ? "Open" : "Collapse"}
            </button>
          </div>
        </div>

        {!collapsed.products ? (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {products.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No visible selling block is available yet in this shop.
              </div>
            ) : (
              products.map((product, index) => (
                <div key={`${product.id || index}`} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "160px minmax(0, 1fr) auto",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <div style={mediaBox(120)}>
                      <RotatingImage
                        candidates={buildResolvedMediaCandidates(
                          firstTruthy(product?.image_url)
                        )}
                        alt={firstTruthy(product?.name, "Product")}
                        style={{
                          width: "100%",
                          height: "100%",
                          minHeight: 120,
                          objectFit: "cover",
                          display: "block",
                        }}
                        fallback={
                          <div
                            style={{
                              padding: 12,
                              textAlign: "center",
                              color: "#37506A",
                              fontWeight: 800,
                              fontSize: 14,
                              lineHeight: 1.4,
                            }}
                          >
                            {firstTruthy(product?.name, "Product")}
                          </div>
                        }
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: 17,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {firstTruthy(product?.name, "Product")}
                      </div>

                      <div style={{ marginTop: 8, ...helperText() }}>
                        {firstTruthy(
                          product?.description,
                          "No additional description is visible yet."
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(true)}>{displayPrice(product)}</span>
                        {positiveNumber(product?.id) ? (
                          <span style={badge(false)}>ID: {positiveNumber(product?.id)}</span>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: isCompact ? "flex-start" : "flex-end",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => beginEditProduct(product)}
                        style={actionBtn("secondary")}
                      >
                        Edit Block
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteProduct(product)}
                        disabled={
                          !hasDeleteProductApi ||
                          deletingProductId === positiveNumber(product?.id)
                        }
                        style={actionBtn(
                          "soft",
                          !hasDeleteProductApi ||
                            deletingProductId === positiveNumber(product?.id)
                        )}
                      >
                        {deletingProductId === positiveNumber(product?.id)
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}