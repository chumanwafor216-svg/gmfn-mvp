import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  getCurrentClan,
  getMarketplaceBroadcasts,
  getMarketplaceProducts,
  getMarketplaceShopByGmfnId,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

type ShopProfile = {
  id?: number;
  gmfnId: string;
  shopName: string;
  ownerName: string;
  description: string;
  communityName: string;
  trustBand: string;
  trustScore: string;
  imageUrl: string;
  whatsapp: string;
  telegram: string;
};

type ShopProduct = {
  id?: number;
  slotNumber: number;
  name: string;
  description: string;
  priceText: string;
  currency: string;
  imageUrl: string;
};

type ShopBroadcast = {
  id?: number;
  imageUrl: string;
  message: string;
  sourceShopName: string;
  sourceClanName: string;
  trustBand: string;
  trustScore: string;
  authorName: string;
  authorGmfnId: string;
};

type NoticeTone = "success" | "error";

const GALLERY_SLOTS_TOTAL = 12;
const PLACEHOLDER_TEXTS = new Set([
  "string",
  "null",
  "undefined",
  "n/a",
  "na",
]);

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function cleanText(x: any): string {
  const text = safeStr(x);
  if (!text) return "";
  if (PLACEHOLDER_TEXTS.has(text.toLowerCase())) return "";
  return text;
}

function firstMeaningful(...values: any[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
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

function initialsOf(value: string): string {
  const parts = safeStr(value).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function moneyText(value: any, currency: any): string {
  const amount = cleanText(value);
  const unit = cleanText(currency || "NGN") || "NGN";

  if (!amount) return "Price on request";
  return `${amount} ${unit}`.trim();
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
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function resolveImageSrc(raw: any): string {
  const value = safeStr(raw);
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${apiOrigin()}${value}`;
  }

  return `${apiOrigin()}/${value.replace(/^\/+/, "")}`;
}

function normalizeShop(
  raw: any,
  fallbackGmfnId: string,
  currentClan: any
): ShopProfile | null {
  if (!raw) return null;

  const src =
    rowsOf<any>(raw)[0] ||
    raw?.item ||
    raw?.shop ||
    raw?.data ||
    raw;

  const ownerGmfnId = firstMeaningful(
    src?.owner_gmfn_id,
    src?.gmfn_id,
    src?.member_gmfn_id,
    fallbackGmfnId
  );

  const ownerName = firstMeaningful(
    src?.owner_display_name,
    src?.owner_name,
    src?.display_name,
    src?.member_name,
    src?.name,
    src?.user_name,
    ownerGmfnId,
    "Shop owner"
  );

  const shopName = firstMeaningful(
    src?.name,
    src?.shop_name,
    src?.display_name,
    src?.title,
    src?.business_name
  );

  const description = firstMeaningful(
    src?.description,
    src?.bio,
    src?.shop_description,
    src?.detail
  );

  const communityName = firstMeaningful(
    src?.marketplace_name,
    src?.clan_name,
    src?.community_name,
    currentClan?.marketplace_name,
    currentClan?.name,
    currentClan?.display_name
  );

  const imageUrl = resolveImageSrc(
    src?.image_url ||
      src?.profile_image_url ||
      src?.shop_image_url ||
      src?.cover_image_url ||
      src?.banner_url
  );

  return {
    id: positiveNumber(src?.id) || undefined,
    gmfnId: ownerGmfnId,
    ownerName: ownerName || "Shop owner",
    shopName: shopName || (ownerGmfnId ? `${ownerGmfnId} Shop` : "Shop"),
    description,
    communityName,
    trustBand: firstMeaningful(src?.trust_band, src?.owner_trust_band),
    trustScore: firstMeaningful(src?.trust_score, src?.owner_trust_score),
    imageUrl,
    whatsapp: firstMeaningful(
      src?.whatsapp_number,
      src?.whatsapp,
      src?.phone_whatsapp
    ),
    telegram: firstMeaningful(
      src?.telegram_handle,
      src?.telegram,
      src?.telegram_username
    ),
  };
}

function normalizeBroadcast(raw: any): ShopBroadcast | null {
  if (!raw) return null;

  const src = raw?.item || raw?.broadcast || raw?.data || raw;

  return {
    id: positiveNumber(src?.id) || undefined,
    imageUrl: resolveImageSrc(src?.image_url),
    message: firstMeaningful(src?.message),
    sourceShopName: firstMeaningful(src?.source_shop_name),
    sourceClanName: firstMeaningful(src?.source_clan_name),
    trustBand: firstMeaningful(src?.trust_band),
    trustScore: firstMeaningful(src?.trust_score),
    authorName: firstMeaningful(src?.author_name),
    authorGmfnId: firstMeaningful(src?.author_gmfn_id),
  };
}

function normalizeProduct(raw: any, slotNumber: number): ShopProduct | null {
  if (!raw) return null;

  const src = raw?.item || raw?.product || raw?.data || raw;

  const name = firstMeaningful(
    src?.name,
    src?.title,
    src?.product_name,
    `Product ${slotNumber.toString().padStart(2, "0")}`
  );

  const description = firstMeaningful(
    src?.description,
    src?.detail,
    src?.summary
  );

  const imageUrl = resolveImageSrc(
    src?.image_url ||
      src?.thumbnail_url ||
      src?.photo_url ||
      src?.cover_image_url
  );

  return {
    id: positiveNumber(src?.id) || undefined,
    slotNumber,
    name,
    description,
    priceText: moneyText(
      src?.price,
      src?.currency || src?.currency_code || "NGN"
    ),
    currency: firstMeaningful(src?.currency, src?.currency_code, "NGN") || "NGN",
    imageUrl,
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 28,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 18px 44px rgba(15,23,42,0.05), 0 3px 10px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
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
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
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
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "9px 12px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    whiteSpace: "nowrap",
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...innerCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    color: tone === "success" ? "#166534" : "#991B1B",
    fontWeight: 800,
    padding: 14,
  };
}

export default function ShopGalleryPage() {
  const { gmfnId } = useParams();
  const location = useLocation();
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [broadcast, setBroadcast] = useState<ShopBroadcast | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );
  const [error, setError] = useState<string>("");

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

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const cleanedGmfnId = safeStr(gmfnId || "");
        const clanRes = await getCurrentClan().catch(() => null);

        let shopRes: any = null;

        if (cleanedGmfnId) {
          shopRes = await getMarketplaceShopByGmfnId(cleanedGmfnId, {
            clan_id: selectedClanId || undefined,
            header_clan_id: selectedClanId || undefined,
          }).catch(() => null);

          if (!shopRes) {
            shopRes = await getMarketplaceShopByGmfnId(cleanedGmfnId).catch(
              () => null
            );
          }
        }

        const normalizedShop = normalizeShop(shopRes, cleanedGmfnId, clanRes);

        let productRes: any = null;

        if (normalizedShop?.id) {
          productRes = await getMarketplaceProducts({
            shop_id: normalizedShop.id,
            clan_id: selectedClanId || undefined,
            header_clan_id: selectedClanId || undefined,
            only_active: true,
            include_reposted: true,
            limit: 100,
          }).catch(() => null);

          if (!productRes) {
            productRes = await getMarketplaceProducts({
              shop_id: normalizedShop.id,
              only_active: true,
              include_reposted: true,
              limit: 100,
            }).catch(() => null);
          }
        }

        const normalizedProducts = rowsOf<any>(productRes)
          .map((row, index) => normalizeProduct(row, index + 1))
          .filter(Boolean) as ShopProduct[];

        const relevantGmfnId = firstMeaningful(
          normalizedShop?.gmfnId,
          cleanedGmfnId
        );

        let broadcastRes: any = null;

        if (selectedClanId > 0) {
          broadcastRes = await getMarketplaceBroadcasts({
            clan_id: selectedClanId,
            active_only: true,
            limit: 24,
          }).catch(() => null);
        }

        if (!broadcastRes) {
          broadcastRes = await getMarketplaceBroadcasts({
            active_only: true,
            limit: 24,
          }).catch(() => null);
        }

        const relevantBroadcast =
          rowsOf<any>(broadcastRes)
            .map((row) => normalizeBroadcast(row))
            .filter(Boolean)
            .find((row) => {
              const authorGmfnId = safeStr(row?.authorGmfnId);
              return Boolean(
                relevantGmfnId &&
                  authorGmfnId &&
                  authorGmfnId.toUpperCase() === relevantGmfnId.toUpperCase()
              );
            }) || null;

        if (!alive) return;

        setCurrentClan(clanRes || null);
        setShop(normalizedShop);
        setProducts(normalizedProducts);
        setBroadcast(relevantBroadcast);
      } catch (err: any) {
        if (!alive) return;
        setError(
          safeStr(err?.message) || "Shop gallery could not be loaded right now."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [gmfnId, selectedClanId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!location.hash) return;
    if (products.length === 0) return;

    const id = location.hash.replace(/^#/, "");
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [location.hash, products.length]);

  const effectiveShop = useMemo<ShopProfile | null>(() => {
    if (!shop && !broadcast) return null;

    const effectiveGmfnId = firstMeaningful(
      shop?.gmfnId,
      broadcast?.authorGmfnId,
      gmfnId
    );

    const effectiveOwnerName = firstMeaningful(
      shop?.ownerName,
      broadcast?.authorName,
      effectiveGmfnId,
      "Shop owner"
    );

    const effectiveShopName = firstMeaningful(
      shop?.shopName,
      broadcast?.sourceShopName,
      effectiveOwnerName,
      effectiveGmfnId ? `${effectiveGmfnId} Shop` : "",
      "Shop"
    );

    const effectiveDescription = firstMeaningful(
      shop?.description,
      broadcast?.message
    );

    const effectiveCommunityName = firstMeaningful(
      shop?.communityName,
      broadcast?.sourceClanName,
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name
    );

    return {
      id: shop?.id,
      gmfnId: effectiveGmfnId,
      shopName: effectiveShopName,
      ownerName: effectiveOwnerName,
      description: effectiveDescription,
      communityName: effectiveCommunityName,
      trustBand: firstMeaningful(shop?.trustBand, broadcast?.trustBand),
      trustScore: firstMeaningful(shop?.trustScore, broadcast?.trustScore),
      imageUrl: firstMeaningful(broadcast?.imageUrl, shop?.imageUrl),
      whatsapp: firstMeaningful(shop?.whatsapp),
      telegram: firstMeaningful(shop?.telegram),
    };
  }, [shop, broadcast, gmfnId, currentClan]);

  const visibleProducts = useMemo(() => products.slice(0, GALLERY_SLOTS_TOTAL), [products]);

  const productSlots = useMemo(() => {
    return Array.from({ length: GALLERY_SLOTS_TOTAL }, (_, index) => {
      return visibleProducts[index] || null;
    });
  }, [visibleProducts]);

  const heroImage = useMemo(() => {
    return (
      effectiveShop?.imageUrl ||
      visibleProducts.find((item) => safeStr(item.imageUrl))?.imageUrl ||
      ""
    );
  }, [effectiveShop, visibleProducts]);

  const absoluteShopLink = useMemo(() => {
    if (typeof window === "undefined") return location.pathname;
    return `${window.location.origin}${location.pathname}`;
  }, [location.pathname]);

  async function shareOrCopy(params: {
    title: string;
    text: string;
    url: string;
    successText: string;
  }) {
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({
          title: params.title,
          text: params.text,
          url: params.url,
        });
        setNotice({ tone: "success", text: params.successText });
        return;
      }

      safeCopy(`${params.title}\n${params.text}\n${params.url}`);
      setNotice({ tone: "success", text: params.successText });
    } catch {
      setNotice({
        tone: "error",
        text: "The share action did not complete.",
      });
    }
  }

  function copyShopLink() {
    safeCopy(absoluteShopLink);
    setNotice({ tone: "success", text: "Shop link copied." });
  }

  function repostShop() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "Shop"
    );

    const shopText = firstMeaningful(
      effectiveShop?.description,
      effectiveShop?.communityName
        ? `${effectiveShop?.communityName} shop`
        : "",
      "Visit this trusted shop surface."
    );

    void shareOrCopy({
      title: shopTitle,
      text: shopText,
      url: absoluteShopLink,
      successText: "Shop repost handle opened.",
    });
  }

  function repostProduct(product: ShopProduct) {
    const hash = product.id ? `#product-${product.id}` : "";
    const productUrl =
      typeof window === "undefined"
        ? `${location.pathname}${hash}`
        : `${window.location.origin}${location.pathname}${hash}`;

    void shareOrCopy({
      title: product.name,
      text: `${product.description || "Shop product"} • ${product.priceText}`,
      url: productUrl,
      successText: "Product repost handle opened.",
    });
  }

  return (
    <div
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        paddingBottom: 36,
        display: "grid",
        gap: 18,
      }}
    >
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}
      {error ? <div style={noticeCard("error")}>{error}</div> : null}

      <section
        style={pageCard(
          heroImage
            ? "linear-gradient(180deg, rgba(15,59,116,0.08) 0%, rgba(255,255,255,0.98) 100%)"
            : "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"
        )}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid rgba(11,31,51,0.08)",
            background:
              "linear-gradient(135deg, #12304D 0%, #0B63D1 55%, #2563EB 100%)",
            minHeight: isCompact ? 300 : 360,
          }}
        >
          {heroImage ? (
            <img
              src={heroImage}
              alt={safeStr(effectiveShop?.shopName || "Shop")}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(7,26,46,0.12) 0%, rgba(7,26,46,0.24) 25%, rgba(7,26,46,0.76) 100%)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              padding: isCompact ? 18 : 24,
              minHeight: isCompact ? 300 : 360,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
              gap: 18,
              alignItems: "end",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    ...badge(true),
                    background: "rgba(255,255,255,0.16)",
                    color: "#FFFFFF",
                  }}
                >
                  Visitor shop surface
                </span>

                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
                >
                  Clean outside view
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: isCompact ? 30 : 44,
                  lineHeight: 1.05,
                  maxWidth: 900,
                  textShadow: "0 6px 18px rgba(0,0,0,0.22)",
                }}
              >
                {safeStr(effectiveShop?.shopName || "Shop")}
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "rgba(255,255,255,0.90)",
                  fontSize: 15,
                  lineHeight: 1.8,
                  maxWidth: 860,
                }}
              >
                {safeStr(
                  effectiveShop?.description ||
                    "A premium visitor surface for trusted products. Internal management controls stay out of this page."
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
                {safeStr(effectiveShop?.ownerName) ? (
                  <span
                    style={{
                      ...badge(true),
                      background: "rgba(255,255,255,0.16)",
                      color: "#FFFFFF",
                    }}
                  >
                    Owner: {safeStr(effectiveShop?.ownerName)}
                  </span>
                ) : null}

                {safeStr(effectiveShop?.gmfnId) ? (
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                    }}
                  >
                    GMFN ID: {safeStr(effectiveShop?.gmfnId)}
                  </span>
                ) : null}

                {safeStr(effectiveShop?.communityName) ? (
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                    }}
                  >
                    {safeStr(effectiveShop?.communityName)}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                ...innerCard("rgba(255,255,255,0.95)"),
                border: "1px solid rgba(255,255,255,0.28)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 18px 38px rgba(11,31,51,0.16)",
                padding: 18,
              }}
            >
              <div style={sectionLabel()}>Shop signpost</div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "72px minmax(0, 1fr)",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    border: "1px solid rgba(11,31,51,0.10)",
                    background:
                      "linear-gradient(180deg, #F8FBFF 0%, #E7F0FF 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0B63D1",
                    fontWeight: 900,
                    fontSize: 24,
                  }}
                >
                  {initialsOf(
                    safeStr(
                      effectiveShop?.shopName ||
                        effectiveShop?.ownerName ||
                        "Shop"
                    )
                  )}
                </div>

                <div>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 19,
                      lineHeight: 1.25,
                    }}
                  >
                    {safeStr(effectiveShop?.shopName || "Shop")}
                  </div>

                  <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                    Share this shop outside the community with a clean shop link and repost handle.
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {safeStr(effectiveShop?.gmfnId) ? (
                  <span style={badge(true)}>
                    GMFN ID: {safeStr(effectiveShop?.gmfnId)}
                  </span>
                ) : null}

                <span style={badge(false)}>
                  Trust:{" "}
                  {safeStr(effectiveShop?.trustBand || "Trust pending")}
                  {safeStr(effectiveShop?.trustScore)
                    ? ` • ${safeStr(effectiveShop?.trustScore)}`
                    : ""}
                </span>

                {safeStr(effectiveShop?.communityName) ? (
                  <span style={badge(false)}>
                    {safeStr(effectiveShop?.communityName)}
                  </span>
                ) : null}

                {safeStr(effectiveShop?.whatsapp) ? (
                  <span style={badge(false)}>
                    WhatsApp: {safeStr(effectiveShop?.whatsapp)}
                  </span>
                ) : null}

                {safeStr(effectiveShop?.telegram) ? (
                  <span style={badge(false)}>
                    Telegram: {safeStr(effectiveShop?.telegram)}
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button type="button" onClick={repostShop} style={primaryBtn(false)}>
                  Repost shop
                </button>

                <button type="button" onClick={copyShopLink} style={secondaryBtn(false)}>
                  Copy shop link
                </button>
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
            <div style={sectionLabel()}>Visible products</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Twelve product frames stay complete here. This is a visitor-facing gallery, so management controls remain outside this surface.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>
              {visibleProducts.length} live / {GALLERY_SLOTS_TOTAL} frames
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 18, color: "#64748B", lineHeight: 1.8 }}>
            Loading shop gallery...
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            {productSlots.map((product, index) => {
              const slotNumber = String(index + 1).padStart(2, "0");

              if (!product) {
                return (
                  <div
                    key={`empty-slot-${slotNumber}`}
                    style={{
                      ...innerCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
                      padding: 0,
                      overflow: "hidden",
                      border: "1px solid rgba(11,99,209,0.10)",
                      minHeight: 430,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        height: 360,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "linear-gradient(180deg, #EEF5FF 0%, #F8FBFF 100%)",
                        borderBottom: "1px solid rgba(11,31,51,0.08)",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          ...badge(true),
                        }}
                      >
                        Slot {slotNumber}
                      </span>

                      <div
                        style={{
                          color: "#64748B",
                          fontSize: 14,
                          fontWeight: 800,
                          textAlign: "center",
                          maxWidth: 220,
                          lineHeight: 1.75,
                          padding: 20,
                        }}
                      >
                        More products soon
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 10,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          fontSize: 16,
                          lineHeight: 1.3,
                        }}
                      >
                        Reserved display slot
                      </div>

                      <div style={{ ...helperText(), fontSize: 13 }}>
                        The 12-frame gallery stays complete even when fewer live products are visible.
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span style={badge(false)}>Visitor frame</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`shop-product-${product.id || slotNumber}`}
                  id={product.id ? `product-${product.id}` : undefined}
                  style={{
                    ...innerCard("#FFFFFF"),
                    padding: 0,
                    overflow: "hidden",
                    border: "1px solid rgba(11,31,51,0.08)",
                    boxShadow:
                      "0 18px 40px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.02)",
                    minHeight: 430,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      height: 360,
                      background:
                        "linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)",
                      borderBottom: "1px solid rgba(11,31,51,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    {safeStr(product.imageUrl) ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#64748B",
                          fontSize: 14,
                          fontWeight: 800,
                          textAlign: "center",
                          padding: 16,
                        }}
                      >
                        Product image pending
                      </div>
                    )}

                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          ...badge(true),
                          background: "rgba(255,255,255,0.86)",
                          color: "#0B63D1",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        Slot {slotNumber}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 10,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 17,
                        lineHeight: 1.28,
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                      }}
                    >
                      {product.name}
                    </div>

                    <div
                      style={{
                        color: "#4D657D",
                        fontSize: 12,
                        lineHeight: 1.5,
                        minHeight: 18,
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                      }}
                    >
                      {safeStr(
                        product.description || "No product description is available yet."
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>{product.priceText}</span>

                      <button
                        type="button"
                        onClick={() => repostProduct(product)}
                        style={secondaryBtn(false)}
                      >
                        Repost
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}