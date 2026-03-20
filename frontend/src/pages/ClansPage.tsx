import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createClan,
  getClanInviteLink,
  getSelectedClanId,
  listMyClans,
  safeCopy,
  setSelectedClanId,
} from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
}

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function btn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 14,
    textDecoration: "none",
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FAFC",
    padding: 16,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    boxSizing: "border-box",
    fontSize: 14,
  };
}

function textareaStyle(rows = 3): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    boxSizing: "border-box",
    fontSize: 14,
    resize: "vertical",
    minHeight: rows * 26,
  };
}

function helperText(): React.CSSProperties {
  return {
    marginTop: 6,
    color: "#6B7A88",
    lineHeight: 1.75,
    fontSize: 13,
  };
}

type ClanItem = {
  id?: number;
  clan_id?: number;
  name?: string;
  description?: string | null;
  marketplace_name?: string | null;
  marketplace_description?: string | null;
};

type InviteInfo = {
  invite_code?: string;
  invite_created_at?: string | null;
  invite_expires_at?: string | null;
  invite_max_uses?: number | null;
  invite_uses?: number | null;
  invite_link?: string;
  invite_url?: string;
  url?: string;
  link?: string;
  invite_text?: string;
};

export default function ClansPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<ClanItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [marketplaceName, setMarketplaceName] = useState("");
  const [marketplaceDescription, setMarketplaceDescription] = useState("");

  const [createdClan, setCreatedClan] = useState<ClanItem | null>(null);

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteMessage, setInviteMessage] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await listMyClans().catch(() => ({ items: [] }));
      const rows = Array.isArray(res) ? res : res?.items || [];
      setItems(rows);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load communities."));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedClanId = useMemo(
    () => Number(getSelectedClanId() || 0),
    [items, createdClan, inviteInfo]
  );

  const selectedClan = useMemo(() => {
    if (!selectedClanId) return null;
    return (
      items.find((x) => Number(x?.id || x?.clan_id || 0) === selectedClanId) ||
      (createdClan &&
      Number(createdClan?.id || createdClan?.clan_id || 0) === selectedClanId
        ? createdClan
        : null)
    );
  }, [items, createdClan, selectedClanId]);

  const inviteLink = useMemo(() => {
    return safeStr(
      inviteInfo?.invite_url ||
        inviteInfo?.url ||
        inviteInfo?.link ||
        inviteInfo?.invite_link ||
        ""
    ).trim();
  }, [inviteInfo]);

  function suggestedMarketplaceName(): string {
    const clanName = safeStr(name).trim();
    if (!clanName) return "";
    return `${clanName} Marketplace`;
  }

  function buildInviteMessage(clan: ClanItem | null, link: string): string {
    const clanName = safeStr(clan?.name || "our GMFN community").trim();
    const marketplace = safeStr(clan?.marketplace_name || "").trim();
    const expiresAt = safeStr(inviteInfo?.invite_expires_at || "").trim();

    return [
      `Hello,`,
      ``,
      `You are invited to begin the request-to-join process for ${clanName}.`,
      marketplace ? `Community / market identity: ${marketplace}.` : "",
      `GMFN is a trust-based community infrastructure for structured support, credibility, and economic coordination.`,
      `This invitation is not automatic admission. Final acceptance still depends on community approval.`,
      expiresAt ? `This invitation expires on: ${expiresAt}` : "",
      ``,
      link ? `Use this link to begin: ${link}` : `Invite link will appear here once generated.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function loadInviteForClan(clan: ClanItem | null) {
    const clanId = Number(clan?.id || clan?.clan_id || 0);
    if (!clanId) {
      setInviteInfo(null);
      setInviteMessage("");
      return;
    }

    setInviteBusy(true);
    setErr("");

    try {
      const out = await getClanInviteLink(clanId);
      setInviteInfo(out || null);

      const link = safeStr(
        out?.invite_url || out?.url || out?.link || out?.invite_link || ""
      ).trim();

      setInviteMessage(buildInviteMessage(clan, link));
    } catch (e: any) {
      setInviteInfo(null);
      setInviteMessage(buildInviteMessage(clan, ""));
      setErr(String(e?.message || e || "Unable to load invite link."));
    } finally {
      setInviteBusy(false);
    }
  }

  useEffect(() => {
    if (selectedClan) {
      void loadInviteForClan(selectedClan);
    } else {
      setInviteInfo(null);
      setInviteMessage("");
    }
  }, [selectedClanId]);

  async function handleCreate() {
    setBusy(true);
    setErr("");
    setMsg("");
    setCreatedClan(null);
    setInviteInfo(null);
    setInviteMessage("");

    try {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      const trimmedMarketplaceName =
        marketplaceName.trim() || suggestedMarketplaceName();
      const trimmedMarketplaceDescription = marketplaceDescription.trim();

      if (!trimmedName) {
        throw new Error("Enter a community name.");
      }

      const out = await createClan({
        name: trimmedName,
        description: trimmedDescription || null,
        marketplace_name: trimmedMarketplaceName || null,
        marketplace_description: trimmedMarketplaceDescription || null,
      });

      const clanId = Number(out?.id || out?.clan_id || 0);
      if (!clanId) {
        throw new Error("Community was created but no ID was returned.");
      }

      setSelectedClanId(clanId);

      const created: ClanItem = {
        id: clanId,
        name: out?.name || trimmedName,
        description: out?.description || trimmedDescription,
        marketplace_name:
          out?.marketplace_name ||
          trimmedMarketplaceName ||
          suggestedMarketplaceName(),
        marketplace_description:
          out?.marketplace_description || trimmedMarketplaceDescription,
      };

      setCreatedClan(created);
      setMsg("Community created successfully.");

      setName("");
      setDescription("");
      setMarketplaceName("");
      setMarketplaceDescription("");
      setShowCreate(true);

      await load();
      await loadInviteForClan(created);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to create community."));
    } finally {
      setBusy(false);
    }
  }

  function handleOpenCommunity(clan: any) {
    const clanId = Number(clan?.id || clan?.clan_id || 0);
    if (!clanId) return;

    setSelectedClanId(clanId);
    navigate(`/app/community/${clanId}`);
  }

  function handleOpenJoinRequests(clan: any) {
    const clanId = Number(clan?.id || clan?.clan_id || 0);
    if (!clanId) return;

    setSelectedClanId(clanId);
    navigate(`/app/community/${clanId}/join-requests`);
  }

  function handleSelectCommunity(clan: ClanItem) {
    const clanId = Number(clan?.id || clan?.clan_id || 0);
    if (!clanId) return;

    setSelectedClanId(clanId);
    setCreatedClan(clan);
    setMsg(`Selected ${safeStr(clan?.name)}.`);
  }

  function whatsappShare(text: string) {
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  function fmtDate(value: any): string {
    const s = safeStr(value).trim();
    if (!s) return "—";
    return s;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <PageTopNav
        title="My Communities"
        subtitle="Open a community, create a new one, and manage its invitation flow."
      />

      {err ? (
        <div
          style={{
            ...card(),
            marginTop: 18,
            background: "#FEF2F2",
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
            ...card(),
            marginTop: 18,
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {msg}
        </div>
      ) : null}

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Existing Communities
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {items.length === 0 ? (
            <div style={{ color: "#6B7A88" }}>No communities found yet.</div>
          ) : null}

          {items.map((clan: ClanItem, idx: number) => {
            const clanId = Number(clan?.id || clan?.clan_id || 0);
            const active = selectedClanId > 0 && clanId === selectedClanId;

            return (
              <div key={clanId || idx} style={softCard()}>
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
                        fontWeight: 1000,
                        fontSize: 18,
                        color: "#0B1F33",
                      }}
                    >
                      {safeStr(clan?.name || `Community ${idx + 1}`)}
                    </div>

                    <div style={{ marginTop: 6, color: "#64748b" }}>
                      {safeStr(clan?.description || "Community workspace")}
                    </div>

                    {safeStr(clan?.marketplace_name).trim() ? (
                      <div
                        style={{
                          marginTop: 8,
                          color: "#0B63D1",
                          fontWeight: 1000,
                          fontSize: 13,
                        }}
                      >
                        Community / Market: {safeStr(clan?.marketplace_name)}
                      </div>
                    ) : null}

                    {active ? (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          fontWeight: 1000,
                          color: "#0B63D1",
                        }}
                      >
                        CURRENTLY SELECTED
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleSelectCommunity(clan)}
                      style={btn(false)}
                    >
                      Select
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCommunity(clan)}
                      style={btn(false)}
                    >
                      Open Community
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenJoinRequests(clan)}
                      style={btn(false)}
                    >
                      Join Requests
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Create New Community
            </div>
            <div style={helperText()}>
              Start a new community and define the community / market identity once here.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            style={btn(false)}
          >
            {showCreate ? "Hide" : "Open"}
          </button>
        </div>

        {showCreate ? (
          <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                Community Identity
              </div>
              <div style={helperText()}>
                This is the name and description of the community itself.
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Community name"
                  style={inputStyle()}
                />

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short community description"
                  rows={3}
                  style={textareaStyle(3)}
                />
              </div>
            </div>

            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                Community / Market Identity
              </div>
              <div style={helperText()}>
                Use this only if you want a separate display label. Otherwise it can match the community name.
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <input
                  value={marketplaceName}
                  onChange={(e) => setMarketplaceName(e.target.value)}
                  placeholder={suggestedMarketplaceName() || "Community / market name"}
                  style={inputStyle()}
                />

                <textarea
                  value={marketplaceDescription}
                  onChange={(e) => setMarketplaceDescription(e.target.value)}
                  placeholder="Short community / market description"
                  rows={3}
                  style={textareaStyle(3)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy}
                style={btn(true)}
              >
                {busy ? "Creating..." : "Create Community"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedClan ? (
        <div
          style={{
            ...card(),
            marginTop: 18,
            background: "linear-gradient(180deg,#F8FBFF,#FFFFFF)",
          }}
        >
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
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                Invite Members
              </div>
              <div style={helperText()}>
                Generate or reload the join link for the selected community, then share it with the right message.
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadInviteForClan(selectedClan)}
              style={btn(false)}
            >
              {inviteBusy ? "Loading..." : "Reload Invite Link"}
            </button>
          </div>

          <div style={{ ...softCard(), marginTop: 16 }}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
              Selected Community
            </div>

            <div style={{ marginTop: 10, color: "#0B63D1", fontWeight: 1000 }}>
              {safeStr(selectedClan?.name || "Unnamed community")}
            </div>

            <div style={{ marginTop: 8, color: "#64748b", lineHeight: 1.7 }}>
              {safeStr(
                selectedClan?.marketplace_name || "Community / market name not yet defined."
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                Invite Link
              </div>

              <div style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>
                Code
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  wordBreak: "break-word",
                }}
              >
                {safeStr(inviteInfo?.invite_code || "—")}
              </div>

              <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
                Link
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  wordBreak: "break-word",
                }}
              >
                {inviteLink || "Invite link not available yet."}
              </div>

              <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
                Created
              </div>
              <div style={{ marginTop: 4, color: "#0B1F33" }}>
                {fmtDate(inviteInfo?.invite_created_at)}
              </div>

              <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
                Expires
              </div>
              <div style={{ marginTop: 4, color: "#0B1F33" }}>
                {fmtDate(inviteInfo?.invite_expires_at)}
              </div>
            </div>

            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                Share Message
              </div>

              <div style={helperText()}>
                This is the sender-facing message block you can copy or send out together with the join link.
              </div>

              <div style={{ marginTop: 12 }}>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={8}
                  style={textareaStyle(8)}
                />
              </div>
            </div>
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
              onClick={() => {
                if (!inviteLink) return;
                safeCopy(inviteLink);
                setMsg("Invite link copied.");
              }}
              style={btn(true)}
            >
              Copy Invite Link
            </button>

            <button
              type="button"
              onClick={() => {
                safeCopy(inviteMessage);
                setMsg("Invitation message copied.");
              }}
              style={btn(false)}
            >
              Copy Message
            </button>

            <button
              type="button"
              onClick={() => {
                const payload = inviteMessage || inviteLink;
                if (!payload) return;
                whatsappShare(payload);
              }}
              style={btn(false)}
            >
              Send via WhatsApp
            </button>

            <button
              type="button"
              onClick={() => handleOpenCommunity(selectedClan)}
              style={btn(false)}
            >
              Open Community
            </button>

            <button
              type="button"
              onClick={() => handleOpenJoinRequests(selectedClan)}
              style={btn(false)}
            >
              Open Join Requests
            </button>
          </div>
        </div>
      ) : null}

      {createdClan && !selectedClan ? (
        <div
          style={{
            ...card(),
            marginTop: 18,
            background: "linear-gradient(180deg,#F8FBFF,#FFFFFF)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Community Created
          </div>

          <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
            <b>{safeStr(createdClan?.name)}</b> is ready. Select it above if you want to manage its invite link now.
          </div>
        </div>
      ) : null}

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Invitation Channel
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Invite only people already known and trusted by the community.
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Community Social Space
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Social events, outings, and informal updates remain linked through the
          community WhatsApp space.
        </div>
      </div>
    </div>
  );
}