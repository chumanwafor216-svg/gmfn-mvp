import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getClanInviteLink,
  getCurrentClan,
  getMarketplaceShops,
  getPoolMe,
  getSelectedClanId,
  listClanMembers,
  listMyClans,
  safeCopy,
} from "../lib/api";

type ClanMember = {
  id?: number;
  user_id?: number;
  gmfn_id?: string | null;
  display_name?: string | null;
  nickname?: string | null;
  first_name?: string | null;
  surname?: string | null;
  email?: string | null;
  phone_e164?: string | null;
};

type MarketplaceShop = {
  id?: number;
  user_id?: number;
  owner_user_id?: number;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
};

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
      minHeight: 40,
      padding: "9px 12px",
      borderRadius: 13,
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

function communityImageBox(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 188,
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };
}

function getCommunityImage(clan: any): string {
  return firstTruthy(
    clan?.image_url,
    clan?.avatar_url,
    clan?.photo_url,
    clan?.cover_image_url,
    clan?.banner_url
  );
}

function getCommunityName(clan: any): string {
  return firstTruthy(
    clan?.name,
    clan?.clan_name,
    clan?.marketplace_name,
    "Selected community"
  );
}

function getCommunityDescription(clan: any): string {
  return firstTruthy(
    clan?.description,
    clan?.clan_description,
    clan?.marketplace_description,
    "This selected community surface shows the current marketplace, visible members, and shop galleries linked to this community."
  );
}

function getCommunityGlobalId(clan: any): string {
  return firstTruthy(
    clan?.community_global_id,
    clan?.global_id,
    clan?.gmfn_id,
    clan?.clan_code,
    clan?.code,
    clan?.marketplace_code,
    clan?.id ? `COMM-${clan.id}` : "",
    "Pending"
  );
}

function getCommunityTrustLabel(clan: any): string {
  return firstTruthy(
    clan?.community_trust_band,
    clan?.trust_band,
    clan?.trust_class,
    clan?.reputation_band,
    clan?.status,
    "Visible community"
  );
}

function getMemberName(member: ClanMember): string {
  return firstTruthy(
    member?.display_name,
    member?.nickname,
    [safeStr(member?.first_name), safeStr(member?.surname)]
      .filter(Boolean)
      .join(" "),
    member?.email,
    member?.phone_e164,
    "Member"
  );
}

function getMemberGmfnId(member: ClanMember): string {
  return firstTruthy(member?.gmfn_id);
}

function getShopForMember(
  member: ClanMember,
  shops: MarketplaceShop[]
): MarketplaceShop | null {
  const memberGmfnId = safeStr(member?.gmfn_id || "").toUpperCase();
  const memberUserId = Number(member?.user_id || member?.id || 0);

  for (const shop of shops) {
    const shopGmfn = safeStr(shop?.gmfn_id || shop?.owner_gmfn_id || "").toUpperCase();
    const shopUserId = Number(shop?.user_id || shop?.owner_user_id || 0);

    if (memberGmfnId && shopGmfn && memberGmfnId === shopGmfn) {
      return shop;
    }

    if (memberUserId > 0 && shopUserId > 0 && memberUserId === shopUserId) {
      return shop;
    }
  }

  return null;
}

function getPoolAmountText(payload: any): string {
  const candidates = [
    payload?.available_balance,
    payload?.balance,
    payload?.pool_balance,
    payload?.summary?.available_balance,
    payload?.summary?.balance,
    payload?.totals?.available_balance,
    payload?.totals?.balance,
    payload?.wallet_balance,
  ];

  for (const candidate of candidates) {
    const text = safeStr(candidate);
    if (text) return text;
  }

  return "—";
}

function getPoolCurrency(payload: any): string {
  return firstTruthy(
    payload?.currency,
    payload?.summary?.currency,
    payload?.totals?.currency,
    "NGN"
  );
}

function getCurrentPageUrl(): string {
  try {
    if (typeof window === "undefined") return "";
    return window.location.href;
  } catch {
    return "";
  }
}

export default function MarketplacePage() {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [selectedClan, setSelectedClan] = useState<any>(null);
  const [myClans, setMyClans] = useState<any[]>([]);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState<string>("");

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
      }, 2500);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [copyMessage]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [currentClanRes, clansRes] = await Promise.all([
          getCurrentClan().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        const clanRows = Array.isArray(clansRes)
          ? clansRes
          : Array.isArray(clansRes?.items)
          ? clansRes.items
          : [];

        setMyClans(clanRows);
        setSelectedClan(currentClanRes || clanRows[0] || null);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const communityId = useMemo(() => {
    return Number(selectedClan?.id || selectedClanId || 0);
  }, [selectedClan, selectedClanId]);

  useEffect(() => {
    let alive = true;

    if (!communityId) {
      setMembers([]);
      setShops([]);
      setPoolInfo(null);
      setInviteLink("");
      return;
    }

    (async () => {
      const [membersRes, shopsRes, poolRes, inviteRes] = await Promise.all([
        listClanMembers(communityId).catch(() => ({ items: [] })),
        getMarketplaceShops({ clan_id: communityId, limit: 200 }).catch(() => ({
          items: [],
        })),
        getPoolMe("NGN", 20).catch(() => null),
        getClanInviteLink(communityId).catch(() => null),
      ]);

      if (!alive) return;

      const memberRows: ClanMember[] = Array.isArray(membersRes)
        ? membersRes
        : Array.isArray(membersRes?.items)
        ? membersRes.items
        : [];

      const shopRows: MarketplaceShop[] = Array.isArray(shopsRes)
        ? shopsRes
        : Array.isArray(shopsRes?.items)
        ? shopsRes.items
        : [];

      setMembers(memberRows);
      setShops(shopRows);
      setPoolInfo(poolRes);

      const resolvedInviteLink = firstTruthy(
        inviteRes?.url,
        inviteRes?.invite_url,
        inviteRes?.link,
        inviteRes?.invite_link
      );

      setInviteLink(resolvedInviteLink);
    })();

    return () => {
      alive = false;
    };
  }, [communityId]);

  const communityName = getCommunityName(selectedClan);
  const communityDescription = getCommunityDescription(selectedClan);
  const communityGlobalId = getCommunityGlobalId(selectedClan);
  const communityTrust = getCommunityTrustLabel(selectedClan);
  const communityImage = getCommunityImage(selectedClan);
  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);

  const memberShopRows = useMemo(() => {
    const rows = members.map((member) => {
      const shop = getShopForMember(member, shops);
      const gmfnId = getMemberGmfnId(member);
      const shopName = firstTruthy(shop?.name, "No visible shop yet");

      return {
        member,
        memberName: getMemberName(member),
        gmfnId,
        shopName,
        shop,
        shopTo: gmfnId ? `/app/shop/${encodeURIComponent(gmfnId)}` : "",
      };
    });

    rows.sort((a, b) => a.memberName.localeCompare(b.memberName));
    return rows;
  }, [members, shops]);

  function copyInviteLink() {
    if (!inviteLink) {
      setCopyMessage("Invite link is not ready yet.");
      return;
    }

    safeCopy(inviteLink);
    setCopyMessage("Invite link copied.");
  }

  function copyTrustLink() {
    const pageUrl = getCurrentPageUrl();
    if (!pageUrl) {
      setCopyMessage("Community link is not available.");
      return;
    }

    safeCopy(pageUrl);
    setCopyMessage("Community trust link copied.");
  }

  function copyCommunityId() {
    if (!communityGlobalId) {
      setCopyMessage("Community ID is not available.");
      return;
    }

    safeCopy(communityGlobalId);
    setCopyMessage("Community ID copied.");
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
          sectionLabel="Marketplace"
          title="Selected community marketplace"
          subtitle="Preparing the selected community surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/community"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Demand Box", to: "/app/demand-box" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading selected community...
          </div>
        </section>
      </div>
    );
  }

  if (!communityId || !selectedClan) {
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
          sectionLabel="Marketplace"
          title="Selected community marketplace"
          subtitle="Marketplace is the selected community surface. Choose a community first from Community Home."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/community"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>No selected community</div>

          <div
            style={{
              marginTop: 12,
              color: "#0B1F33",
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.15,
              maxWidth: 760,
            }}
          >
            Open Community Home first, then choose the community you want to work with.
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
            Community Home remains the private control room. Marketplace is the
            selected community surface that opens after a community has been chosen.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/app/community" style={actionBtn("primary")}>
              Open Community Home
            </Link>
            <Link to="/app/dashboard" style={actionBtn("secondary")}>
              Dashboard
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
        sectionLabel="Marketplace"
        title={communityName}
        subtitle="This is the selected community surface. Review the community profile, use community actions, and open member shop galleries."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/community"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Demand Box", to: "/app/demand-box" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          { label: "Trust", to: "/app/trust" },
        ]}
      />

      {copyMessage ? (
        <div
          style={{
            ...softCard("#F3FBF5"),
            color: "#166534",
            border: "1px solid rgba(34,197,94,0.16)",
            fontWeight: 800,
          }}
        >
          {copyMessage}
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1.22fr) minmax(320px, 0.78fr)",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Community profile</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "250px minmax(0, 1fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div>
              <div style={communityImageBox()}>
                {communityImage ? (
                  <img
                    src={communityImage}
                    alt={communityName}
                    style={{
                      width: "100%",
                      height: "100%",
                      minHeight: 188,
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
                      fontSize: 22,
                      lineHeight: 1.3,
                    }}
                  >
                    {communityName}
                  </div>
                )}
              </div>
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
                {communityName}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Community ID: {communityGlobalId}</span>
                <span style={badge(false)}>Community trust: {communityTrust}</span>
                <span style={badge(false)}>Members: {members.length}</span>
                <span style={badge(false)}>Visible shops: {shops.length}</span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#5F7287",
                  fontSize: 15,
                  lineHeight: 1.8,
                  maxWidth: 760,
                }}
              >
                {communityDescription}
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Link to="/app/trust-slip" style={actionBtn("primary")}>
                  Merchant Verify
                </Link>

                <button
                  type="button"
                  onClick={copyTrustLink}
                  style={actionBtn("secondary")}
                >
                  Copy Trust Link
                </button>

                <button
                  type="button"
                  onClick={copyCommunityId}
                  style={actionBtn("secondary")}
                >
                  Copy Community ID
                </button>
              </div>

              <div
                style={{
                  marginTop: 16,
                  ...innerCard("#F8FBFF"),
                }}
              >
                <div style={sectionLabel()}>What this page does</div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.8,
                  }}
                >
                  This page belongs to the selected community surface. It is not
                  your private control room. It shows the community profile, visible
                  members, and each member’s shop gallery link.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}>
          <div style={sectionLabel()}>Community actions</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: 24,
              fontWeight: 900,
              lineHeight: 1.2,
            }}
          >
            Main actions for this selected community.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            Use these buttons for invite, demand, spotlight, notification review,
            and pool-related movement while staying inside the selected community context.
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
              onClick={copyInviteLink}
              style={actionBtn("primary", !inviteLink)}
              disabled={!inviteLink}
            >
              Copy Invite Link
            </button>

            <Link to="/app/demand-box" style={actionBtn("secondary")}>
              Demand Box
            </Link>

            <Link to="/app/marketplace?compose=spotlight" style={actionBtn("secondary")}>
              Spotlight
            </Link>

            <Link to="/app/notifications" style={actionBtn("secondary")}>
              Notifications
            </Link>

            <Link to="/create" style={actionBtn("secondary")}>
              Create Community
            </Link>
          </div>

          <div
            style={{
              marginTop: 16,
              ...softCard("#FFFFFF"),
            }}
          >
            <div style={sectionLabel()}>Money in and money out</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              Your pool position: {poolAmount} {poolCurrency}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              This block shows only your own position in the pool connected to
              this selected community context, not the balances of everyone else.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/payment/pool" style={actionBtn("secondary")}>
                Money In
              </Link>

              <Link
                to="/app/withdrawal-instructions"
                style={actionBtn("secondary")}
              >
                Money Out
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
            <div style={sectionLabel()}>Members and shop galleries</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              Open any visible member’s shop gallery from the row below.
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
                maxWidth: 860,
              }}
            >
              This surface is for viewing. It should not carry shop-control
              functions. Each row points to the public or member-facing shop gallery
              for that member.
            </div>
          </div>

          <span style={badge(false)}>{memberShopRows.length} visible member rows</span>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {memberShopRows.length === 0 ? (
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              No member rows are visible yet for this selected community.
            </div>
          ) : (
            memberShopRows.map((row, index) => (
              <div
                key={`${row.gmfnId || row.member?.id || index}`}
                style={innerCard("#FCFEFF")}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "minmax(0, 1.2fr) minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 17,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {row.memberName}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#64748B",
                        fontSize: 13,
                        lineHeight: 1.65,
                      }}
                    >
                      {row.gmfnId ? `GMFN ID: ${row.gmfnId}` : "GMFN ID pending"}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 15,
                        fontWeight: 800,
                        lineHeight: 1.35,
                      }}
                    >
                      {row.shopName}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#64748B",
                        fontSize: 13,
                        lineHeight: 1.65,
                      }}
                    >
                      {row.shop
                        ? "Visible shop gallery is available."
                        : "No visible shop gallery yet."}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: isCompact ? "flex-start" : "flex-end",
                    }}
                  >
                    {row.shopTo ? (
                      <Link to={row.shopTo} style={actionBtn("primary")}>
                        Open Shop Gallery
                      </Link>
                    ) : (
                      <button
                        type="button"
                        style={actionBtn("secondary", true)}
                        disabled
                      >
                        No Shop Yet
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {myClans.length > 1 ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Your wider community context</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: 22,
              fontWeight: 900,
              lineHeight: 1.2,
            }}
          >
            You belong to {myClans.length} communities.
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.8,
              maxWidth: 860,
            }}
          >
            Demand and spotlight remain attached to your identity and shop, while
            the selected community surface stays community-based. Switch communities
            from Community Home whenever you want to work inside a different one.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/app/community" style={actionBtn("primary")}>
              Open Community Home
            </Link>
            <Link to="/app/dashboard" style={actionBtn("secondary")}>
              Dashboard
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}