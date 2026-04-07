import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createMarketplaceRepost,
  getCurrentClan,
  getMarketplaceProducts,
  getMarketplaceShopByGmfnId,
  getMarketplaceShops,
  getMe,
  getSelectedClanId,
  listMyClans,
  safeCopy,
} from "../lib/api";

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

type ShopCandidate = {
  shop: ShopRecord;
  clanId: number | null;
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

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function normalizeGmfn(value: any): string {
  return safeStr(value).toUpperCase();
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

function positiveNumber(value: any): number | undefined {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function dedupeStrings(values: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = safeStr(value);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
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
    for (const origin of origins) {
      out.push(`${origin}${raw}`);
    }
  } else {
    for (const origin of origins) {
      out.push(`${origin}/${trimmed}`);
    }
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
    owner_user_id: positiveNumber(firstDefined(src?.owner_user_id, src?.owner_id)),
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

function getCurrentUrlWithoutHash(): string {
  try {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  } catch {
    return "";
  }
}

function normalizeWhatsAppHref(value: string): string {
  const raw = safeStr(value);
  if (!raw) return "";

  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";

  return `https://wa.me/${digits}`;
}

function normalizeTelegramHref(value: string): string {
  const raw = safeStr(value).replace(/^@/, "");
  if (!raw) return "";
  return `https://t.me/${raw}`;
}

function dedupeClanIds(values: Array<number | null | undefined>): number[] {
  const seen = new Set<number>();
  const out: number[] = [];

  for (const value of values) {
    const id = Number(value || 0);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }

  return out;
}

function dedupeShopCandidates(rows: ShopCandidate[]): ShopCandidate[] {
  const seen = new Set<string>();
  const out: ShopCandidate[] = [];

  for (const row of rows) {
    const shopId = Number(row.shop?.id || 0);
    const gmfn = normalizeGmfn(
      row.shop?.gmfn_id || row.shop?.owner_gmfn_id || ""
    );
    const clanId = Number(row.clanId || 0);
    const key = `${shopId}-${gmfn}-${clanId}`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function dedupeProducts(rows: ShopProduct[]): ShopProduct[] {
  const seen = new Set<string>();
  const out: ShopProduct[] = [];

  for (const row of rows) {
    const id = Number(row?.id || 0);
    const key =
      id > 0
        ? `id-${id}`
        : `fallback-${normalizeGmfn(row?.name || "")}-${normalizeGmfn(
            row?.image_url || ""
          )}-${normalizeGmfn(row?.price || "")}`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function mergeShopRecords(candidates: ShopCandidate[]): ShopRecord | null {
  if (candidates.length === 0) return null;

  const shops = candidates.map((item) => item.shop);

  return {
    id:
      Number(shops.find((x) => Number(x?.id || 0) > 0)?.id || 0) || undefined,
    gmfn_id: firstTruthy(...shops.map((x) => x?.gmfn_id)),
    owner_gmfn_id: firstTruthy(...shops.map((x) => x?.owner_gmfn_id)),
    name: firstTruthy(...shops.map((x) => x?.name)),
    description: firstTruthy(...shops.map((x) => x?.description)),
    owner_name: firstTruthy(...shops.map((x) => x?.owner_name)),
    owner_display_name: firstTruthy(...shops.map((x) => x?.owner_display_name)),
    owner_nickname: firstTruthy(...shops.map((x) => x?.owner_nickname)),
    trust_band: firstTruthy(...shops.map((x) => x?.trust_band)),
    whatsapp_number: firstTruthy(...shops.map((x) => x?.whatsapp_number)),
    telegram_handle: firstTruthy(...shops.map((x) => x?.telegram_handle)),
    image_url: firstTruthy(...shops.map((x) => x?.image_url)),
    photo_url: firstTruthy(...shops.map((x) => x?.photo_url)),
    cover_image_url: firstTruthy(...shops.map((x) => x?.cover_image_url)),
    banner_url: firstTruthy(...shops.map((x) => x?.banner_url)),
    logo_url: firstTruthy(...shops.map((x) => x?.logo_url)),
    shop_logo_url: firstTruthy(...shops.map((x) => x?.shop_logo_url)),
  };
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

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
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

function detailsShell(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    overflow: "hidden",
  };
}

function detailsSummary(): React.CSSProperties {
  return {
    listStyle: "none",
    cursor: "pointer",
    padding: "16px 18px",
    fontWeight: 900,
    color: "#0B1F33",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
    whiteSpace: "nowrap",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
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

function secondaryBtn(disabled = false): React.CSSProperties {
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

function mediaBox(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 230,
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };
}

function productImageBox(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 180,
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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

export default function ShopGalleryPage() {
  const params = useParams<{ gmfnId: string }>();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    text: string;
  } | null>(null);
  const [resolvedGmfnId, setResolvedGmfnId] = useState("");
  const [selectedCommunityLabel, setSelectedCommunityLabel] = useState("");
  const [repostingProductId, setRepostingProductId] = useState<number>(0);

  const routeGmfnId = safeStr(params.gmfnId || "");
  const routeMode = safeStr(routeGmfnId).toLowerCase();
  const isSelfRoute = routeMode === "me" || routeMode === "self";
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
    if (!feedback) return;

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!routeMode) {
        if (alive) setResolvedGmfnId("");
        return;
      }

      if (!isSelfRoute) {
        if (alive) setResolvedGmfnId(routeGmfnId);
        return;
      }

      const meRes = await getMe().catch(() => null);
      if (!alive) return;

      setResolvedGmfnId(safeStr(meRes?.gmfn_id || ""));
    })();

    return () => {
      alive = false;
    };
  }, [routeGmfnId, routeMode, isSelfRoute]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        if (!resolvedGmfnId) {
          if (alive) {
            setMe(null);
            setShop(null);
            setProducts([]);
            setSelectedCommunityLabel("");
          }
          return;
        }

        const [meRes, currentClanRes, myClansRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
        ]);

        const myClanRows = rowsOf<any>(myClansRes);

        const selectedClanMatch =
          myClanRows.find(
            (item: any) =>
              Number(item?.id || item?.clan_id || 0) === Number(selectedClanId || 0)
          ) || null;

        const contextLabel = firstTruthy(
          selectedClanMatch?.marketplace_name,
          selectedClanMatch?.name,
          (currentClanRes as any)?.marketplace_name,
          (currentClanRes as any)?.name,
          selectedClanId ? `Community ${selectedClanId}` : ""
        );

        if (alive) {
          setMe(meRes || null);
          setSelectedCommunityLabel(contextLabel);
        }

        const clanIds = dedupeClanIds([
          selectedClanId,
          (currentClanRes as any)?.id,
          (currentClanRes as any)?.clan_id,
          ...myClanRows.map((item: any) => item?.id || item?.clan_id),
        ]);

        const targetGmfn = normalizeGmfn(resolvedGmfnId);
        const candidateRows: ShopCandidate[] = [];

        for (const clanId of [...clanIds, 0]) {
          const scopedClanId = clanId > 0 ? clanId : undefined;

          const byGmfn = await getMarketplaceShopByGmfnId(resolvedGmfnId, {
            clan_id: scopedClanId,
          }).catch(() => null);

          const normalizedByGmfn = normalizeShopRecord(byGmfn);
          if (normalizedByGmfn) {
            candidateRows.push({
              shop: normalizedByGmfn,
              clanId: scopedClanId ?? null,
            });
          }

          const shopList = await getMarketplaceShops({
            clan_id: scopedClanId,
            only_active: true,
            limit: 200,
          }).catch(() => ({ items: [] }));

          const shopRows = rowsOf<any>(shopList);

          for (const rawShopRow of shopRows) {
            const shopRow = normalizeShopRecord(rawShopRow);
            if (!shopRow) continue;

            const rowGmfn = normalizeGmfn(
              shopRow?.gmfn_id || shopRow?.owner_gmfn_id || ""
            );

            if (rowGmfn && rowGmfn === targetGmfn) {
              candidateRows.push({
                shop: shopRow,
                clanId: scopedClanId ?? null,
              });
            }
          }
        }

        const dedupedCandidates = dedupeShopCandidates(candidateRows);
        const mergedShop = mergeShopRecords(dedupedCandidates);

        if (!alive) return;
        setShop(mergedShop);

        const productRows: ShopProduct[] = [];
        const fetchedProductKeys = new Set<string>();

        for (const candidate of dedupedCandidates) {
          const shopId = Number(candidate.shop?.id || 0);
          if (!shopId) continue;

          const key = `${shopId}-${Number(candidate.clanId || 0)}`;
          if (fetchedProductKeys.has(key)) continue;
          fetchedProductKeys.add(key);

          const result = await getMarketplaceProducts({
            clan_id: candidate.clanId ?? undefined,
            shop_id: shopId,
            only_active: true,
            include_reposted: true,
            limit: 200,
          }).catch(() => ({ items: [] }));

          const rows = rowsOf<any>(result);

          for (const rawProduct of rows) {
            const product = normalizeProductRecord(rawProduct);
            if (product) {
              productRows.push(product);
            }
          }
        }

        if (!alive) return;
        setProducts(dedupeProducts(productRows));
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [resolvedGmfnId, selectedClanId]);

  const shopName = firstTruthy(shop?.name, "Shop Gallery");
  const ownerName = firstTruthy(
    shop?.owner_name,
    shop?.owner_display_name,
    shop?.owner_nickname,
    "Seller"
  );
  const ownerGmfnId = firstTruthy(
    shop?.gmfn_id,
    shop?.owner_gmfn_id,
    resolvedGmfnId
  );
  const trustPassportStatus = firstTruthy(shop?.trust_band, "Visible seller");
  const shopDescription = firstTruthy(shop?.description);

  const shopImageCandidates = useMemo(
    () => buildResolvedMediaCandidates(getShopImage(shop)),
    [shop]
  );

  const isOwnShop = useMemo(() => {
    return normalizeGmfn(me?.gmfn_id || "") === normalizeGmfn(ownerGmfnId || "");
  }, [me, ownerGmfnId]);

  const whatsappHref = useMemo(
    () => normalizeWhatsAppHref(firstTruthy(shop?.whatsapp_number)),
    [shop]
  );

  const telegramHref = useMemo(
    () => normalizeTelegramHref(firstTruthy(shop?.telegram_handle)),
    [shop]
  );

  function showFeedback(tone: FeedbackTone, text: string) {
    setFeedback({ tone, text });
  }

  function copyShopLink() {
    const url = getCurrentUrlWithoutHash();
    if (!url) {
      showFeedback("error", "Shop link could not be copied.");
      return;
    }

    safeCopy(url);
    showFeedback("success", "Shop gallery link copied.");
  }

  function copyOwnerIdentity() {
    if (!ownerGmfnId) {
      showFeedback("error", "GMFN ID is not available.");
      return;
    }

    safeCopy(ownerGmfnId);
    showFeedback("success", "GMFN ID copied.");
  }

  async function handleRepostProduct(product: ShopProduct) {
    const productId = Number(product?.id || 0);

    if (!productId) {
      showFeedback("error", "This product is missing a usable ID for repost.");
      return;
    }

    if (!selectedClanId) {
      showFeedback(
        "error",
        "Select a community first in Community Home before reposting."
      );
      return;
    }

    setRepostingProductId(productId);

    try {
      await createMarketplaceRepost({
        product_id: productId,
        target_clan_id: selectedClanId,
      });

      showFeedback(
        "success",
        selectedCommunityLabel
          ? `Product reposted to ${selectedCommunityLabel}.`
          : "Product reposted to your current community context."
      );
    } catch (err: any) {
      showFeedback(
        "error",
        safeStr(err?.message) || "Product could not be reposted right now."
      );
    } finally {
      setRepostingProductId(0);
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
          sectionLabel="Shop Gallery"
          title="Shop Gallery"
          subtitle="Preparing the visible shop gallery..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
          utilityLinks={[
            { label: "Trust", to: "/app/trust" },
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Preparing shop gallery...
          </div>
        </section>
      </div>
    );
  }

  if (!resolvedGmfnId || !shop) {
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
          sectionLabel="Shop Gallery"
          title="Shop Gallery"
          subtitle="View-only shop surface for visible shop identity and visible shop blocks."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
          utilityLinks={[
            { label: "Trust", to: "/app/trust" },
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section
          style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
        >
          <div style={sectionLabel()}>Shop Gallery</div>

          <div
            style={{
              marginTop: 12,
              color: "#0B1F33",
              fontSize: isCompact ? 30 : 40,
              fontWeight: 900,
              lineHeight: 1.05,
              maxWidth: 760,
            }}
          >
            No visible shop gallery was found for this GMFN identity.
          </div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              maxWidth: 860,
            }}
          >
            The gallery appears only when a visible system-level shop is connected
            to the GMFN identity being viewed.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {isSelfRoute ? (
              <Link to="/app/shop-control" style={primaryBtn(false)}>
                Open Shop Control
              </Link>
            ) : null}

            <Link to="/app/marketplace" style={secondaryBtn(false)}>
              Open Marketplace
            </Link>

            <Link to="/app/community" style={secondaryBtn(false)}>
              Community Home
            </Link>
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
        sectionLabel="Shop Gallery"
        title={shopName}
        subtitle="View-only shop gallery for visible shop identity, repost handling, and visible shop blocks."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "Demand Box", to: "/app/demand-box" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {feedback ? <div style={feedbackCard(feedback.tone)}>{feedback.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "280px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div style={mediaBox()}>
              <RotatingImage
                candidates={shopImageCandidates}
                alt={shopName}
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
                    {shopName}
                  </div>
                }
              />
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Shop identity</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: isCompact ? 28 : 36,
                fontWeight: 900,
                lineHeight: 1.08,
              }}
            >
              {shopName}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.75,
              }}
            >
              Owner: {ownerName}
            </div>

            {shopDescription ? (
              <div
                style={{
                  marginTop: 10,
                  ...helperText(),
                  maxWidth: 760,
                }}
              >
                {shopDescription}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>GMFN ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {ownerGmfnId || "Pending"}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Trust signal</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  {trustPassportStatus}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Visible blocks</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 20,
                  }}
                >
                  {products.length}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Repost target</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  {selectedCommunityLabel ||
                    (selectedClanId ? `Community ${selectedClanId}` : "Not selected")}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={copyShopLink}
                style={primaryBtn(false)}
              >
                Share Shop Link
              </button>

              <button
                type="button"
                onClick={copyOwnerIdentity}
                style={secondaryBtn(false)}
              >
                Copy GMFN ID
              </button>

              {isOwnShop ? (
                <Link to="/app/shop-control" style={secondaryBtn(false)}>
                  Shop Control
                </Link>
              ) : null}

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  style={secondaryBtn(false)}
                >
                  WhatsApp
                </a>
              ) : null}

              {telegramHref ? (
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noreferrer"
                  style={secondaryBtn(false)}
                >
                  Telegram
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Repost handler</div>

        <div
          style={{
            marginTop: 10,
            ...helperText(),
            maxWidth: 860,
          }}
        >
          This page is view-only. Repost sends a visible shop block into your current selected community context without changing the original owner identity of the shop.
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
            Current target:{" "}
            {selectedCommunityLabel ||
              (selectedClanId ? `Community ${selectedClanId}` : "Not selected")}
          </span>
          <span style={badge(false)}>
            {isOwnShop ? "You are viewing your own shop" : "You are viewing another member’s shop"}
          </span>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/community" style={secondaryBtn(false)}>
            Community Home
          </Link>
          <Link to="/app/marketplace" style={secondaryBtn(false)}>
            Marketplace
          </Link>
          {!selectedClanId ? (
            <Link to="/app/community" style={primaryBtn(false)}>
              Select Community First
            </Link>
          ) : null}
        </div>
      </section>

      <section style={detailsShell()}>
        <details open>
          <summary style={detailsSummary()}>
            <span>Visible shop blocks</span>
            <span style={{ color: "#64748B", fontSize: 13 }}>
              {products.length} block{products.length === 1 ? "" : "s"}
            </span>
          </summary>

          <div style={{ padding: "0 18px 18px" }}>
            {products.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No visible shop block is available in this gallery right now.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                {products.map((product, index) => {
                  const imageCandidates = buildResolvedMediaCandidates(
                    firstTruthy(product?.image_url)
                  );
                  const productId = Number(product?.id || 0);
                  const reposting = repostingProductId === productId;

                  return (
                    <div key={`${product.id || index}`} style={innerCard("#FCFEFF")}>
                      <div style={productImageBox()}>
                        <RotatingImage
                          candidates={imageCandidates}
                          alt={firstTruthy(product?.name, "Product")}
                          style={{
                            width: "100%",
                            height: "100%",
                            minHeight: 180,
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
                                lineHeight: 1.5,
                              }}
                            >
                              {firstTruthy(product?.name, "Product")}
                            </div>
                          }
                        />
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          color: "#0B1F33",
                          fontSize: 18,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {firstTruthy(product?.name, "Product")}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          ...helperText(),
                        }}
                      >
                        {firstTruthy(
                          product?.description,
                          "No additional description is visible yet."
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
                        <span style={badge(true)}>{displayPrice(product)}</span>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void handleRepostProduct(product)}
                          disabled={!productId || !selectedClanId || reposting}
                          style={secondaryBtn(!productId || !selectedClanId || reposting)}
                        >
                          {reposting
                            ? "Reposting..."
                            : selectedCommunityLabel
                            ? `Repost to ${selectedCommunityLabel}`
                            : "Repost"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}