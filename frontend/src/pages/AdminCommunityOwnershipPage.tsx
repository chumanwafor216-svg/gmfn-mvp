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
  postAdminCommunityLifecycle,
  postAdminCommunityDomainLifecycle,
  postAdminCommunityDomainOwnershipReconciliation,
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
  const [communityLifecycleName, setCommunityLifecycleName] = useState(
    safeStr(searchParams.get("community_name")) || "Pillar of Hope"
  );
  const [communityLifecycleId, setCommunityLifecycleId] = useState(0);
  const [communityLifecycleStatus, setCommunityLifecycleStatus] = useState<"active" | "dormant" | "closed">("dormant");
  const [communityLifecycleNote, setCommunityLifecycleNote] = useState("");
  const [communityLifecycleConfirmed, setCommunityLifecycleConfirmed] = useState(false);
  const [communityLifecyclePreview, setCommunityLifecyclePreview] = useState<any>(null);
  const [communityLifecycleResult, setCommunityLifecycleResult] = useState<any>(null);
  const [communityLifecycleMessage, setCommunityLifecycleMessage] = useState("");
  const [communityLifecycleError, setCommunityLifecycleError] = useState("");
  const [communityLifecycleBusy, setCommunityLifecycleBusy] = useState<"preview" | "execute" | "">("");
  const [domainLifecycleName, setDomainLifecycleName] = useState(safeStr(searchParams.get("domain_name")));
  const [domainLifecycleId, setDomainLifecycleId] = useState(0);
  const [domainLifecycleStatus, setDomainLifecycleStatus] = useState<"active" | "suspended" | "closed">("suspended");
  const [domainLifecycleNote, setDomainLifecycleNote] = useState("");
  const [domainLifecycleConfirmed, setDomainLifecycleConfirmed] = useState(false);
  const [domainLifecyclePreview, setDomainLifecyclePreview] = useState<any>(null);
  const [domainLifecycleResult, setDomainLifecycleResult] = useState<any>(null);
  const [domainLifecycleMessage, setDomainLifecycleMessage] = useState("");
  const [domainLifecycleError, setDomainLifecycleError] = useState("");
  const [domainLifecycleBusy, setDomainLifecycleBusy] = useState<"preview" | "execute" | "">("");
  const [domainOwnerName, setDomainOwnerName] = useState(
    safeStr(searchParams.get("domain_name")) || "Pillar of Hope"
  );
  const [domainOwnerId, setDomainOwnerId] = useState(0);
  const [domainOwnerQuery, setDomainOwnerQuery] = useState(safeStr(searchParams.get("owner_query")));
  const [domainOwnerNote, setDomainOwnerNote] = useState("");
  const [domainOwnerConfirmed, setDomainOwnerConfirmed] = useState(false);
  const [domainOwnerPreview, setDomainOwnerPreview] = useState<any>(null);
  const [domainOwnerResult, setDomainOwnerResult] = useState<any>(null);
  const [domainOwnerMessage, setDomainOwnerMessage] = useState("");
  const [domainOwnerError, setDomainOwnerError] = useState("");
  const [domainOwnerBusy, setDomainOwnerBusy] = useState<"preview" | "execute" | "">("");
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
  const directDomainOwner = useMemo(() => directOwnerSignal(domainOwnerQuery), [domainOwnerQuery]);
  const domainOwnerIdentityReady = Boolean(
    safeStr(directDomainOwner.owner_gmfn_id) ||
      safeStr(directDomainOwner.owner_email) ||
      safeStr(directDomainOwner.owner_phone_e164)
  );
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


  async function runCommunityLifecyclePreview() {
    setCommunityLifecycleBusy("preview");
    setCommunityLifecycleError("");
    setCommunityLifecycleMessage("");
    setCommunityLifecyclePreview(null);
    setCommunityLifecycleResult(null);
    try {
      const out = await postAdminCommunityLifecycle({
        clan_id: communityLifecycleId || undefined,
        community_name: communityLifecycleId ? undefined : communityLifecycleName,
        status: communityLifecycleStatus,
        execute: false,
      });
      setCommunityLifecyclePreview(out);
      setCommunityLifecycleMessage(safeStr(out?.message) || "Community lifecycle preview ready.");
    } catch (err: any) {
      setCommunityLifecycleError(safeStr(err?.message || err) || "Community lifecycle preview failed.");
    } finally {
      setCommunityLifecycleBusy("");
    }
  }

  async function runCommunityLifecycleExecute() {
    setCommunityLifecycleBusy("execute");
    setCommunityLifecycleError("");
    setCommunityLifecycleMessage("");
    setCommunityLifecycleResult(null);
    try {
      const out = await postAdminCommunityLifecycle({
        clan_id: communityLifecycleId || undefined,
        community_name: communityLifecycleId ? undefined : communityLifecycleName,
        status: communityLifecycleStatus,
        lifecycle_confirmed: communityLifecycleConfirmed,
        execute: true,
        reviewer_note: communityLifecycleNote,
      });
      setCommunityLifecycleResult(out);
      setCommunityLifecyclePreview(out);
      setCommunityLifecycleMessage(safeStr(out?.message) || "Community lifecycle recorded.");
    } catch (err: any) {
      setCommunityLifecycleError(safeStr(err?.message || err) || "Community lifecycle update failed.");
    } finally {
      setCommunityLifecycleBusy("");
    }
  }
  async function runDomainLifecyclePreview() {
    setDomainLifecycleBusy("preview");
    setDomainLifecycleError("");
    setDomainLifecycleMessage("");
    setDomainLifecyclePreview(null);
    setDomainLifecycleResult(null);
    try {
      const out = await postAdminCommunityDomainLifecycle({
        community_domain_id: domainLifecycleId || undefined,
        domain_name: domainLifecycleId ? undefined : domainLifecycleName,
        status: domainLifecycleStatus,
        execute: false,
      });
      setDomainLifecyclePreview(out);
      setDomainLifecycleMessage(safeStr(out?.message) || "Lifecycle preview ready.");
    } catch (err: any) {
      setDomainLifecycleError(safeStr(err?.message || err) || "Lifecycle preview failed.");
    } finally {
      setDomainLifecycleBusy("");
    }
  }

  async function runDomainLifecycleExecute() {
    setDomainLifecycleBusy("execute");
    setDomainLifecycleError("");
    setDomainLifecycleMessage("");
    setDomainLifecycleResult(null);
    try {
      const out = await postAdminCommunityDomainLifecycle({
        community_domain_id: domainLifecycleId || undefined,
        domain_name: domainLifecycleId ? undefined : domainLifecycleName,
        status: domainLifecycleStatus,
        lifecycle_confirmed: domainLifecycleConfirmed,
        execute: true,
        reviewer_note: domainLifecycleNote,
      });
      setDomainLifecycleResult(out);
      setDomainLifecyclePreview(out);
      setDomainLifecycleMessage(safeStr(out?.message) || "Community Domain lifecycle recorded.");
    } catch (err: any) {
      setDomainLifecycleError(safeStr(err?.message || err) || "Lifecycle update failed.");
    } finally {
      setDomainLifecycleBusy("");
    }
  }

  async function runDomainOwnerPreview() {
    setDomainOwnerBusy("preview");
    setDomainOwnerError("");
    setDomainOwnerMessage("");
    setDomainOwnerPreview(null);
    setDomainOwnerResult(null);
    try {
      const out = await postAdminCommunityDomainOwnershipReconciliation({
        community_domain_id: domainOwnerId || undefined,
        domain_name: domainOwnerId ? undefined : domainOwnerName,
        owner_gmfn_id: directDomainOwner.owner_gmfn_id,
        owner_email: directDomainOwner.owner_email,
        owner_phone_e164: directDomainOwner.owner_phone_e164,
        execute: false,
      });
      setDomainOwnerPreview(out);
      setDomainOwnerMessage(safeStr(out?.message) || "Domain owner transfer preview ready.");
    } catch (err: any) {
      setDomainOwnerError(safeStr(err?.message || err) || "Domain owner preview failed.");
    } finally {
      setDomainOwnerBusy("");
    }
  }

  async function runDomainOwnerExecute() {
    setDomainOwnerBusy("execute");
    setDomainOwnerError("");
    setDomainOwnerMessage("");
    setDomainOwnerResult(null);
    try {
      const out = await postAdminCommunityDomainOwnershipReconciliation({
        community_domain_id: domainOwnerId || undefined,
        domain_name: domainOwnerId ? undefined : domainOwnerName,
        owner_gmfn_id: directDomainOwner.owner_gmfn_id,
        owner_email: directDomainOwner.owner_email,
        owner_phone_e164: directDomainOwner.owner_phone_e164,
        owner_proof_confirmed: domainOwnerConfirmed,
        execute: true,
        reviewer_note: domainOwnerNote,
      });
      setDomainOwnerResult(out);
      setDomainOwnerPreview(out);
      setDomainOwnerMessage(safeStr(out?.message) || "Community Domain owner recorded.");
    } catch (err: any) {
      setDomainOwnerError(safeStr(err?.message || err) || "Domain owner transfer failed.");
    } finally {
      setDomainOwnerBusy("");
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
  const canCommunityLifecyclePreview = Boolean(communityLifecycleId || safeStr(communityLifecycleName));
  const canCommunityLifecycleExecute =
    Boolean(communityLifecyclePreview) && communityLifecycleConfirmed && safeStr(communityLifecycleNote).length >= 12 && !communityLifecycleResult;
  const canLifecyclePreview = Boolean(domainLifecycleId || safeStr(domainLifecycleName));
  const canLifecycleExecute = Boolean(domainLifecyclePreview) && domainLifecycleConfirmed && safeStr(domainLifecycleNote).length >= 12 && !domainLifecycleResult;
  const canDomainOwnerPreview = Boolean(domainOwnerId || safeStr(domainOwnerName)) && domainOwnerIdentityReady;
  const canDomainOwnerExecute = Boolean(domainOwnerPreview) && domainOwnerConfirmed && safeStr(domainOwnerNote).length >= 12 && !domainOwnerResult;
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

        <section style={card("#F8FBFF")}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={label()}>Community lifecycle</div>
              <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 22 }}>Pause or close example community</h2>
            </div>
            <div style={{ ...helper(), maxWidth: 430 }}>
              Use this when a setup community should stop appearing to normal members. It does not delete the community, remove members, or transfer ownership.
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <div style={fieldLabel()}>Community name</div>
              <input
                value={communityLifecycleName}
                onChange={(event) => {
                  setCommunityLifecycleName(event.target.value);
                  setCommunityLifecycleId(0);
                  setCommunityLifecyclePreview(null);
                  setCommunityLifecycleResult(null);
                }}
                placeholder="Pillar of Hope"
                style={inputStyle()}
              />
            </div>
            <div>
              <div style={fieldLabel()}>Or community ID</div>
              <input
                value={communityLifecycleId || ""}
                onChange={(event) => {
                  setCommunityLifecycleId(toNum(event.target.value));
                  setCommunityLifecyclePreview(null);
                  setCommunityLifecycleResult(null);
                }}
                placeholder="11"
                inputMode="numeric"
                style={inputStyle()}
              />
            </div>
            <div>
              <div style={fieldLabel()}>Lifecycle decision</div>
              <select
                value={communityLifecycleStatus}
                onChange={(event) => {
                  setCommunityLifecycleStatus(event.target.value as "active" | "dormant" | "closed");
                  setCommunityLifecyclePreview(null);
                  setCommunityLifecycleResult(null);
                }}
                style={inputStyle()}
              >
                <option value="dormant">Pause pilot use</option>
                <option value="closed">Close example community</option>
                <option value="active">Reactivate community</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SecondaryButton
              onClick={runCommunityLifecyclePreview}
              busy={communityLifecycleBusy === "preview"}
              busyLabel="Previewing..."
              disabled={communityLifecycleBusy !== "" || !canCommunityLifecyclePreview}
              debugId="admin-community-lifecycle.preview"
            >
              {iconLabel("eye", "Preview community lifecycle")}
            </SecondaryButton>
          </div>

          {communityLifecyclePreview ? (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div style={{ ...factGrid(142) }}>
                {fact("Community", safeStr(communityLifecyclePreview?.community?.name))}
                {fact("Current", safeStr(communityLifecyclePreview?.current_status))}
                {fact("Requested", safeStr(communityLifecyclePreview?.requested_status))}
                {fact("Member Home", communityLifecyclePreview?.will_hide_from_member_home ? "Hidden" : "Visible")}
              </div>
              <div style={{ ...institutionalInnerCard("#FFFFFF"), ...helper() }}>
                {safeStr(communityLifecyclePreview?.boundary) || "History is preserved. This does not delete the community, remove members, transfer ownership, or ban anybody."}
              </div>
              {!communityLifecycleResult ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#0B1F33", fontWeight: 900 }}>
                    <input
                      type="checkbox"
                      checked={communityLifecycleConfirmed}
                      onChange={(event) => setCommunityLifecycleConfirmed(event.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    I confirm this ordinary community lifecycle decision. I understand it preserves history and does not delete members or evidence.
                  </label>
                  <div>
                    <div style={fieldLabel()}>Reviewer note</div>
                    <textarea
                      value={communityLifecycleNote}
                      onChange={(event) => setCommunityLifecycleNote(event.target.value)}
                      placeholder="Example: Pillar of Hope was used as a pilot setup example. Pause the example shell while preserving the name, membership trail, and audit history."
                      rows={4}
                      style={{ ...inputStyle(), resize: "vertical", minHeight: 92 }}
                    />
                  </div>
                  <PrimaryButton
                    onClick={runCommunityLifecycleExecute}
                    busy={communityLifecycleBusy === "execute"}
                    busyLabel="Recording..."
                    disabled={communityLifecycleBusy !== "" || !canCommunityLifecycleExecute}
                    debugId="admin-community-lifecycle.execute"
                  >
                    {iconLabel("check", "Record community lifecycle")}
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          ) : null}

          {(communityLifecycleMessage || communityLifecycleError) ? (
            <div style={{ marginTop: 12, ...institutionalInnerCard(communityLifecycleError ? "#FEF2F2" : "#ECFDF5") }}>
              <div style={{ color: communityLifecycleError ? "#991B1B" : "#065F46", fontWeight: 1000 }}>
                {iconLabel(communityLifecycleError ? "alert" : "check", communityLifecycleError || communityLifecycleMessage)}
              </div>
            </div>
          ) : null}
        </section>
        <section style={card("#F8FBFF")}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={label()}>Community Domain owner</div>
              <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 22 }}>Transfer the protected domain</h2>
            </div>
            <div style={{ ...helper(), maxWidth: 430 }}>
              Use this when a pilot/demo Community Domain name already exists and must move to the rightful representative. This does not close, delete, or recreate the domain.
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            <div>
              <div style={fieldLabel()}>Domain name</div>
              <input
                value={domainOwnerName}
                onChange={(event) => {
                  setDomainOwnerName(event.target.value);
                  setDomainOwnerId(0);
                  setDomainOwnerPreview(null);
                  setDomainOwnerResult(null);
                }}
                placeholder="pillar-of-hope"
                style={inputStyle()}
              />
            </div>
            <div>
              <div style={fieldLabel()}>Or domain ID</div>
              <input
                value={domainOwnerId || ""}
                onChange={(event) => {
                  setDomainOwnerId(toNum(event.target.value));
                  setDomainOwnerPreview(null);
                  setDomainOwnerResult(null);
                }}
                placeholder="123"
                inputMode="numeric"
                style={inputStyle()}
              />
            </div>
            <div>
              <div style={fieldLabel()}>New owner</div>
              <input
                value={domainOwnerQuery}
                onChange={(event) => {
                  setDomainOwnerQuery(event.target.value);
                  setDomainOwnerPreview(null);
                  setDomainOwnerResult(null);
                }}
                placeholder="GMFN-U-E485F73F or email"
                style={inputStyle()}
              />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SecondaryButton
              onClick={runDomainOwnerPreview}
              busy={domainOwnerBusy === "preview"}
              busyLabel="Previewing..."
              disabled={domainOwnerBusy !== "" || !canDomainOwnerPreview}
              debugId="admin-community-domain-ownership.preview"
            >
              {iconLabel("eye", "Preview domain transfer")}
            </SecondaryButton>
          </div>

          <div style={{ marginTop: 10, ...helper() }}>
            For Felix, use exact ID <strong>GMFN-U-E485F73F</strong> or exact email <strong>fetern@yahoo.com</strong>. Do not use lifecycle close/suspend for ownership transfer.
          </div>

          {domainOwnerPreview ? (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div style={{ ...factGrid(142) }}>
                {fact("Domain", safeStr(domainOwnerPreview?.community_domain?.display_name) || safeStr(domainOwnerPreview?.community_domain?.domain_name))}
                {fact("Current owner", userName(domainOwnerPreview?.current_owner))}
                {fact("New owner", userName(domainOwnerPreview?.requested_owner))}
                {fact("Action", safeStr(domainOwnerPreview?.membership_action).replace(/_/g, " "))}
              </div>
              <div style={{ ...institutionalInnerCard("#FFFFFF"), ...helper() }}>
                {safeStr(domainOwnerPreview?.boundary) || "History is preserved. This records Community Domain ownership; it does not delete or duplicate the name."}
              </div>
              {!domainOwnerResult ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#0B1F33", fontWeight: 900 }}>
                    <input
                      type="checkbox"
                      checked={domainOwnerConfirmed}
                      onChange={(event) => setDomainOwnerConfirmed(event.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    I checked proof that this person is the real owner or representative for this Community Domain.
                  </label>
                  <div>
                    <div style={fieldLabel()}>Reviewer note</div>
                    <textarea
                      value={domainOwnerNote}
                      onChange={(event) => setDomainOwnerNote(event.target.value)}
                      placeholder="Example: Felix Nwobi is present with Chuma. Pillar of Hope demo domain was created under Chuma during pilot setup and is now transferred to the rightful representative."
                      rows={4}
                      style={{ ...inputStyle(), resize: "vertical", minHeight: 92 }}
                    />
                  </div>
                  <PrimaryButton
                    onClick={runDomainOwnerExecute}
                    busy={domainOwnerBusy === "execute"}
                    busyLabel="Recording..."
                    disabled={domainOwnerBusy !== "" || !canDomainOwnerExecute}
                    debugId="admin-community-domain-ownership.execute"
                  >
                    {iconLabel("check", "Record domain owner")}
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          ) : null}

          {(domainOwnerMessage || domainOwnerError) ? (
            <div style={{ marginTop: 12, ...institutionalInnerCard(domainOwnerError ? "#FEF2F2" : "#ECFDF5") }}>
              <div style={{ color: domainOwnerError ? "#991B1B" : "#065F46", fontWeight: 1000 }}>
                {iconLabel(domainOwnerError ? "alert" : "check", domainOwnerError || domainOwnerMessage)}
              </div>
            </div>
          ) : null}
        </section>
        <section style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={label()}>Community Domain lifecycle</div>
              <h2 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 22 }}>Suspend, close, or reactivate a pilot domain</h2>
            </div>
            <div style={{ ...helper(), maxWidth: 420 }}>
              Pilot billing is suspended. Closing a domain blocks normal operation and public lookup while keeping the name and history reserved.
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <div style={fieldLabel()}>Domain name</div>
              <input
                value={domainLifecycleName}
                onChange={(event) => {
                  setDomainLifecycleName(event.target.value);
                  setDomainLifecycleId(0);
                  setDomainLifecyclePreview(null);
                  setDomainLifecycleResult(null);
                }}
                placeholder="pillar-of-hope"
                style={inputStyle()}
              />
            </div>
            <div>
              <div style={fieldLabel()}>Or domain ID</div>
              <input
                value={domainLifecycleId || ""}
                onChange={(event) => {
                  setDomainLifecycleId(toNum(event.target.value));
                  setDomainLifecyclePreview(null);
                  setDomainLifecycleResult(null);
                }}
                placeholder="123"
                inputMode="numeric"
                style={inputStyle()}
              />
            </div>
            <div>
              <div style={fieldLabel()}>Lifecycle decision</div>
              <select
                value={domainLifecycleStatus}
                onChange={(event) => {
                  setDomainLifecycleStatus(event.target.value as "active" | "suspended" | "closed");
                  setDomainLifecyclePreview(null);
                  setDomainLifecycleResult(null);
                }}
                style={inputStyle()}
              >
                <option value="suspended">Suspend pilot use</option>
                <option value="closed">Close domain</option>
                <option value="active">Reactivate pilot use</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SecondaryButton
              onClick={runDomainLifecyclePreview}
              busy={domainLifecycleBusy === "preview"}
              busyLabel="Previewing..."
              disabled={domainLifecycleBusy !== "" || !canLifecyclePreview}
              debugId="admin-community-domain-lifecycle.preview"
            >
              {iconLabel("eye", "Preview lifecycle")}
            </SecondaryButton>
          </div>

          {domainLifecyclePreview ? (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div style={{ ...factGrid(142) }}>
                {fact("Domain", safeStr(domainLifecyclePreview?.community_domain?.display_name) || safeStr(domainLifecyclePreview?.community_domain?.domain_name))}
                {fact("Current", safeStr(domainLifecyclePreview?.current_status))}
                {fact("Requested", safeStr(domainLifecyclePreview?.requested_status))}
                {fact("Payment", "Suspended")}
              </div>
              <div style={{ ...institutionalInnerCard("#FFFFFF"), ...helper() }}>
                {safeStr(domainLifecyclePreview?.boundary) || "The domain name and history stay reserved. This is not a global user ban."}
              </div>
              {!domainLifecycleResult ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#0B1F33", fontWeight: 900 }}>
                    <input
                      type="checkbox"
                      checked={domainLifecycleConfirmed}
                      onChange={(event) => setDomainLifecycleConfirmed(event.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    I confirm this Community Domain lifecycle decision. I understand it preserves history and does not globally ban the owner identity.
                  </label>
                  <div>
                    <div style={fieldLabel()}>Reviewer note</div>
                    <textarea
                      value={domainLifecycleNote}
                      onChange={(event) => setDomainLifecycleNote(event.target.value)}
                      placeholder="Example: Pilot owner did not continue after review; close domain but preserve audit history and name reservation."
                      rows={4}
                      style={{ ...inputStyle(), resize: "vertical", minHeight: 92 }}
                    />
                  </div>
                  <PrimaryButton
                    onClick={runDomainLifecycleExecute}
                    busy={domainLifecycleBusy === "execute"}
                    busyLabel="Recording..."
                    disabled={domainLifecycleBusy !== "" || !canLifecycleExecute}
                    debugId="admin-community-domain-lifecycle.execute"
                  >
                    {iconLabel("check", "Record lifecycle decision")}
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          ) : null}

          {(domainLifecycleMessage || domainLifecycleError) ? (
            <div style={{ marginTop: 12, ...institutionalInnerCard(domainLifecycleError ? "#FEF2F2" : "#ECFDF5") }}>
              <div style={{ color: domainLifecycleError ? "#991B1B" : "#065F46", fontWeight: 1000 }}>
                {iconLabel(domainLifecycleError ? "alert" : "check", domainLifecycleError || domainLifecycleMessage)}
              </div>
            </div>
          ) : null}
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
