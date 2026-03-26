import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getMarketplaceShops,
  getMe,
  getSelectedClanId,
  listMarketplaceRequests,
  listMyClans,
  selectClan,
} from "../lib/api";

type ClanItem = {
  id?: number;
  name?: string;
  display_name?: string;
};

type ShopItem = {
  id?: number;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  owner_user_id?: number | null;
  seller_user_id?: number | null;
  owner_name?: string | null;
  seller_name?: string | null;
  owner_full_name?: string | null;
  seller_full_name?: string | null;
  owner_display_name?: string | null;
  seller_display_name?: string | null;
  owner_gmfn_id?: string | null;
  seller_gmfn_id?: string | null;
  gmfn_id?: string | null;
  created_at?: string | null;
  clan_id?: number | null;
};

type DemandItem = {
  id?: number;
  title?: string | null;
  product_name?: string | null;
  item_name?: string | null;
  message?: string | null;
  description?: string | null;
  member_name?: string | null;
  requester_name?: string | null;
  full_name?: string | null;
  nickname?: string | null;
  member_gmfn_id?: string | null;
  requester_gmfn_id?: string | null;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  user_gmfn_id?: string | null;
  clan_id?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type MemberCommerceCard = {
  key: string;
  memberName: string;
  gmfnId: string;
  shop: ShopItem | null;
  demandCount: number;
  latestDemandTitle?: string;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    boxShadow:
      "0 22px 54px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.03)",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
    padding: 16,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function btn(primary = false): React.CSSProperties {
  return {
    border: primary
      ? "1px solid rgba(11,99,209,0.22)"
      : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    borderRadius: 12,
    padding: "10px 13px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function formatClanName(c: ClanItem): string {
  return safeStr(c.display_name || c.name || "Community");
}

function formatMemberNameFromShop(shop: ShopItem): string {
  return safeStr(
    shop.owner_display_name ||
      shop.seller_display_name ||
      shop.owner_full_name ||
      shop.seller_full_name ||
      shop.owner_name ||
      shop.seller_name ||
      "Community Member"
  );
}

function formatMemberIdFromShop(shop: ShopItem): string {
  return safeStr(shop.owner_gmfn_id || shop.seller_gmfn_id || shop.gmfn_id || "");
}

function formatMemberNameFromDemand(d: DemandItem): string {
  return safeStr(
    d.member_name ||
      d.requester_name ||
      d.full_name ||
      d.nickname ||
      "Community Member"
  );
}

function formatMemberIdFromDemand(d: DemandItem): string {
  return safeStr(
    d.member_gmfn_id ||
      d.requester_gmfn_id ||
      d.owner_gmfn_id ||
      d.user_gmfn_id ||
      d.gmfn_id ||
      ""
  );
}

function demandTitle(d: DemandItem): string {
  return safeStr(d.title || d.product_name || d.item_name || "Demand request");
}

function normalizeStatus(v?: string | null): string {
  return safeStr(v).toLowerCase();
}

export default function MarketplacePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [switchingClan, setSwitchingClan] = useState(false);
  const [error, setError] = useState("");

  const [me, setMe] = useState<any>(null);
  const [selectedClanId, setSelectedClanId] = useState<number | null>(
    getSelectedClanId()
  );
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [query, setQuery] = useState("");

  async function loadAll(activeClanId?: number | null) {
    setLoading(true);
    setError("");

    try {
      const currentClanId =
        typeof activeClanId === "number" ? activeClanId : getSelectedClanId();

      const [meRes, clansRes, shopsRes, demandRes] = await Promise.all([
        getMe().catch(() => null),
        listMyClans().catch(() => []),
        getMarketplaceShops().catch(() => []),
        listMarketplaceRequests().catch(() => []),
      ]);

      setMe(meRes || null);
      setClans(Array.isArray(clansRes) ? clansRes : []);
      setSelectedClanId(currentClanId ?? null);
      setShops(Array.isArray(shopsRes) ? shopsRes : []);
      setDemands(Array.isArray(demandRes) ? demandRes : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load marketplace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSelectClan(nextClanId: number) {
    try {
      setSwitchingClan(true);
      await selectClan(nextClanId);
      setSelectedClanId(nextClanId);
      await loadAll(nextClanId);
    } catch (err: any) {
      setError(err?.message || "Failed to switch community.");
    } finally {
      setSwitchingClan(false);
    }
  }

  const activeClan = useMemo(() => {
    return clans.find((c) => Number(c.id) === Number(selectedClanId)) || null;
  }, [clans, selectedClanId]);

  const memberCards = useMemo(() => {
    const map = new Map<string, MemberCommerceCard>();

    for (const shop of shops) {
      const gmfnId = formatMemberIdFromShop(shop);
      const memberName = formatMemberNameFromShop(shop);
      const key = gmfnId || `shop-${shop.id || Math.random()}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          memberName,
          gmfnId,
          shop,
          demandCount: 0,
          latestDemandTitle: undefined,
        });
      } else {
        const current = map.get(key)!;
        if (!current.shop) current.shop = shop;
      }
    }

    for (const d of demands) {
      const status = normalizeStatus(d.status);
      if (status && ["cancelled", "canceled", "fulfilled", "closed"].includes(status)) {
        continue;
      }

      const gmfnId = formatMemberIdFromDemand(d);
      const memberName = formatMemberNameFromDemand(d);
      const key = gmfnId || `demand-${d.id || Math.random()}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          memberName,
          gmfnId,
          shop: null,
          demandCount: 1,
          latestDemandTitle: demandTitle(d),
        });
      } else {
        const current = map.get(key)!;
        current.demandCount += 1;
        current.latestDemandTitle = current.latestDemandTitle || demandTitle(d);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aHasShop = a.shop ? 1 : 0;
      const bHasShop = b.shop ? 1 : 0;

      if (bHasShop !== aHasShop) return bHasShop - aHasShop;
      if (b.demandCount !== a.demandCount) return b.demandCount - a.demandCount;
      return a.memberName.localeCompare(b.memberName);
    });
  }, [shops, demands]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memberCards;

    return memberCards.filter((item) => {
      const text = [
        item.memberName,
        item.gmfnId,
        item.shop?.name,
        item.shop?.title,
        item.shop?.category,
        item.latestDemandTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [memberCards, query]);

  const summary = useMemo(() => {
    const withShop = memberCards.filter((m) => !!m.shop).length;
    const withDemand = memberCards.filter((m) => m.demandCount > 0).length;
    const demandTotal = memberCards.reduce((sum, m) => sum + m.demandCount, 0);

    return {
      membersVisible: memberCards.length,
      shopsLinked: withShop,
      demandMembers: withDemand,
      demandTotal,
    };
  }, [memberCards]);

  return (
    <div
      style={{
        padding: "24px 20px 80px",
        maxWidth: 1160,
        margin: "0 auto",
      }}
    >
      <div style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}>
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
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "8px 12px",
                border: "1px solid rgba(11,99,209,0.14)",
                background: "rgba(11,99,209,0.06)",
                color: "#0B63D1",
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Marketplace
            </div>

            <h1
              style={{
                margin: "14px 0 8px",
                fontSize: 30,
                lineHeight: 1.15,
                color: "#0B1F33",
              }}
            >
              Browse members, shops, and demand
            </h1>

            <div
              style={{
                color: "#475569",
                fontSize: 15,
                lineHeight: 1.75,
                maxWidth: 760,
              }}
            >
              Browse people first. Each shop is tied to one global identity.
              Demand remains identity-based, so members can ask for help even
              without opening a shop.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/community" style={btn(true)}>
                Community Home
              </Link>
              <Link to="/app/demand-box" style={btn(false)}>
                Demand Box
              </Link>
            </div>
          </div>

          <div
            style={{
              minWidth: 260,
              flex: "0 1 320px",
              ...softCard("#FFFFFF"),
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, color: "#64748B" }}>
              Active community
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 18,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              {activeClan ? formatClanName(activeClan) : "No community selected"}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.65,
                fontSize: 14,
              }}
            >
              Visibility comes from the communities you belong to.
            </div>

            <div style={{ marginTop: 14 }}>
              <select
                value={selectedClanId ?? ""}
                onChange={(e) => handleSelectClan(Number(e.target.value))}
                disabled={switchingClan || clans.length === 0}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(11,31,51,0.12)",
                  background: "#FFFFFF",
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#0B1F33",
                  outline: "none",
                }}
              >
                {clans.length === 0 ? (
                  <option value="">No communities available</option>
                ) : (
                  clans.map((clan) => (
                    <option key={clan.id} value={clan.id}>
                      {formatClanName(clan)}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div style={card("#FFFFFF")}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Members visible
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {summary.membersVisible}
          </div>
        </div>

        <div style={card("#FFFFFF")}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Linked shops
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {summary.shopsLinked}
          </div>
        </div>

        <div style={card("#FFFFFF")}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Members with demand
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {summary.demandMembers}
          </div>
        </div>

        <div style={card("#FFFFFF")}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
            Open demand signals
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {summary.demandTotal}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, ...pageCard("#FFFFFF") }}>
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Member directory
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                lineHeight: 1.65,
                maxWidth: 760,
              }}
            >
              Browse people first. Shop and demand appear under each member.
            </div>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search member, GMFN ID, shop, or demand"
            style={{
              width: 320,
              maxWidth: "100%",
              borderRadius: 12,
              border: "1px solid rgba(11,31,51,0.12)",
              background: "#FFFFFF",
              padding: "12px 14px",
              fontSize: 14,
              color: "#0B1F33",
              outline: "none",
            }}
          />
        </div>

        {error ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: 14,
              border: "1px solid rgba(220,38,38,0.16)",
              background: "rgba(220,38,38,0.05)",
              color: "#991B1B",
              padding: 14,
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              marginTop: 18,
              color: "#64748B",
              lineHeight: 1.7,
            }}
          >
            Loading marketplace...
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={{ marginTop: 18, ...softCard("#F8FBFF") }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#0B1F33",
              }}
            >
              No visible member commerce records yet
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.6,
              }}
            >
              When members create shops or publish demand, they will appear here.
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 14,
            }}
          >
            {filteredCards.map((item) => {
              const shopName = safeStr(item.shop?.name || item.shop?.title || "No shop yet");
              const category = safeStr(item.shop?.category || "General");
              const shopDescription = safeStr(item.shop?.description || "");
              const canOpenShop = !!item.shop && !!item.gmfnId;

              return (
                <div key={item.key} style={card("#FFFFFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 1000,
                          color: "#0B1F33",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.memberName}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#64748B",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {item.gmfnId || "GMFN ID pending"}
                      </div>
                    </div>

                    <span style={item.shop ? badge(true) : badge(false)}>
                      {item.shop ? "Shop linked" : "No shop yet"}
                    </span>
                  </div>

                  <div style={{ marginTop: 14, ...softCard(item.shop ? "#F8FBFF" : "#FCFCFD") }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#64748B",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      Shop
                    </div>

                    {item.shop ? (
                      <>
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 18,
                            fontWeight: 1000,
                            color: "#0B1F33",
                          }}
                        >
                          {shopName}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={badge(false)}>{category}</span>
                        </div>

                        {shopDescription ? (
                          <div
                            style={{
                              marginTop: 10,
                              color: "#475569",
                              lineHeight: 1.65,
                              fontSize: 14,
                            }}
                          >
                            {shopDescription}
                          </div>
                        ) : null}

                        <div
                          style={{
                            marginTop: 10,
                            display: "grid",
                            gap: 6,
                            color: "#64748B",
                            fontSize: 13,
                          }}
                        >
                          <div>
                            Seller: {item.memberName}
                          </div>
                          <div>
                            GMFN ID: {item.gmfnId || "—"}
                          </div>
                          <div>
                            WhatsApp: {safeStr(item.shop?.whatsapp_number || "—")}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          marginTop: 8,
                          color: "#64748B",
                          lineHeight: 1.6,
                        }}
                      >
                        This member has not opened a shop yet.
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 14, ...softCard("#FFFFFF") }}>
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
                        <div
                          style={{
                            fontSize: 13,
                            color: "#64748B",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          Demand
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 16,
                            fontWeight: 900,
                            color: "#0B1F33",
                          }}
                        >
                          {item.demandCount > 0
                            ? `${item.demandCount} active signal${item.demandCount > 1 ? "s" : ""}`
                            : "No active demand"}
                        </div>
                      </div>

                      <Link to="/app/demand-box" style={btn(false)}>
                        Open Demand
                      </Link>
                    </div>

                    {item.latestDemandTitle ? (
                      <div
                        style={{
                          marginTop: 10,
                          color: "#475569",
                          lineHeight: 1.6,
                          fontSize: 14,
                        }}
                      >
                        Latest: {item.latestDemandTitle}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {canOpenShop ? (
                      <Link
                        to={`/app/shop/${encodeURIComponent(item.gmfnId)}`}
                        style={btn(true)}
                      >
                        Open Shop
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate("/app/shop-control")}
                        style={btn(false)}
                      >
                        Create Shop
                      </button>
                    )}

                    <Link to="/app/community" style={btn(false)}>
                      Community Home
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 18, ...pageCard("#FFFFFF") }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Community portals
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#64748B",
            lineHeight: 1.7,
            maxWidth: 860,
          }}
        >
          Invite and money stay at community level, not inside individual shops.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <div style={softCard("#F8FBFF")}>
            <div style={{ fontWeight: 900, color: "#0B1F33" }}>Invite</div>
            <div style={{ marginTop: 8, color: "#64748B", lineHeight: 1.6 }}>
              Manage invites for your communities.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to="/app/clans" style={btn(false)}>
                Open Invites
              </Link>
            </div>
          </div>

          <div style={softCard("#F8FBFF")}>
            <div style={{ fontWeight: 900, color: "#0B1F33" }}>Money In</div>
            <div style={{ marginTop: 8, color: "#64748B", lineHeight: 1.6 }}>
              Add money through the community structure.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to="/app/payment/pool" style={btn(false)}>
                Open Money In
              </Link>
            </div>
          </div>

          <div style={softCard("#F8FBFF")}>
            <div style={{ fontWeight: 900, color: "#0B1F33" }}>Money Out</div>
            <div style={{ marginTop: 8, color: "#64748B", lineHeight: 1.6 }}>
              Withdraw through the same structured community path.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to="/app/withdrawal-instructions" style={btn(false)}>
                Open Money Out
              </Link>
            </div>
          </div>
        </div>
      </div>

      {me ? (
        <div
          style={{
            marginTop: 18,
            color: "#64748B",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Signed in as {safeStr(me?.full_name || me?.nickname || me?.email || "member")}
        </div>
      ) : null}
    </div>
  );
}