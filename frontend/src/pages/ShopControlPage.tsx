import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createMarketplaceFeed,
  createMarketplaceProduct,
  createMarketplaceShop,
  deleteMarketplaceBroadcast,
  getMarketplaceBroadcasts,
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
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.85 : 1,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
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
    resize: "vertical",
    minHeight: 110,
  };
}

function tiny(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
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

export default function ShopControlPage() {
  const [me, setMe] = useState<any>(null);
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [selectedClanId, setSelectedClanId] = useState<number | null>(null);

  const [loadingBoot, setLoadingBoot] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [switchingClanId, setSwitchingClanId] = useState<number | null>(null);

  const [shops, setShops] = useState<ShopItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);

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

        const items = Array.isArray(clansRes) ? clansRes : clansRes?.items || [];
        setClans(items);

        const storedSelected = Number(getSelectedClanId() || 0);

        if (
          storedSelected > 0 &&
          items.some((c: any) => Number(c?.id || c?.clan_id || 0) === storedSelected)
        ) {
          setSelectedClanId(storedSelected);

          try {
            await selectClan(storedSelected);
          } catch {
            // ignore sync error
          }
        } else if (items.length > 0) {
          const firstId = Number(items[0]?.id || items[0]?.clan_id || 0);

          if (firstId > 0) {
            setSelectedClanId(firstId);

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
    const effectiveClanId = Number(clanId || selectedClanId || 0);

    if (!effectiveClanId) {
      setShops([]);
      return;
    }

    setLoadingShops(true);
    try {
      const res = await getMarketplaceShops({
        clan_id: effectiveClanId,
      }).catch(() => ({ items: [] }));

      const items = Array.isArray(res) ? res : res?.items || [];
      setShops(items);
    } finally {
      setLoadingShops(false);
    }
  }

  async function refreshBroadcasts(clanId?: number | null) {
    const effectiveClanId = Number(clanId || selectedClanId || 0);

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

      const items = Array.isArray(res?.items) ? res.items : [];
      setBroadcasts(items);
    } finally {
      setLoadingBroadcasts(false);
    }
  }

  useEffect(() => {
    if (!selectedClanId) {
      setShops([]);
      setBroadcasts([]);
      return;
    }

    void refreshShops(selectedClanId);
    void refreshBroadcasts(selectedClanId);
  }, [selectedClanId]);

  const selectedClan = useMemo(() => {
    return (
      clans.find(
        (c) => Number(c.id || c.clan_id || 0) === Number(selectedClanId || 0)
      ) || null
    );
  }, [clans, selectedClanId]);

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

  const activeMySpotlight = useMemo(() => {
    const myGmfnId = safeStr(me?.gmfn_id || "");
    if (!myGmfnId) return null;

    return (
      broadcasts.find(
        (b) => safeStr(b?.author_gmfn_id || "") === myGmfnId
      ) || null
    );
  }, [broadcasts, me]);

  const myShopReady = Boolean(myShop?.id);
  const myShopLink = safeStr(me?.gmfn_id || "")
    ? `/app/shop/${encodeURIComponent(safeStr(me?.gmfn_id || ""))}`
    : "";

  const selectedCommunityLabel = safeStr(
    selectedClan?.marketplace_name ||
      selectedClan?.name ||
      (selectedClanId ? `Community ${selectedClanId}` : "Not selected")
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
      setSelectedClanId(clanId);
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

    if (!selectedClanId) {
      setErr("Choose a community first.");
      return;
    }

    setSavingShop(true);
    try {
      await createMarketplaceShop({
        clan_id: selectedClanId,
        name: trimmedName,
        description: safeStr(shopDescription || "") || null,
        whatsapp_number: safeStr(shopWhatsapp || "") || null,
        telegram_handle: safeStr(shopTelegram || "") || null,
      });

      await refreshShops(selectedClanId);
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
      const res = await uploadMarketplaceImageFile(file, selectedClanId || undefined);
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

  async function handleUploadSpotlightImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    e.currentTarget.value = "";
    if (!file) return;

    setErr("");
    setMsg("");
    setUploadingSpotlightImage(true);
    try {
      const res = await uploadMarketplaceImageFile(file, selectedClanId || undefined);
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

    if (!selectedClanId) {
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
        clan_id: selectedClanId,
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

    if (!selectedClanId) {
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
        clan_id: selectedClanId,
        message: trimmedMessage,
        image_url: safeStr(spotlightImageUrl || "") || null,
        expires_at: expiresAt,
      });

      setSpotlightMessage("");
      setSpotlightImageUrl("");
      setSpotlightHours("24");
      await refreshBroadcasts(selectedClanId);
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
      await refreshBroadcasts(selectedClanId);
      setMsg("Spotlight deleted successfully.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to delete spotlight."));
    } finally {
      setDeletingSpotlight(false);
    }
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 30 }}>
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
            <div style={sectionLabel()}>Shop control</div>

            <div style={{ marginTop: 10, fontSize: 30, fontWeight: 1000, color: "#0B1F33" }}>
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

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/app/dashboard" style={btn(false)}>
                Dashboard
              </Link>

              <Link to="/app/community" style={btn(false)}>
                Community Home
              </Link>

              <Link to="/app/marketplace" style={btn(false)}>
                Marketplace
              </Link>

              {myShopLink ? (
                <Link to={myShopLink} style={btn(true)}>
                  Open My Shop
                </Link>
              ) : (
                <button type="button" style={btn(true, true)} disabled>
                  Open My Shop
                </button>
              )}
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
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(11,99,209,0.08)",
                  color: "#0B63D1",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                Shop ready: {myShopReady ? "Yes" : "No"}
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(100,116,139,0.10)",
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
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

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>SELECT COMMUNITY</div>

        {loadingBoot ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>Loading communities...</div>
        ) : clans.length === 0 ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>
            No communities available yet.
          </div>
        ) : (
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {clans.map((clan) => {
              const clanId = Number(clan.id || clan.clan_id || 0);
              const active = clanId === selectedClanId;

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
        )}

        <div
          style={{
            marginTop: 14,
            color: "#64748B",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          Selected visibility context:{" "}
          <strong style={{ color: "#0B1F33" }}>{selectedCommunityLabel}</strong>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <div style={card()}>
          <div style={tiny()}>SHOP IDENTITY</div>

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
                style={btn(true, savingShop || !selectedClanId)}
                onClick={handleSaveShop}
                disabled={savingShop || !selectedClanId}
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
        </div>

        <div style={card()}>
          <div style={tiny()}>PRODUCT PUBLICATION</div>

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
                  }}
                >
                  Product Preview
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
        </div>

        <div style={card()}>
          <div style={tiny()}>SPOTLIGHT PUBLICATION</div>

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
                  }}
                >
                  Spotlight Preview
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
        </div>
      </div>
    </div>
  );
}