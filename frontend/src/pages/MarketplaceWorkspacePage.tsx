import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getClanInviteLink,
  getSelectedClanId,
  listClanMembers,
  listJoinRequests,
  safeCopy,
  setSelectedClanId,
} from "../lib/api";
import { navigateWithOrigin } from "../lib/nav";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
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

function resolveImageSrc(src?: string | null): string {
  const raw = String(src || "").trim();
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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
    padding: 18,
    overflow: "hidden",
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

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    gap: 8,
    opacity: disabled ? 0.72 : 1,
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

function muted(): React.CSSProperties {
  return {
    color: "#64748B",
    lineHeight: 1.7,
    fontSize: 14,
  };
}

function sectionTitle(): React.CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 1000,
    color: "#0B1F33",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

type CommunityTrustState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
};

function getCommunityTrustState(source: any): CommunityTrustState {
  const rawScore =
    source?.community_cci_score ??
    source?.cci_score ??
    source?.trust_score ??
    source?.community_trust_score ??
    null;

  const rawClass =
    source?.community_cci_class ??
    source?.cci_class ??
    source?.trust_class ??
    source?.community_trust_class ??
    "";

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    return {
      classText,
      scoreText:
        scoreNum === null || Number.isNaN(scoreNum)
          ? "Not available yet"
          : String(Math.round(scoreNum)),
      tone:
        classText === "A" || classText === "A+" || classText === "B"
          ? "green"
          : classText === "C"
          ? "yellow"
          : "red",
      statusText:
        classText === "A" || classText === "A+"
          ? "Healthy"
          : classText === "B"
          ? "Stable"
          : classText === "C"
          ? "Needs attention"
          : "At risk",
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy",
      };
    }
    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable",
      };
    }
    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
      };
    }
    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
    };
  }

  return {
    classText: "Awaiting reading",
    scoreText: "Not available yet",
    tone: "neutral",
    statusText: "Loading",
  };
}

function communityToneStyles(tone: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green") {
    return {
      bg: "#F0FDF4",
      border: "1px solid rgba(34,197,94,0.18)",
      text: "#166534",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEB",
      border: "1px solid rgba(245,158,11,0.18)",
      text: "#92400E",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FEF2F2",
      border: "1px solid rgba(239,68,68,0.18)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.18)",
    text: "#334155",
  };
}

export default function MarketplaceWorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const routeClanId = safeNum(params.clanId);
  const storedClanId = safeNum(getSelectedClanId() || 0);
  const activeClanId = routeClanId || storedClanId;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [privateBlocksLocked, setPrivateBlocksLocked] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(true);
  const [moneyOpen, setMoneyOpen] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);

  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  useEffect(() => {
    if (activeClanId > 0) {
      setSelectedClanId(activeClanId);
    }
  }, [activeClanId]);

  useEffect(() => {
    async function loadAll() {
      if (!activeClanId) {
        setErr("No community selected.");
        return;
      }

      setBusy(true);
      setErr("");
      setMsg("");
      setPrivateBlocksLocked(false);

      try {
        const [inviteRes, joinRes, membersRes] = await Promise.allSettled([
          getClanInviteLink(activeClanId),
          listJoinRequests(activeClanId),
          listClanMembers(activeClanId),
        ]);

        if (inviteRes.status === "fulfilled") {
          setInviteInfo(inviteRes.value || null);
        } else {
          throw new Error("Unable to load community workspace.");
        }

        if (joinRes.status === "fulfilled") {
          setJoinRequests(
            Array.isArray(joinRes.value) ? joinRes.value : joinRes.value?.items || []
          );
        } else {
          setJoinRequests([]);
          setPrivateBlocksLocked(true);
        }

        if (membersRes.status === "fulfilled") {
          setMembers(
            Array.isArray(membersRes.value)
              ? membersRes.value
              : membersRes.value?.items || []
          );
        } else {
          setMembers([]);
          setPrivateBlocksLocked(true);
        }
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load community page."));
      } finally {
        setBusy(false);
      }
    }

    void loadAll();
  }, [activeClanId]);

  const communityName = useMemo(() => {
    if (inviteInfo?.marketplace_name) return safeStr(inviteInfo.marketplace_name);
    if (inviteInfo?.clan_name) return safeStr(inviteInfo.clan_name);
    if (inviteInfo?.community_name) return safeStr(inviteInfo.community_name);
    return "Community";
  }, [inviteInfo]);

  const communityIdentity = useMemo(() => {
    return safeStr(
      inviteInfo?.community_id ||
        inviteInfo?.marketplace_id ||
        inviteInfo?.clan_code ||
        inviteInfo?.gmfn_id ||
        activeClanId ||
        ""
    );
  }, [inviteInfo, activeClanId]);

  const communityPicture = useMemo(() => {
    return safeStr(
      inviteInfo?.community_image_url ||
        inviteInfo?.marketplace_image_url ||
        inviteInfo?.image_url ||
        inviteInfo?.image ||
        ""
    );
  }, [inviteInfo]);

  const communityDescription = useMemo(() => {
    return safeStr(
      inviteInfo?.community_description ||
        inviteInfo?.marketplace_description ||
        inviteInfo?.description ||
        ""
    );
  }, [inviteInfo]);

  const inviteLink = useMemo(() => {
    return safeStr(
      inviteInfo?.invite_url ||
        inviteInfo?.url ||
        inviteInfo?.link ||
        inviteInfo?.invite_link ||
        ""
    );
  }, [inviteInfo]);

  const inviteCode = useMemo(() => {
    return safeStr(inviteInfo?.invite_code || inviteInfo?.code || "");
  }, [inviteInfo]);

  const shopViewLink = useMemo(() => {
    return safeStr(
      inviteInfo?.shop_view_url ||
        inviteInfo?.shop_link ||
        inviteInfo?.shop_profile_url ||
        inviteInfo?.public_shop_url ||
        ""
    );
  }, [inviteInfo]);

  const guideUrl = useMemo(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/GMFN_FINAL_WHITE.pdf`;
    }
    return "/GMFN_FINAL_WHITE.pdf";
  }, []);

  const pendingCount = useMemo(() => {
    return joinRequests.filter(
      (x) => safeStr(x?.status).toLowerCase() === "pending"
    ).length;
  }, [joinRequests]);

  const communityTrust = useMemo(
    () => getCommunityTrustState(inviteInfo),
    [inviteInfo]
  );
  const trustTone = useMemo(
    () => communityToneStyles(communityTrust.tone),
    [communityTrust.tone]
  );

  const communityHomeLink = useMemo(() => {
    return activeClanId ? `/app/community/${activeClanId}` : "/app/community";
  }, [activeClanId]);

  const memberRows = useMemo(() => {
    return members.map((member: any, idx: number) => {
      const displayName =
        safeStr(
          member?.display_name ||
            member?.full_name ||
            member?.nickname ||
            member?.email
        ) || `Member ${idx + 1}`;

      const gmfnId = safeStr(
        member?.gmfn_id ||
          member?.member_gmfn_id ||
          member?.user?.gmfn_id
      );

      const shopName = safeStr(
        member?.shop_name ||
          member?.marketplace_shop_name ||
          member?.shop?.name
      );

      return {
        raw: member,
        key: safeNum(member?.id) || idx,
        displayName,
        gmfnId,
        shopName,
        role: safeStr(member?.role || member?.membership_role || "member"),
      };
    });
  }, [members]);

  function copyInviteMessage() {
    const title = safeStr(communityName || "this community");
    const text = [
      `Hello,`,
      ``,
      `You are invited to begin the request-to-join process for ${title}.`,
      `Admission is not automatic. Existing members still review and vote according to community rules.`,
      ``,
      `Use this community link to begin:`,
      inviteLink || "(invite link unavailable)",
      ``,
      `Guide:`,
      guideUrl,
    ].join("\n");

    safeCopy(text);
    setMsg("Community invite message copied.");
  }

  function shareWhatsAppJoin() {
    const title = safeStr(communityName || "this community");
    const text = [
      `You are invited to begin the request-to-join process for ${title}.`,
      `Admission is not automatic. Members still review and vote.`,
      inviteLink,
      `Guide: ${guideUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function copyShopViewLink() {
    if (!shopViewLink) return;
    safeCopy(shopViewLink);
    setMsg("Community shop-view link copied.");
  }

  function copyShopViewMessage() {
    const title = safeStr(communityName || "this community");
    const text = [
      `Take a look at shops visible in ${title}.`,
      shopViewLink || "(shop view link unavailable)",
      `Guide: ${guideUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    safeCopy(text);
    setMsg("Community shop-view message copied.");
  }

  function openShopForMember(member: any) {
    const gmfnId = safeStr(
      member?.gmfn_id || member?.member_gmfn_id || member?.user?.gmfn_id
    );
    if (!gmfnId) {
      setMsg("This member does not yet have a visible shop identity.");
      return;
    }
    navigateWithOrigin(navigate, `/app/shop/${encodeURIComponent(gmfnId)}`, location);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 36 }}>
      <PageTopNav sectionLabel="Community Workspace" title={communityName} subtitle="Community workspace." />

      {err ? (
        <div
          style={{
            ...pageCard("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            ...pageCard("#ECFDF5"),
            marginTop: 18,
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {msg}
        </div>
      ) : null}

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Community profile</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "0.9fr 1.1fr",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div style={softCard("#FCFEFF")}>
            {communityPicture ? (
              <img
                src={resolveImageSrc(communityPicture)}
                alt={communityName}
                style={{
                  width: "100%",
                  height: 220,
                  objectFit: "cover",
                  borderRadius: 16,
                  border: "1px solid rgba(11,31,51,0.08)",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 16,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background: "linear-gradient(180deg, #EAF2FF 0%, #DCEBFF 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                Community Picture
              </div>
            )}
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 900 }}>
              Community identity
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              {communityName}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>
                Community ID: {communityIdentity || "Not available yet"}
              </span>
              <span style={badge(false)}>Members: {memberRows.length}</span>
              <span style={badge(false)}>Alerts: {pendingCount}</span>
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 560,
              }}
            >
              {communityDescription ||
                "This keeps one community's invite links, money and support routes, demand, spotlight, and member-to-shop mapping clear."}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <OriginLink to={communityHomeLink} style={btn(false)}>
                Community Home
              </OriginLink>
              <OriginLink to="/app/marketplace" style={btn(false)}>
                Marketplace
              </OriginLink>
              <OriginLink to="/app/clans" style={btn(false)}>
                Create Community
              </OriginLink>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          ...pageCard(trustTone.bg),
          marginTop: 18,
          border: trustTone.border,
        }}
      >
        <div style={{ fontSize: 13, color: trustTone.text, fontWeight: 900 }}>
          Community trust reading
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 1000,
                lineHeight: 1,
                color: trustTone.text,
              }}
            >
              {communityTrust.classText}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                padding: "7px 12px",
                borderRadius: 999,
                background: "#FFFFFF",
                border: trustTone.border,
                color: trustTone.text,
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              Score: {communityTrust.scoreText}
            </div>

            <div
              style={{
                marginTop: 14,
                color: trustTone.text,
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              {communityTrust.statusText}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setAlertsOpen((v) => !v)}
              style={btn(false)}
            >
              {alertsOpen ? "Hide Alerts" : "Open Alerts"}
            </button>
            <button
              type="button"
              onClick={() => setMembersOpen((v) => !v)}
              style={btn(false)}
            >
              {membersOpen ? "Hide Members" : "Open Members"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionTitle()}>Action layer</div>
          <button
            type="button"
            onClick={() => setInviteOpen((v) => !v)}
            style={btn(false)}
          >
            {inviteOpen ? "Hide" : "Open"}
          </button>
        </div>

        {inviteOpen ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div style={softCard("#F8FBFF")}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                Invite package
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                    Invite code
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 1000,
                    }}
                  >
                    {inviteCode || "Invite code not available yet."}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                    Invite link
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      wordBreak: "break-word",
                    }}
                  >
                    {inviteLink || "Invite link not available yet."}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                    Guide
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      wordBreak: "break-word",
                    }}
                  >
                    {guideUrl}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      safeCopy(inviteLink);
                      setMsg("Community invite link copied.");
                    }}
                    style={btn(true, !inviteLink)}
                    disabled={!inviteLink}
                  >
                    Copy Join Link
                  </button>

                  <button
                    type="button"
                    onClick={copyInviteMessage}
                    style={btn(false)}
                  >
                    Copy Join Message
                  </button>

                  <button
                    type="button"
                    onClick={shareWhatsAppJoin}
                    style={btn(false)}
                  >
                    Send via WhatsApp
                  </button>
                </div>
              </div>
            </div>

            <div style={softCard("#F8FBFF")}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                Localized routes
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <OriginLink to="/app/demand-box" style={btn(false)}>
                  Demand
                </OriginLink>
                <OriginLink to="/app/marketplace" style={btn(false)}>
                  Spotlight
                </OriginLink>
                <OriginLink to="/app/clans" style={btn(false)}>
                  Create Community
                </OriginLink>
              </div>
            </div>

            <div style={softCard("#F8FBFF")}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                View shop from this community
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.7,
                }}
              >
                Share the viewing link for this community's shop-facing page.
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  wordBreak: "break-word",
                }}
              >
                {shopViewLink || "Shop view link not available yet."}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={copyShopViewLink}
                  style={btn(false)}
                  disabled={!shopViewLink}
                >
                  Copy Shop View Link
                </button>

                <button
                  type="button"
                  onClick={copyShopViewMessage}
                  style={btn(false)}
                  disabled={!shopViewLink}
                >
                  Copy Shop View Message
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionTitle()}>Money & Support</div>
          <button
            type="button"
            onClick={() => setMoneyOpen((v) => !v)}
            style={btn(false)}
          >
            {moneyOpen ? "Hide" : "Open"}
          </button>
        </div>

        {moneyOpen ? (
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
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/payment/pool", location)}
            >
              Money In
            </button>
            <button
              type="button"
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/withdrawal-instructions", location)}
            >
              Money Out
            </button>
            <button
              type="button"
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/loans", location)}
            >
              Loans
            </button>
            <button
              type="button"
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/loan-readiness", location)}
            >
              Readiness
            </button>
            <button
              type="button"
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/loan-workbench", location)}
            >
              Workbench
            </button>
            <button
              type="button"
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/guarantor-earnings", location)}
            >
              Earnings
            </button>
            <button
              type="button"
              style={btn(false)}
              onClick={() => navigateWithOrigin(navigate, "/app/loan-suggestions", location)}
            >
              Suggestions
            </button>
          </div>
        ) : null}
      </div>

      {privateBlocksLocked ? (
        <div
          style={{
            ...pageCard("#FFFDF5"),
            marginTop: 18,
            border: "1px solid rgba(214,175,71,0.25)",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#92400E" }}>
            Some private community blocks require sign-in
          </div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
            Invite details are visible here, but full alerts and member mapping
            may
            require signed-in community access.
          </div>
        </div>
      ) : null}

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionTitle()}>Community alerts</div>
          <button
            type="button"
            onClick={() => setAlertsOpen((v) => !v)}
            style={btn(false)}
          >
            {alertsOpen ? "Hide" : "Open"}
          </button>
        </div>

        {alertsOpen ? (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {joinRequests.length === 0 ? (
              <div style={{ color: "#64748B" }}>No community alerts yet.</div>
            ) : (
              joinRequests.map((req: any, idx: number) => (
                <div key={safeNum(req?.id) || idx} style={softCard("#F8FBFF")}>
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
                      <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                        Membership request #{safeNum(req?.id) || "Not available yet"}
                      </div>
                      <div style={{ marginTop: 6, ...muted() }}>
                        Status: {safeStr(req?.status || "pending")}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <OriginLink
                        to={`/app/community/${activeClanId}/join-requests`}
                        style={btn(true)}
                      >
                        Open Requests
                      </OriginLink>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionTitle()}>Members to shop mapping</div>
          <button
            type="button"
            onClick={() => setMembersOpen((v) => !v)}
            style={btn(false)}
          >
            {membersOpen ? "Hide" : "Open"}
          </button>
        </div>

        {membersOpen ? (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {memberRows.length === 0 ? (
              <div style={{ color: "#64748B" }}>No members found yet.</div>
            ) : (
              memberRows.map((member, idx) => (
                <div
                  key={member.key || idx}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background: "#FFFFFF",
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 1000,
                        color: "#0B1F33",
                        fontSize: 16,
                      }}
                    >
                      {member.displayName}
                    </div>

                    <div style={{ marginTop: 6, ...muted() }}>
                      {member.shopName ? `Shop: ${member.shopName}` : "No shop yet"}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color: "#0B63D1",
                        fontWeight: 1000,
                        fontSize: 13,
                      }}
                    >
                      {member.gmfnId
                        ? `GMFN ID: ${member.gmfnId}`
                        : "GMFN ID not yet available"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(member.raw)}
                      style={btn(false)}
                    >
                      View Row
                    </button>

                    <button
                      type="button"
                      onClick={() => openShopForMember(member.raw)}
                      style={btn(true)}
                    >
                      Shop Gallery
                    </button>
                  </div>
                </div>
              ))
            )}

            {selectedMember ? (
              <div style={{ ...softCard("#F8FBFF"), marginTop: 4 }}>
                <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                  Selected member
                </div>
                <div style={{ marginTop: 10, ...muted() }}>
                  Member:{" "}
                  {safeStr(
                    selectedMember?.display_name ||
                      selectedMember?.full_name ||
                      selectedMember?.nickname ||
                      selectedMember?.email ||
                      "Not available yet"
                  )}
                </div>
                <div style={muted()}>
                  GMFN ID:{" "}
                  {safeStr(
                    selectedMember?.gmfn_id ||
                      selectedMember?.member_gmfn_id ||
                      selectedMember?.user?.gmfn_id ||
                      "Not available yet"
                  )}
                </div>
                <div style={muted()}>
                  Role:{" "}
                  {safeStr(
                    selectedMember?.role ||
                      selectedMember?.membership_role ||
                      "member"
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {busy ? (
        <div style={{ marginTop: 18, color: "#64748B", fontWeight: 900 }}>
          Loading community page...
        </div>
      ) : null}
    </div>
  );
}






