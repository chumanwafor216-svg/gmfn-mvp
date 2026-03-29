import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
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
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function resolveMediaSrc(src: string): string {
  const raw = safeStr(src);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${apiOrigin()}${raw}`;
  }

  return `${apiOrigin()}/${raw.replace(/^\/+/, "")}`;
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

function getCurrentUrlWithoutHash(): string {
  try {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  } catch {
    return "";
  }
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
    id: Number(shops.find((x) => Number(x?.id || 0) > 0)?.id || 0) || undefined,
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

export default function ShopGalleryPage() {
  const params = useParams<{ gmfnId: string }>();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");
  const [resolvedGmfnId, setResolvedGmfnId] = useState("");

  const routeGmfnId = safeStr(params.gmfnId || "");
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
    const timer =
      copyMessage &&
      window.setTimeout(() => {
        setCopyMessage("");
      }, 2400);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [copyMessage]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const normalized = safeStr(routeGmfnId).toLowerCase();

      if (!normalized) {
        if (alive) setResolvedGmfnId("");
        return;
      }

      if (normalized !== "me" && normalized !== "self") {
        if (alive) setResolvedGmfnId(routeGmfnId);
        return;
      }

      const me = await getMe().catch(() => null);
      if (!alive) return;

      setResolvedGmfnId(safeStr(me?.gmfn_id || ""));
    })();

    return () => {
      alive = false;
    };
  }, [routeGmfnId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        if (!resolvedGmfnId) {
          if (alive) {
            setShop(null);
            setProducts([]);
          }
          return;
        }

        const [currentClanRes, myClansRes] = await Promise.all([
          getCurrentClan().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
        ]);

        const myClanRows = Array.isArray(myClansRes)
          ? myClansRes
          : Array.isArray((myClansRes as any)?.items)
          ? (myClansRes as any).items
          : [];

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

          const shopRows = Array.isArray(shopList)
            ? shopList
            : Array.isArray((shopList as any)?.items)
            ? (shopList as any).items
            : [];

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

          const rows = Array.isArray(result)
            ? result
            : Array.isArray((result as any)?.items)
            ? (result as any).items
            : [];

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
  const shopImage = resolveMediaSrc(getShopImage(shop));
  const shopDescription = firstTruthy(shop?.description);

  function copyShopLink() {
    const url = getCurrentUrlWithoutHash();
    if (!url) {
      setCopyMessage("Shop link could not be copied.");
      return;
    }

    safeCopy(url);
    setCopyMessage("Shop gallery link copied.");
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
        <section
          style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
        >
          <div style={sectionLabel()}>Shop Gallery</div>
          <div
            style={{
              marginTop: 12,
              color: "#0B1F33",
              fontSize: 34,
              fontWeight: 900,
              lineHeight: 1.1,
            }}
          >
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
        <section
          style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
        >
          <div style={sectionLabel()}>Shop Gallery</div>

          <div
            style={{
              marginTop: 12,
              color: "#0B1F33",
              fontSize: 34,
              fontWeight: 900,
              lineHeight: 1.1,
              maxWidth: 760,
            }}
          >
            No visible shop gallery was found for this GMFN identity.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: 15,
              lineHeight: 1.8,
              maxWidth: 860,
            }}
          >
            The gallery will only show when a shop connected to this GMFN
            identity is visible from the system level.
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
      {copyMessage ? (
        <div
          style={{
            ...pageCard("#F3FBF5"),
            color: "#166534",
            border: "1px solid rgba(34,197,94,0.16)",
            fontWeight: 800,
            padding: 14,
          }}
        >
          {copyMessage}
        </div>
      ) : null}

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
          }}
        >
          {shopName}
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#5F7287",
            fontSize: 14,
            lineHeight: 1.75,
            maxWidth: 780,
          }}
        >
          View-only shop gallery for members and linked external viewers.
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "260px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div style={mediaBox()}>
              {shopImage ? (
                <img
                  src={shopImage}
                  alt={shopName}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 230,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
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
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Shop identity</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: isCompact ? 28 : 34,
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
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.8,
                  maxWidth: 760,
                }}
              >
                {shopDescription}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {ownerGmfnId || "Pending"}</span>
              <span style={badge(false)}>
                Trust Passport: {trustPassportStatus}
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
              <button
                type="button"
                onClick={copyShopLink}
                style={primaryBtn(false)}
              >
                Share Shop Link
              </button>
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
            <div style={sectionLabel()}>Visible selling blocks</div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
                maxWidth: 860,
              }}
            >
              These are the visible shop blocks for this gallery surface.
            </div>
          </div>

          <span style={badge(false)}>{products.length} visible blocks</span>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {products.length === 0 ? (
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              No visible selling block is available in this shop right now.
            </div>
          ) : (
            products.map((product, index) => {
              const imageSrc = resolveMediaSrc(firstTruthy(product?.image_url));

              return (
                <div
                  key={`${product.id || index}`}
                  style={innerCard("#FCFEFF")}
                >
                  <div style={productImageBox()}>
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={firstTruthy(product?.name, "Product")}
                        style={{
                          width: "100%",
                          height: "100%",
                          minHeight: 180,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
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
                    )}
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
                      color: "#5F7287",
                      fontSize: 14,
                      lineHeight: 1.75,
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
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}