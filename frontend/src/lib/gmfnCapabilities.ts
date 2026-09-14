export type GmfnCapabilityCategory =
  | "trade"
  | "visibility"
  | "finance"
  | "support"
  | "community"
  | "identity"
  | "work"
  | "operating";

export type GmfnCapabilityTone = "calm" | "focus" | "alert" | "spotlight";

export type GmfnCapability = {
  id: number;
  title: string;
  proverb: string;
  gmfn: string;
  category: GmfnCapabilityCategory;
  tone: GmfnCapabilityTone;
  priority?: number;
  whatItIs?: string;
  howItWorks?: string;
  whyItMatters?: string;
  decisionGuideLine?: string;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hashSeed(...parts: Array<unknown>): number {
  const text = parts.map((part) => String(part ?? "")).join("|");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export const GMFN_CAPABILITIES: readonly GmfnCapability[] = [
  {
    id: 1,
    title: "Recognised Community Identity",
    proverb: "A community should not live only inside one phone, chat name, or paper list.",
    gmfn:
      "GSN gives a real group a governed identity space where members, public claims, setup material, and handover records can remain readable over time.",
    category: "community",
    tone: "focus",
    priority: 9,
    whatItIs:
      "A structured GSN identity for a church, school, cooperative, market, NGO, family, diaspora group, or similar organisation.",
    howItWorks:
      "The community keeps a named space for its public identity, membership context, setup links, documents, and role-based activity instead of scattering authority across chats and personal devices.",
    whyItMatters:
      "Identity is the root of safe membership, announcements, meetings, trust evidence, shops, support, and continuity.",
    decisionGuideLine:
      "Before a group acts publicly, confirm the community identity, owner context, member boundary, and source of authority.",
  },
  {
    id: 2,
    title: "Governed Membership and Roles",
    proverb: "Access should follow responsibility, not forwarded links alone.",
    gmfn:
      "GSN separates leaders, admins, members, visitors, and public readers so community access can be controlled without turning every person into an owner.",
    category: "identity",
    tone: "focus",
    priority: 9,
    whatItIs:
      "A membership and role model for who belongs, who manages, who can publish, and who can only read.",
    howItWorks:
      "Joining paths, invite or QR entry, role-aware surfaces, and controlled actions keep membership from becoming a loose public chat.",
    whyItMatters:
      "Good limits protect official notices, private evidence, member safety, and leadership handover.",
    decisionGuideLine:
      "Before granting access, check the person's role, entry path, community fit, and what actions that role should allow.",
  },
  {
    id: 3,
    title: "Invite and QR Entry",
    proverb: "The entry path is part of the evidence.",
    gmfn:
      "GSN helps people enter the right community, document, shop, or setup flow by scanning or opening the correct link instead of relying on manual typing and repeated forwarding.",
    category: "operating",
    tone: "calm",
    priority: 8,
    whatItIs:
      "Phone-friendly invite, QR, and download paths for onboarding, meetings, documents, and client handover.",
    howItWorks:
      "The setup pack and app flows can provide QR or invite links that take the reader directly to the intended public, member, or setup surface.",
    whyItMatters:
      "QR entry reduces manual error and gives communities a cleaner way to distribute material to members.",
    decisionGuideLine:
      "Before sharing a QR or invite, confirm it opens only the intended public, member, or setup surface.",
  },
  {
    id: 4,
    title: "Official Announcements and Response Evidence",
    proverb: "A message that matters should not disappear under chat noise.",
    gmfn:
      "GSN gives official notices, acknowledgements, availability, and response signals a clearer place to live so leaders can see what happened after a message was sent.",
    category: "community",
    tone: "calm",
    priority: 8,
    whatItIs:
      "A protected announcement and response layer for official community communication.",
    howItWorks:
      "Bulletin-style notices, acknowledgement paths, and response records can sit beside ordinary communication without becoming a free-for-all feed.",
    whyItMatters:
      "Coordination begins when people can tell who saw, acknowledged, responded, or needs follow-up.",
    decisionGuideLine:
      "Before treating an announcement as complete, check its official source, response evidence, and follow-up path.",
  },
  {
    id: 5,
    title: "Meetings, Attendance and Decision Memory",
    proverb: "A community should not repeat decisions because yesterday's record is missing.",
    gmfn:
      "GSN helps meetings, attendance, actions, files, decisions, and handover memory stay connected so a community does not restart when leaders change.",
    category: "community",
    tone: "focus",
    priority: 9,
    whatItIs:
      "A meeting and institutional memory layer for participation, decisions, documents, and continuity.",
    howItWorks:
      "Notices, attendance/sign-in patterns, minutes, action owners, files, and follow-up evidence can be organised around the community domain.",
    whyItMatters:
      "Leadership continuity depends on records that survive phones, terms of office, and changing admins.",
    decisionGuideLine:
      "Before a decision is reused, check the meeting, attendance, document, action owner, and handover evidence behind it.",
  },
  {
    id: 6,
    title: "TrustPassport and TrustSlip Evidence",
    proverb: "Trust should be readable, bounded, and current before people rely on it.",
    gmfn:
      "GSN helps members carry controlled trust evidence through TrustPassport, TrustSlip, identity context, credentials, and verification boundaries without pretending trust is automatic proof.",
    category: "identity",
    tone: "alert",
    priority: 9,
    whatItIs:
      "Portable but bounded evidence for identity, reputation, community context, and trust decisions.",
    howItWorks:
      "TrustPassport holds fuller context while TrustSlip gives a smaller checkable evidence record for decisions that need a public or limited reading.",
    whyItMatters:
      "People need a way to carry a good name beyond one circle without exposing every private record.",
    decisionGuideLine:
      "Before relying on trust, reopen the current TrustPassport, TrustSlip, credential, and verification boundary.",
  },
  {
    id: 7,
    title: "Community Marketplace and Public Shop",
    proverb: "A shop should not be only scattered photos, chats, and claims.",
    gmfn:
      "GSN gives sellers, services, products, media, contact routes, Spotlight activity, and public shop identity a more organised community-backed presence.",
    category: "trade",
    tone: "spotlight",
    priority: 8,
    whatItIs:
      "A marketplace and public shop layer for goods, services, seller identity, and contact paths.",
    howItWorks:
      "Public shop pages, shelf items, media, Spotlight, WhatsApp or phone contact paths, and trust entry points stay tied to one shop identity.",
    whyItMatters:
      "Buyers need to see item, owner, contact route, community context, and evidence boundaries together.",
    decisionGuideLine:
      "Before buying, selling, or sharing a shop, check owner identity, shelf evidence, contact path, and verification boundary.",
  },
  {
    id: 8,
    title: "DemandBox and Ask Community",
    proverb: "Real needs should be structured before chat noise buries them.",
    gmfn:
      "GSN routes needs, offers, requests, and local demand into a structured place so the official bulletin can stay official while opportunity remains visible.",
    category: "trade",
    tone: "focus",
    priority: 8,
    whatItIs:
      "A structured demand and request layer for community needs, offers, services, goods, and support signals.",
    howItWorks:
      "Ask Community and DemandBox separate official notices from demand signals, then keep requester context, placement, and response paths visible.",
    whyItMatters:
      "Many opportunities are lost because the right person never sees the need at the right time.",
    decisionGuideLine:
      "Before treating a need as solved, check requester context, placement, response path, and evidence left behind.",
  },
  {
    id: 9,
    title: "Support, Welfare and Contribution Records",
    proverb: "Help is stronger when responsibility and evidence travel with it.",
    gmfn:
      "GSN helps support requests, welfare activity, contribution history, repayment context, supporter responsibility, and savings-circle records become easier to review.",
    category: "finance",
    tone: "focus",
    priority: 8,
    whatItIs:
      "A support and finance-evidence layer for welfare, contributions, loans, repayments, and community responsibility.",
    howItWorks:
      "Requests can carry amount, purpose, duration, fit, supporter context, repayment plan, contribution record, or ROSCA context where the live product supports it.",
    whyItMatters:
      "Communities need support evidence without pretending GSN is a bank or that every request is approved.",
    decisionGuideLine:
      "Before backing support or reading finance evidence, check amount, purpose, duration, responsibility, repayment, and community source.",
  },
  {
    id: 10,
    title: "Opportunity and Activity Analytics",
    proverb: "Activity becomes useful when leaders can read it without mistaking signals for proof.",
    gmfn:
      "GSN helps leaders read attention, participation, demand, Spotlight movement, shop activity, trust signals, and opportunity patterns from observable activity.",
    category: "visibility",
    tone: "focus",
    priority: 8,
    whatItIs:
      "A practical analytics layer for reading community movement, market activity, demand, visibility, and follow-up signals.",
    howItWorks:
      "Shop Control, Spotlight attention, DemandBox signals, Market Wisdom, and Opportunity Engine views can organise what GSN can observe.",
    whyItMatters:
      "Leaders need a calmer way to see what is moving, what is ignored, and what needs action.",
    decisionGuideLine:
      "Before acting on analytics, separate attention, demand, participation, contact attempts, and verified outcomes.",
  },
  {
    id: 11,
    title: "Documents, Downloads and Bridges",
    proverb: "Important material should move cleanly without exposing the wrong door.",
    gmfn:
      "GSN helps communities package documents, QR download sheets, forms, setup packs, public links, private files, and approved bridges so people receive the right material.",
    category: "operating",
    tone: "calm",
    priority: 8,
    whatItIs:
      "A document and transfer layer for setup packs, downloads, QR handover, public links, and controlled private material.",
    howItWorks:
      "The setup pack, QR download index, document links, bulletin bridges, and public/private boundaries guide what can be sent to leaders or members.",
    whyItMatters:
      "Good documents reduce repeated explanation and help members move setup material onto their phones.",
    decisionGuideLine:
      "Before sending a document or bridge, check whether it is public, member-safe, admin-only, or private.",
  },
  {
    id: 12,
    title: "Continuity, Handover and Institutional Memory",
    proverb: "A community should outlive the current admin's phone.",
    gmfn:
      "GSN helps preserve identity, membership, roles, documents, decisions, support evidence, marketplace context, and setup history so communities can upgrade instead of starting again.",
    category: "community",
    tone: "focus",
    priority: 9,
    whatItIs:
      "The continuity layer that keeps community memory, setup material, roles, evidence, and handover usable over time.",
    howItWorks:
      "The Community Domain, setup pack, route map, documents, role model, and evidence surfaces make the organisation less dependent on one person or device.",
    whyItMatters:
      "Continuity is what makes GSN valuable beyond one demo, one meeting, or one leadership cycle.",
    decisionGuideLine:
      "Before handover or upgrade, check the source pack, current routes, roles, documents, evidence limits, and live community state.",
  },
] as const;

export const GMFN_CAPABILITY_COUNT = GMFN_CAPABILITIES.length;

export function getGmfnCapability(id: any): GmfnCapability | null {
  const capabilityId = positiveNumber(id);
  if (!capabilityId) return null;
  return GMFN_CAPABILITIES.find((item) => item.id === capabilityId) || null;
}

export function getFeaturedGmfnCapability(seed?: unknown): GmfnCapability | null {
  if (!GMFN_CAPABILITIES.length) return null;

  const seedKey =
    safeStr(seed) ||
    new Date().toISOString().slice(0, 10) ||
    String(GMFN_CAPABILITY_COUNT);
  const index = hashSeed(seedKey, GMFN_CAPABILITY_COUNT) % GMFN_CAPABILITIES.length;

  return GMFN_CAPABILITIES[index] || GMFN_CAPABILITIES[0] || null;
}

export function getGmfnCapabilityGuideLine(id: any, fallbackSeed?: unknown): string {
  const capability =
    getGmfnCapability(id) || getFeaturedGmfnCapability(fallbackSeed);

  if (!capability) {
    return `My GSN and I keeps the ${GMFN_CAPABILITY_COUNT} core capabilities as the guide behind this reading.`;
  }

  return (
    safeStr(capability.decisionGuideLine) ||
    safeStr(capability.whyItMatters) ||
    safeStr(capability.whatItIs) ||
    safeStr(capability.proverb) ||
    safeStr(capability.gmfn) ||
    capability.title
  );
}
