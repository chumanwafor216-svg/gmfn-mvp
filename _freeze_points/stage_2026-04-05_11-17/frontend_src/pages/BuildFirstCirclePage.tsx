import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getMe, getSelectedClanId, safeCopy } from "../lib/api";
import {
  FIRST_CIRCLE_RELATIONSHIP_OPTIONS,
  FIRST_CIRCLE_ROLE_OPTIONS,
  buildInviteBundle,
  buildInviteMessage,
  clearFirstCircleDraft,
  createFirstCircleContact,
  emptyFirstCircleDraft,
  getFirstCircleProgress,
  getSuggestedRelationshipsForRole,
  isContactInviteReady,
  loadFirstCircleDraft,
  parsePastedContacts,
  relationshipLabel,
  saveFirstCircleDraft,
  type FirstCircleContact,
  type FirstCircleDraft,
  type FirstCircleMemberRole,
} from "../lib/firstCircle";

type DeviceContactSelection = {
  name?: string[] | string;
  tel?: string[] | string;
  email?: string[] | string;
};

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

function primaryBtn(disabled = false): React.CSSProperties {
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

function secondaryBtn(disabled = false): React.CSSProperties {
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

function subtleBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
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

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 110,
    resize: "vertical" as const,
    lineHeight: 1.6,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase" as const,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap" as const,
  };
}

function feedbackCard(success = false): React.CSSProperties {
  return {
    ...softCard(success ? "#F3FBF5" : "#FEF2F2"),
    color: success ? "#166534" : "#991B1B",
    border: success
      ? "1px solid rgba(34,197,94,0.16)"
      : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function displayName(me: any): string {
  const direct =
    safeStr(me?.display_name) ||
    safeStr(me?.nickname) ||
    safeStr(me?.name) ||
    safeStr(me?.first_name);

  if (direct) return direct;

  const email = safeStr(me?.email);
  if (email.includes("@")) return email.split("@")[0] || "Member";
  return email || "Member";
}

function firstFromArrayOrString(value: string[] | string | undefined): string {
  if (Array.isArray(value)) {
    return safeStr(value.find((item) => safeStr(item)) || "");
  }
  return safeStr(value || "");
}

function contactMergeKey(contact: Partial<FirstCircleContact>): string {
  return [
    safeStr(contact.name).toLowerCase(),
    safeStr(contact.phone).replace(/\s+/g, ""),
    safeStr(contact.email).toLowerCase(),
  ].join("|");
}

function mergeContacts(
  incoming: FirstCircleContact[],
  existing: FirstCircleContact[]
): FirstCircleContact[] {
  const seen = new Set<string>();
  const out: FirstCircleContact[] = [];

  for (const item of [...incoming, ...existing]) {
    const key = contactMergeKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function createContactsFromDeviceSelection(
  picked: DeviceContactSelection[]
): FirstCircleContact[] {
  const out: FirstCircleContact[] = [];

  for (const row of picked || []) {
    const name = firstFromArrayOrString(row?.name);
    const phone = firstFromArrayOrString(row?.tel);
    const email = firstFromArrayOrString(row?.email);

    if (!name) continue;
    if (!phone && !email) continue;

    out.push(
      createFirstCircleContact({
        name,
        phone,
        email,
        relationship: "",
        note: "",
        source: "device",
        selected: true,
      })
    );
  }

  return out;
}

export default function BuildFirstCirclePage() {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [draft, setDraft] = useState<FirstCircleDraft>(() =>
    loadFirstCircleDraft()
  );

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualRelationship, setManualRelationship] = useState("");
  const [manualNote, setManualNote] = useState("");

  const [pastedContacts, setPastedContacts] = useState("");
  const [pickingDeviceContacts, setPickingDeviceContacts] = useState(false);

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
    (async () => {
      const [meRes, clanRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
      ]);

      setMe(meRes || null);
      setCommunity(clanRes || null);
    })();
  }, []);

  useEffect(() => {
    saveFirstCircleDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (!err && !msg) return;

    const timer = window.setTimeout(() => {
      setErr("");
      setMsg("");
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [err, msg]);

  const memberName = useMemo(() => displayName(me), [me]);
  const gmfnId = useMemo(() => safeStr(me?.gmfn_id || "Pending"), [me]);
  const communityName = useMemo(() => {
    return (
      safeStr(community?.marketplace_name || community?.name) ||
      (selectedClanId ? `Community ${selectedClanId}` : "your community")
    );
  }, [community, selectedClanId]);

  const progress = useMemo(() => getFirstCircleProgress(draft), [draft]);

  const suggestedRelationships = useMemo(
    () => getSuggestedRelationshipsForRole(draft.memberRole),
    [draft.memberRole]
  );

  const readyContacts = useMemo(
    () =>
      draft.contacts.filter(
        (item: FirstCircleContact) => item.selected && isContactInviteReady(item)
      ),
    [draft.contacts]
  );

  const selectedContacts = useMemo(
    () =>
      draft.contacts.filter((item: FirstCircleContact) => item.selected),
    [draft.contacts]
  );

  const deviceContactsAvailable = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (typeof navigator === "undefined") return false;
    return Boolean((navigator as any)?.contacts?.select);
  }, []);

  function updateDraft(next: Partial<FirstCircleDraft>) {
    setDraft((prev) => ({
      ...prev,
      ...next,
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateContact(id: string, patch: Partial<FirstCircleContact>) {
    setDraft((prev) => ({
      ...prev,
      contacts: prev.contacts.map((item: FirstCircleContact) =>
        item.id === id ? { ...item, ...patch } : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addManualContact() {
    if (!safeStr(manualName)) {
      setErr("Add at least the contact name.");
      return;
    }

    if (!safeStr(manualPhone) && !safeStr(manualEmail)) {
      setErr("Add a phone number or email so the invite can be useful.");
      return;
    }

    const contact = createFirstCircleContact({
      name: manualName,
      phone: manualPhone,
      email: manualEmail,
      relationship: manualRelationship as FirstCircleContact["relationship"],
      note: manualNote,
      source: "manual",
      selected: true,
    });

    setDraft((prev) => ({
      ...prev,
      contacts: mergeContacts([contact], prev.contacts),
      updatedAt: new Date().toISOString(),
    }));

    setManualName("");
    setManualPhone("");
    setManualEmail("");
    setManualRelationship("");
    setManualNote("");
    setErr("");
    setMsg("Trusted contact added.");
  }

  function addPastedContactRows() {
    const rows = parsePastedContacts(pastedContacts);

    if (rows.length === 0) {
      setErr("Paste one contact per line, for example: Name, Phone, Relationship");
      return;
    }

    setDraft((prev) => ({
      ...prev,
      contacts: mergeContacts(rows, prev.contacts),
      updatedAt: new Date().toISOString(),
    }));

    setPastedContacts("");
    setErr("");
    setMsg(`${rows.length} contacts added from pasted list.`);
  }

  async function handlePickDeviceContacts() {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      setErr("Phone contact access is not available here.");
      return;
    }

    if (!window.isSecureContext) {
      setErr(
        "Phone contact access needs a secure browser context. Use HTTPS or a supported secure local environment."
      );
      return;
    }

    const navAny = navigator as any;
    if (!navAny?.contacts?.select) {
      setErr(
        "Phone contact access is not available in this browser yet. Use manual add or paste for now."
      );
      return;
    }

    try {
      setPickingDeviceContacts(true);

      const picked = (await navAny.contacts.select(
        ["name", "tel", "email"],
        {
          multiple: true,
        }
      )) as DeviceContactSelection[];

      const rows = createContactsFromDeviceSelection(picked || []);

      if (rows.length === 0) {
        setErr("No usable phone contact was selected.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        contacts: mergeContacts(rows, prev.contacts),
        updatedAt: new Date().toISOString(),
      }));

      setErr("");
      setMsg(`${rows.length} contacts added from phone book.`);
    } catch (error: any) {
      const message = safeStr(error?.message);

      if (
        message.toLowerCase().includes("abort") ||
        message.toLowerCase().includes("cancel")
      ) {
        setErr("Phone contact selection was cancelled.");
      } else {
        setErr(
          message ||
            "Phone contact access could not be completed in this browser."
        );
      }
    } finally {
      setPickingDeviceContacts(false);
    }
  }

  function removeContact(id: string) {
    setDraft((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((item: FirstCircleContact) => item.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }

  function clearDraft() {
    clearFirstCircleDraft();
    setDraft(emptyFirstCircleDraft());
    setMsg("First-circle draft cleared.");
    setErr("");
  }

  function copyInviteForContact(contact: FirstCircleContact) {
    if (!isContactInviteReady(contact)) {
      setErr("This contact still needs a usable name and phone or email.");
      return;
    }

    const message = buildInviteMessage({
      contact,
      memberName,
      gmfnId,
      communityName,
      memberRole: draft.memberRole,
      operatingPattern: draft.operatingPattern,
    });

    safeCopy(message);
    setMsg(`Invite draft copied for ${safeStr(contact.name || "contact")}.`);
    setErr("");
  }

  function copyInviteBundleNow() {
    if (readyContacts.length === 0) {
      setErr("No ready invite draft is available yet.");
      return;
    }

    const bundle = buildInviteBundle({
      draft,
      memberName,
      gmfnId,
      communityName,
    });

    safeCopy(bundle);
    setMsg("All ready invite drafts copied.");
    setErr("");
  }

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Build Your First Circle"
        title="Build Your First Circle"
        subtitle="Bring in the people you already trust and already do real life with. This step is guided, trust-based, and local-first."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/community"
        backLabel="Community Home"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          { label: "Trust", to: "/app/trust" },
        ]}
      />

      {err ? <div style={feedbackCard(false)}>{err}</div> : null}
      {msg ? <div style={feedbackCard(true)}>{msg}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 280px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Start here</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              Start with real people, not random people.
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.85,
                maxWidth: 760,
              }}
            >
              Add suppliers, buyers, family-support people, remittance contacts,
              savings partners, group officers, and other serious relationships
              that already matter in your real life.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              <span style={badge(false)}>Context: {communityName}</span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Progress</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.6,
              }}
            >
              {progress.nextStepText}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Selected: {progress.selectedCount}</span>
              <span style={badge(false)}>Ready: {progress.readyCount}</span>
              <span style={badge(false)}>Target: {progress.targetCount}</span>
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
                onClick={copyInviteBundleNow}
                disabled={readyContacts.length === 0}
                style={primaryBtn(readyContacts.length === 0)}
              >
                Copy Invite Bundle
              </button>

              <button
                type="button"
                onClick={clearDraft}
                style={secondaryBtn(false)}
              >
                Clear Draft
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Step 1 — Your work context</div>

        <div
          style={{
            marginTop: 10,
            color: "#5F7287",
            fontSize: 14,
            lineHeight: 1.8,
            maxWidth: 820,
          }}
        >
          Tell the app what you do first, so the guidance stays relationship-based
          instead of random.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <div style={sectionLabel()}>Your role</div>
            <select
              value={draft.memberRole}
              onChange={(e) =>
                updateDraft({
                  memberRole: e.target.value as FirstCircleMemberRole | "",
                })
              }
              style={{ ...inputStyle(), marginTop: 8 }}
            >
              <option value="">Choose your role</option>
              {FIRST_CIRCLE_ROLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={sectionLabel()}>Suggested relationship types</div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {suggestedRelationships.length === 0 ? (
                <span style={badge(false)}>Choose your role first</span>
              ) : (
                suggestedRelationships.map((item) => (
                  <span key={item} style={badge(false)}>
                    {relationshipLabel(item)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={sectionLabel()}>How you work</div>
          <textarea
            value={draft.operatingPattern}
            onChange={(e) => updateDraft({ operatingPattern: e.target.value })}
            placeholder="Examples: I buy and resell. I send money home monthly. I manage a local association. I supply goods to traders."
            style={{ ...textAreaStyle(), marginTop: 8 }}
          />
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Step 2 — Add trusted people</div>

        <div
          style={{
            marginTop: 10,
            color: "#5F7287",
            fontSize: 14,
            lineHeight: 1.8,
            maxWidth: 860,
          }}
        >
          Use any simple route that fits your situation: manual entry, pasted list,
          or supported phone contact selection.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Manual add</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Name"
                style={inputStyle()}
              />

              <select
                value={manualRelationship}
                onChange={(e) => setManualRelationship(e.target.value)}
                style={inputStyle()}
              >
                <option value="">Relationship type</option>
                {FIRST_CIRCLE_RELATIONSHIP_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="Phone number"
                style={inputStyle()}
              />

              <input
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="Email"
                style={inputStyle()}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <textarea
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Optional note about this relationship"
                style={textAreaStyle()}
              />
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button type="button" onClick={addManualContact} style={primaryBtn(false)}>
                Add Trusted Person
              </button>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Paste or choose</div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              One line per person. Example:
              <br />
              <strong style={{ color: "#0B1F33" }}>
                Amina Bello, +2348000000000, supplier
              </strong>
            </div>

            <div style={{ marginTop: 12 }}>
              <textarea
                value={pastedContacts}
                onChange={(e) => setPastedContacts(e.target.value)}
                placeholder="Name, phone or email, relationship"
                style={textAreaStyle()}
              />
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={addPastedContactRows}
                style={primaryBtn(false)}
              >
                Add Pasted Contacts
              </button>

              <button
                type="button"
                onClick={() => void handlePickDeviceContacts()}
                disabled={pickingDeviceContacts || !deviceContactsAvailable}
                style={secondaryBtn(pickingDeviceContacts || !deviceContactsAvailable)}
              >
                {pickingDeviceContacts
                  ? "Opening phone book..."
                  : "Choose From Phone Contacts"}
              </button>
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#64748B",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {deviceContactsAvailable
                ? "On supported secure devices, you can choose contacts directly from your phone book. Nothing is sent automatically."
                : "Phone book access depends on browser and device support. Manual add and paste still work everywhere."}
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
            <div style={sectionLabel()}>Step 3 — Review and invite</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Keep only the people you truly trust and already do real life with.
            </div>
          </div>

          <span style={badge(false)}>{selectedContacts.length} selected people</span>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {draft.contacts.length === 0 ? (
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              No trusted person has been added yet.
            </div>
          ) : (
            draft.contacts.map((contact) => (
              <div key={contact.id} style={innerCard("#FCFEFF")}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "minmax(0, 1.15fr) minmax(0, 0.85fr) auto",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 16,
                        lineHeight: 1.4,
                      }}
                    >
                      {safeStr(contact.name || "Contact")}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>
                        {relationshipLabel(contact.relationship)}
                      </span>
                      <span style={badge(false)}>Source: {contact.source}</span>
                      <span style={badge(false)}>
                        {isContactInviteReady(contact)
                          ? "Invite ready"
                          : "Needs phone or email"}
                      </span>
                    </div>

                    {safeStr(contact.note) ? (
                      <div
                        style={{
                          marginTop: 10,
                          color: "#5F7287",
                          fontSize: 14,
                          lineHeight: 1.75,
                        }}
                      >
                        {contact.note}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <input
                      value={contact.phone}
                      onChange={(e) =>
                        updateContact(contact.id, { phone: e.target.value })
                      }
                      placeholder="Phone"
                      style={inputStyle()}
                    />

                    <input
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(contact.id, { email: e.target.value })
                      }
                      placeholder="Email"
                      style={inputStyle()}
                    />

                    <select
                      value={contact.relationship}
                      onChange={(e) =>
                        updateContact(contact.id, {
                          relationship: e.target.value as FirstCircleContact["relationship"],
                        })
                      }
                      style={inputStyle()}
                    >
                      <option value="">Relationship type</option>
                      {FIRST_CIRCLE_RELATIONSHIP_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: isCompact ? "flex-start" : "flex-end",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateContact(contact.id, {
                          selected: !contact.selected,
                        })
                      }
                      style={contact.selected ? primaryBtn(false) : secondaryBtn(false)}
                    >
                      {contact.selected ? "Selected" : "Select"}
                    </button>

                    <button
                      type="button"
                      onClick={() => copyInviteForContact(contact)}
                      style={secondaryBtn(!isContactInviteReady(contact))}
                      disabled={!isContactInviteReady(contact)}
                    >
                      Copy Invite
                    </button>

                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      style={subtleBtn(false)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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
            onClick={copyInviteBundleNow}
            disabled={readyContacts.length === 0}
            style={primaryBtn(readyContacts.length === 0)}
          >
            Copy Invite Bundle
          </button>

          <Link to="/app/community" style={secondaryBtn(false)}>
            Open Community Home
          </Link>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What the app is doing</div>

        <div
          style={{
            marginTop: 10,
            color: "#0B1F33",
            fontWeight: 900,
            fontSize: isCompact ? 24 : 28,
            lineHeight: 1.18,
            maxWidth: 820,
          }}
        >
          The app is helping you build a trust-based first circle, not a random invite list.
        </div>

        <div
          style={{
            marginTop: 12,
            color: "#5F7287",
            fontSize: 15,
            lineHeight: 1.85,
            maxWidth: 900,
          }}
        >
          These contacts do not automatically raise trust scores. They only help
          you identify who already matters in your real life so that GMFN can
          begin from real relationships.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/community" style={primaryBtn(false)}>
            Open Community Home
          </Link>
          <Link to="/app/dashboard" style={secondaryBtn(false)}>
            Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}