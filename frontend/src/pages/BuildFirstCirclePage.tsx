import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  StableButton,
  SubtleButton,
} from "../components/StableButton";
import {
  getClanInviteLink,
  getCurrentClan,
  getMe,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import * as firstCircle from "../lib/firstCircle";
import { normalizedJoinInviteUrl } from "../lib/joinLinks";

type FirstCircleContact = {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  note?: string;
  selected?: boolean;
  source?: "manual" | "device" | "quick";
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

type QuickPersonRow = {
  value: string;
};

type CollapseState = {
  progress: boolean;
  role: boolean;
  add: boolean;
  contacts: boolean;
  invite: boolean;
};

type NoticeTone = "success" | "error";
type FocusedAction = "invite" | null;

const UI_STORAGE_KEY = "gmfn.buildFirstCircle.sections.v2";
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
    border: "1px solid rgba(123,161,204,0.20)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 22px 48px rgba(2,6,23,0.22), 0 2px 8px rgba(15,23,42,0.04)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(123,161,204,0.16)",
    background:
      bg === "#F8FBFF" || bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(123,161,204,0.14)",
    background:
      bg === "#FFFFFF" || bg === "#F8FBFF" || bg === "#FCFEFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(123,161,204,0.14)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
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
    background: primary
      ? "rgba(32,76,133,0.36)"
      : "rgba(255,255,255,0.08)",
    color: primary ? "#CFE3FF" : "#E6EEF8",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    lineHeight: 1.2,
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
    color: "#C8D8EA",
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
    add: true,
    contacts: true,
    invite: true,
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
    params.gmfnId ? `GSN ID: ${params.gmfnId}` : "",
    params.communityName ? `Community: ${params.communityName}` : "",
    "",
    "Trusted first-circle contacts:",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = readyContacts.map((item, index) => {
    return `${index + 1}. ${item.name} - ${relationshipText(item.relationship)}${
      item.phone ? ` - ${item.phone}` : ""
    }${item.email ? ` - ${item.email}` : ""}`;
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
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [draft, setDraft] = useState<FirstCircleDraft>(defaultDraft());
  const [manualForm, setManualForm] = useState<ManualFormState>(defaultManualForm());
  const [quickRows, setQuickRows] = useState<QuickPersonRow[]>(defaultQuickRows());
  const [pickingContacts, setPickingContacts] = useState(false);
  const [focusedAction, setFocusedAction] = useState<FocusedAction>(null);

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
        setQuickRows(() => {
          const quickContacts = loadedDraft.contacts.filter((item) =>
            safeStr(item.id).startsWith("quick-person-")
          );
          if (!quickContacts.length) return defaultQuickRows();

          return defaultQuickRows().map((row, index) => {
            const contact = quickContacts.find(
              (item) => safeStr(item.id) === `quick-person-${index + 1}`
            );
            if (!contact) return row;
            const detail = safeStr(contact.email || contact.phone);
            return {
              value: [safeStr(contact.name), detail].filter(Boolean).join(", "),
            };
          });
        });
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

  useEffect(() => {
    const clanId = Number(
      firstTruthy(currentClan?.id, currentClan?.clan_id, selectedClanId)
    );
    if (!clanId) return;

    let alive = true;
    setInviteLoading(true);

    getClanInviteLink(clanId)
      .then((out) => {
        if (!alive) return;
        setInviteLink(normalizedJoinInviteUrl(out));
      })
      .catch(() => {
        if (!alive) return;
        setInviteLink("");
      })
      .finally(() => {
        if (alive) setInviteLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [currentClan, selectedClanId]);

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

  const joinInviteMessage = useMemo(() => {
    const lines = [
      `Hello, I am building my trusted first circle on GSN for ${communityName}.`,
      "If you already know me and this community, use this invite link to request to join.",
      inviteLink,
      gmfnId ? `My GSN ID: ${gmfnId}` : "",
    ].filter(Boolean);

    return lines.join("\n\n");
  }, [communityName, gmfnId, inviteLink]);

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
  const isInviteFocused = focusedAction === "invite";
  const activeStepTitle =
    activeStep === 1
      ? "Pick your aim"
      : activeStep === 2
      ? "Add trusted people"
      : "Copy the invite message";
  const activeStepText =
    activeStep === 1
      ? "Choose what you mostly do. GSN will suggest the right people next."
      : activeStep === 2
      ? `Add ${remainingReady} more ${
          remainingReady === 1 ? "person" : "people"
        } with phone or email.`
      : "Review the list, then copy the message.";

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function openInviteFocus() {
    setNotice(null);
    setFocusedAction("invite");
  }

  function closeFocusedAction() {
    setFocusedAction(null);
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
    const nextRelationship = suggestedRelationships(role)[0] || "trusted";
    const quickContacts = quickRows
      .map((row, index) => quickPersonContact(row.value, index, nextRelationship))
      .filter(Boolean) as FirstCircleContact[];

    updateDraft({
      ...draft,
      memberRole: role,
      contacts: [
        ...quickContacts,
        ...draft.contacts.filter(
          (item) => !safeStr(item.id).startsWith("quick-person-")
        ),
      ],
    });

    setManualForm((prev) => ({
      ...prev,
      relationship: prev.relationship || nextRelationship,
    }));
  }

  function updateQuickRow(index: number, value: string) {
    const nextRows = quickRows.map((row, rowIndex) =>
      rowIndex === index ? { value } : row
    );
    const defaultRelationship =
      roleHints[0] || safeStr(manualForm.relationship) || "trusted";
    const quickContacts = nextRows
      .map((row, rowIndex) =>
        quickPersonContact(row.value, rowIndex, defaultRelationship)
      )
      .filter(Boolean) as FirstCircleContact[];

    setQuickRows(nextRows);
    updateDraft({
      ...draft,
      contacts: [
        ...quickContacts,
        ...draft.contacts.filter(
          (item) => !safeStr(item.id).startsWith("quick-person-")
        ),
      ],
    });
  }

  function addManualContact() {
    const name = safeStr(manualForm.name);
    const relationship = safeStr(manualForm.relationship);
    const phone = safeStr(manualForm.phone);
    const email = safeStr(manualForm.email);

    if (!name) {
      showNotice("error", "Add the person's name first.");
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

      setFocusedAction(null);
      setCollapsed((prev) => ({ ...prev, contacts: false }));
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

  async function copyInviteBundle() {
    if (readyContacts.length === 0) {
      showNotice("error", "No ready invite message is available yet.");
      return;
    }

    const copied = await safeCopy(inviteBundle);
    showNotice(
      copied ? "success" : "error",
      copied
        ? "Invite message copied."
        : "Copy did not complete. Select the message and copy it manually."
    );
  }

  async function copyJoinInvite() {
    if (!inviteLink) {
      showNotice("error", "Invite link is not ready yet.");
      return;
    }

    const copied = await safeCopy(joinInviteMessage);
    if (!copied) {
      showNotice(
        "error",
        "Copy did not complete. Select the invite message and copy it manually."
      );
      return;
    }

    setFocusedAction(null);
    showNotice("success", "Invite message copied.");
  }

  async function shareJoinInvite() {
    if (!inviteLink) {
      showNotice("error", "Invite link is not ready yet.");
      return;
    }

    const navAny = navigator as any;
    if (navAny?.share) {
      try {
        await navAny.share({
          title: `Join ${communityName} on GSN`,
          text: joinInviteMessage,
          url: inviteLink,
        });
        setFocusedAction(null);
        showNotice("success", "Invite share opened.");
        return;
      } catch (err: any) {
        if (safeStr(err?.name) === "AbortError") return;
      }
    }

    await copyJoinInvite();
  }

  function openWhatsAppInvite() {
    if (!inviteLink) {
      showNotice("error", "Invite link is not ready yet.");
      return;
    }

    const opened = window.open(
      `https://wa.me/?text=${encodeURIComponent(joinInviteMessage)}`,
      "_blank",
      "noopener,noreferrer"
    );
    if (!opened) {
      showNotice("error", "WhatsApp could not open. Copy the invite message instead.");
      return;
    }
    setFocusedAction(null);
    showNotice("success", "WhatsApp invite opened.");
  }

  function openEmailInvite() {
    if (!inviteLink) {
      showNotice("error", "Invite link is not ready yet.");
      return;
    }

    const subject = `Join ${communityName} on GSN`;
    showNotice("success", "Opening email invite now.");
    setFocusedAction(null);
    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(joinInviteMessage)}`;
  }

  function openFacebookInvite() {
    if (!inviteLink) {
      showNotice("error", "Invite link is not ready yet.");
      return;
    }

    const opened = window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`,
      "_blank",
      "noopener,noreferrer"
    );
    if (!opened) {
      showNotice("error", "Facebook could not open. Copy the invite link instead.");
      return;
    }
    setFocusedAction(null);
    showNotice("success", "Facebook invite opened.");
  }

  function resetDraft() {
    const next = defaultDraft();
    clearSavedDraft();
    setDraft(next);
    setManualForm(defaultManualForm());
    setQuickRows(defaultQuickRows());
    showNotice("success", "First-circle draft cleared.");
  }

  function routeTarget(intent: CtaIntent, debugId: string): string {
    return resolveCtaTarget(intent, { communityId: selectedClanId, debugId }).to as string;
  }

  const routes = {
    dashboard: routeTarget("dashboard", "build-first-circle.route.dashboard"),
    community: routeTarget("communityHome", "build-first-circle.route.community"),
  };
  const quickRoleOptions = [
    "supplier",
    "buyer",
    "dealer",
    "trader",
    "service_provider",
  ].filter((role) => (ROLE_OPTIONS as string[]).includes(role));
  const messagePreview =
    readyContacts.length > 0
      ? inviteBundle
      : "Hi! I am inviting you to join me on GSN (GMFN).\nLet us build trust and grow together.";
  const showLegacyFirstCirclePanels = false;

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
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.community}
          backLabel="Community Home"
        />

        <section style={pageCard()}>
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
      <section
        style={{
          ...pageCard(
            "radial-gradient(circle at 86% 24%, rgba(44,96,151,0.28) 0%, rgba(44,96,151,0.00) 30%), linear-gradient(135deg, #06101E 0%, #09233D 58%, #0B3A69 100%)"
          ),
          borderRadius: 22,
          padding: isCompact ? 24 : 34,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 300px",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#3B82F6", fontSize: 13 }}>
              Focused task
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#FFFFFF",
                fontWeight: 1000,
                fontSize: isCompact ? 42 : 56,
                lineHeight: 0.98,
              }}
            >
              First Circle
            </div>
            <div
              style={{
                marginTop: 12,
                color: "#C8D8EA",
                fontSize: isCompact ? 16 : 18,
                fontWeight: 800,
              }}
            >
              Add people you already trust.
            </div>
            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 220px))",
                gap: 12,
              }}
            >
              <StableCtaLink
                to={routes.dashboard}
                stableHeight={58}
                debugId="build-first-circle.hero.dashboard"
                style={{
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.04)",
                  color: "#F8FBFF",
                  border: "1px solid rgba(203,220,240,0.22)",
                  fontSize: 16,
                  fontWeight: 950,
                }}
              >
                Dashboard
              </StableCtaLink>
              <StableCtaLink
                to={routes.community}
                stableHeight={58}
                debugId="build-first-circle.hero.community"
                style={{
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.04)",
                  color: "#F8FBFF",
                  border: "1px solid rgba(203,220,240,0.22)",
                  fontSize: 16,
                  fontWeight: 950,
                }}
              >
                Community Home
              </StableCtaLink>
            </div>
          </div>
          <div
            aria-hidden="true"
            style={{
              minHeight: isCompact ? 80 : 190,
              borderRadius: 28,
              border: "1px solid rgba(203,220,240,0.10)",
              opacity: 0.55,
              display: "grid",
              placeItems: "center",
              color: "rgba(203,220,240,0.32)",
              fontSize: 0,
              fontWeight: 1000,
              background:
                "radial-gradient(circle, rgba(203,220,240,0.14) 0%, rgba(203,220,240,0.04) 58%, rgba(203,220,240,0.00) 100%)",
            }}
          >
            GSN
          </div>
        </div>
      </section>

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={{
          ...pageCard(
            "linear-gradient(180deg, #06101E 0%, #08223C 48%, #0A3156 100%)"
          ),
          borderRadius: 22,
          padding: isCompact ? 18 : 32,
        }}
      >
        <div>
          <div
            style={{
              color: "#F8FBFF",
              fontWeight: 1000,
              fontSize: isCompact ? 34 : 42,
              lineHeight: 1.05,
            }}
          >
            Add trusted people
          </div>
          <div
            style={{
              marginTop: 10,
              color: "#C8D8EA",
              fontSize: isCompact ? 15 : 17,
              fontWeight: 750,
              lineHeight: 1.45,
            }}
          >
            Start with family, buyers, suppliers, partners.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(220px, 0.9fr)",
              gap: 12,
            }}
          >
            <span style={badge(true)}>Community: {communityName}</span>
            <span style={badge(false)}>GSN ID: {gmfnId || "Awaiting issue"}</span>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div style={{ color: "#E6EEF8", fontWeight: 950 }}>
              People {readyCount}/{targetCount}
            </div>
            <div
              aria-label={`First circle progress ${progressPercent}%`}
              style={{
                height: 12,
                borderRadius: 999,
                background: "rgba(203,220,240,0.12)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(progressPercent, readyCount > 0 ? 8 : 0)}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #2563EB 0%, #F0C94B 100%)",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div style={innerCard("#FFFFFF")}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px minmax(0, 1fr) auto",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(37,99,235,0.24)",
                  color: "#DBEAFE",
                  fontWeight: 1000,
                }}
              >
                1
              </div>
              <div>
                <div style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 1000 }}>
                  Pick your aim
                </div>
                <div style={{ marginTop: 6, ...helperText() }}>
                  What do you mostly do?
                </div>
                <select
                  value={safeStr(draft.memberRole)}
                  onChange={(event) => setRole(event.target.value)}
                  style={{
                    ...inputStyle(),
                    marginTop: 12,
                    minHeight: 54,
                    background: "rgba(8,22,38,0.72)",
                    color: "#E6EEF8",
                    border: "1px solid rgba(203,220,240,0.20)",
                  }}
                >
                  <option value="">Choose one</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {roleText(role)}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 14, ...helperText(), fontSize: 13 }}>
                  Suggested roles
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {quickRoleOptions.map((role) => {
                    const active = safeStr(draft.memberRole) === role;
                    return (
                      <StableButton
                        key={role}
                        kind={active ? "primary" : "secondary"}
                        onClick={() => setRole(role)}
                        stableHeight={42}
                        debugId={`build-first-circle.quick-role.${role}`}
                        style={{
                          borderRadius: 14,
                          padding: "0 16px",
                          fontWeight: 950,
                        }}
                      >
                        {roleText(role)}
                      </StableButton>
                    );
                  })}
                </div>
              </div>
              <div style={{ color: "#8EA7C4", fontSize: 24, lineHeight: 1 }}>
                v
              </div>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px minmax(0, 1fr) auto",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(37,99,235,0.24)",
                  color: "#DBEAFE",
                  fontWeight: 1000,
                }}
              >
                2
              </div>
              <div>
                <div style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 1000 }}>
                  Add 3 people
                </div>
                <div style={{ marginTop: 6, ...helperText() }}>
                  Phone or email makes invites easy.
                </div>
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {quickRows.map((row, index) => (
                    <label
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 34px",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <input
                        value={row.value}
                        onChange={(event) => updateQuickRow(index, event.target.value)}
                        placeholder="Name, phone or email"
                        aria-label={`Trusted person ${index + 1}`}
                        style={{
                          ...inputStyle(),
                          minHeight: 50,
                          background: "rgba(8,22,38,0.72)",
                          color: "#E6EEF8",
                          border: "1px solid rgba(203,220,240,0.20)",
                        }}
                      />
                      <span
                        aria-hidden="true"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(203,220,240,0.12)",
                          color: "#C8D8EA",
                          fontWeight: 1000,
                        }}
                      >
                        {index + 1}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ color: "#8EA7C4", fontSize: 24, lineHeight: 1 }}>
                v
              </div>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px minmax(0, 1fr)",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(34,197,94,0.18)",
                  color: "#BBF7D0",
                  fontWeight: 1000,
                }}
              >
                3
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 1000 }}>
                    Check people
                  </div>
                  <div style={{ marginTop: 6, ...helperText() }}>
                    Review your list before inviting.
                  </div>
                </div>
                <span
                  style={{
                    ...badge(readyContacts.length > 0),
                    justifyContent: "center",
                  }}
                >
                  {readyContacts.length} contacts
                </span>
                <SecondaryButton
                  onClick={() => toggleSection("contacts")}
                  stableHeight={46}
                  debugId="build-first-circle.open-list"
                  style={{ borderRadius: 14, minWidth: isCompact ? undefined : 128 }}
                >
                  {collapsed.contacts ? "Open list" : "Close list"}
                </SecondaryButton>
              </div>
            </div>

            {!collapsed.contacts ? (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {draft.contacts.length === 0 ? (
                  <div style={{ ...helperText(), color: "#C8D8EA" }}>
                    No trusted person has been added yet.
                  </div>
                ) : (
                  draft.contacts.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(203,220,240,0.14)",
                        background: "rgba(8,22,38,0.56)",
                        padding: 12,
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ color: "#F8FBFF", fontWeight: 950 }}>
                          {safeStr(item.name || "Contact")}
                        </div>
                        <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                          {[
                            relationshipText(item.relationship),
                            safeStr(item.phone || item.email),
                            contactInviteReady(item)
                              ? "Invite ready"
                              : "Needs phone or email",
                          ]
                            .filter(Boolean)
                            .join(" - ")}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <StableButton
                          kind={item.selected ? "primary" : "secondary"}
                          onClick={() => toggleSelected(item.id)}
                          stableHeight={42}
                          debugId={`build-first-circle.contact.${item.id}.toggle-selected`}
                        >
                          {item.selected ? "Included" : "Include"}
                        </StableButton>
                        <SubtleButton
                          onClick={() => removeContact(item.id)}
                          stableHeight={42}
                          debugId={`build-first-circle.contact.${item.id}.remove`}
                        >
                          Remove
                        </SubtleButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px minmax(0, 1fr) auto",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(124,58,237,0.20)",
                  color: "#DDD6FE",
                  fontWeight: 1000,
                }}
              >
                4
              </div>
              <div>
                <div style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 1000 }}>
                  Invite message
                </div>
                <div style={{ marginTop: 6, ...helperText() }}>
                  A ready message to invite your people.
                </div>
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(203,220,240,0.16)",
                    background: "rgba(3,12,24,0.72)",
                    padding: 14,
                    color: "#DCEBFB",
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {messagePreview}
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <SecondaryButton
                    onClick={() => {
                      void copyInviteBundle();
                    }}
                    stableHeight={52}
                    debugId="build-first-circle.copy-invite"
                    style={{ borderRadius: 14 }}
                  >
                    Copy invite
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={openWhatsAppInvite}
                    stableHeight={52}
                    debugId="build-first-circle.share-whatsapp"
                    style={{
                      borderRadius: 14,
                      background: "#15803D",
                      border: "1px solid rgba(187,247,208,0.22)",
                    }}
                  >
                    Share WhatsApp
                  </PrimaryButton>
                </div>
              </div>
              <div style={{ color: "#8EA7C4", fontSize: 24, lineHeight: 1 }}>
                v
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            borderRadius: 18,
            border: "1px solid rgba(203,220,240,0.12)",
            background: "rgba(20,48,78,0.68)",
            padding: isCompact ? 14 : 18,
            color: "#DCEBFB",
            fontWeight: 900,
            textAlign: "center",
          }}
        >
          Trust is our network. Your circle builds the future.
        </div>
      </section>

      {showLegacyFirstCirclePanels ? (
      <>
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
              Start with people you can call today: family, buyers, sellers,
              suppliers, savings partners, or community officers.
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
              <span style={badge(false)}>GSN ID: {gmfnId || "Awaiting issue"}</span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Do this now</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
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
                alignItems: "center",
              }}
            >
              <span style={badge(hasRole)}>Aim</span>
              <span style={badge(readyCount > 0)}>
                People {readyCount}/{targetCount}
              </span>
              <PrimaryButton
                onClick={openInviteFocus}
                disabled={inviteLoading}
                busy={inviteLoading}
                busyLabel="Preparing..."
                stableHeight={44}
                debugId="build-first-circle.focus-invite"
              >
                Invite
              </PrimaryButton>
            </div>
          </div>
        </div>
      </section>

      {isInviteFocused ? (
      <section style={pageCard()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div>
            <div style={sectionLabel()}>Invite first</div>
            <div
              style={{
                marginTop: 8,
                color: "#F8FBFF",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.18,
              }}
            >
              Pick people from the handles you already use
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Use contacts, WhatsApp, email, Facebook, share, or copy. Then add
              the real people you want in your first circle.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: isCompact ? "flex-start" : "flex-end",
            }}
          >
            <span style={badge(Boolean(inviteLink))}>
              {inviteLoading
                ? "Invite loading"
                : inviteLink
                  ? "Invite link ready"
                  : "Invite link not ready"}
            </span>
            <SubtleButton
              onClick={closeFocusedAction}
              stableHeight={44}
              debugId="build-first-circle.close-invite-focus"
              style={collapseToggle()}
            >
              Close
            </SubtleButton>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr 1fr"
              : "repeat(6, minmax(120px, 1fr))",
            gap: 10,
          }}
        >
          <PrimaryButton
            onClick={() => {
              void addFromPhoneContacts();
            }}
            disabled={pickingContacts}
            busy={pickingContacts}
            busyLabel="Opening..."
            stableHeight={52}
            debugId="build-first-circle.quick.phone-contacts"
          >
            Phone book
          </PrimaryButton>
          <SecondaryButton
            onClick={openWhatsAppInvite}
            disabled={!inviteLink}
            stableHeight={52}
            debugId="build-first-circle.quick.whatsapp"
          >
            WhatsApp
          </SecondaryButton>
          <SecondaryButton
            onClick={openEmailInvite}
            disabled={!inviteLink}
            stableHeight={52}
            debugId="build-first-circle.quick.email"
          >
            Email
          </SecondaryButton>
          <SecondaryButton
            onClick={openFacebookInvite}
            disabled={!inviteLink}
            stableHeight={52}
            debugId="build-first-circle.quick.facebook"
          >
            Facebook
          </SecondaryButton>
          <SecondaryButton
            onClick={() => {
              void shareJoinInvite();
            }}
            disabled={!inviteLink}
            stableHeight={52}
            debugId="build-first-circle.quick.share"
          >
            Share
          </SecondaryButton>
          <SecondaryButton
            onClick={() => {
              void copyJoinInvite();
            }}
            disabled={!inviteLink}
            stableHeight={52}
            debugId="build-first-circle.quick.copy"
          >
            Copy
          </SecondaryButton>
        </div>
      </section>
      ) : null}

      {!isInviteFocused ? (
      <>
      <section style={pageCard()}>
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
            <div style={sectionLabel()}>Aim</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Pick the closest one. You can change it later.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {isCompact ? (
            <div>
              <div style={sectionLabel()}>Role</div>
              <select
                value={safeStr(draft.memberRole)}
                onChange={(event) => setRole(event.target.value)}
                style={{ ...inputStyle(), marginTop: 8, minHeight: 52 }}
              >
                <option value="">Choose one</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {roleText(role)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
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
                  <StableButton
                    key={role}
                    kind={active ? "primary" : "secondary"}
                    onClick={() => {
                      setRole(role);
                    }}
                    stableHeight={48}
                    debugId={`build-first-circle.role.${role}`}
                  >
                    {roleText(role)}
                  </StableButton>
                );
              })}
            </div>
          )}

          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>Suggested people</div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {roleHints.length > 0 ? (
                roleHints.slice(0, 5).map((item) => (
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

      <section style={pageCard()}>
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
            <div style={sectionLabel()}>People</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Add three real people. Phone or email makes each invite ready.
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
                    color: "#E6EEF8",
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
                  <PrimaryButton
                    onClick={() => {
                      addManualContact();
                    }}
                    stableHeight={48}
                    debugId="build-first-circle.add-person"
                  >
                    Add Person
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={() => {
                      setManualForm(defaultManualForm());
                    }}
                    stableHeight={48}
                    debugId="build-first-circle.clear-form"
                  >
                    Clear Form
                  </SecondaryButton>
                </div>
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Choose from phone contacts</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                If your phone browser allows it, choose contacts directly.
              </div>

              <div style={{ marginTop: 14 }}>
                <SecondaryButton
                  onClick={() => {
                    void addFromPhoneContacts();
                  }}
                  disabled={pickingContacts}
                  busy={pickingContacts}
                  busyLabel="Opening..."
                  stableHeight={48}
                  debugId="build-first-circle.choose-phone-contacts"
                >
                  Choose from Phone Contacts
                </SecondaryButton>
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
                color: "#F8FBFF",
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

      <section style={pageCard()}>
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
            <div style={sectionLabel()}>Check people</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Review your people. Keep only names you truly know.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>{draft.contacts.length} contacts</span>
            <SubtleButton
              onClick={() => {
                toggleSection("contacts");
              }}
              stableHeight={44}
              debugId="build-first-circle.toggle-contacts"
              style={collapseToggle()}
            >
              {collapsed.contacts ? "Open" : "Collapse"}
            </SubtleButton>
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
                          color: "#F8FBFF",
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
                        .join(" - ") || "No extra note yet"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: isCompact ? "flex-start" : "flex-end",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <StableButton
                        kind={item.selected ? "primary" : "secondary"}
                        onClick={() => {
                          toggleSelected(item.id);
                        }}
                        stableHeight={48}
                        debugId={`build-first-circle.contact.${item.id}.toggle-selected`}
                      >
                        {item.selected ? "Included" : "Include"}
                      </StableButton>

                      <SubtleButton
                        onClick={() => {
                          removeContact(item.id);
                        }}
                        stableHeight={46}
                        debugId={`build-first-circle.contact.${item.id}.remove`}
                      >
                        Remove
                      </SubtleButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section style={pageCard()}>
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
            <div style={sectionLabel()}>Invite message</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Copy the invite message when ready.
            </div>
          </div>

          <SubtleButton
            onClick={() => {
              toggleSection("invite");
            }}
            stableHeight={44}
            debugId="build-first-circle.toggle-invite"
            style={collapseToggle()}
          >
            {collapsed.invite ? "Open" : "Collapse"}
          </SubtleButton>
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
              <div style={sectionLabel()}>Message preview</div>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(10,22,36,0.94) 0%, rgba(14,31,50,0.92) 100%)",
                  padding: 14,
                  color: "#F8FBFF",
                  fontSize: 13,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {inviteBundle || "Invite message will appear here when ready."}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Message status</div>

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
                    <PrimaryButton
                      onClick={() => {
                        copyInviteBundle();
                      }}
                      disabled={readyContacts.length === 0}
                      stableHeight={48}
                      debugId="build-first-circle.copy-invite-bundle"
                  >
                    Copy message
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={() => {
                      resetDraft();
                    }}
                    stableHeight={48}
                    debugId="build-first-circle.reset"
                  >
                    Reset First Circle
                  </SecondaryButton>
                </div>

                <div style={{ ...helperText(), fontSize: 13 }}>
                  Copy only when the list is real and ready.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      </>
      ) : null}
      </>
      ) : null}
    </div>
  );
}

function defaultQuickRows(): QuickPersonRow[] {
  return [{ value: "" }, { value: "" }, { value: "" }];
}

function quickPersonContact(
  value: string,
  index: number,
  relationship: string
): FirstCircleContact | null {
  const raw = safeStr(value);
  if (!raw) return null;

  const parts = raw
    .split(",")
    .map((part) => safeStr(part))
    .filter(Boolean);
  const name = parts[0] || raw;
  const contactDetail = parts.slice(1).join(" ");
  const email = contactDetail.includes("@") ? contactDetail : "";
  const phone = email ? "" : contactDetail;

  return {
    id: `quick-person-${index + 1}`,
    name,
    relationship: relationship || "trusted",
    phone: phone || undefined,
    email: email || undefined,
    selected: true,
    source: "quick",
  };
}
