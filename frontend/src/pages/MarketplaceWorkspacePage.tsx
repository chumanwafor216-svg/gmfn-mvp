import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getClanInviteLink,
  getSelectedClanId,
  listClanMembers,
  listJoinRequests,
  safeCopy,
  setSelectedClanId,
} from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
}

function safeNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
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

function softCard(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FAFC",
    padding: 16,
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

function muted(): React.CSSProperties {
  return {
    color: "#64748B",
    lineHeight: 1.75,
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

export default function MarketplaceWorkspacePage() {
  const navigate = useNavigate();
  const params = useParams();

  const routeClanId = safeNum(params.clanId);
  const storedClanId = safeNum(getSelectedClanId() || 0);
  const activeClanId = routeClanId || storedClanId;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [inviteOpen, setInviteOpen] = useState(true);
  const [governanceOpen, setGovernanceOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(true);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [cciOpen, setCciOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

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
        setErr("No marketplace selected.");
        return;
      }

      setBusy(true);
      setErr("");
      setMsg("");

      try {
        const [inviteRes, joinRes, membersRes] = await Promise.all([
          getClanInviteLink(activeClanId).catch(() => null),
          listJoinRequests(activeClanId).catch(() => ({ items: [] })),
          listClanMembers(activeClanId).catch(() => ({ items: [] })),
        ]);

        setInviteInfo(inviteRes || null);
        setJoinRequests(Array.isArray(joinRes) ? joinRes : joinRes?.items || []);
        setMembers(Array.isArray(membersRes) ? membersRes : membersRes?.items || []);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load marketplace workspace."));
      } finally {
        setBusy(false);
      }
    }

    void loadAll();
  }, [activeClanId]);

  const marketName = useMemo(() => {
    if (inviteInfo?.marketplace_name) return safeStr(inviteInfo.marketplace_name);
    if (inviteInfo?.clan_name) return safeStr(inviteInfo.clan_name);
    const firstMemberClanName = "";
    return firstMemberClanName;
  }, [inviteInfo]);

  const inviteLink = useMemo(() => {
    return safeStr(
      inviteInfo?.invite_url ||
        inviteInfo?.url ||
        inviteInfo?.link ||
        inviteInfo?.invite_link ||
        ""
    ).trim();
  }, [inviteInfo]);

  const inviteCode = useMemo(() => {
    return safeStr(inviteInfo?.invite_code || inviteInfo?.code || "").trim();
  }, [inviteInfo]);

  function copyInviteMessage() {
    const title = safeStr(marketName || "this marketplace").trim();
    const text = [
      `Hello,`,
      ``,
      `You are invited to begin the request-to-join process for ${title}.`,
      `GMFN helps trusted people trade, support each other, and build visible trust across distance.`,
      `Admission is not automatic. Existing members still review and vote according to community rules.`,
      ``,
      `Use this link to begin:`,
      inviteLink || "(invite link unavailable)",
    ].join("\n");

    safeCopy(text);
    setMsg("Invite message copied.");
  }

  function shareWhatsApp() {
    const title = safeStr(marketName || "this marketplace").trim();
    const text = [
      `You are invited to begin the request-to-join process for ${title}.`,
      `Admission is not automatic. Members still review and vote.`,
      inviteLink,
    ]
      .filter(Boolean)
      .join("\n\n");

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openShopForMember(member: any) {
    const gmfnId = safeStr(member?.gmfn_id || "").trim();
    if (!gmfnId) {
      setMsg("This member does not yet have a visible GMFN shop identity.");
      return;
    }
    navigate(`/app/shop/${encodeURIComponent(gmfnId)}`);
  }

  const pendingCount = joinRequests.filter(
    (x) => safeStr(x?.status).toLowerCase() === "pending"
  ).length;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <PageTopNav
        title={marketName || "Marketplace Workspace"}
        subtitle="Governance, members and shops, invitations, trust signals, and operating actions for this marketplace."
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 1000, color: "#64748B" }}>
              MARKETPLACE IDENTITY
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 32,
                lineHeight: 1.12,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              {marketName || "Unnamed Marketplace"}
            </div>

            <div style={{ marginTop: 12, ...muted() }}>
              This is the operational governance space for this marketplace. Notifications may surface on the dashboard first, but action is taken here.
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={softCard()}>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                  CLAN / MARKETPLACE ID
                </div>
                <div style={{ marginTop: 6, fontWeight: 1000, color: "#0B1F33" }}>
                  {activeClanId || "—"}
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                  PENDING GOVERNANCE ACTIONS
                </div>
                <div style={{ marginTop: 6, fontWeight: 1000, color: "#0B1F33" }}>
                  {pendingCount}
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                  MEMBERS / SHOPS
                </div>
                <div style={{ marginTop: 6, fontWeight: 1000, color: "#0B1F33" }}>
                  {members.length}
                </div>
              </div>
            </div>
          </div>

          <div style={softCard()}>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
              GOVERNANCE NOTE
            </div>
            <div style={{ marginTop: 10, ...muted() }}>
              Membership review, join approvals, member removal decisions, and trust-facing marketplace actions should all point back to this workspace.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
        <div style={card()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={sectionTitle()}>Governance</div>
            <button type="button" onClick={() => setGovernanceOpen((v) => !v)} style={btn(false)}>
              {governanceOpen ? "Hide" : "Open"}
            </button>
          </div>

          {governanceOpen ? (
            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
              <div style={softCard()}>
                <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Notification Board</div>
                <div style={{ marginTop: 8, ...muted() }}>
                  Action items from this marketplace should appear here, and also surface on the dashboard with the marketplace name clearly attached.
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  {joinRequests.length === 0 ? (
                    <div style={{ color: "#64748B" }}>No governance notifications yet.</div>
                  ) : (
                    joinRequests.map((req: any, idx: number) => (
                      <div key={safeNum(req?.id) || idx} style={softCard()}>
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
                              Membership request #{safeNum(req?.id) || "—"}
                            </div>
                            <div style={{ marginTop: 6, ...muted() }}>
                              Status: {safeStr(req?.status || "pending")} • Marketplace:{" "}
                              {safeStr(req?.clan_name || marketName || "—")}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" style={btn(true)}>
                              Approve
                            </button>
                            <button type="button" style={btn(false)}>
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Voting</div>
                <div style={{ marginTop: 8, ...muted() }}>
                  Voting belongs here. This includes member admission votes and future member-removal votes. Dashboard notifications should point members back here.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div style={card()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={sectionTitle()}>Invite</div>
            <button type="button" onClick={() => setInviteOpen((v) => !v)} style={btn(false)}>
              {inviteOpen ? "Hide" : "Open"}
            </button>
          </div>

          {inviteOpen ? (
            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
              <div style={softCard()}>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>INVITE CODE</div>
                <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33" }}>
                  {inviteCode || "Invite code not available yet."}
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>INVITE LINK</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    wordBreak: "break-word",
                  }}
                >
                  {inviteLink || "Invite link not available yet."}
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      safeCopy(inviteLink);
                      setMsg("Invite link copied.");
                    }}
                    style={btn(true)}
                  >
                    Copy Invite Link
                  </button>

                  <button type="button" onClick={copyInviteMessage} style={btn(false)}>
                    Copy Message
                  </button>

                  <button type="button" onClick={shareWhatsApp} style={btn(false)}>
                    Send via WhatsApp
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div style={card()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={sectionTitle()}>Members and Shops</div>
            <button type="button" onClick={() => setMembersOpen((v) => !v)} style={btn(false)}>
              {membersOpen ? "Hide" : "Open"}
            </button>
          </div>

          {membersOpen ? (
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {members.length === 0 ? (
                <div style={{ color: "#64748B" }}>No members found yet.</div>
              ) : (
                members.map((member: any, idx: number) => {
                  const name = safeStr(member?.email || member?.gmfn_id || `Member ${idx + 1}`);
                  const shopName = safeStr(member?.shop_name || "");
                  const gmfnId = safeStr(member?.gmfn_id || "");

                  return (
                    <div key={safeNum(member?.id) || idx} style={softCard()}>
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
                          <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 17 }}>
                            {name}
                          </div>
                          <div style={{ marginTop: 6, ...muted() }}>
                            Shop: {shopName || "Shop identity not yet visible"}
                          </div>
                          <div style={{ marginTop: 4, color: "#0B63D1", fontWeight: 1000, fontSize: 13 }}>
                            {gmfnId ? `GMFN ID: ${gmfnId}` : "GMFN ID not yet available"}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => setSelectedMember(member)} style={btn(false)}>
                            View Row
                          </button>
                          <button type="button" onClick={() => openShopForMember(member)} style={btn(true)}>
                            Open Shop
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {selectedMember ? (
                <div style={softCard()}>
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Selected Member / Shop Row</div>
                  <div style={{ marginTop: 10, ...muted() }}>
                    Member: {safeStr(selectedMember?.email || "—")}
                  </div>
                  <div style={{ ...muted() }}>
                    GMFN ID: {safeStr(selectedMember?.gmfn_id || "—")}
                  </div>
                  <div style={{ ...muted() }}>
                    Role: {safeStr(selectedMember?.role || "user")}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div style={card()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={sectionTitle()}>Money</div>
            <button type="button" onClick={() => setMoneyOpen((v) => !v)} style={btn(false)}>
              {moneyOpen ? "Hide" : "Open"}
            </button>
          </div>

          {moneyOpen ? (
            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" style={btn(true)} onClick={() => navigate("/app/payment/pool")}>
                Add Money
              </button>
              <button type="button" style={btn(false)} onClick={() => navigate("/app/withdrawal-instructions")}>
                Withdraw
              </button>
              <button type="button" style={btn(false)} onClick={() => navigate("/app/loan-workbench")}>
                Loan Workbench
              </button>
            </div>
          ) : null}
        </div>

        <div style={card()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={sectionTitle()}>CCI Board</div>
            <button type="button" onClick={() => setCciOpen((v) => !v)} style={btn(false)}>
              {cciOpen ? "Hide" : "Open"}
            </button>
          </div>

          {cciOpen ? (
            <div style={{ marginTop: 16, ...muted() }}>
              This is the community-level CCI area. It should later show how healthy the marketplace is in trust, participation, cooperation, and repayment culture.
            </div>
          ) : null}
        </div>

        <div style={card()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={sectionTitle()}>Events</div>
            <button type="button" onClick={() => setEventsOpen((v) => !v)} style={btn(false)}>
              {eventsOpen ? "Hide" : "Open"}
            </button>
          </div>

          {eventsOpen ? (
            <div style={{ marginTop: 16, ...muted() }}>
              This section is for marketplace/community events, announcements, and future group activity coordination.
            </div>
          ) : null}
        </div>
      </div>

      {busy ? (
        <div style={{ marginTop: 18, color: "#64748B", fontWeight: 1000 }}>
          Loading marketplace workspace...
        </div>
      ) : null}
    </div>
  );
}