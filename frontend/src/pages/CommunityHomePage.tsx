import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getClanInviteLink,
  getCurrentClan,
  getMe,
  listMyClans,
  selectClan,
} from "../lib/api";

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 18,
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
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
  };
}

function safeStr(x: any): string {
  return String(x ?? "");
}

export default function CommunityHomePage() {
  const navigate = useNavigate();

  const [clan, setClan] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [myClans, setMyClans] = useState<any[]>([]);
  const [inviteMap, setInviteMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clanRes, meRes, clansRes] = await Promise.all([
          getCurrentClan().catch(() => null),
          getMe().catch(() => null),
          listMyClans().catch(() => []),
        ]);

        setClan(clanRes);
        setMe(meRes);

        const list = Array.isArray(clansRes) ? clansRes : clansRes?.items || [];
        setMyClans(list);

        // preload invite links
        const map: Record<number, string> = {};
        for (const c of list) {
          const clanId = Number(c?.id || c?.clan_id || 0);
          if (!clanId) continue;

          const res = await getClanInviteLink(clanId).catch(() => null);
          const link = String(
            res?.invite_url || res?.url || res?.link || ""
          ).trim();

          map[clanId] = link;
        }
        setInviteMap(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const communityName = useMemo(() => {
    return safeStr(clan?.name || "Selected Community");
  }, [clan]);

  const myShopLink = useMemo(() => {
    const id = String(me?.gmfn_id || "").trim();
    return id ? `/app/shop/${encodeURIComponent(id)}` : "";
  }, [me]);

  async function openCommunity(clanId: number) {
    await selectClan(clanId);
    navigate("/app/community");
    window.location.reload();
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 30 }}>
      {/* Top Nav */}
      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <button onClick={() => navigate(-1)} style={btn(false)}>
          ← Back
        </button>
        <Link to="/app/dashboard" style={btn(true)}>
          Dashboard
        </Link>
      </div>

      {/* Header */}
      <div style={{ ...card("#F8FBFF"), marginTop: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
          Community Home
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88" }}>
          Work inside this community. Open your shop, manage funds, or switch communities.
        </div>
      </div>

      {/* My Shop */}
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>MY SHOP</div>

        <div style={{ marginTop: 12 }}>
          {myShopLink ? (
            <Link to={myShopLink} style={btn(true)}>
              Open My Shop
            </Link>
          ) : (
            <button style={btn(true, true)} disabled>
              Shop not ready
            </button>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <button style={btn(false)} onClick={() => navigate("/app/shop-control")}>
            Manage My Shop
          </button>
        </div>
      </div>

      {/* Money */}
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>MONEY</div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/app/payment/pool" style={btn(true)}>
            Add Money
          </Link>
          <Link to="/app/withdrawal-instructions" style={btn(false)}>
            Withdraw
          </Link>
          <Link to="/app/loan-workbench" style={btn(false)}>
            Loan Workbench
          </Link>
        </div>
      </div>

      {/* Communities */}
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>MY COMMUNITIES</div>

        {loading ? (
          <div style={{ marginTop: 12 }}>Loading...</div>
        ) : myClans.length === 0 ? (
          <div style={{ marginTop: 12 }}>No communities yet</div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {myClans.map((c: any) => {
              const clanId = Number(c?.id || c?.clan_id || 0);
              const link = inviteMap[clanId];

              return (
                <div key={clanId} style={softCard()}>
                  <div style={{ fontWeight: 1000 }}>
                    {safeStr(c?.name || `Community ${clanId}`)}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button style={btn(true)} onClick={() => openCommunity(clanId)}>
                      Open
                    </button>

                    {link ? (
                      <button
                        style={btn(false)}
                        onClick={() => navigator.clipboard.writeText(link)}
                      >
                        Copy Invite
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}