// src/pages/CommunityHomePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getCurrentClan,
  listClanMembers,
  getClanInviteLink,
  createInvite, 
  getSelectedClanId,
  leaveClan,
  getTrustScoreExplained,
  safeCopy,
} from "../lib/api";

import ShareActions from "../components/ShareActions";
import { Alert, Button, ButtonPrimary, Card, PageHeader, Pill } from "../components/uiKit";
import { displayNameFromEmail, maskedEmail, parseItems, safeStr, fmtMoney } from "../ui/format";

type ClanCurrentResp = {
  ok?: boolean;
  clan?: { id: number; name: string; description?: string | null; created_at?: string | null };
  membership?: { id: number; role?: string | null; personal_pool_balance?: string | null };
};

type MemberRow = {
  id: number;
  clan_id: number;
  user_id: number;
  email?: string | null;
  role?: string | null;
  personal_pool_balance?: string | null;
  created_at?: string | null;
};

export default function CommunityHomePage() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [clan, setClan] = useState<ClanCurrentResp | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);

  const [trust, setTrust] = useState<any>(null);

  const [inviteLink, setInviteLink] = useState<string>("");
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  const [leaveBusy, setLeaveBusy] = useState(false);

  const clanId = useMemo(() => {
    const id = clan?.clan?.id ?? getSelectedClanId();
    return typeof id === "number" && id > 0 ? id : null;
  }, [clan]);

  const isAdmin = useMemo(() => safeStr(clan?.membership?.role || "").toLowerCase() === "admin", [clan]);

  const poolBalance = useMemo(() => fmtMoney(clan?.membership?.personal_pool_balance || "0"), [clan]);

  const inviteText = useMemo(() => {
    const name = safeStr(clan?.clan?.name || "GMFN clan");
    const link = inviteLink || "(generate link first)";
    return `Join my GMFN clan: ${name}\n\nOpen this link:\n${link}\n\nTip: Save this message for later.`;
  }, [clan, inviteLink]);

  async function refreshAll() {
    setLoading(true);
    setErr(null);
    try {
      const c = (await getCurrentClan()) as ClanCurrentResp;
      setClan(c);

      const t = await getTrustScoreExplained();
      setTrust(t);

      const cid = c?.clan?.id ?? getSelectedClanId();
      if (cid) {
        const ms = await listClanMembers(cid);
        setMembers(parseItems<MemberRow>(ms));
      } else {
        setMembers([]);
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function refreshInviteLink() {
    setInviteErr(null);
    try {
      if (!clanId) throw new Error("No clan selected.");
      // Some backends require POST /invite first; we do both safely.
      try {
        await createInvite(clanId);
      } catch {
        // ignore if not allowed / not needed
      }
      const res = await getClanInviteLink(clanId);
      const link = safeStr(res?.invite_link || res?.link || res?.url || "");
      setInviteLink(link);
    } catch (e: any) {
      setInviteErr(String(e?.message || e));
      setInviteLink("");
    }
  }

  async function doLeaveClan() {
    setLeaveBusy(true);
    setInviteErr(null);
    try {
      if (!clanId) throw new Error("No clan selected.");
      await leaveClan(clanId);
      alert("You left the clan.");
      nav("/clans");
    } catch (e: any) {
      alert(String(e?.message || e));
    } finally {
      setLeaveBusy(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clanName = safeStr(clan?.clan?.name || "No clan selected");
  const clanDesc = safeStr(clan?.clan?.description || "");

  const trustScore = safeStr(trust?.score ?? trust?.trust_score ?? "—");
  const trustBand = safeStr(trust?.band ?? trust?.trust_band ?? "—");

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <PageHeader
        title="My Community"
        subtitle="Invite, onboard, and track your clan reputation."
        right={
          <Button onClick={refreshAll} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {err && <Alert kind="error">{err}</Alert>}

      {/* Clan header */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 1000 }}>{clanName}</div>
          {clanId && <Pill kind="blue">Clan #{clanId}</Pill>}
          <Pill kind={isAdmin ? "green" : "gray"}>{isAdmin ? "Admin" : "Member"}</Pill>
        </div>
        {clanDesc && <div style={{ marginTop: 6, color: "#334155" }}>{clanDesc}</div>}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ButtonPrimary onClick={() => nav("/loans")}>Request Support →</ButtonPrimary>
          <Button onClick={() => nav("/trust-slip")}>TrustSlip</Button>
          <Button onClick={() => nav("/trust")}>My Trust</Button>
        </div>
      </Card>

      {/* Trust + Pool */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>My Trust</div>
          <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 28, fontWeight: 1000 }}>{trustScore}</div>
            <Pill kind="gold">{trustBand}</Pill>
          </div>
          <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
            Trust grows slowly. Reputation is a treasure.
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>My Pool</div>
          <div style={{ marginTop: 6, fontSize: 28, fontWeight: 1000 }}>{poolBalance}</div>
          <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
            Pool supports small loans and helps you guarantee others.
          </div>
        </Card>
      </div>

      {/* Invite share */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 1000 }}>Invite</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
              Share link via WhatsApp or copy it. (Low-end phone friendly.)
            </div>
          </div>
          <Button onClick={refreshInviteLink}>Refresh invite link</Button>
        </div>

        {inviteErr && <div style={{ marginTop: 10, color: "#991b1b", fontWeight: 900 }}>{inviteErr}</div>}

        <div style={{ marginTop: 10, color: "#334155", fontSize: 12, wordBreak: "break-all" }}>
          {inviteLink || "Invite link not available yet. If you are clan admin, click Refresh invite link."}
        </div>

        {inviteLink ? (
          <div style={{ marginTop: 10 }}>
            <ShareActions
              title={`Join my GMFN clan: ${clanName}`}
              text={inviteText}
              url={inviteLink}
              copyLabel="Copy invite link"
              whatsappLabel="WhatsApp invite"
              qrLabel="QR" // ignored in MVP (kept for compatibility)
            />
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={() => safeCopy(inviteText)}>Copy invite text</Button>
          </div>
        )}
      </Card>

      {/* Members */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 1000 }}>My Clan Members</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
              Names are derived from email prefix for now. Photos/phone/country can be added later.
            </div>
          </div>
          <Button onClick={refreshAll} disabled={loading}>
            Refresh members
          </Button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {members.map((m) => {
            const name = displayNameFromEmail(m.email);
            const emailMasked = maskedEmail(m.email);
            const role = safeStr(m.role || "user").toLowerCase();
            return (
              <Card key={m.id} style={{ boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 1000 }}>{name}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{emailMasked}</div>
                  </div>
                  <Pill kind={role === "admin" ? "green" : "gray"}>{role === "admin" ? "Admin" : "Member"}</Pill>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>Member ID</div>
                    <div style={{ fontWeight: 900 }}>{m.user_id}</div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>Pool</div>
                    <div style={{ fontWeight: 900 }}>{fmtMoney(m.personal_pool_balance || "0")}</div>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button onClick={() => nav("/trust-slip")}>TrustSlip</Button>
                  <Button onClick={() => nav("/loans")}>Invite as guarantor</Button>
                </div>
              </Card>
            );
          })}

          {members.length === 0 && <div style={{ color: "#64748b" }}>No members loaded yet. Click Refresh.</div>}
        </div>
      </Card>

      {/* Leave clan */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 1000 }}>Leave clan</div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
          Leaving removes you from this community. (You can re-join later by invite.)
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button style={{ borderColor: "#fecaca", background: "#fef2f2" }} onClick={doLeaveClan} disabled={leaveBusy}>
            {leaveBusy ? "Leaving..." : "Leave clan"}
          </Button>
        </div>
      </Card>
    </div>
  );
}