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
    letterSpacing: 0,
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

function factGrid(minWidth = 140): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gap: 10,
  };
}

function isLikelyPhoneQuery(value: string): boolean {
  const compact = value.replace(/[\s().-]+/g, "");
  const digits = compact.replace(/\D/g, "");
  return digits.length >= 8;
}

function isLikelyGsnId(value: string): boolean {
  return /^(GMFN|GSN)-/i.test(value.trim());
}

function directOwnerSignal(ownerQuery: string) {
  const clean = safeStr(ownerQuery);
  return {
    owner_gmfn_id: isLikelyGsnId(clean) ? clean : undefined,
    owner_email: clean.includes("@") ? clean : undefined,
    owner_phone_e164: isLikelyPhoneQuery(clean) ? clean : undefined,
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
    <div style={{ ...institutionalInnerCard("#FFFFFF"), minWidth: 0 }}>
      <div style={label()}>{labelText}</div>
      <div
        style={{
          marginTop: 6,
          color: "#0B1F33",
          fontSize: 18,
          fontWeight: 1000,
          lineHeight: 1.25,
          minWidth: 0,
          overflowWrap: "normal",
          wordBreak: "normal",
          hyphens: "none",
        }}
      >
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

function intakeName(row: any): string {
  return safeStr(row?.display_name) || safeStr(row?.email) || `Intake ${safeStr(row?.entry_verification_id)}`;
}

export default function AdminCommunityOwnershipPage() {
  const [searchParams] = useSearchParams();
  const [communityNameInput, setCommunityNameInput] = useState(
    safeStr(searchParams.get("community_name")) || "Pillar of Hope"
  );
  const [ownerQuery, setOwnerQuery] = useState(safeStr(searchParams.get("owner_query")));
  const [selectedClanId, setSelectedClanId] = useState<number>(0);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number>(0);
  const [selectedIntakeId, setSelectedIntakeId] = useState<number>(0);
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

  const ownerIntakes = useMemo(() => {
    const rows = Array.isArray(lookup?.owner_intakes) ? lookup.owner_intakes : [];
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
  const selectedIntake = useMemo(
    () => ownerIntakes.find((row: any) => toNum(row?.entry_verification_id) === selectedIntakeId) || null,
    [ownerIntakes, selectedIntakeId]
  );
  const directOwner = useMemo(() => directOwnerSignal(ownerQuery), [ownerQuery]);
  const ownerIdentityReady = Boolean(
    selectedOwnerId ||
      selectedIntakeId ||
      safeStr(selectedOwnerGmfnId) ||
      safeStr(directOwner.owner_gmfn_id) ||
      safeStr(directOwner.owner_email) ||
      safeStr(directOwner.owner_phone_e164)
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
      const firstIntake = Array.isArray(out?.owner_intakes) ? out.owner_intakes[0] : null;
      if (firstCommunity) {
        setSelectedClanId(toNum(firstCommunity.clan_id));
      } else {
        setSelectedClanId(0);
      }
      if (firstOwner) {
        setSelectedOwnerId(toNum(firstOwner.user_id));
        setSelectedIntakeId(0);
        setSelectedOwnerGmfnId(safeStr(firstOwner.gmfn_id));
        setMessage("Lookup ready. Choose the community and the owner identity before preview.");
      } else if (firstIntake) {
        setSelectedOwnerId(0);
        setSelectedIntakeId(toNum(firstIntake.entry_verification_id));
        setSelectedOwnerGmfnId("");
        setMessage("Stuck intake found. Preview will create the owner's GSN ID before recording ownership.");
      } else {
        setSelectedOwnerId(0);
        setSelectedIntakeId(0);
        setSelectedOwnerGmfnId("");
        setMessage("Community lookup checked. No GSN identity or intake matched yet. Try Felix's exact phone with country code.");
      }
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
        entry_verification_id: selectedOwnerId ? undefined : selectedIntakeId || undefined,
        owner_user_id: selectedOwnerId || undefined,
        owner_gmfn_id: selectedOwnerId || selectedIntakeId ? undefined : selectedOwnerGmfnId || directOwner.owner_gmfn_id,
        owner_email: selectedOwnerId || selectedIntakeId ? undefined : directOwner.owner_email,
        owner_phone_e164: selectedOwnerId || selectedIntakeId ? undefined : directOwner.owner_phone_e164,
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
        entry_verification_id: selectedOwnerId ? undefined : selectedIntakeId || undefined,
        owner_user_id: selectedOwnerId || undefined,
        owner_gmfn_id: selectedOwnerId || selectedIntakeId ? undefined : selectedOwnerGmfnId || directOwner.owner_gmfn_id,
        owner_email: selectedOwnerId || selectedIntakeId ? undefined : directOwner.owner_email,
        owner_phone_e164: selectedOwnerId || selectedIntakeId ? undefined : directOwner.owner_phone_e164,
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

  const canPreview = Boolean(selectedClanId || safeStr(communityNameInput)) && ownerIdentityReady;
  const canExecute = Boolean(preview) && proofConfirmed && safeStr(note).length >= 12 && !result;
  const hasStuckIntake = Boolean(selectedIntake || ownerIntakes.length > 0);
  const noOwnerMatches = Boolean(lookup && safeStr(ownerQuery) && owners.length === 0 && ownerIntakes.length === 0);
  const repairState = result
    ? "Resolved"
    : preview
      ? "Proof needed"
      : selectedOwner
        ? "Owner ready"
        : hasStuckIntake
          ? "Intake ready"
          : ownerIdentityReady
            ? "Owner signal ready"
            : lookup
              ? "Search result"
              : "Not repaired";
  const nextAction = result
    ? "Send owner back"
    : preview
      ? "Confirm proof"
      : hasStuckIntake
        ? "Preview GSN ID repair"
        : selectedOwner || ownerIdentityReady
          ? "Preview repair"
          : "Search owner";

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
              <h1 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 28, lineHeight: 1.08 }}>
                Repair ownership
              </h1>
              <div style={{ marginTop: 6, ...helper() }}>
                Select Pillar of Hope and Felix. If Felix has no GSN ID, use his intake record first.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, ...factGrid(136) }}>
            {fact("Community", selectedCommunity ? communityName(selectedCommunity) : communityNameInput)}
            {fact("Owner", selectedOwner ? userName(selectedOwner) : selectedIntake ? `${intakeName(selectedIntake)} intake` : selectedOwnerGmfnId || ownerQuery || "Not set")}
            {fact("State", repairState)}
            {fact("Next", nextAction)}
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

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
                onChange={(event) => {
                  setOwnerQuery(event.target.value);
                  setSelectedOwnerId(0);
                  setSelectedIntakeId(0);
                  setSelectedOwnerGmfnId("");
                }}
                placeholder="Felix, email, or phone number"
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
          <div style={{ marginTop: 10, ...helper() }}>
            If the owner has no GSN number yet, search with the phone number used for onboarding, then choose the intake record.
          </div>
        </section>

        {noOwnerMatches ? (
          <section style={card("#FFFBEB")}>
            <div style={label()}>Owner not found</div>
            <div style={{ marginTop: 6, color: "#92400E", fontSize: 18, fontWeight: 1000, lineHeight: 1.35 }}>
              No GSN owner identity or intake matched that search yet.
            </div>
            <div style={{ marginTop: 10, ...helper() }}>
              Try the exact phone number with the country code. If nothing appears, the intake may not have been recorded and the community is still not repaired.
            </div>
          </section>
        ) : null}

        {ownerIntakes.length && !owners.length ? (
          <section style={card("#FFFBEB")}>
            <div style={label()}>Stuck intake found</div>
            <div style={{ marginTop: 6, color: "#92400E", fontSize: 18, fontWeight: 1000, lineHeight: 1.35 }}>
              The owner has no GSN ID yet, but onboarding evidence is recorded.
            </div>
            <div style={{ marginTop: 10, ...helper() }}>
              Choose the intake below, preview the repair, then record it after checking proof. GSN will create his ID first, then attach Pillar of Hope.
            </div>
          </section>
        ) : null}

        {(communities.length || owners.length || ownerIntakes.length) ? (
          <section style={card()}>
            <div style={label()}>Confirm repair records</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              <div style={soft()}>
                <div style={fieldLabel()}>Community</div>
                {communities.length ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div style={{ ...inputStyle(), background: "#F8FBFF", fontWeight: 900 }}>
                      Use typed community: {safeStr(communityNameInput) || "Not set"}
                    </div>
                    <div style={{ marginTop: 10, ...helper() }}>
                      No dropdown choice is needed here. Preview will use the community name typed in the search box above.
                    </div>
                  </>
                )}
              </div>

              <div style={soft()}>
                <div style={fieldLabel()}>Owner identity</div>
                {owners.length ? (
                  <>
                    <select
                      value={selectedOwnerId || ""}
                      onChange={(event) => {
                        const id = toNum(event.target.value);
                        const row = owners.find((item: any) => toNum(item.user_id) === id);
                        setSelectedOwnerId(id);
                        setSelectedIntakeId(0);
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
                      Use phone, email, or exact GSN ID if the name search finds more than one owner.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ ...inputStyle(), background: "#FFFBEB", color: "#92400E", fontWeight: 900 }}>
                      No GSN owner ID found yet
                    </div>
                    <div style={{ marginTop: 10, ...helper() }}>
                      Use the stuck intake below. GSN will create the missing owner ID during the repair.
                    </div>
                  </>
                )}
              </div>
              {ownerIntakes.length ? (
                <div style={soft()}>
                  <div style={fieldLabel()}>Stuck intake</div>
                  <select
                    value={selectedIntakeId || ""}
                    onChange={(event) => {
                      const id = toNum(event.target.value);
                      setSelectedIntakeId(id);
                      if (id) {
                        setSelectedOwnerId(0);
                        setSelectedOwnerGmfnId("");
                      }
                    }}
                    style={inputStyle()}
                  >
                    <option value="">Select intake</option>
                    {ownerIntakes.map((row: any) => (
                      <option key={safeStr(row.entry_verification_id)} value={safeStr(row.entry_verification_id)}>
                        {intakeName(row)} - phone ends {safeStr(row.phone_last4) || "unknown"}
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: 10, ...helper() }}>
                    Use this when Felix finished onboarding evidence but the duplicate community name stopped GSN ID creation.
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {preview ? (
          <section style={card(result ? "#ECFDF5" : "#FFFBEB")}>
            <div style={label()}>{result ? "Recorded" : "Preview"}</div>
            <h2 style={{ margin: "6px 0 0", color: result ? "#065F46" : "#92400E", fontSize: 22 }}>
              {result ? "Canonical owner recorded" : preview?.will_create_owner_identity ? "Ready to create GSN ID" : "Ready for proof confirmation"}
            </h2>
            <div style={{ marginTop: 12, ...factGrid(142) }}>
              {fact("Community", communityName(preview.community))}
              {fact("New owner", userName(preview.requested_owner))}
              {fact("GSN ID", safeStr(preview.requested_owner?.gmfn_id) || (preview?.will_create_owner_identity ? "Will be created" : "Not set"))}
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
                  I checked proof that this person is the real owner or representative for this community.
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
                  {iconLabel("check", preview?.will_create_owner_identity ? "Create GSN ID and record owner" : "Record canonical owner")}
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
