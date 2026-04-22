import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getMe, getSelectedClanId, safeCopy } from "../lib/api";
import * as firstCircle from "../lib/firstCircle";

type FirstCircleContact = {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  note?: string;
  selected?: boolean;
  source?: "manual" | "device";
};

type FirstCircleDraft = {
  memberRole: string;
  contacts: FirstCircleContact[];
};

type ManualFormState = {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  note: string;
  selected: boolean;
};

type CollapseState = {
  progress: boolean;
  role: boolean;
  add: boolean;
  contacts: boolean;
  invite: boolean;
};

type NoticeTone = "success" | "error";

const UI_STORAGE_KEY = "gmfn.buildFirstCircle.sections.v1";
const DRAFT_FALLBACK_KEY = "gmfn.firstCircle.fallback.v1";

const ROLE_OPTIONS = firstCircle.FIRST_CIRCLE_ROLE_OPTIONS.map(
  (option) => option.value
);

const COMMON_RELATIONSHIPS = firstCircle.FIRST_CIRCLE_RELATIONSHIP_OPTIONS.map(
  (option) => option.value
);

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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
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
    whiteSpace: "normal",
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
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
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
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
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
    minHeight: 96,
    resize: "vertical",
    lineHeight: 1.6,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function defaultCollapseState(): CollapseState {
  return {
    progress: false,
    role: false,
    add: false,
    contacts: false,
    invite: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    progress: Boolean(raw?.progress ?? base.progress),
    role: Boolean(raw?.role ?? base.role),
    add: Boolean(raw?.add ?? base.add),
    contacts: Boolean(raw?.contacts ?? base.contacts),
    invite: Boolean(raw?.invite ?? base.invite),
  };
}

function defaultDraft(): FirstCircleDraft {
  return {
    memberRole: "",
    contacts: [],
  };
}

function defaultManualForm(): ManualFormState {
  return {
    name: "",
    relationship: "",
    phone: "",
    email: "",
    note: "",
    selected: true,
  };
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }

  return `fc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadDraft(): FirstCircleDraft {
  const fn = (firstCircle as any).loadFirstCircleDraft;
  if (typeof fn === "function") {
    try {
      const result = fn();
      if (result && typeof result === "object") {
        return {
          memberRole: safeStr(result.memberRole),
          contacts: Array.isArray(result.contacts) ? result.contacts : [],
        };
      }
    } catch {
      // ignore
    }
  }

  return readLocalJSON<FirstCircleDraft>(DRAFT_FALLBACK_KEY, defaultDraft());
}

function saveDraft(draft: FirstCircleDraft) {
  const fn =
    (firstCircle as any).saveFirstCircleDraft ||
    (firstCircle as any).persistFirstCircleDraft ||
    (firstCircle as any).setFirstCircleDraft;

  if (typeof fn === "function") {
    try {
      fn(draft);
    } catch {
      // ignore
    }
  }

  writeLocalJSON(DRAFT_FALLBACK_KEY, draft);
}

function clearSavedDraft() {
  const fn =
    (firstCircle as any).clearFirstCircleDraft ||
    (firstCircle as any).resetFirstCircleDraft;

  if (typeof fn === "function") {
    try {
      fn();
    } catch {
      // ignore
    }
  }

  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_FALLBACK_KEY);
    }
  } catch {
    // ignore
  }
}

function roleText(value: string): string {
  const raw = safeStr(value);
  if (!raw) return "Not chosen";

  const fn = (firstCircle as any).roleLabel;
  if (typeof fn === "function") {
    try {
      const label = safeStr(fn(raw));
      if (label && label !== "Member") return label;
    } catch {
      // ignore
    }
  }

  return raw
    ? value
        .split("-")
        .join("_")
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Not chosen";
}

function relationshipText(value: string): string {
  const fn = (firstCircle as any).relationshipLabel;
  if (typeof fn === "function") {
    try {
      return safeStr(fn(value)) || value;
    } catch {
      // ignore
    }
  }

  return value
    ? value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Relationship";
}

function contactInviteReady(contact: FirstCircleContact): boolean {
  const fn = (firstCircle as any).isContactInviteReady;
  if (typeof fn === "function") {
    try {
      return Boolean(fn(contact));
    } catch {
      // ignore
    }
  }

  return Boolean(safeStr(contact.phone) || safeStr(contact.email));
}

function suggestedRelationships(role: string): string[] {
  const fn = (firstCircle as any).getSuggestedRelationshipsForRole;
  if (typeof fn === "function") {
    try {
      const result = fn(role);
      if (Array.isArray(result) && result.length > 0) {
        return result.map((item: any) => safeStr(item)).filter(Boolean);
      }
    } catch {
      // ignore
    }
  }

  return COMMON_RELATIONSHIPS;
}

function progressForDraft(draft: FirstCircleDraft) {
  const selectedCount = draft.contacts.filter((item) => item.selected).length;
  const readyCount = draft.contacts.filter(
    (item) => item.selected && contactInviteReady(item)
  ).length;
  const targetCount = 3;
  const missingReadyCount = Math.max(targetCount - readyCount, 0);

  let nextStepText = "First choose what you mostly do.";
  if (draft.memberRole && readyCount === 0) {
    nextStepText = "Now add three real people with phone or email.";
  } else if (draft.memberRole && missingReadyCount > 0) {
    nextStepText = `Add ${missingReadyCount} more ready ${
      missingReadyCount === 1 ? "person" : "people"
    }.`;
  } else if (selectedCount > readyCount) {
    nextStepText = "Some selected people still need phone or email.";
  } else {
    nextStepText = "Your first circle is ready to review and copy.";
  }

  return {
    selectedCount,
    readyCount,
    targetCount,
    nextStepText,
  };
}

function inviteBundleText(params: {
  draft: FirstCircleDraft;
  memberName: string;
  gmfnId: string;
  communityName: string;
}): string {
  const fn = (firstCircle as any).buildInviteBundle;
  if (typeof fn === "function") {
    try {
      const out = fn(params);
      if (safeStr(out)) return safeStr(out);
    } catch {
      // ignore
    }
  }

  const readyContacts = params.draft.contacts.filter(
    (item) => item.selected && contactInviteReady(item)
  );

  const header = [
    `Invite from: ${params.memberName}`,
    params.gmfnId ? `GMFN ID: ${params.gmfnId}` : "",
    params.communityName ? `Community: ${params.communityName}` : "",
    "",
    "Trusted first-circle contacts:",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = readyContacts.map((item, index) => {
    return `${index + 1}. ${item.name} — ${relationshipText(item.relationship)}${
      item.phone ? ` — ${item.phone}` : ""
    }${item.email ? ` — ${item.email}` : ""}`;
  });

  return [header, ...lines].join("\n");
}

export default function BuildFirstCirclePage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(readLocalJSON(UI_STORAGE_KEY, defaultCollapseState()))
  );

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [draft, setDraft] = useState<FirstCircleDraft>(defaultDraft());
  const [manualForm, setManualForm] = useState<ManualFormState>(defaultManualForm());
  const [pickingContacts, setPickingContacts] = useState(false);

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
    writeLocalJSON(UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
        ]);

        if (!alive) return;

        const loadedDraft = loadDraft();

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setDraft(loadedDraft);
        setManualForm((prev) => ({
          ...prev,
          relationship:
            prev.relationship ||
            suggestedRelationships(safeStr(loadedDraft.memberRole))[0] ||
            "",
        }));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const communityName = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "your community")
    );
  }, [currentClan, selectedClanId]);

  const memberName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me]);

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id);
  }, [me]);

  const progress = useMemo(() => progressForDraft(draft), [draft]);
  const roleHints = useMemo(
    () => suggestedRelationships(safeStr(draft.memberRole)),
    [draft.memberRole]
  );

  const readyContacts = useMemo(() => {
    return draft.contacts.filter(
      (item) => item.selected && contactInviteReady(item)
    );
  }, [draft.contacts]);

  const inviteBundle = useMemo(() => {
    return inviteBundleText({
      draft,
      memberName,
      gmfnId,
      communityName,
    });
  }, [draft, memberName, gmfnId, communityName]);

  const readyCount = Number(progress.readyCount || 0);
  const targetCount = Number(progress.targetCount || 3);
  const hasRole = Boolean(safeStr(draft.memberRole));
  const remainingReady = Math.max(targetCount - readyCount, 0);
  const activeStep = !hasRole ? 1 : remainingReady > 0 ? 2 : 3;
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round((readyCount / Math.max(targetCount, 1)) * 100))
  );
  const activeStepTitle =
    activeStep === 1
      ? "Choose what you mostly do"
      : activeStep === 2
      ? "Add real people"
      : "Review and copy invites";
  const activeStepText =
    activeStep === 1
      ? "Start with one simple choice. This helps GSN suggest the right kind of people."
      : activeStep === 2
      ? `Add ${remainingReady} more ${
          remainingReady === 1 ? "person" : "people"
        } with a phone or email. Three serious people are enough to begin.`
      : "Your first circle has enough ready names. Review the list, then copy the invite message.";

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function updateDraft(next: FirstCircleDraft) {
    setDraft(next);
    saveDraft(next);
  }

  function setRole(role: string) {
    updateDraft({
      ...draft,
      memberRole: role,
    });

    setManualForm((prev) => ({
      ...prev,
      relationship: prev.relationship || suggestedRelationships(role)[0] || "",
    }));
  }

  function addManualContact() {
    const name = safeStr(manualForm.name);
    const relationship = safeStr(manualForm.relationship);
    const phone = safeStr(manualForm.phone);
    const email = safeStr(manualForm.email);

    if (!name) {
      showNotice("error", "Add the person’s name first.");
      return;
    }

    if (!relationship) {
      showNotice("error", "Choose the relationship first.");
      return;
    }

    const nextContact: FirstCircleContact = {
      id: makeId(),
      name,
      relationship,
      phone: phone || undefined,
      email: email || undefined,
      note: safeStr(manualForm.note) || undefined,
      selected: Boolean(manualForm.selected),
      source: "manual",
    };

    updateDraft({
      ...draft,
      contacts: [nextContact, ...draft.contacts],
    });

    setManualForm({
      name: "",
      relationship: relationship,
      phone: "",
      email: "",
      note: "",
      selected: true,
    });

    showNotice("success", "Trusted person added.");
  }

  async function addFromPhoneContacts() {
    try {
      setPickingContacts(true);

      const navAny = navigator as any;
      if (!navAny?.contacts?.select) {
        showNotice(
          "error",
          "Phone contact access is not supported on this browser yet. Use manual add here, or test on a supported phone browser."
        );
        return;
      }

      const picked = await navAny.contacts.select(["name", "tel", "email"], {
        multiple: true,
      });

      if (!Array.isArray(picked) || picked.length === 0) {
        showNotice("error", "No phone contact was selected.");
        return;
      }

      const defaultRelationship =
        roleHints[0] || COMMON_RELATIONSHIPS[0] || "friend";

      const newContacts: FirstCircleContact[] = picked
        .map((item: any) => {
          const name = Array.isArray(item?.name)
            ? safeStr(item.name[0])
            : safeStr(item?.name);
          const phone = Array.isArray(item?.tel)
            ? safeStr(item.tel[0])
            : safeStr(item?.tel);
          const email = Array.isArray(item?.email)
            ? safeStr(item.email[0])
            : safeStr(item?.email);

          if (!name) return null;

          return {
            id: makeId(),
            name,
            relationship: defaultRelationship,
            phone: phone || undefined,
            email: email || undefined,
            selected: true,
            source: "device" as const,
          };
        })
        .filter(Boolean) as FirstCircleContact[];

      if (newContacts.length === 0) {
        showNotice("error", "The selected phone contacts could not be read.");
        return;
      }

      updateDraft({
        ...draft,
        contacts: [...newContacts, ...draft.contacts],
      });

      showNotice("success", `${newContacts.length} phone contact(s) added.`);
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Phone contacts could not be opened."
      );
    } finally {
      setPickingContacts(false);
    }
  }

  function toggleSelected(contactId: string) {
    updateDraft({
      ...draft,
      contacts: draft.contacts.map((item) =>
        item.id === contactId ? { ...item, selected: !item.selected } : item
      ),
    });
  }

  function removeContact(contactId: string) {
    updateDraft({
      ...draft,
      contacts: draft.contacts.filter((item) => item.id !== contactId),
    });
  }

  function copyInviteBundle() {
    if (readyContacts.length === 0) {
      showNotice("error", "No ready invite bundle is available yet.");
      return;
    }

    safeCopy(inviteBundle);
    showNotice("success", "Invite bundle copied.");
  }

  function resetDraft() {
    const next = defaultDraft();
    clearSavedDraft();
    setDraft(next);
    setManualForm(defaultManualForm());
    showNotice("success", "First-circle draft cleared.");
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
          sectionLabel="Focused task"
          title="First Circle"
          subtitle="Loading trusted people..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/community"
          backLabel="Community Home"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
          utilityLinks={[
            { label: "Marketplace", to: "/app/marketplace" },
            { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading first-circle workspace...
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
        sectionLabel="Focused task"
        title="First Circle"
        subtitle="Aim: add real people you already trust."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/community"
        backLabel="Community Home"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Aim</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Add trusted people
            </div>

            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              Choose people you already know: family, buyers, sellers,
              suppliers, savings partners, or community officers. Keep it small,
              serious, and real.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community: {communityName}</span>
              <span style={badge(false)}>
                Role: {roleText(draft.memberRole)}
              </span>
              <span style={badge(false)}>GMFN ID: {gmfnId || "Awaiting issue"}</span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Do this now</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {activeStepTitle}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {activeStepText}
            </div>

            <div
              style={{
                marginTop: 14,
                height: 10,
                borderRadius: 999,
                background: "rgba(11,31,51,0.08)",
                overflow: "hidden",
              }}
              aria-label={`First circle progress ${progressPercent}%`}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, #0B63D1 0%, #F0C94B 100%)",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(hasRole)}>1. Role</span>
              <span style={badge(readyCount > 0)}>2. People {readyCount}/{targetCount}</span>
              <span style={badge(readyCount >= targetCount)}>3. Invite</span>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Simple path</div>
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              number: "1",
              title: "Say what you do",
              text: hasRole
                ? `Chosen: ${roleText(draft.memberRole)}`
                : "Pick the closest work or life role.",
              done: hasRole,
            },
            {
              number: "2",
              title: "Add real people",
              text: `${readyCount}/${targetCount} ready with phone or email.`,
              done: readyCount >= targetCount,
            },
            {
              number: "3",
              title: "Copy invite message",
              text:
                readyCount >= targetCount
                  ? "Ready to review."
                  : "This opens when enough names are ready.",
              done: readyCount >= targetCount,
            },
          ].map((step) => (
            <div
              key={step.number}
              style={innerCard(
                step.done ? "rgba(11,99,209,0.06)" : "#FCFEFF"
              )}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: step.done ? "#0B63D1" : "#EAF1F8",
                    color: step.done ? "#FFFFFF" : "#24415C",
                    fontWeight: 900,
                  }}
                >
                  {step.number}
                </span>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.25,
                  }}
                >
                  {step.title}
                </div>
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {step.text}
              </div>
            </div>
          ))}
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
            <div style={sectionLabel()}>Step 1</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              What do you mostly do? Pick the closest one. You can change it later.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {ROLE_OPTIONS.map((role) => {
                const active = safeStr(draft.memberRole) === role;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRole(role)}
                    style={active ? actionBtn("primary") : actionBtn("secondary")}
                  >
                    {roleText(role)}
                  </button>
                );
              })}
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div style={sectionLabel()}>Suggested relationships for this role</div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {roleHints.length > 0 ? (
                  roleHints.map((item) => (
                    <span key={item} style={badge(false)}>
                      {relationshipText(item)}
                    </span>
                  ))
                ) : (
                  <span style={badge(false)}>Choose a role first</span>
                )}
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
            <div style={sectionLabel()}>Step 2</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Add three real people you already trust. A phone or email makes each invite ready.
            </div>
          </div>
        </div>

        {hasRole ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.02fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Add manually</div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div>
                  <div style={sectionLabel()}>Name</div>
                  <input
                    value={manualForm.name}
                    onChange={(e) =>
                      setManualForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Person's name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Relationship</div>
                  <select
                    value={manualForm.relationship}
                    onChange={(e) =>
                      setManualForm((prev) => ({
                        ...prev,
                        relationship: e.target.value,
                      }))
                    }
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="">Choose relationship</option>
                    {Array.from(new Set([...roleHints, ...COMMON_RELATIONSHIPS])).map(
                      (item) => (
                        <option key={item} value={item}>
                          {relationshipText(item)}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={sectionLabel()}>Phone</div>
                    <input
                      value={manualForm.phone}
                      onChange={(e) =>
                        setManualForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="Phone number"
                      style={{ ...inputStyle(), marginTop: 8 }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Email</div>
                    <input
                      value={manualForm.email}
                      onChange={(e) =>
                        setManualForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="Email address"
                      style={{ ...inputStyle(), marginTop: 8 }}
                    />
                  </div>
                </div>

                <div>
                  <div style={sectionLabel()}>Note</div>
                  <textarea
                    value={manualForm.note}
                    onChange={(e) =>
                      setManualForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    placeholder="Why this person matters..."
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>

                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    color: "#0B1F33",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={manualForm.selected}
                    onChange={(e) =>
                      setManualForm((prev) => ({
                        ...prev,
                        selected: e.target.checked,
                      }))
                    }
                  />
                  <span>Select this person for the first circle</span>
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button type="button" onClick={addManualContact} style={actionBtn("primary")}>
                    Add Person
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualForm(defaultManualForm())}
                    style={actionBtn("secondary")}
                  >
                    Clear Form
                  </button>
                </div>
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Choose from phone contacts</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                If your phone browser allows it, choose contacts directly.
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => void addFromPhoneContacts()}
                  disabled={pickingContacts}
                  style={actionBtn("secondary", pickingContacts)}
                >
                  {pickingContacts ? "Opening..." : "Choose from Phone Contacts"}
                </button>
              </div>

              <div style={{ marginTop: 14, ...helperText(), fontSize: 13 }}>
                If this does not open, use manual add.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, ...innerCard("#F8FBFF") }}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.35,
              }}
            >
              Choose Step 1 first.
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Once you choose what you mostly do, GSN will suggest the right
              kinds of trusted people to add here.
            </div>
          </div>
        )}
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
            <div style={sectionLabel()}>Step 3</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Review your people. Keep only names you truly know.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>{draft.contacts.length} contacts</span>
            <button
              type="button"
              onClick={() => toggleSection("contacts")}
              style={collapseToggle()}
            >
              {collapsed.contacts ? "Open" : "Collapse"}
            </button>
          </div>
        </div>

        {!collapsed.contacts ? (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {draft.contacts.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No trusted person has been added yet.
              </div>
            ) : (
              draft.contacts.map((item) => (
                <div key={item.id} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1.12fr) minmax(0, 0.88fr) auto",
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
                        {safeStr(item.name || "Contact")}
                      </div>

                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={badge(item.selected)}>
                          {item.selected ? "In first circle" : "Saved only"}
                        </span>
                        <span style={badge(false)}>{relationshipText(item.relationship)}</span>
                        <span style={badge(false)}>
                          {contactInviteReady(item) ? "Invite ready" : "Needs phone or email"}
                        </span>
                        {safeStr(item.source) ? (
                          <span style={badge(false)}>
                            {item.source === "device" ? "From phone" : "Manual"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ ...helperText(), fontSize: 13 }}>
                      {[
                        safeStr(item.phone) ? `Phone: ${safeStr(item.phone)}` : "",
                        safeStr(item.email) ? `Email: ${safeStr(item.email)}` : "",
                        safeStr(item.note) || "",
                      ]
                        .filter(Boolean)
                        .join(" • ") || "No extra note yet"}
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
                        onClick={() => toggleSelected(item.id)}
                        style={item.selected ? actionBtn("primary") : actionBtn("secondary")}
                      >
                        {item.selected ? "Included" : "Include"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeContact(item.id)}
                        style={actionBtn("soft")}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
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
            <div style={sectionLabel()}>Final step</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Copy the invite message when the first circle is ready.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("invite")}
            style={collapseToggle()}
          >
            {collapsed.invite ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.invite ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.05fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Bundle preview</div>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background: "#FFFFFF",
                  padding: 14,
                  color: "#0B1F33",
                  fontSize: 13,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {inviteBundle || "Invite bundle will appear here when ready."}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Bundle status</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={statTile()}>
                  <div style={sectionLabel()}>Ready contacts</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B63D1",
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {readyContacts.length}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={copyInviteBundle}
                    disabled={readyContacts.length === 0}
                    style={actionBtn("primary", readyContacts.length === 0)}
                  >
                    Copy Invite Bundle
                  </button>

                  <button
                    type="button"
                    onClick={resetDraft}
                    style={actionBtn("secondary")}
                  >
                    Reset First Circle
                  </button>
                </div>

                <div style={{ ...helperText(), fontSize: 13 }}>
                  Copy only when the list is real and ready.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}


