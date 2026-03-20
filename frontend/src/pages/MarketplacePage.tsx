import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getMarketplaceShops,
  getMe,
  getSelectedClanId,
  listMyClans,
  selectClan,
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

function tiny(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
  };
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
  image_url?: string | null;
};

export default function MarketplacePage() {
  const navigate = useNavigate();

  const [me, setMe] = useState<any>(null);
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [selectedClanId, setSelectedClanId] = useState<number | null>(null);
  const [loadingClans, setLoadingClans] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [switchingClanId, setSwitchingClanId] = useState<number | null>(null);
  const [shops, setShops] = useState<ShopItem[]>([]);

  useEffect(() => {
    (async () => {
      setLoadingClans(true);
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
        setLoadingClans(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClanId) {
      setShops([]);
      return;
    }

    (async () => {
      setLoadingShops(true);
      try {
        const res = await getMarketplaceShops({
          clan_id: selectedClanId,
        }).catch(() => ({ items: [] }));

        const items = Array.isArray(res) ? res : res?.items || [];
        setShops(items);
      } finally {
        setLoadingShops(false);
      }
    })();
  }, [selectedClanId]);

  async function openCommunityMarketplace(clanId: number) {
    try {
      setSwitchingClanId(clanId);
      await selectClan(clanId);
      setSelectedClanId(clanId);
    } finally {
      setSwitchingClanId(null);
    }
  }

  function openShop(shop: ShopItem) {
    const gmfnId = String(shop?.gmfn_id || shop?.owner_gmfn_id || "").trim();
    if (!gmfnId) return;
    navigate(`/app/shop/${encodeURIComponent(gmfnId)}`);
  }

  function openMyShop() {
    const gmfnId = String(me?.gmfn_id || "").trim();
    if (!gmfnId) return;
    navigate(`/app/shop/${encodeURIComponent(gmfnId)}`);
  }

  function openShopControl() {
    navigate("/app/shop-control");
  }

  const selectedClan = useMemo(() => {
    return (
      clans.find((c) => Number(c.id || c.clan_id || 0) === Number(selectedClanId || 0)) || null
    );
  }, [clans, selectedClanId]);

  const myShopReady = Boolean(String(me?.gmfn_id || "").trim());

  const myShopCardText = useMemo(() => {
    if (!me?.gmfn_id) {
      return "Your GMFN identity is still preparing. Shop access will appear once identity is ready.";
    }
    return "Open the public shop page tied to your GMFN identity.";
  }, [me]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 30 }}>
      <div style={{ ...card("#F8FBFF"), marginTop: 18 }}>
        <div style={{ fontSize: 30, fontWeight: 1000, color: "#0B1F33" }}>
          Marketplace
        </div>
        <div style={{ marginTop: 6, color: "#6B7A88", lineHeight: 1.7 }}>
          Browse community-visible member shops, switch marketplace context, or move into your
          dedicated shop control workspace.
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>MY SHOP ACCESS</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          <div style={softCard()}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Open My Shop
            </div>
            <div style={{ marginTop: 8, color: "#64748B", fontSize: 14, lineHeight: 1.7 }}>
              {myShopCardText}
            </div>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                style={btn(true, !myShopReady)}
                onClick={openMyShop}
                disabled={!myShopReady}
              >
                Open My Shop
              </button>
            </div>
          </div>

          <div style={softCard()}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Shop Control
            </div>
            <div style={{ marginTop: 8, color: "#64748B", fontSize: 14, lineHeight: 1.7 }}>
              Use the dedicated institutional control surface for shop identity, products, and
              spotlight.
            </div>
            <div style={{ marginTop: 14 }}>
              <button type="button" style={btn(false)} onClick={openShopControl}>
                Open Shop Control
              </button>
            </div>
          </div>

          <div style={softCard()}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Return to Dashboard
            </div>
            <div style={{ marginTop: 8, color: "#64748B", fontSize: 14, lineHeight: 1.7 }}>
              Go back to your main member dashboard for trust, spotlight display, and notifications.
            </div>
            <div style={{ marginTop: 14 }}>
              <Link to="/app/dashboard" style={btn(false)}>
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>YOUR COMMUNITIES</div>

        {loadingClans ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>Loading communities...</div>
        ) : clans.length === 0 ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>
            No communities available yet.
          </div>
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
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>SELECTED MARKETPLACE</div>

        <div style={{ marginTop: 10, fontSize: 24, fontWeight: 1000, color: "#0B1F33" }}>
          {safeStr(
            selectedClan?.marketplace_name ||
              selectedClan?.name ||
              (selectedClanId ? `Community ${selectedClanId} Marketplace` : "Choose a community")
          )}
        </div>

        <div style={{ marginTop: 6, color: "#64748B", lineHeight: 1.7 }}>
          {selectedClanId
            ? "These are the member shops currently visible inside the selected community marketplace."
            : "Choose a community above to continue."}
        </div>
      </div>

      {selectedClanId ? (
        <div style={{ ...card(), marginTop: 18 }}>
          <div style={tiny()}>VISIBLE SHOPS</div>

          {loadingShops ? (
            <div style={{ marginTop: 14, color: "#64748B" }}>Loading shops...</div>
          ) : shops.length === 0 ? (
            <div style={{ marginTop: 14, color: "#64748B" }}>
              No shops found in this community yet.
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {shops.map((shop, index) => (
                <div
                  key={shop.id || index}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background: "#FFFFFF",
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                    {safeStr(shop.name || "Shop")}
                  </div>

                  <div style={{ marginTop: 8, color: "#64748B", fontSize: 14, lineHeight: 1.7 }}>
                    {safeStr(shop.description || "No description yet.")}
                  </div>

                  <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
                    Seller: {safeStr(shop.owner_display_name || "Member")}
                  </div>

                  <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
                    GMFN ID: {safeStr(shop.gmfn_id || shop.owner_gmfn_id || "—")}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <button type="button" style={btn(true)} onClick={() => openShop(shop)}>
                      Open Shop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}