export type FirstCircleMemberRole =
  | "trader"
  | "supplier"
  | "dealer"
  | "buyer"
  | "service_provider"
  | "student"
  | "salary_earner"
  | "remittance_sender"
  | "remittance_receiver"
  | "community_leader"
  | "association_organizer"
  | "cooperative_member"
  | "faith_worker";

export type FirstCircleRelationshipType =
  | "supplier"
  | "buyer"
  | "customer"
  | "dealer"
  | "partner"
  | "guarantor_candidate"
  | "family_support"
  | "remittance_contact"
  | "group_officer"
  | "association_member"
  | "savings_partner";

export type FirstCircleContactSource = "manual" | "paste" | "device";

export type FirstCircleContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: FirstCircleRelationshipType | "";
  note: string;
  source: FirstCircleContactSource;
  selected: boolean;
};

export type FirstCircleDraft = {
  memberRole: FirstCircleMemberRole | "";
  operatingPattern: string;
  contacts: FirstCircleContact[];
  updatedAt: string;
};

export type FirstCircleProgress = {
  selectedCount: number;
  readyCount: number;
  targetCount: number;
  nextStepText: string;
};

export type DeviceContactSelection = {
  name?: string[] | string;
  tel?: string[] | string;
  email?: string[] | string;
};

type FirstCircleRoleOption = {
  value: FirstCircleMemberRole;
  label: string;
};

type FirstCircleRelationshipOption = {
  value: FirstCircleRelationshipType;
  label: string;
};

const STORAGE_KEY = "gmfn_first_circle_draft_v1";

export const FIRST_CIRCLE_ROLE_OPTIONS: FirstCircleRoleOption[] = [
  { value: "trader", label: "Trader" },
  { value: "supplier", label: "Supplier" },
  { value: "dealer", label: "Dealer" },
  { value: "buyer", label: "Buyer" },
  { value: "service_provider", label: "Service Provider" },
  { value: "student", label: "Student" },
  { value: "salary_earner", label: "Salary Earner / Civil Servant" },
  { value: "remittance_sender", label: "Remittance Sender" },
  { value: "remittance_receiver", label: "Remittance Receiver" },
  { value: "community_leader", label: "Community Leader" },
  { value: "association_organizer", label: "Association / Group Organizer" },
  { value: "cooperative_member", label: "Cooperative Member" },
  { value: "faith_worker", label: "Faith / Community Worker" },
];

export const FIRST_CIRCLE_RELATIONSHIP_OPTIONS: FirstCircleRelationshipOption[] =
  [
    { value: "supplier", label: "Supplier" },
    { value: "buyer", label: "Buyer" },
    { value: "customer", label: "Customer" },
    { value: "dealer", label: "Dealer" },
    { value: "partner", label: "Partner" },
    { value: "guarantor_candidate", label: "Supporter Candidate" },
    { value: "family_support", label: "Family Support Person" },
    { value: "remittance_contact", label: "Remittance Contact" },
    { value: "group_officer", label: "Group Officer" },
    { value: "association_member", label: "Association Member" },
    { value: "savings_partner", label: "Savings Partner" },
  ];

const ROLE_RELATIONSHIP_MAP: Record<
  FirstCircleMemberRole,
  FirstCircleRelationshipType[]
> = {
  trader: ["supplier", "buyer", "customer", "dealer", "partner"],
  supplier: ["buyer", "dealer", "partner", "customer"],
  dealer: ["supplier", "buyer", "customer", "partner"],
  buyer: ["supplier", "dealer", "partner"],
  service_provider: ["customer", "partner", "guarantor_candidate"],
  student: ["family_support", "group_officer", "savings_partner", "partner"],
  salary_earner: [
    "family_support",
    "savings_partner",
    "guarantor_candidate",
    "partner",
  ],
  remittance_sender: ["family_support", "remittance_contact", "partner"],
  remittance_receiver: ["family_support", "remittance_contact", "partner"],
  community_leader: ["group_officer", "association_member", "partner"],
  association_organizer: ["group_officer", "association_member", "partner"],
  cooperative_member: ["savings_partner", "group_officer", "partner"],
  faith_worker: ["group_officer", "association_member", "family_support"],
};

function safeStr(x: unknown): string {
  return String(x ?? "").trim();
}

function makeId(): string {
  return `fc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function parseMemberRole(value: unknown): FirstCircleMemberRole | "" {
  const raw = safeStr(value).toLowerCase().replace(/\s+/g, "_");

  const match = FIRST_CIRCLE_ROLE_OPTIONS.find(
    (option: FirstCircleRoleOption) => option.value === raw
  );

  return match?.value || "";
}

function parseRelationship(value: unknown): FirstCircleRelationshipType | "" {
  const raw = safeStr(value).toLowerCase().replace(/\s+/g, "_");

  const match = FIRST_CIRCLE_RELATIONSHIP_OPTIONS.find(
    (option: FirstCircleRelationshipOption) => option.value === raw
  );

  return match?.value || "";
}

function parseContactSource(value: unknown): FirstCircleContactSource {
  return value === "paste" || value === "device" ? value : "manual";
}

function firstStringFromSelection(
  value: string[] | string | undefined
): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = safeStr(item);
      if (text) return text;
    }
    return "";
  }

  return safeStr(value);
}

function contactSignature(contact: FirstCircleContact): string {
  return [
    safeStr(contact.name).toLowerCase(),
    safeStr(contact.phone).replace(/[^\d+]/g, ""),
    safeStr(contact.email).toLowerCase(),
  ].join("|");
}

export function emptyFirstCircleDraft(): FirstCircleDraft {
  return {
    memberRole: "",
    operatingPattern: "",
    contacts: [],
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeFirstCircleContact(
  raw: unknown
): FirstCircleContact | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Partial<FirstCircleContact> & {
    relationship?: unknown;
    source?: unknown;
    selected?: unknown;
  };

  return {
    id: safeStr(source.id) || makeId(),
    name: safeStr(source.name),
    phone: safeStr(source.phone),
    email: safeStr(source.email),
    relationship: parseRelationship(source.relationship),
    note: safeStr(source.note),
    source: parseContactSource(source.source),
    selected: source.selected !== false,
  };
}

export function createFirstCircleContact(
  partial?: Partial<FirstCircleContact>
): FirstCircleContact {
  return {
    id: safeStr(partial?.id) || makeId(),
    name: safeStr(partial?.name),
    phone: safeStr(partial?.phone),
    email: safeStr(partial?.email),
    relationship: parseRelationship(partial?.relationship),
    note: safeStr(partial?.note),
    source: parseContactSource(partial?.source),
    selected: partial?.selected !== false,
  };
}

export function mergeFirstCircleContacts(
  existing: FirstCircleContact[],
  incoming: FirstCircleContact[]
): FirstCircleContact[] {
  const out: FirstCircleContact[] = [];
  const seen = new Set<string>();

  const addRow = (row: FirstCircleContact) => {
    const normalized = normalizeFirstCircleContact(row);
    if (!normalized) return;

    const signature = contactSignature(normalized);
    const fallbackSignature = `id:${normalized.id}`;

    if (signature !== "||") {
      if (seen.has(signature)) return;
      seen.add(signature);
    } else {
      if (seen.has(fallbackSignature)) return;
      seen.add(fallbackSignature);
    }

    out.push(normalized);
  };

  for (const row of existing) addRow(row);
  for (const row of incoming) addRow(row);

  return out;
}

export function createFirstCircleContactsFromDeviceSelection(
  rows: DeviceContactSelection[]
): FirstCircleContact[] {
  const out: FirstCircleContact[] = [];

  for (const row of rows || []) {
    const name = firstStringFromSelection(row?.name);
    const phone = firstStringFromSelection(row?.tel);
    const email = firstStringFromSelection(row?.email);

    if (!name && !phone && !email) continue;

    out.push(
      createFirstCircleContact({
        name: name || phone || email || "Contact",
        phone,
        email,
        source: "device",
        selected: true,
      })
    );
  }

  return out;
}

export function loadFirstCircleDraft(): FirstCircleDraft {
  try {
    if (!canUseStorage()) return emptyFirstCircleDraft();

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyFirstCircleDraft();

    const parsed = JSON.parse(raw) as
      | {
          memberRole?: unknown;
          operatingPattern?: unknown;
          contacts?: unknown;
          updatedAt?: unknown;
        }
      | null;

    if (!parsed || typeof parsed !== "object") {
      return emptyFirstCircleDraft();
    }

    const contactsRaw: unknown[] = Array.isArray(parsed.contacts)
      ? parsed.contacts
      : [];

    const contacts: FirstCircleContact[] = contactsRaw
      .map((row: unknown) => normalizeFirstCircleContact(row))
      .filter(
        (item: FirstCircleContact | null): item is FirstCircleContact =>
          Boolean(item)
      );

    return {
      memberRole: parseMemberRole(parsed.memberRole),
      operatingPattern: safeStr(parsed.operatingPattern),
      contacts,
      updatedAt: safeStr(parsed.updatedAt) || new Date().toISOString(),
    };
  } catch {
    return emptyFirstCircleDraft();
  }
}

export function saveFirstCircleDraft(draft: FirstCircleDraft): void {
  try {
    if (!canUseStorage()) return;

    const contacts: FirstCircleContact[] = Array.isArray(draft?.contacts)
      ? draft.contacts
          .map((row: FirstCircleContact) => normalizeFirstCircleContact(row))
          .filter(
            (item: FirstCircleContact | null): item is FirstCircleContact =>
              Boolean(item)
          )
      : [];

    const safeDraft: FirstCircleDraft = {
      memberRole: parseMemberRole(draft?.memberRole),
      operatingPattern: safeStr(draft?.operatingPattern),
      contacts,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeDraft));
  } catch {
    // Draft persistence is helpful but should never block the page.
  }
}

export function clearFirstCircleDraft(): void {
  try {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage cleanup issues.
  }
}

export const persistFirstCircleDraft = saveFirstCircleDraft;
export const setFirstCircleDraft = saveFirstCircleDraft;
export const resetFirstCircleDraft = clearFirstCircleDraft;

export function roleLabel(role: FirstCircleMemberRole | ""): string {
  if (!role) return "Not chosen";

  const match = FIRST_CIRCLE_ROLE_OPTIONS.find(
    (option: FirstCircleRoleOption) => option.value === role
  );

  return match?.label || "Member";
}

export function relationshipLabel(
  value: FirstCircleRelationshipType | "" | string
): string {
  const clean = parseRelationship(value);

  const match = FIRST_CIRCLE_RELATIONSHIP_OPTIONS.find(
    (option: FirstCircleRelationshipOption) => option.value === clean
  );

  return match?.label || "Trusted Contact";
}

export function getSuggestedRelationshipsForRole(
  role: FirstCircleMemberRole | ""
): FirstCircleRelationshipType[] {
  if (!role) return [];
  return ROLE_RELATIONSHIP_MAP[role] || [];
}

export function isContactInviteReady(contact: FirstCircleContact): boolean {
  return Boolean(
    safeStr(contact.name) && (safeStr(contact.phone) || safeStr(contact.email))
  );
}

export function getFirstCircleProgress(
  draft: FirstCircleDraft,
  targetCount = 3
): FirstCircleProgress {
  const selectedContacts: FirstCircleContact[] = draft.contacts.filter(
    (item: FirstCircleContact) => item.selected
  );

  const readyContacts: FirstCircleContact[] = selectedContacts.filter(
    (item: FirstCircleContact) => isContactInviteReady(item)
  );

  let nextStepText = "First choose what you mostly do.";

  if (draft.memberRole) {
    nextStepText =
      selectedContacts.length === 0
        ? `Add ${targetCount} trusted people you already do real life with.`
        : readyContacts.length < targetCount
        ? `${Math.max(targetCount - readyContacts.length, 0)} more ready invite${
            Math.max(targetCount - readyContacts.length, 0) === 1 ? "" : "s"
          } will make your first circle stronger.`
        : "Your first circle is ready for invite drafting and review.";
  }

  return {
    selectedCount: selectedContacts.length,
    readyCount: readyContacts.length,
    targetCount,
    nextStepText,
  };
}

export function buildInviteMessage(params: {
  contact: FirstCircleContact;
  memberName: string;
  gmfnId: string;
  communityName: string;
  memberRole: FirstCircleMemberRole | "";
  operatingPattern: string;
}): string {
  const memberName = safeStr(params.memberName) || "Member";
  const gmfnId = safeStr(params.gmfnId);
  const communityName = safeStr(params.communityName) || "my community";
  const roleText = roleLabel(params.memberRole);
  const relationshipText = relationshipLabel(params.contact.relationship);
  const patternText = safeStr(params.operatingPattern);

  const lines: string[] = [
    `Hello ${safeStr(params.contact.name) || "there"},`,
    "",
    gmfnId
      ? `I recently joined GSN and received my GSN ID ${gmfnId}.`
      : "I recently joined GSN. My GSN ID is not issued yet.",
    "GSN works best when people begin with those they already trust and already do real life with.",
    "",
    `I am joining as a ${roleText.toLowerCase()}.`,
    patternText ? `My main pattern is: ${patternText}.` : "",
    `Because of our relationship as ${relationshipText.toLowerCase()}, I would like to invite you into my first GSN circle in ${communityName}.`,
    "",
    "This is not a random invite. It is trust-based and relationship-based.",
    "",
    `From ${memberName}`,
  ];

  return lines.filter(Boolean).join("\n");
}

export function buildInviteBundle(params: {
  draft: FirstCircleDraft;
  memberName: string;
  gmfnId: string;
  communityName: string;
}): string {
  const contacts: FirstCircleContact[] = params.draft.contacts.filter(
    (item: FirstCircleContact) => item.selected && isContactInviteReady(item)
  );

  return contacts
    .map((contact: FirstCircleContact) =>
      buildInviteMessage({
        contact,
        memberName: params.memberName,
        gmfnId: params.gmfnId,
        communityName: params.communityName,
        memberRole: params.draft.memberRole,
        operatingPattern: params.draft.operatingPattern,
      })
    )
    .join("\n\n--------------------\n\n");
}

export function parsePastedContacts(text: string): FirstCircleContact[] {
  const lines: string[] = String(text || "")
    .split(/\r?\n/g)
    .map((line: string) => safeStr(line))
    .filter((line: string) => Boolean(line));

  const out: FirstCircleContact[] = [];

  for (const line of lines) {
    const parts: string[] = line
      .split(/[,|;]/g)
      .map((part: string) => safeStr(part));

    const name = safeStr(parts[0]);
    const rest: string[] = parts.slice(1).filter((part: string) => Boolean(part));

    if (!name) continue;

    let email = "";
    let phone = "";
    let relationship: FirstCircleRelationshipType | "" = "";

    for (const token of rest) {
      const maybeRelationship = parseRelationship(token);

      if (!email && token.includes("@")) {
        email = token;
        continue;
      }

      if (!relationship && maybeRelationship) {
        relationship = maybeRelationship;
        continue;
      }

      if (!phone) {
        phone = token;
      }
    }

    out.push(
      createFirstCircleContact({
        name,
        phone,
        email,
        relationship,
        source: "paste",
        selected: true,
      })
    );
  }

  return out;
}

