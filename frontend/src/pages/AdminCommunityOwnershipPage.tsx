import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import {
  getAdminCommunityOwnershipLookup,
  postAdminCommunityOwnershipReconciliation,
} from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function toNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100svh",
    background:
      "linear-gradient(180deg, #F7FAFF 0%, #EDF4FB 46%, #E7EEF7 100%)",
    padding: "18px 12px 96px",
    boxSizing: "border-box",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.16)",
    boxShadow:
      "0 24px 52px rgba(7,20,36,0.11), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function soft(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(20,52,83,0.12)",
  };
}

function label(): React.CSSProperties {
  return {
    color: "#4E6680",
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    color: "#0B1F33",
    fontSize: 13,
    fontWeight: 950,
    marginBottom: 6,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    border: "1px solid rgba(20,52,83,0.16)",
    background: "#FFFFFF",
    color: "#0B1F33",
    padding: "12px 14px",
    fontSize: 16,
    outline: "none",
  };
}

function helper(): React.CSSProperties {
  return {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
  };
}

function iconLabel(icon: GsnIconName, text: React.ReactNode) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <GsnLegacyIcon name={icon} size={18} />
      <span>{text}</span>
    </span>
  );
}

function fact(labelText: string, value: React.ReactNode) {
  return (
    <div style={institutionalInnerCard("#FFFFFF")}>
      <div style={label()}>{labelText}</div>
      <div style={{ marginTop: 6, color: "#0B1F33", fontWeight: 1000, lineHeight: 1.35 }}>
        {value || "Not set"}
      </div>
    </div>
  );
}

function userName(row: any): string {
  return safeStr(row?.display_name) || safeStr(row?.email) || safeStr(row?.gmfn_id) || `User ${safeStr(row?.user_id)}`;
}

function communityName(row: any): string {
  return safeStr(row?.name) || `Community ${safeStr(row?.clan_id)}`;
}

export default function AdminCommunityOwnershipPage() {
  const [searchParams] = useSearchParams();
  const [communityNameInput, setCommunityNameInput] = useState(
    safeStr(searchParams.get("community_name")) || "Pillar of Hope"
  );
  const [ownerQuery, setOwnerQuery] = useState(safeStr(searchParams.get("owner_query")));
  const [selectedClanId, setSelectedClanId] = useState<number>(0);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number>(0);
  const [selectedOwnerGmfnId, setSelectedOwnerGmfnId] = useState("");
  const [note, setNote] = useState("");
  const [proofConfirmed, setProofConfirmed] = useState(false);
  const [lookup, setLookup] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"lookup" | "preview" | "execute" | "">("");
  const didInitialLookupRef = useRef(false);

  const communities = useMemo(() => {
    const rows = Array.isArray(lookup?.communities) ? lookup.communities : [];
    return rows;
  }, [lookup]);

  const owners = useMemo(() => {
    const rows = Array.isArray(lookup?.owners) ? lookup.owners : [];
    return rows;
  }, [lookup]);

  const selectedCommunity = useMemo(
    () => communities.find((row: any) => toNum(row?.clan_id) === selectedClanId) || null,
    [communities, selectedClanId]
  );

  const selectedOwner = useMemo(
    () => owners.find((row: any) => toNum(row?.user_id) === selectedOwnerId) || null,
    [owners, selectedOwnerId]
  );

  const runLookup = useCallback(async () => {
    setBusy("lookup");
    setError("");
    setMessage("");
    setPreview(null);
    setResult(null);
    try {
      const out = await getAdminCommunityOwnershipLookup({
        community_name: communityNameInput,
        owner_query: ownerQuery,
        limit: 12,
      });
      setLookup(out);
      const firstCommunity = Array.isArray(out?.communities) ? out.communities[0] : null;
      const firstOwner = Array.isArray(out?.owners) ? out.owners[0] : null;
      if (firstCommunity) setSelectedClanId(toNum(firstCommunity.clan_id));
      if (firstOwner) {
        setSelectedOwnerId(toNum(firstOwner.user_id));
        setSelectedOwnerGmfnId(safeStr(firstOwner.gmfn_id));
      }
      setMessage("Lookup ready. Choose the community and the owner identity before preview.");
    } catch (err: any) {
      setError(safeStr(err?.message || err) || "Lookup failed.");
    } finally {
      setBusy("");
    }
  }, [communityNameInput, ownerQuery]);

  async function runPreview() {
    setBusy("preview");
    setError("");
    setMessage("");
    setPreview(null);
    setResult(null);
    try {
      const out = await postAdminCommunityOwnershipReconciliation({
        clan_id: selectedClanId || undefined,
        community_name: selectedClanId ? undefined : communityNameInput,
        owner_user_id: selectedOwnerId || undefined,
        owner_gmfn_id: selectedOwnerId ? undefined : selectedOwnerGmfnId,
        execute: false,
      });
      setPreview(out);
      setMessage(safeStr(out?.message) || "Preview ready.");
    } catch (err: any) {
      setError(safeStr(err?.message || err) || "Preview failed.");
    } finally {
      setBusy("");
    }
  }

  async function runExecute() {
    setBusy("execute");
    setError("");
    setMessage("");
    setResult(null);
    try {
      const out = await postAdminCommunityOwnershipReconciliation({
        clan_id: selectedClanId || undefined,
        community_name: selectedClanId ? undefined : communityNameInput,
        owner_user_id: selectedOwnerId || undefined,
        owner_gmfn_id: selectedOwnerId ? undefined : selectedOwnerGmfnId,
        owner_proof_confirmed: proofConfirmed,
        execute: true,
        reviewer_note: note,
      });
      setResult(out);
      setPreview(out);
      setMessage(safeStr(out?.message) || "Ownership reconciliation recorded.");
    } catch (err: any) {
      setError(safeStr(err?.message || err) || "Reconciliation failed.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (didInitialLookupRef.current) return;
    if (safeStr(searchParams.get("community_name")) || safeStr(searchParams.get("owner_query"))) {
      didInitialLookupRef.current = true;
      void runLookup();
    }
  }, [runLookup, searchParams]);

  const canPreview = Boolean(selectedClanId || safeStr(communityNameInput)) && Boolean(selectedOwnerId || safeStr(selectedOwnerGmfnId));
  const canExecute = Boolean(preview) && proofConfirmed && safeStr(note).length >= 12 && !result;

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 16 }}>
        <PageTopNav
          sectionLabel="Command Centre"
          title="Community Ownership"
          subtitle="Resolve a blocked community name without losing history."
          homeTo="/app/command-center"
          homeLabel="Command Centre"
          backTo="/app/command-center"
        />

        <section style={card()}>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 14, alignItems: "center" }}>
            <span
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F2C766",
                background: "linear-gradient(180deg, #08233A 0%, #061827 100%)",
                boxShadow: "0 16px 32px rgba(7,20,36,0.16)",
              }}
            >
              <GsnLegacyIcon name="community" size={28} />
            </span>
            <div>
              <div style={label()}>Owner repair</div>
              <h1 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 30, lineHeight: 1.1 }}>
                Make the existing community canonical.
              </h1>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            {fact("Community", selectedCommunity ? communityName(selectedCommunity) : communityNameInput)}
            {fact("Owner", selectedOwner ? userName(selectedOwner) : selectedOwnerGmfnId || ownerQuery)}
            {fact("Action", preview?.membership_action || "Preview first")}
            {fact("History", "Preserved")}
          </div>
        </section>

        <section style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={label()}>Find record</div>
              <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 22 }}>Search the community and owner</h2>
            </div>
            <StableCtaLink to="/app/command-center" kind="secondary" debugId="admin-community-ownership.back-command">
              {iconLabel("navigation", "Command Centre")}
            </StableCtaLink>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={fieldLabel()}>Community name</div>
              <input
                value={communityNameInput}
                onChange={(event) => setCommunityNameInput(event.target.value)}
                placeholder="Pillar of Hope"
                style={inputStyle()}
              />
            </div>
            <div>
              <div style={fieldLabel()}>Owner search</div>
              <input
                value={ownerQuery}
                onChange={(event) => setOwnerQuery(event.target.value)}
                placeholder="Felix, GSN ID, email, or phone"
                style={inputStyle()}
              />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PrimaryButton
              onClick={runLookup}
              busy={busy === "lookup"}
              busyLabel="Searching..."
              disabled={busy !== "" || !safeStr(communityNameInput)}
              debugId="admin-community-ownership.lookup"
            >
              {iconLabel("search", "Search records")}
            </PrimaryButton>
            <SecondaryButton
              onClick={runPreview}
              busy={busy === "preview"}
              busyLabel="Previewing..."
              disabled={busy !== "" || !canPreview}
              debugId="admin-community-ownership.preview"
            >
              {iconLabel("eye", "Preview repair")}
            </SecondaryButton>
          </div>
        </section>

        {(communities.length || owners.length) ? (
          <section style={card()}>
            <div style={label()}>Choose exact records</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={soft()}>
                <div style={fieldLabel()}>Community</div>
                <select value={selectedClanId || ""} onChange={(event) => setSelectedClanId(toNum(event.target.value))} style={inputStyle()}>
                  <option value="">Select community</option>
                  {communities.map((row: any) => (
                    <option key={safeStr(row.clan_id)} value={safeStr(row.clan_id)}>
                      {communityName(row)} - {safeStr(row.community_code) || `#${safeStr(row.clan_id)}`}
                    </option>
                  ))}
                </select>
                {selectedCommunity ? (
                  <div style={{ marginTop: 10, ...helper() }}>
                    Current owner: {userName(selectedCommunity.canonical_owner) || "Not recorded"}. Admins: {Array.isArray(selectedCommunity.admin_members) ? selectedCommunity.admin_members.length : 0}.
                  </div>
                ) : null}
              </div>

              <div style={soft()}>
                <div style={fieldLabel()}>Owner identity</div>
                <select
                  value={selectedOwnerId || ""}
                  onChange={(event) => {
                    const id = toNum(event.target.value);
                    const row = owners.find((item: any) => toNum(item.user_id) === id);
                    setSelectedOwnerId(id);
                    setSelectedOwnerGmfnId(safeStr(row?.gmfn_id));
                  }}
                  style={inputStyle()}
                >
                  <option value="">Select owner</option>
                  {owners.map((row: any) => (
                    <option key={safeStr(row.user_id)} value={safeStr(row.user_id)}>
                      {userName(row)} - {safeStr(row.gmfn_id) || `User ${safeStr(row.user_id)}`}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 10, ...helper() }}>
                  Use exact GSN ID if the name search finds more than one Felix.
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {preview ? (
          <section style={card(result ? "#ECFDF5" : "#FFFBEB")}>
            <div style={label()}>{result ? "Recorded" : "Preview"}</div>
            <h2 style={{ margin: "6px 0 0", color: result ? "#065F46" : "#92400E", fontSize: 22 }}>
              {result ? "Canonical owner recorded" : "Ready for proof confirmation"}
            </h2>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {fact("Community", communityName(preview.community))}
              {fact("New owner", userName(preview.requested_owner))}
              {fact("Membership", safeStr(preview.membership_action).replace(/_/g, " "))}
            </div>
            <div style={{ marginTop: 12, ...institutionalInnerCard("#FFFFFF"), ...helper() }}>
              {safeStr(preview.boundary) || "History is preserved. This records ownership; it does not erase evidence."}
            </div>

            {!result ? (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#0B1F33", fontWeight: 900 }}>
                  <input
                    type="checkbox"
                    checked={proofConfirmed}
                    onChange={(event) => setProofConfirmed(event.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  I checked proof that this GSN identity is the real owner or representative.
                </label>
                <div>
                  <div style={fieldLabel()}>Reviewer note</div>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Example: Felix confirmed as Pillar of Hope founder during pilot review. Existing test row kept as canonical community."
                    rows={4}
                    style={{ ...inputStyle(), resize: "vertical", minHeight: 92 }}
                  />
                </div>
                <PrimaryButton
                  onClick={runExecute}
                  busy={busy === "execute"}
                  busyLabel="Recording..."
                  disabled={busy !== "" || !canExecute}
                  debugId="admin-community-ownership.execute"
                >
                  {iconLabel("check", "Record canonical owner")}
                </PrimaryButton>
              </div>
            ) : null}
          </section>
        ) : null}

        {(message || error) ? (
          <section style={card(error ? "#FEF2F2" : "#ECFDF5")}>
            <div style={{ color: error ? "#991B1B" : "#065F46", fontWeight: 1000 }}>
              {iconLabel(error ? "alert" : "check", error || message)}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
