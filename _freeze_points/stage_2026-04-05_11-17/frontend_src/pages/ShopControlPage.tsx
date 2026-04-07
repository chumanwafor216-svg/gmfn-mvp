import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createMarketplaceFeed,
  createMarketplaceProduct,
  createMarketplaceShop,
  deleteMarketplaceBroadcast,
  getMarketplaceBroadcasts,
  getMarketplaceProducts,
  getMarketplaceShops,
  getMe,
  getSelectedClanId,
  listMyClans,
  selectClan,
  uploadMarketplaceImageFile,
} from "../lib/api";

type ClanItem = {
  id?: number;
  clan_id?: number;
  name?: string;
  marketplace_name?: string | null;
  description?: string | null;
};

type ShopItem = {
  id?: number;
  name?: string;
  description?: string | null;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  owner_display_name?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
};

type BroadcastItem = {
  id?: number;
  message?: string | null;
  image_url?: string | null;
  author_gmfn_id?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  source_clan_name?: string | null;
};

type ProductItem = {
  id?: number;
  name?: string | null;
  description?: string | null;
  price?: string | number | null;
  currency?: string | null;
  display_price?: string | null;
  image_url?: string | null;
};

type NextShopStep = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaKind: "community" | "shop" | "product" | "spotlight" | "maintain";
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 22px 54px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.03)",
    overflow: "hidden",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
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

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    minHeight: 42,
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.85 : 1,
    whiteSpace: "nowrap",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    outline: "none",
    boxSizing: "border-box",
    fontSize: 14,
    background: "#FFFFFF",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    outline: "none",
    boxSizing: "border-box",
    fontSize: 14,
    background: "#FFFFFF",
    resize: "vertical" as const,
    minHeight: 110,
  };
}

function tiny(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
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

function resolveMediaUrl(value?: string | null): string {
  const raw = String(value || "").trim();
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

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseRows(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

function normalizeProductItem(raw: any): ProductItem | null {
  if (!raw) return null;

  const src = raw?.product || raw?.item || raw;

  return {
    id: positiveNumber(src?.id || src?.product_id) || undefined,
    name: firstTruthy(src?.name, src?.title, src?.product_name),
    description: firstTruthy(
      src?.description,
      src?.product_description,
      src?.details,
      src?.summary
    ),
    price:
      src?.price ??
      src?.amount ??
      src?.unit_price ??
      src?.selling_price ??
      null,
    currency: firstTruthy(src?.currency, src?.currency_code),
    display_price: firstTruthy(src?.display_price, src?.formatted_price),
    image_url: firstTruthy(
      src?.image_url,
      src?.photo_url,
      src?.thumbnail_url,
      src?.cover_image_url,
      src?.banner_url,
      src?.image
    ),
  };
}

function displayPrice(product: ProductItem): string {
  const display = safeStr(product?.display_price);
  if (display) return display;

  const value = safeStr(product?.price);
  const currency = safeStr(product?.currency);

  if (!value && !currency) return "Price pending";
  if (value && currency) return `${value} ${currency}`;
  return value || currency || "Price pending";
}

function buildNextShopStep(params: {
  selectedCommunityId: number | null;
  shopReady: boolean;
  productCount: number;
  spotlightLive: boolean;
}): NextShopStep {
  if (!params.selectedCommunityId) {
    return {
      title: "Choose a community context first",
      detail:
        "Your shop remains global, but this private page still needs a selected community context for controlled publication work.",
      today: "Choose the community context you want to work in.",
      tomorrow:
        "A selected context keeps your publication work clean and properly placed.",
      ctaKind: "community",
    };
  }

  if (!params.shopReady) {
    return {
      title: "Save your shop identity first",
      detail:
        "Your global shop must exist before products and spotlight can be published properly.",
      today: "Complete the shop identity fields and save the shop.",
      tomorrow:
        "A complete shop identity makes product publication and visibility more trustworthy.",
      ctaKind: "shop",
    };
  }

  if (params.productCount === 0) {
    return {
      title: "Publish your first visible product",
      detail:
        "Your shop exists, but there is no visible selling block yet for the public gallery.",
      today: "Add one product with image, price, and clear description.",
      tomorrow:
        "A visible product makes the shop surface useful and credible.",
      ctaKind: "product",
    };
  }

  if (!params.spotlightLive) {
    return {
      title: "Publish a spotlight when ready",
      detail:
        "You already have a shop and products. Spotlight is the next optional visibility step for Dashboard display.",
      today: "Prepare a calm spotlight and publish it only when ready.",
      tomorrow:
        "A clean spotlight can improve visibility without confusing the shop surface.",
      ctaKind: "spotlight",
    };
  }

  return {
    title: "Maintain the shop calmly",
    detail:
      "Your shop, products, and spotlight are already in place. Keep them current and clean.",
    today: "Review your shop details and keep the live surfaces accurate.",
    tomorrow:
      "Consistent maintenance protects the quality of the public-facing experience.",
    ctaKind: "maintain",
  };
}

export default function ShopControlPage() {
  const [me, setMe] = useState<any>(null);
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(
    null
  );

  const [loadingBoot, setLoadingBoot] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [switchingClanId, setSwitchingClanId] = useState<number | null>(null);

  const [shops, setShops] = useState<ShopItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [myProducts, setMyProducts] = useState<ProductItem[]>([]);

  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [shopWhatsapp, setShopWhatsapp] = useState("");
  const [shopTelegram, setShopTelegram] = useState("");
  const [savingShop, setSavingShop] = useState(false);

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCurrency, setProductCurrency] = useState("NGN");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  const [spotlightMessage, setSpotlightMessage] = useState("");
  const [spotlightImageUrl, setSpotlightImageUrl] = useState("");
  const [spotlightHours, setSpotlightHours] = useState("24");
  const [uploadingSpotlightImage, setUploadingSpotlightImage] = useState(false);
  const [savingSpotlight, setSavingSpotlight] = useState(false);
  const [deletingSpotlight, setDeletingSpotlight] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingBoot(true);
      try {
        const [meRes, clansRes] = await Promise.all([
          getMe().catch(() => null),
          listMyClans().catch(() => []),
        ]);

        setMe(meRes);

        const items = parseRows(clansRes) as ClanItem[];
        setClans(items);

        const storedSelected = Number(getSelectedClanId() || 0);

        if (
          storedSelected > 0 &&
          items.some((c: any) => Number(c?.id || c?.clan_id || 0) === storedSelected)
        ) {
          setSelectedCommunityId(storedSelected);

          try {
            await selectClan(storedSelected);
          } catch {
            // ignore sync error
          }
        } else if (items.length > 0) {
          const firstId = Number(items[0]?.id || items[0]?.clan_id || 0);

          if (firstId > 0) {
            setSelectedCommunityId(firstId);

            try {
              await selectClan(firstId);
            } catch {
              // ignore sync error
            }
          }
        }
      } finally {
        setLoadingBoot(false);
      }
    })();
  }, []);

  async function refreshShops(clanId?: number | null) {
    const effectiveClanId = Number(clanId || selectedCommunityId || 0);

    if (!effectiveClanId) {
      setShops([]);
      return;
    }

    setLoadingShops(true);
    try {
      const res = await getMarketplaceShops({
        clan_id: effectiveClanId,
      }).catch(() => ({ items: [] }));

      setShops(parseRows(res) as ShopItem[]);
    } finally {
      setLoadingShops(false);
    }
  }

  async function refreshBroadcasts(clanId?: number | null) {
    const effectiveClanId = Number(clanId || selectedCommunityId || 0);

    if (!effectiveClanId) {
      setBroadcasts([]);
      return;
    }

    setLoadingBroadcasts(true);
    try {
      const res = await getMarketplaceBroadcasts({
        clan_id: effectiveClanId,
        active_only: true,
        limit: 100,
      }).catch(() => ({ items: [] }));

      setBroadcasts(parseRows(res) as BroadcastItem[]);
    } finally {
      setLoadingBroadcasts(false);
    }
  }

  useEffect(() => {
    if (!selectedCommunityId) {
      setShops([]);
      setBroadcasts([]);
      return;
    }

    void refreshShops(selectedCommunityId);
    void refreshBroadcasts(selectedCommunityId);
  }, [selectedCommunityId]);

  const selectedClan = useMemo(() => {
    return (
      clans.find(
        (c) => Number(c.id || c.clan_id || 0) === Number(selectedCommunityId || 0)
      ) || null
    );
  }, [clans, selectedCommunityId]);

  const myShop = useMemo(() => {
    if (!shops.length) return null;

    const myGmfnId = safeStr(me?.gmfn_id || "");
    if (!myGmfnId) return shops[0] || null;

    return (
      shops.find((shop) => {
        const shopOwnerId = safeStr(shop?.gmfn_id || shop?.owner_gmfn_id || "");
        return shopOwnerId === myGmfnId;
      }) || null
    );
  }, [shops, me]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!selectedCommunityId || !myShop?.id) {
        setMyProducts([]);
        return;
      }

      setLoadingProducts(true);
      try {
        const res = await getMarketplaceProducts({
          clan_id: selectedCommunityId,
          shop_id: Number(myShop.id),
          only_active: true,
          include_reposted: true,
          limit: 100,
        }).catch(() => ({ items: [] }));

        if (!alive) return;

        const rows = parseRows(res)
          .map((row: any) => normalizeProductItem(row))
          .filter(Boolean) as ProductItem[];

        setMyProducts(rows);
      } finally {
        if (alive) setLoadingProducts(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedCommunityId, myShop?.id]);

  const activeMySpotlight = useMemo(() => {
    const myGmfnId = safeStr(me?.gmfn_id || "");
    if (!myGmfnId) return null;

    return (
      broadcasts.find((b) => safeStr(b?.author_gmfn_id || "") === myGmfnId) || null
    );
  }, [broadcasts, me]);

  const myShopReady = Boolean(myShop?.id);
  const myProductCount = myProducts.length;
  const myShopLink = safeStr(me?.gmfn_id || "")
    ? `/app/shop/${encodeURIComponent(safeStr(me?.gmfn_id || ""))}`
    : "";

  const selectedCommunityLabel = safeStr(
    selectedClan?.marketplace_name ||
      selectedClan?.name ||
      (selectedCommunityId ? `Community ${selectedCommunityId}` : "Not selected")
  );

  const nextShopStep = useMemo(
    () =>
      buildNextShopStep({
        selectedCommunityId,
        shopReady: myShopReady,
        productCount: myProductCount,
        spotlightLive: Boolean(activeMySpotlight),
      }),
    [selectedCommunityId, myShopReady, myProductCount, activeMySpotlight]
  );

  useEffect(() => {
    if (!myShop) {
      setShopName("");
      setShopDescription("");
      setShopWhatsapp("");
      setShopTelegram("");
      return;
    }

    setShopName(safeStr(myShop?.name || ""));
    setShopDescription(safeStr(myShop?.description || ""));
    setShopWhatsapp(safeStr(myShop?.whatsapp_number || ""));
    setShopTelegram(safeStr(myShop?.telegram_handle || ""));
  }, [myShop]);

  async function handleSelectClanContext(clanId: number) {
    try {
      setSwitchingClanId(clanId);
      await selectClan(clanId);
      setSelectedCommunityId(clanId);
      setMsg("");
      setErr("");
    } finally {
      setSwitchingClanId(null);
    }
  }

  async function handleSaveShop() {
    setErr("");
    setMsg("");

    const trimmedName = safeStr(shopName || "");
    if (!trimmedName) {
      setErr("Shop name is required.");
      return;
    }

    if (!selectedCommunityId) {
      setErr("Choose a community first.");
      return;
    }

    setSavingShop(true);
    try {
      await createMarketplaceShop({
        clan_id: selectedCommunityId,
        name: trimmedName,
        description: safeStr(shopDescription || "") || null,
        whatsapp_number: safeStr(shopWhatsapp || "") || null,
        telegram_handle: safeStr(shopTelegram || "") || null,
      });

      await refreshShops(selectedCommunityId);
      setMsg("Shop saved successfully.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to save shop."));
    } finally {
      setSavingShop(false);
    }
  }

  async function handleUploadProductImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    e.currentTarget.value = "";
    if (!file) return;

    setErr("");
    setMsg("");
    setUploadingProductImage(true);
    try {
      const res = await uploadMarketplaceImageFile(
        file,
        selectedCommunityId || undefined
      );
      const uploadedUrl = safeStr(
        res?.image_url || res?.url || res?.file_url || res?.path || ""
      );

      if (!uploadedUrl) {
        throw new Error("Product image upload failed.");
      }

      setProductImageUrl(uploadedUrl);
      setMsg("Product image uploaded. Review the preview, then save.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to upload product image."));
    } finally {
      setUploadingProductImage(false);
    }
  }

  async function handleUploadSpotlightImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0] || null;
    e.currentTarget.value = "";
    if (!file) return;

    setErr("");
    setMsg("");
    setUploadingSpotlightImage(true);
    try {
      const res = await uploadMarketplaceImageFile(
        file,
        selectedCommunityId || undefined
      );
      const uploadedUrl = safeStr(
        res?.image_url || res?.url || res?.file_url || res?.path || ""
      );

      if (!uploadedUrl) {
        throw new Error("Spotlight image upload failed.");
      }

      setSpotlightImageUrl(uploadedUrl);
      setMsg("Spotlight image uploaded. Review the preview, then publish.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to upload spotlight image."));
    } finally {
      setUploadingSpotlightImage(false);
    }
  }

  async function handleCreateProduct() {
    setErr("");
    setMsg("");

    const trimmedName = safeStr(productName || "");
    const trimmedPrice = safeStr(productPrice || "");
    const trimmedImage = safeStr(productImageUrl || "");

    if (!trimmedName) {
      setErr("Product name is required.");
      return;
    }

    if (!trimmedPrice) {
      setErr("Product price is required.");
      return;
    }

    if (!trimmedImage) {
      setErr("Product image is required.");
      return;
    }

    if (!selectedCommunityId) {
      setErr("Choose a community first.");
      return;
    }

    if (!myShop?.id) {
      setErr("Save your shop first before adding a product.");
      return;
    }

    setSavingProduct(true);
    try {
      await createMarketplaceProduct({
        clan_id: selectedCommunityId,
        shop_id: Number(myShop.id),
        name: trimmedName,
        description: safeStr(productDescription || "") || null,
        price: trimmedPrice,
        currency: safeStr(productCurrency || "NGN") || "NGN",
        image_url: trimmedImage,
      });

      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductCurrency("NGN");
      setProductImageUrl("");
      await refreshShops(selectedCommunityId);
      const refreshedProducts = await getMarketplaceProducts({
        clan_id: selectedCommunityId,
        shop_id: Number(myShop.id),
        only_active: true,
        include_reposted: true,
        limit: 100,
      }).catch(() => ({ items: [] }));

      setMyProducts(
        parseRows(refreshedProducts)
          .map((row: any) => normalizeProductItem(row))
          .filter(Boolean) as ProductItem[]
      );

      setMsg("Product saved successfully.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to save product."));
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleCreateSpotlight() {
    setErr("");
    setMsg("");

    const trimmedMessage = safeStr(spotlightMessage || "");
    if (!trimmedMessage) {
      setErr("Spotlight message is required.");
      return;
    }

    if (!selectedCommunityId) {
      setErr("Choose a community first.");
      return;
    }

    if (!myShop?.id) {
      setErr("Save your shop first before publishing spotlight.");
      return;
    }

    setSavingSpotlight(true);
    try {
      const hoursNum = Math.max(1, Number(spotlightHours || 24) || 24);
      const expiresAt = new Date(
        Date.now() + hoursNum * 60 * 60 * 1000
      ).toISOString();

      await createMarketplaceFeed({
        clan_id: selectedCommunityId,
        message: trimmedMessage,
        image_url: safeStr(spotlightImageUrl || "") || null,
        expires_at: expiresAt,
      });

      setSpotlightMessage("");
      setSpotlightImageUrl("");
      setSpotlightHours("24");
      await refreshBroadcasts(selectedCommunityId);
      setMsg("Spotlight published successfully.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to publish spotlight."));
    } finally {
      setSavingSpotlight(false);
    }
  }

  async function handleDeleteSpotlight() {
    const spotlightId = Number(activeMySpotlight?.id || 0);
    if (!spotlightId) return;

    setErr("");
    setMsg("");
    setDeletingSpotlight(true);
    try {
      await deleteMarketplaceBroadcast(spotlightId);
      await refreshBroadcasts(selectedCommunityId);
      setMsg("Spotlight deleted successfully.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to delete spotlight."));
    } finally {
      setDeletingSpotlight(false);
    }
  }

  function handleStepAction() {
    const sectionId =
      nextShopStep.ctaKind === "community"
        ? "shop-control-community-context"
        : nextShopStep.ctaKind === "shop"
        ? "shop-control-shop-identity"
        : nextShopStep.ctaKind === "product"
        ? "shop-control-product-publication"
        : nextShopStep.ctaKind === "spotlight"
        ? "shop-control-spotlight"
        : "shop-control-status";

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (loadingBoot) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 30 }}>
        <PageTopNav
          sectionLabel="Shop Control"
          title="Shop Control"
          subtitle="Preparing your private owner-side shop surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Marketplace", to: "/app/marketplace" },
          ]}
          utilityLinks={[
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
            { label: "Trust", to: "/app/trust" },
          ]}
        />

        <section style={{ ...pageCard("#FFFFFF"), marginTop: 18 }}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading shop control...
          </div>
        </section>
      </div>
    );
  }

  if (clans.length === 0) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 30 }}>
        <PageTopNav
          sectionLabel="Shop Control"
          title="Shop Control"
          subtitle="This is your private owner-side shop control surface."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Marketplace", to: "/app/marketplace" },
          ]}
          utilityLinks={[
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
            { label: "Trust", to: "/app/trust" },
          ]}
        />

        <section style={{ ...pageCard("#FFFFFF"), marginTop: 18 }}>
          <div style={sectionLabel()}>No communities yet</div>

          <div
            style={{
              marginTop: 12,
              fontSize: 30,
              fontWeight: 1000,
              color: "#0B1F33",
              lineHeight: 1.15,
              maxWidth: 760,
            }}
          >
            You need at least one community context before using shop control.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#6B7A88",
              lineHeight: 1.8,
              fontSize: 15,
              maxWidth: 840,
            }}
          >
            The shop remains global, but the owner-side publication work still
            needs a selected community context.
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/app/clans" style={btn(true)}>
              Create New Community
            </Link>
            <Link to="/app/dashboard" style={btn(false)}>
              Dashboard
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Shop Control"
        title="Shop Control"
        subtitle="This is your private owner-side shop surface. Public viewing stays in Shop Gallery. Owner controls stay here."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Marketplace", to: "/app/marketplace" },
          myShopLink ? { label: "Open My Shop", to: myShopLink } : undefined,
        ].filter(Boolean) as { label: string; to: string }[]}
        utilityLinks={[
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          { label: "Trust", to: "/app/trust" },
        ]}
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div style={sectionLabel()}>Owner-side control</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              One global shop, prepared through your selected community context
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#6B7A88",
                lineHeight: 1.7,
                fontSize: 14,
                maxWidth: 760,
              }}
            >
              This is your private shop control surface. Use it to maintain your
              shop identity, publish products, and manage spotlight visibility.
              Community selection here controls visibility context, not ownership
              of multiple separate shops.
            </div>
          </div>

          <div
            style={{
              minWidth: 240,
              flex: "0 1 320px",
              ...softCard("#FFFFFF"),
            }}
          >
            <div style={tiny()}>Current context</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 18,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              {selectedCommunityLabel}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Shop stays tied to your identity. This selected community decides
              where product and spotlight visibility is being prepared right now.
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={badge(true)}>Shop ready: {myShopReady ? "Yes" : "No"}</div>
              <div style={badge(false)}>Products: {myProductCount}</div>
              <div style={badge(false)}>
                Spotlight live: {activeMySpotlight ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div
          style={{
            ...card("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            padding: 14,
          }}
        >
          {err}
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            ...card("#ECFDF5"),
            marginTop: 18,
            border: "1px solid #A7F3D0",
            color: "#065F46",
            padding: 14,
          }}
        >
          {msg}
        </div>
      ) : null}

      <section style={{ ...card(), marginTop: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={tiny()}>Next best shop step</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 28,
                fontWeight: 1000,
                lineHeight: 1.15,
              }}
            >
              {nextShopStep.title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#64748B",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 820,
              }}
            >
              {nextShopStep.detail}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" style={btn(true)} onClick={handleStepAction}>
                Open next step
              </button>

              {myShopLink ? (
                <Link to={myShopLink} style={btn(false)}>
                  Open My Shop
                </Link>
              ) : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#F8FBFF")}>
              <div style={tiny()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.6,
                }}
              >
                {nextShopStep.today}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={tiny()}>Tomorrow</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.6,
                }}
              >
                {nextShopStep.tomorrow}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="shop-control-community-context" style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>Select community</div>

        <div
          style={{
            marginTop: 8,
            color: "#64748B",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          The selected community here controls the current visibility and publication
          context. It does not create a different owner identity.
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {clans.map((clan) => {
            const clanId = Number(clan.id || clan.clan_id || 0);
            const active = clanId === selectedCommunityId;

            return (
              <button
                key={clanId}
                type="button"
                style={btn(active, switchingClanId === clanId)}
                disabled={switchingClanId === clanId}
                onClick={() => handleSelectClanContext(clanId)}
              >
                {switchingClanId === clanId
                  ? "Opening..."
                  : safeStr(clan.marketplace_name || clan.name || `Community ${clanId}`)}
              </button>
            );
          })}
        </div>
      </section>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <section id="shop-control-shop-identity" style={card()}>
          <div style={tiny()}>Shop identity</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Shop name"
              style={inputStyle()}
            />

            <textarea
              value={shopDescription}
              onChange={(e) => setShopDescription(e.target.value)}
              placeholder="Shop description"
              style={textAreaStyle()}
            />

            <input
              value={shopWhatsapp}
              onChange={(e) => setShopWhatsapp(e.target.value)}
              placeholder="WhatsApp number"
              style={inputStyle()}
            />

            <input
              value={shopTelegram}
              onChange={(e) => setShopTelegram(e.target.value)}
              placeholder="Telegram handle"
              style={inputStyle()}
            />

            <div style={{ marginTop: 4 }}>
              <button
                type="button"
                style={btn(true, savingShop || !selectedCommunityId)}
                onClick={handleSaveShop}
                disabled={savingShop || !selectedCommunityId}
              >
                {savingShop ? "Saving Shop..." : "Save Shop"}
              </button>
            </div>

            <div
              style={{
                marginTop: 6,
                borderRadius: 12,
                border: "1px solid rgba(11,31,51,0.08)",
                background: "#F8FBFF",
                padding: 12,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              {loadingShops ? (
                "Loading shop status..."
              ) : myShop ? (
                <>
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Current shop:</strong>{" "}
                    {safeStr(myShop.name || "Shop")}
                  </div>
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Owner identity:</strong>{" "}
                    {safeStr(myShop.gmfn_id || myShop.owner_gmfn_id || "—")}
                  </div>
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Display name:</strong>{" "}
                    {safeStr(myShop.owner_display_name || "—")}
                  </div>
                </>
              ) : (
                "No active shop loaded for your identity in the selected community context yet."
              )}
            </div>
          </div>
        </section>

        <section id="shop-control-product-publication" style={card()}>
          <div style={tiny()}>Product publication</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name"
              style={inputStyle()}
            />

            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Product description"
              style={textAreaStyle()}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px",
                gap: 10,
              }}
            >
              <input
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="Price"
                style={inputStyle()}
              />

              <input
                value={productCurrency}
                onChange={(e) => setProductCurrency(e.target.value)}
                placeholder="NGN"
                style={inputStyle()}
              />
            </div>

            <input
              value={productImageUrl}
              onChange={(e) => setProductImageUrl(e.target.value)}
              placeholder="Product image URL"
              style={inputStyle()}
            />

            <label style={btn(false, uploadingProductImage)}>
              {uploadingProductImage
                ? "Uploading Product Image..."
                : "Upload Product Image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadProductImage}
                style={{ display: "none" }}
                disabled={uploadingProductImage}
              />
            </label>

            {safeStr(productImageUrl || "") ? (
              <div
                style={{
                  border: "1px solid rgba(11,31,51,0.10)",
                  borderRadius: 14,
                  background: "#FFFFFF",
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 1000,
                    color: "#64748B",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  Product preview
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 200,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#EAF2FF",
                    border: "1px solid rgba(11,31,51,0.08)",
                  }}
                >
                  <img
                    src={resolveMediaUrl(productImageUrl)}
                    alt="Product preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    style={btn(false)}
                    onClick={() => setProductImageUrl("")}
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 4 }}>
              <button
                type="button"
                style={btn(true, savingProduct || !myShopReady)}
                onClick={handleCreateProduct}
                disabled={savingProduct || !myShopReady}
              >
                {savingProduct ? "Saving Product..." : "Save Product"}
              </button>
            </div>

            <div
              style={{
                marginTop: 6,
                borderRadius: 12,
                border: "1px solid rgba(11,31,51,0.08)",
                background: "#F8FBFF",
                padding: 12,
                color: "#64748B",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Product publication is active now. Product editing and deletion are
              not part of this current control surface.
            </div>
          </div>
        </section>

        <section id="shop-control-spotlight" style={card()}>
          <div style={tiny()}>Spotlight publication</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <textarea
              value={spotlightMessage}
              onChange={(e) => setSpotlightMessage(e.target.value)}
              placeholder="Spotlight message"
              style={textAreaStyle()}
            />

            <input
              value={spotlightImageUrl}
              onChange={(e) => setSpotlightImageUrl(e.target.value)}
              placeholder="Spotlight image URL"
              style={inputStyle()}
            />

            <label style={btn(false, uploadingSpotlightImage)}>
              {uploadingSpotlightImage
                ? "Uploading Spotlight Image..."
                : "Upload Spotlight Image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadSpotlightImage}
                style={{ display: "none" }}
                disabled={uploadingSpotlightImage}
              />
            </label>

            {safeStr(spotlightImageUrl || "") ? (
              <div
                style={{
                  border: "1px solid rgba(11,31,51,0.10)",
                  borderRadius: 14,
                  background: "#FFFFFF",
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 1000,
                    color: "#64748B",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  Spotlight preview
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 200,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#EAF2FF",
                    border: "1px solid rgba(11,31,51,0.08)",
                  }}
                >
                  <img
                    src={resolveMediaUrl(spotlightImageUrl)}
                    alt="Spotlight preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    style={btn(false)}
                    onClick={() => setSpotlightImageUrl("")}
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : null}

            <input
              value={spotlightHours}
              onChange={(e) => setSpotlightHours(e.target.value)}
              placeholder="24"
              style={inputStyle()}
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <button
                type="button"
                style={btn(true, savingSpotlight || !myShopReady)}
                onClick={handleCreateSpotlight}
                disabled={savingSpotlight || !myShopReady}
              >
                {savingSpotlight ? "Publishing Spotlight..." : "Publish Spotlight"}
              </button>

              <button
                type="button"
                style={btn(false, deletingSpotlight || !activeMySpotlight?.id)}
                onClick={handleDeleteSpotlight}
                disabled={deletingSpotlight || !activeMySpotlight?.id}
              >
                {deletingSpotlight ? "Deleting..." : "Delete Spotlight"}
              </button>
            </div>

            <div
              style={{
                marginTop: 6,
                borderRadius: 12,
                border: "1px solid rgba(11,31,51,0.08)",
                background: "#F8FBFF",
                padding: 12,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              {loadingBroadcasts ? (
                "Loading spotlight status..."
              ) : activeMySpotlight ? (
                <>
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Current spotlight:</strong>{" "}
                    {safeStr(activeMySpotlight.message || "Active spotlight")}
                  </div>
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Marketplace:</strong>{" "}
                    {safeStr(
                      activeMySpotlight.source_clan_name ||
                        selectedClan?.marketplace_name ||
                        selectedClan?.name ||
                        "Selected community"
                    )}
                  </div>
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Expires:</strong>{" "}
                    {safeDateTime(activeMySpotlight.expires_at) || "—"}
                  </div>
                  {safeStr(activeMySpotlight.image_url || "") ? (
                    <div
                      style={{
                        marginTop: 10,
                        width: "100%",
                        height: 160,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#EAF2FF",
                        border: "1px solid rgba(11,31,51,0.08)",
                      }}
                    >
                      <img
                        src={resolveMediaUrl(activeMySpotlight.image_url)}
                        alt="Active spotlight"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                "No active spotlight loaded for your identity in this community context yet."
              )}
            </div>
          </div>
        </section>
      </div>

      <section id="shop-control-status" style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>Current shop status</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Shop</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 1000,
              }}
            >
              {myShopReady ? "Ready" : "Pending"}
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Products</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 1000,
              }}
            >
              {loadingProducts ? "…" : myProductCount}
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Spotlight</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 1000,
              }}
            >
              {activeMySpotlight ? "Live" : "Not live"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {loadingProducts ? (
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              Loading your current products...
            </div>
          ) : myProducts.length === 0 ? (
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              No active product is visible in this selected community context yet.
            </div>
          ) : (
            myProducts.slice(0, 4).map((product, index) => (
              <div key={`${product.id || index}`} style={softCard("#FFFFFF")}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "88px minmax(0, 1fr)",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid rgba(11,31,51,0.08)",
                      background: "#EAF2FF",
                    }}
                  >
                    {safeStr(product.image_url || "") ? (
                      <img
                        src={resolveMediaUrl(product.image_url)}
                        alt={safeStr(product.name || "Product")}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : null}
                  </div>

                  <div>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 16,
                        fontWeight: 1000,
                        lineHeight: 1.35,
                      }}
                    >
                      {safeStr(product.name || "Product")}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#64748B",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {safeStr(product.description || "No description yet.")}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <span style={badge(true)}>{displayPrice(product)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}