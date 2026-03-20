import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  return String(x ?? "");
}

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

export default function ShopControlPage() {
  const navigate = useNavigate();

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
        if (storedSelected > 0) {
          setSelectedClanId(storedSelected);
        } else if (items.length > 0) {
          const firstId = Number(items[0]?.id || items[0]?.clan_id || 0);
          if (firstId > 0) setSelectedClanId(firstId);
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
    refreshShops(selectedClanId);
    refreshBroadcasts(selectedClanId);
  }, [selectedClanId]);

  const selectedClan = useMemo(() => {
    return (
      clans.find((c) => Number(c.id || c.clan_id || 0) === Number(selectedClanId || 0)) || null
    );
  }, [clans, selectedClanId]);

  const myShop = useMemo(() => {
    const myGmfnId = String(me?.gmfn_id || "").trim();
    if (!myGmfnId) return null;

    return (
      shops.find(
        (s) =>
          String(s?.gmfn_id || "").trim() === myGmfnId ||
          String(s?.owner_gmfn_id || "").trim() === myGmfnId
      ) || null
    );
  }, [shops, me]);

  const activeMySpotlight = useMemo(() => {
    const myGmfnId = String(me?.gmfn_id || "").trim();
    if (!myGmfnId) return null;

    return (
      broadcasts.find(
        (b) => String(b?.author_gmfn_id || "").trim() === myGmfnId
      ) || null
    );
  }, [broadcasts, me]);

  const myShopReady = Boolean(myShop?.id);
  const myShopLink = String(me?.gmfn_id || "").trim()
    ? `/app/shop/${encodeURIComponent(String(me?.gmfn_id || "").trim())}`
    : "";

  useEffect(() => {
    if (!myShop) {
      setShopName("");
      setShopDescription("");
      setShopWhatsapp("");
      setShopTelegram("");
      return;
    }

    setShopName(String(myShop?.name || ""));
    setShopDescription(String(myShop?.description || ""));
    setShopWhatsapp(String(myShop?.whatsapp_number || ""));
    setShopTelegram(String(myShop?.telegram_handle || ""));
  }, [myShop]);

  async function openCommunityMarketplace(clanId: number) {
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

    const trimmedName = String(shopName || "").trim();
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
        description: String(shopDescription || "").trim() || null,
        whatsapp_number: String(shopWhatsapp || "").trim() || null,
        telegram_handle: String(shopTelegram || "").trim() || null,
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
      const uploadedUrl = String(
        res?.image_url || res?.url || res?.file_url || res?.path || ""
      ).trim();

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
      const uploadedUrl = String(
        res?.image_url || res?.url || res?.file_url || res?.path || ""
      ).trim();

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

    const trimmedName = String(productName || "").trim();
    const trimmedPrice = String(productPrice || "").trim();
    const trimmedImage = String(productImageUrl || "").trim();

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
        description: String(productDescription || "").trim() || null,
        price: trimmedPrice,
        currency: String(productCurrency || "NGN").trim() || "NGN",
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

    const trimmedMessage = String(spotlightMessage || "").trim();
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
      const expiresAt = new Date(Date.now() + hoursNum * 60 * 60 * 1000).toISOString();

      await createMarketplaceFeed({
        clan_id: selectedClanId,
        message: trimmedMessage,
        image_url: String(spotlightImageUrl || "").trim() || null,
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
      <div style={{ ...card("#F8FBFF"), marginTop: 18 }}>
        <div style={{ fontSize: 30, fontWeight: 1000, color: "#0B1F33" }}>
          Shop Control
        </div>
        <div style={{ marginTop: 6, color: "#6B7A88", lineHeight: 1.7 }}>
          Institutional control surface for shop identity, product publication, and spotlight.
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
        <div style={tiny()}>NAVIGATION</div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/app/dashboard" style={btn(false)}>
            Dashboard
          </Link>

          <Link to="/app/marketplace" style={btn(false)}>
            Marketplace
          </Link>

          <Link to="/app/community" style={btn(false)}>
            Community Home
          </Link>

          {myShopLink ? (
            <button type="button" style={btn(true)} onClick={() => navigate(myShopLink)}>
              Open My Shop
            </button>
          ) : (
            <button type="button" style={btn(true, true)} disabled>
              Open My Shop
            </button>
          )}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>SELECT COMMUNITY</div>

        {loadingBoot ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>Loading communities...</div>
        ) : clans.length === 0 ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>No communities available yet.</div>
        ) : (
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {clans.map((c) => {
              const clanId = Number(c.id || c.clan_id || 0);
              const active = clanId === selectedClanId;
              return (
                <button
                  key={clanId}
                  type="button"
                  style={btn(active, switchingClanId === clanId)}
                  disabled={switchingClanId === clanId}
                  onClick={() => openCommunityMarketplace(clanId)}
                >
                  {switchingClanId === clanId
                    ? "Opening..."
                    : safeStr(c.marketplace_name || c.name || `Community ${clanId}`)}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 14, color: "#64748B", fontSize: 14, lineHeight: 1.7 }}>
          Selected marketplace:{" "}
          <strong style={{ color: "#0B1F33" }}>
            {safeStr(
              selectedClan?.marketplace_name ||
                selectedClan?.name ||
                (selectedClanId ? `Community ${selectedClanId}` : "Not selected")
            )}
          </strong>
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
                </>
              ) : (
                "No active shop loaded for your identity in the selected marketplace yet."
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
              {uploadingProductImage ? "Uploading Product Image..." : "Upload Product Image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadProductImage}
                style={{ display: "none" }}
                disabled={uploadingProductImage}
              />
            </label>

            {String(productImageUrl || "").trim() ? (
              <div
                style={{
                  border: "1px solid rgba(11,31,51,0.10)",
                  borderRadius: 14,
                  background: "#FFFFFF",
                  padding: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 1000, color: "#64748B", marginBottom: 8 }}>
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
              {uploadingSpotlightImage ? "Uploading Spotlight Image..." : "Upload Spotlight Image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadSpotlightImage}
                style={{ display: "none" }}
                disabled={uploadingSpotlightImage}
              />
            </label>

            {String(spotlightImageUrl || "").trim() ? (
              <div
                style={{
                  border: "1px solid rgba(11,31,51,0.10)",
                  borderRadius: 14,
                  background: "#FFFFFF",
                  padding: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 1000, color: "#64748B", marginBottom: 8 }}>
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
                        "Selected marketplace"
                    )}
                  </div>
                </>
              ) : (
                "No active spotlight loaded for your identity in this marketplace yet."
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}