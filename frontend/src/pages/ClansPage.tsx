// src/pages/ClansPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getMe,
  listMyClans,
  createClan,
  selectClan,
  getCurrentClan,
  getSelectedClanId,
  setSelectedClanId,
  getClanInviteLink,
  listClanMembers,
  safeCopy,
} from "../lib/api";

type ClanRow = { id: number; name: string; description?: string | null };
type MemberRow = { user_id: number; email?: string | null; role?: string | null; personal_pool_balance?: string | null };

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.10)",
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.94)",
    boxShadow: "0 18px 60px rgba(2,6,23,0.06)",
  };
}

function btn(primary?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: primary ? "1px solid rgba(11,31,51,0.75)" : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#0B1F33" : "#fff",
    color: primary ? "#fff" : "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function pill(kind: "blue" | "gray" | "gold" | "green"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    border: "1px solid #e5e7eb",
    background: "#fff",
    whiteSpace: "nowrap",
  };
  if (kind === "blue") return { ...base, color: "#1e40af", background: "#eff6ff", borderColor: "#bfdbfe" };
  if (kind === "gold") return { ...base, color: "#92400e", background: "#fffbeb", borderColor: "#fde68a" };
  if (kind === "green") return { ...base, color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" };
  return { ...base, color: "#334155", background: "#f9fafb", borderColor: "#e5e7eb" };
}

function safeStr(x: any): string {
  return (x ?? "").toString();
}

function parseItems<T = any>(raw: any): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (Array.isArray(raw?.items)) return raw.items as T[];
  if (Array.isArray(raw?.clans)) return raw.clans as T[];
  return [];
}

function prettyErr(e: any): string {
  const msg = String(e?.message || e || "").trim();
  if (!msg) return "Unknown error";
  try {
    const j = JSON.parse(msg);
    if (typeof j?.detail === "string") return j.detail;
    if (Array.isArray(j?.detail)) return JSON.stringify(j.detail, null, 2);
    return JSON.stringify(j, null, 2);
  } catch {
    return msg;
  }
}

function waLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function ClansPage() {
  const nav = useNavigate();

  const [me, setMe] = useState<any>(null);
  const role = useMemo(() => safeStr(me?.role || "user").toLowerCase(), [me]);
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [clans, setClans] = useState<ClanRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(getSelectedClanId());
  const [selectedClan, setSelectedClan] = useState<ClanRow | null>(null);

  // Invite link
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");

  // Members
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersBusy, setMembersBusy] = useState(false);

  // Create clan (admin-only)
  const [name, setName] = useState("My Community");
  const [desc, setDesc] = useState("");

  async function loadAll() {
    setLoading(true);
    setErr(null);
    setOkMsg(null);

    try {
      const m = await getMe();
      setMe(m);

      const raw = await listMyClans();
      const list = parseItems<any>(raw).map((c: any) => ({
        id: Number(c?.id ?? c?.clan_id ?? c?.clanId ?? 0),
        name: safeStr(c?.name || "Community"),
        description: c?.description ?? null,
      }));
      setClans(list.filter((x) => Number.isFinite(x.id) && x.id > 0));

      // Try server current clan
      try {
        const cur = await getCurrentClan();
        const cid = Number(cur?.clan?.id ?? cur?.id ?? cur?.clan_id ?? cur?.clanId ?? 0);
        if (Number.isFinite(cid) && cid > 0) {
          setSelectedId(cid);
          setSelectedClan(list.find((x) => x.id === cid) || null);
          setSelectedClanId(cid);
        }
      } catch {
        // ignore
      }

      // If we already have selectedId in local storage, map it
      const sid = getSelectedClanId();
      if (sid && (!selectedId || selectedId !== sid)) {
        setSelectedId(sid);
        setSelectedClan(list.find((x) => x.id === sid) || null);
      }
    } catch (e: any) {
      setErr(prettyErr(e));
      setClans([]);
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(clanId: number) {
    setErr(null);
    setOkMsg(null);
    try {
      await selectClan(clanId);
      setSelectedId(clanId);
      setSelectedClan(clans.find((c) => c.id === clanId) || null);
      setSelectedClanId(clanId);
      setOkMsg("Community selected. Loading…");

      // preload members + invite
      await loadMembers(clanId);
      await loadInvite(clanId);

      window.setTimeout(() => nav("/dashboard"), 250);
    } catch (e: any) {
      setErr(prettyErr(e));
    }
  }

  async function loadInvite(clanId: number) {
    setInviteBusy(true);
    try {
      const out: any = await getClanInviteLink(clanId);
      setInviteCode(safeStr(out?.invite_code || out?.code || ""));
      const link = safeStr(out?.invite_link || out?.link || "");
      setInviteLink(link);
    } catch {
      setInviteCode("");
      setInviteLink("");
    } finally {
      setInviteBusy(false);
    }
  }

  async function loadMembers(clanId: number) {
    setMembersBusy(true);
    try {
      const out: any = await listClanMembers(clanId);
      const items = parseItems<any>(out).map((m: any) => ({
        user_id: Number(m?.user_id ?? 0),
        email: m?.email ?? null,
        role: m?.role ?? null,
        personal_pool_balance: m?.personal_pool_balance ?? null,
      }));
      setMembers(items.filter((x) => Number.isFinite(x.user_id) && x.user_id > 0));
    } catch {
      setMembers([]);
    } finally {
      setMembersBusy(false);
    }
  }

  async function onCreate() {
    setErr(null);
    setOkMsg(null);
    try {
      const nm = name.trim();
      if (!nm) throw new Error("Enter a community name.");
      const created: any = await createClan({ name: nm, description: desc.trim() || null });
      setOkMsg(`Community created: ${safeStr(created?.name || nm)}`);
      await loadAll();
    } catch (e: any) {
      setErr(prettyErr(e));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When selected changes, load invite + members
  useEffect(() => {
    if (!selectedId) return;
    loadInvite(selectedId);
    loadMembers(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedLabel = useMemo(() => {
    if (!selectedId) return "No community selected";
    const n = selectedClan?.name ? `${selectedClan.name}` : `Community #${selectedId}`;
    return n;
  }, [selectedId, selectedClan]);

  const inviteText = useMemo(() => {
    if (!inviteLink && !inviteCode) return "";
    if (inviteLink) return `Join my GMFN community: ${inviteLink}`;
    return `Join my GMFN community with invite code: ${inviteCode}`;
  }, [inviteLink, inviteCode]);

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 1000, color: "#0B1F33" }}>Community</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
            Choose your community. Invite people you already know.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={pill(selectedId ? "gold" : "gray")}>
            Active: <b>{selectedLabel}</b>
          </span>
          <button onClick={loadAll} style={btn()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {err && (
        <div style={{ ...card(), marginTop: 12, borderColor: "rgba(153,27,27,0.25)", background: "rgba(254,242,242,0.9)", color: "#991b1b" }}>
          <div style={{ fontWeight: 1000 }}>Something went wrong</div>
          <div style={{ marginTop: 6, fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{err}</div>
        </div>
      )}

      {okMsg && (
        <div style={{ ...card(), marginTop: 12, borderColor: "rgba(6,95,70,0.18)", background: "rgba(236,253,245,0.95)", color: "#065f46", fontWeight: 900 }}>
          {okMsg}
        </div>
      )}

      {/* Invite card */}
      <div style={{ ...card(), marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Invite (WhatsApp)</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
              Invite only people you already know. This is how trust stays safe.
            </div>
          </div>
          <button
            onClick={() => (selectedId ? loadInvite(selectedId) : null)}
            style={btn()}
            disabled={!selectedId || inviteBusy}
            title={!selectedId ? "Select a community first" : "Refresh invite link"}
          >
            {inviteBusy ? "Refreshing..." : "Refresh link"}
          </button>
        </div>

        {!selectedId && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88" }}>
            Select a community first, then you can invite people.
          </div>
        )}

        {selectedId && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Invite link</div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={inviteLink || (inviteCode ? `code: ${inviteCode}` : "")}
                readOnly
                style={{
                  flex: 1,
                  minWidth: 240,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(11,31,51,0.18)",
                  background: "#fff",
                }}
              />
              <button
                style={btn(true)}
                disabled={!inviteText}
                onClick={() => safeCopy(inviteLink || inviteCode)}
              >
                Copy
              </button>
              <a
                href={inviteText ? waLink(inviteText) : "#"}
                target="_blank"
                rel="noreferrer"
                style={{ ...btn(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                onClick={(e) => {
                  if (!inviteText) e.preventDefault();
                }}
              >
                WhatsApp →
              </a>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88" }}>
              If network drops, you can still copy the link and send later.
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      <div style={{ ...card(), marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Members</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88" }}>
              People in this community.
            </div>
          </div>
          <button
            onClick={() => (selectedId ? loadMembers(selectedId) : null)}
            style={btn()}
            disabled={!selectedId || membersBusy}
            title={!selectedId ? "Select a community first" : "Refresh members"}
          >
            {membersBusy ? "Loading..." : "Refresh"}
          </button>
        </div>

        {!selectedId && <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88" }}>Select a community to see members.</div>}

        {selectedId && (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {members.length === 0 && !membersBusy && <div style={{ fontSize: 12, color: "#6B7A88" }}>No members to show.</div>}

            {members.map((m) => (
              <div key={`${m.user_id}`} style={{ border: "1px solid rgba(11,31,51,0.10)", borderRadius: 16, padding: 12, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{safeStr(m.email || `User #${m.user_id}`)}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88" }}>User #{m.user_id}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={pill((safeStr(m.role).toLowerCase() === "admin") ? "green" : "gray")}>
                      {safeStr(m.role || "user")}
                    </span>
                    <span style={pill("blue")}>Pool: {safeStr(m.personal_pool_balance || "0")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin-only create */}
      {isAdmin && (
        <div style={{ ...card(), marginTop: 12 }}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Admin: Create a new community</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
            Use this only when starting a new group. Do not create many groups for one set of people.
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Community name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
                placeholder="e.g., Ladipo Tools Group"
              />
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Description (optional)</div>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
                placeholder="Short description…"
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={onCreate} style={btn(true)} disabled={loading}>
                Create
              </button>
              <div style={{ fontSize: 12, color: "#6B7A88", display: "flex", alignItems: "center" }}>
                After creating, select it to make it active.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List of my clans */}
      <div style={{ ...card(), marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>My communities</div>
          <span style={pill(clans.length ? "blue" : "gray")}>{clans.length} total</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {clans.length === 0 && <div style={{ fontSize: 12, color: "#6B7A88" }}>No communities yet.</div>}

          {clans.map((c) => {
            const cid = Number(c.id);
            const isSelected = selectedId != null && cid === selectedId;

            return (
              <div key={String(cid)} style={{ border: "1px solid rgba(11,31,51,0.10)", borderRadius: 16, padding: 12, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{safeStr(c.name || "Community")}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: "#6B7A88" }}>#{cid}</div>
                    {c.description ? <div style={{ marginTop: 6, fontSize: 12, color: "#6B7A88" }}>{safeStr(c.description)}</div> : null}
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={() => onSelect(cid)} style={btn()} disabled={!Number.isFinite(cid) || cid <= 0}>
                      Use this
                    </button>
                    {isSelected && <span style={pill("green")}>Active</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6B7A88" }}>
        Tip: If you can’t see the right community, tap <b>Refresh</b>.
      </div>
    </div>
  );
}