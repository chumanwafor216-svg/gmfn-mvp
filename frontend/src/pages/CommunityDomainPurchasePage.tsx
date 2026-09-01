import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  EntryActionButton,
  EntryBackLink,
} from "../components/EntryControls";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import { StableDisclosureSummary } from "../components/StableButton";
import {
  checkCommunityDomainAvailability,
  createCommunityDomainDraft,
  createCommunityDomainPackageQuote,
  getAccessToken,
  listMyClans,
  listCommunityDomainTemplates,
  lookupCommunityDomainByName,
} from "../lib/api";

type TemplateOption = {
  template_key: string;
  domain_type: string;
  label: string;
  summary?: string;
  boundary?: string;
};

type AvailabilityResult = {
  domain_name?: string;
  normalized_domain_name?: string;
  available?: boolean;
  reason?: string | null;
};

type DomainLookupResult = {
  id?: number | string;
  domain_name?: string;
  display_name?: string;
  status?: string;
  verification_status?: string;
  template_label?: string;
  dashboard_path?: string;
  public_profile?: string | null;
};

type PurchaseDraftSnapshot = {
  organizationName?: string;
  domainName?: string;
  country?: string;
  stateName?: string;
  templateKey?: string;
  publicProfile?: string;
  domainSetupToggles?: Partial<DomainSetupToggles>;
};

type LocalCommunityAnchorState = {
  checked: boolean;
  loading: boolean;
  count: number;
  firstName: string;
  error: string;
};

const PURCHASE_DRAFT_STORAGE_KEY = "gsn.communityDomainPurchaseDraft.v1";
const DEFAULT_COMMUNITY_DOMAIN_TEMPLATE_KEY = "ngo_project_network";
const PILLAR_OF_HOPE_DEMO_PROFILE =
  "Pillar of Hope supports families in Aberdeen through Saturday community fitness with Snapfit Aberdeen, food support for families in need, low-cost household items, and health education seminars for women and families.";

const PILLAR_OF_HOPE_DEMO_DRAFT: PurchaseDraftSnapshot = {
  organizationName: "Pillar of Hope Demo",
  domainName: "pillar-of-hope-demo",
  country: "United Kingdom",
  stateName: "Scotland / Aberdeen",
  templateKey: "ngo_project_network",
  publicProfile: PILLAR_OF_HOPE_DEMO_PROFILE,
};

const FALLBACK_TEMPLATES: TemplateOption[] = [
  {
    template_key: "school_multi_branch",
    domain_type: "school",
    label: "School",
    summary: "Schools, academies, branches, classes, staff, parents, and student groups.",
  },
  {
    template_key: "church_religious_body",
    domain_type: "religious_body",
    label: "Church / religious body",
    summary: "Branches, ministries, departments, leaders, members, and programmes.",
  },
  {
    template_key: "union_professional_body",
    domain_type: "professional_union",
    label: "Union / professional body",
    summary: "Chapters, committees, professional groups, and membership governance.",
  },
  {
    template_key: "market_cooperative",
    domain_type: "market_cooperative",
    label: "Market / cooperative",
    summary: "Market authorities, trade lines, shop clusters, and cooperative records.",
  },
  {
    template_key: "family_town_union_diaspora",
    domain_type: "town_union",
    label: "Family / town union / diaspora",
    summary: "Town unions, diaspora chapters, family groups, projects, and committees.",
  },
  {
    template_key: "hospital_health_body",
    domain_type: "health_body",
    label: "Hospital / health body",
    summary: "Clinics, health networks, care groups, units, staff, and controlled records.",
  },
  {
    template_key: "ngo_project_network",
    domain_type: "ngo_project_network",
    label: "Charity / nonprofit / NGO",
    summary:
      "Charities, nonprofits, support networks, food aid, health programmes, volunteers, and evidence records.",
  },
  {
    template_key: "generic_association",
    domain_type: "generic_association",
    label: "Generic association",
    summary: "A flexible structure for custom institutional domains.",
  },
];

type DomainSetupToggleKey =
  | "member_invites"
  | "official_announcements"
  | "member_shops"
  | "contributions"
  | "welfare_cycles"
  | "demand_box"
  | "private_records";

type DomainSetupToggles = Record<DomainSetupToggleKey, boolean>;

type CreateEntryCommunityType =
  | "informal_social"
  | "local_support"
  | "migrant_community"
  | "alumni_school"
  | "marketplace_community"
  | "professional_community"
  | "registered_organisation"
  | "welfare_contribution"
  | "other";

type CreateEntryGovernanceWeight = "light" | "standard" | "high";

const DOMAIN_SETUP_TOGGLE_OPTIONS: Array<{
  key: DomainSetupToggleKey;
  label: string;
  summary: string;
}> = [
  {
    key: "member_invites",
    label: "Member invites",
    summary: "Prepare invite links and admin approval for new members.",
  },
  {
    key: "official_announcements",
    label: "Official announcements",
    summary: "Prepare the notice board for official updates and meetings.",
  },
  {
    key: "member_shops",
    label: "Member shops / services",
    summary: "Prepare member stalls, service listings, and shop control.",
  },
  {
    key: "contributions",
    label: "Payments / contributions",
    summary: "Prepare contribution records without confirming payment yet.",
  },
  {
    key: "welfare_cycles",
    label: "Welfare cycles",
    summary: "Prepare rotating support or contribution-cycle records.",
  },
  {
    key: "demand_box",
    label: "Demand Box",
    summary: "Prepare a place to collect needs, requests, and supply gaps.",
  },
  {
    key: "private_records",
    label: "Private records",
    summary: "Prepare a protected vault for evidence and admin records.",
  },
];

const DOMAIN_TEMPLATE_CREATE_ENTRY_MAP: Record<
  string,
  {
    communityType: CreateEntryCommunityType;
    governanceWeight: CreateEntryGovernanceWeight;
    governanceLabel: string;
  }
> = {
  school_multi_branch: {
    communityType: "alumni_school",
    governanceWeight: "standard",
    governanceLabel: "Standard school / alumni setup",
  },
  church_religious_body: {
    communityType: "registered_organisation",
    governanceWeight: "high",
    governanceLabel: "Structured registered organisation",
  },
  union_professional_body: {
    communityType: "professional_community",
    governanceWeight: "standard",
    governanceLabel: "Standard professional community",
  },
  market_cooperative: {
    communityType: "marketplace_community",
    governanceWeight: "standard",
    governanceLabel: "Standard marketplace network",
  },
  family_town_union_diaspora: {
    communityType: "migrant_community",
    governanceWeight: "light",
    governanceLabel: "Light migrant support network",
  },
  hospital_health_body: {
    communityType: "registered_organisation",
    governanceWeight: "high",
    governanceLabel: "Structured health body",
  },
  ngo_project_network: {
    communityType: "registered_organisation",
    governanceWeight: "high",
    governanceLabel: "Structured charity / nonprofit setup",
  },
  generic_association: {
    communityType: "registered_organisation",
    governanceWeight: "high",
    governanceLabel: "Structured association setup",
  },
};
const DOMAIN_ENGINE_POINTS = [
  {
    label: "Governance",
    text: "Give an institution one owned home with clear roles and branches.",
  },
  {
    label: "Trust record",
    text: "Preserve member, shop, service, and evidence history under one domain.",
  },
  {
    label: "Network reach",
    text: "Let branches and groups carry trust across the wider GSN network.",
  },
  {
    label: "Opportunity",
    text: "Turn community-created value into visible, trusted opportunity.",
  },
];

const DOMAIN_PURCHASE_MOBILE_FACTS = [
  "Community first",
  "Domain after",
  "Payment later",
];

const COMMUNITY_DOMAIN_PURCHASE_COMPACT_WIDTH = 980;

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100svh",
    width: "100%",
    background:
      "radial-gradient(circle at 86% 12%, rgba(214,170,69,0.13) 0%, rgba(214,170,69,0.00) 28%), radial-gradient(circle at 10% 84%, rgba(70,119,165,0.22) 0%, rgba(70,119,165,0.00) 30%), linear-gradient(180deg, #04101B 0%, #071A2A 46%, #0D2A43 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "16px",
    boxSizing: "border-box",
  };
}

function glassCard(): React.CSSProperties {
  return {
    width: "min(100%, 1040px)",
    margin: "0 auto",
    borderRadius: 30,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
    border: "1px solid rgba(220,231,243,0.18)",
    boxShadow:
      "0 34px 78px rgba(0,8,18,0.34), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 18,
    boxSizing: "border-box",
    overflow: "hidden",
    position: "relative",
  };
}

function whiteCard(): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(232,239,247,0.97) 100%)",
    border: "1px solid rgba(17,37,58,0.12)",
    boxShadow: "0 22px 48px rgba(8,18,34,0.13)",
    padding: 18,
    color: "#0B1F33",
  };
}

function darkPanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)",
    border: "1px solid rgba(220,231,243,0.18)",
    boxShadow: "0 18px 34px rgba(0,8,18,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
    padding: 16,
  };
}

function labelText(onDark = true): React.CSSProperties {
  return {
    fontSize: 12,
    color: onDark ? "#F3D06A" : "#526B83",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
    overflowWrap: "normal",
    wordBreak: "normal",
  };
}

function helperText(onDark = true): React.CSSProperties {
  return {
    color: onDark ? "rgba(255,255,255,0.82)" : "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 50,
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.15)",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,250,255,0.99) 100%)",
    color: "#0B1F33",
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    color: "#0B1F33",
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 6,
  };
}

function statusPill(kind: "ready" | "blocked" | "waiting"): React.CSSProperties {
  const palette =
    kind === "ready"
      ? { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" }
      : kind === "blocked"
      ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
      : { bg: "rgba(146,94,8,0.10)", color: "#925E08", border: "rgba(146,94,8,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1.15,
    maxWidth: "100%",
    whiteSpace: "normal",
    textAlign: "center",
    overflowWrap: "normal",
    wordBreak: "normal",
  };
}

function stepCard(): React.CSSProperties {
  return {
    ...darkPanel(),
    display: "grid",
    gap: 12,
    color: "#F8FBFF",
  };
}

function resultBanner(kind: "ready" | "blocked" | "waiting"): React.CSSProperties {
  const palette =
    kind === "ready"
      ? {
          bg: "linear-gradient(180deg, rgba(35,190,106,0.18) 0%, rgba(255,255,255,0.08) 100%)",
          border: "rgba(74,222,128,0.24)",
        }
      : kind === "blocked"
      ? {
          bg: "linear-gradient(180deg, rgba(220,38,38,0.16) 0%, rgba(255,255,255,0.08) 100%)",
          border: "rgba(248,113,113,0.22)",
        }
      : {
          bg: "linear-gradient(180deg, rgba(246,199,102,0.16) 0%, rgba(255,255,255,0.08) 100%)",
          border: "rgba(246,199,102,0.22)",
        };

  return {
    minHeight: 92,
    borderRadius: 20,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "58px minmax(0, 1fr)",
    gap: 14,
    alignItems: "center",
  };
}

function resultMark(kind: "ready" | "blocked" | "waiting"): React.CSSProperties {
  const palette =
    kind === "ready"
      ? { bg: "#22C55E", color: "#062014" }
      : kind === "blocked"
      ? { bg: "#EF4444", color: "#FFFFFF" }
      : { bg: "#F2C766", color: "#10253B" };

  return {
    width: 52,
    height: 52,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: palette.bg,
    color: palette.color,
    fontSize: 13,
    fontWeight: 950,
    boxShadow:
      "0 16px 30px rgba(0,8,18,0.26), inset 0 1px 0 rgba(255,255,255,0.36)",
  };
}

function detailRow(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "minmax(92px, 0.45fr) minmax(0, 1fr)",
    gap: 10,
    alignItems: "start",
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 1.45,
    minWidth: 0,
  };
}

function detailValue(): React.CSSProperties {
  return {
    color: "#F8FBFF",
    fontWeight: 850,
    textAlign: "right",
    minWidth: 0,
    overflowWrap: "normal",
    wordBreak: "normal",
  };
}

function stepLine(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr)",
    gap: 10,
    alignItems: "start",
    paddingTop: 10,
    borderTop: "1px solid rgba(220,231,243,0.12)",
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 1.45,
  };
}

function smallLineIcon(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(246,199,102,0.30)",
    color: "#F2C766",
    fontSize: 11,
    fontWeight: 950,
  };
}

function compactValue(value: unknown, fallback = "Not set"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactOptional(value: unknown): string {
  return String(value ?? "").trim();
}

function domainDisplayCode(value: unknown): string {
  const clean = compactValue(value, "").replace(/\.gsn$/i, "");
  return clean ? `${clean}.gsn` : "Not returned";
}

function templateForKey(
  templateKey: unknown,
  options: TemplateOption[] = FALLBACK_TEMPLATES
): TemplateOption {
  const key = compactValue(templateKey, DEFAULT_COMMUNITY_DOMAIN_TEMPLATE_KEY);
  return (
    options.find((item) => item.template_key === key) ||
    FALLBACK_TEMPLATES.find((item) => item.template_key === key) ||
    FALLBACK_TEMPLATES.find(
      (item) => item.template_key === DEFAULT_COMMUNITY_DOMAIN_TEMPLATE_KEY
    ) ||
    FALLBACK_TEMPLATES[0]
  );
}

function createEntryProfileForTemplate(template: TemplateOption) {
  return (
    DOMAIN_TEMPLATE_CREATE_ENTRY_MAP[template.template_key] ||
    DOMAIN_TEMPLATE_CREATE_ENTRY_MAP.generic_association
  );
}

function defaultDomainSetupToggles(template: TemplateOption): DomainSetupToggles {
  const key = template.template_key;
  return {
    member_invites: true,
    official_announcements: true,
    member_shops: [
      "market_cooperative",
      "family_town_union_diaspora",
      "ngo_project_network",
    ].includes(key),
    contributions: key !== "generic_association",
    welfare_cycles: ["market_cooperative", "family_town_union_diaspora"].includes(key),
    demand_box: [
      "market_cooperative",
      "family_town_union_diaspora",
      "ngo_project_network",
    ].includes(key),
    private_records: [
      "school_multi_branch",
      "hospital_health_body",
      "ngo_project_network",
    ].includes(key),
  };
}

function normalizeDomainSetupToggles(
  value: unknown,
  template: TemplateOption
): DomainSetupToggles {
  const defaults = defaultDomainSetupToggles(template);
  if (!value || typeof value !== "object") return defaults;
  const record = value as Partial<Record<DomainSetupToggleKey, unknown>>;
  return DOMAIN_SETUP_TOGGLE_OPTIONS.reduce<DomainSetupToggles>((next, item) => {
    next[item.key] =
      typeof record[item.key] === "boolean" ? Boolean(record[item.key]) : defaults[item.key];
    return next;
  }, { ...defaults });
}

function domainSetupRecommendationFor(template: TemplateOption) {
  const profile = createEntryProfileForTemplate(template);
  return {
    governanceLabel: profile.governanceLabel,
    summary:
      profile.governanceWeight === "high"
        ? "GSN recommends stronger owner/admin checks because this looks like a formal institution or registered body."
        : "GSN recommends a lighter guided setup first, then lets the owner deepen controls as the community grows.",
    requirements: [
      "Create or choose the normal GSN community first",
      "Keep owner/admin approval on for membership changes",
      "Treat payment, verification, and activation as later steps",
    ],
  };
}

function enabledDomainSetupLabels(toggles: DomainSetupToggles): string[] {
  return DOMAIN_SETUP_TOGGLE_OPTIONS.filter((item) => toggles[item.key]).map(
    (item) => item.label
  );
}

function createEntryGovernanceTogglesFromDomainSetup(
  profile: { governanceWeight: CreateEntryGovernanceWeight },
  toggles: DomainSetupToggles
) {
  const highTrust = profile.governanceWeight === "high";
  return {
    allow_public_invite_link: Boolean(toggles.member_invites),
    require_admin_approval_after_invite: true,
    enable_member_service_listings: Boolean(toggles.member_shops || toggles.demand_box),
    require_admin_approval_for_listings: true,
    enable_community_records: Boolean(
      toggles.official_announcements || toggles.private_records
    ),
    allow_member_record_submissions: false,
    require_admin_approval_for_records: true,
    require_full_member_verification: highTrust,
  };
}

function rowsOf(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.clans)) return payload.clans;
  return [];
}

function readableCommunityName(row: any): string {
  return compactOptional(row?.name || row?.clan_name || row?.community_name);
}

function readPurchaseDraftSnapshot(): PurchaseDraftSnapshot | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(PURCHASE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PurchaseDraftSnapshot;
    const templateKey = compactOptional(parsed?.templateKey);
    return {
      organizationName: compactOptional(parsed?.organizationName),
      domainName: compactOptional(parsed?.domainName),
      country: compactOptional(parsed?.country),
      stateName: compactOptional(parsed?.stateName),
      templateKey,
      publicProfile: compactOptional(parsed?.publicProfile),
      domainSetupToggles: normalizeDomainSetupToggles(
        parsed?.domainSetupToggles,
        templateForKey(templateKey)
      ),
    };
  } catch {
    return null;
  }
}

function savePurchaseDraftSnapshot(snapshot: PurchaseDraftSnapshot) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  const templateKey = compactOptional(snapshot.templateKey);
  const safeSnapshot: PurchaseDraftSnapshot = {
    organizationName: compactOptional(snapshot.organizationName),
    domainName: compactOptional(snapshot.domainName),
    country: compactOptional(snapshot.country),
    stateName: compactOptional(snapshot.stateName),
    templateKey,
    publicProfile: compactOptional(snapshot.publicProfile),
    domainSetupToggles: normalizeDomainSetupToggles(
      snapshot.domainSetupToggles,
      templateForKey(templateKey)
    ),
  };
  window.sessionStorage.setItem(PURCHASE_DRAFT_STORAGE_KEY, JSON.stringify(safeSnapshot));
}

function clearPurchaseDraftSnapshot() {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  window.sessionStorage.removeItem(PURCHASE_DRAFT_STORAGE_KEY);
}

function availabilityReasonText(reason: unknown): string {
  const key = compactValue(reason, "").toLowerCase();
  if (key === "domain_name_required") {
    return "Enter the name or code you want GSN to check.";
  }
  if (key === "reserved_domain_name") {
    return "That name is reserved by GSN. Choose a more specific institution name.";
  }
  if (key === "invalid_domain_name") {
    return "Use letters, numbers, spaces, or hyphens. GSN will turn spaces into hyphens.";
  }
  if (key === "domain_name_taken") {
    return "That name is already in use. Add a branch, city, or institution detail.";
  }
  return "Choose a different domain name before continuing.";
}

function normalizeTemplateItems(payload: any): TemplateOption[] {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const clean = items
    .map((item: any): TemplateOption | null => {
      const templateKey = compactValue(item?.template_key, "");
      const domainType = compactValue(item?.domain_type, templateKey);
      const label = compactValue(item?.label, "");
      if (!templateKey || !label) return null;
      if (templateKey === "ngo_project_network") {
        return {
          template_key: templateKey,
          domain_type: domainType,
          label: "Charity / nonprofit / NGO",
          summary:
            "Charities, nonprofits, support networks, food aid, health programmes, volunteers, and evidence records.",
          boundary: compactValue(item?.boundary, ""),
        };
      }
      return {
        template_key: templateKey,
        domain_type: domainType,
        label,
        summary: compactValue(item?.summary, ""),
        boundary: compactValue(item?.boundary, ""),
      };
    })
    .filter(Boolean) as TemplateOption[];

  return clean.length ? clean : FALLBACK_TEMPLATES;
}

function purchaseDemoDraftFromSearch(search: string): PurchaseDraftSnapshot | null {
  const params = new URLSearchParams(search || "");
  const demoKey = compactValue(
    params.get("demo") || params.get("example") || params.get("preset"),
    ""
  )
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  if (["pillar-of-hope", "pillar-of-hope-demo", "poh"].includes(demoKey)) {
    return PILLAR_OF_HOPE_DEMO_DRAFT;
  }

  return null;
}

export default function CommunityDomainPurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const demoDraft = useMemo(
    () => purchaseDemoDraftFromSearch(location.search),
    [location.search]
  );
  const restoredDraft = useMemo(() => readPurchaseDraftSnapshot(), []);
  const initialDraft = demoDraft || restoredDraft;
  const initialTemplateKey =
    initialDraft?.templateKey || DEFAULT_COMMUNITY_DOMAIN_TEMPLATE_KEY;
  const initialTemplate = templateForKey(initialTemplateKey);
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= COMMUNITY_DOMAIN_PURCHASE_COMPACT_WIDTH;
  });
  const [organizationName, setOrganizationName] = useState(
    initialDraft?.organizationName || ""
  );
  const [domainName, setDomainName] = useState(initialDraft?.domainName || "");
  const [country, setCountry] = useState(initialDraft?.country || "");
  const [stateName, setStateName] = useState(initialDraft?.stateName || "");
  const [templateKey, setTemplateKey] = useState(initialTemplateKey);
  const [domainSetupToggles, setDomainSetupToggles] = useState<DomainSetupToggles>(
    () => normalizeDomainSetupToggles(initialDraft?.domainSetupToggles, initialTemplate)
  );
  const [templates, setTemplates] = useState<TemplateOption[]>(FALLBACK_TEMPLATES);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [draftResult, setDraftResult] = useState<any>(null);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [existingDomainName, setExistingDomainName] = useState("");
  const [domainLookup, setDomainLookup] = useState<DomainLookupResult | null>(null);
  const [busy, setBusy] = useState<
    "templates" | "availability" | "draft" | "lookup" | null
  >(null);
  const [message, setMessage] = useState("");
  const [localCommunityAnchor, setLocalCommunityAnchor] =
    useState<LocalCommunityAnchorState>({
      checked: false,
      loading: Boolean(getAccessToken()),
      count: 0,
      firstName: "",
      error: "",
    });
  const mountedRef = useRef(true);
  const busyRef = useRef<typeof busy>(null);
  const templateLoadSequence = useRef(0);
  const availabilityCheckSequence = useRef(0);
  const draftCreateSequence = useRef(0);
  const domainLookupSequence = useRef(0);

  const setBusyState = useCallback((nextBusy: typeof busy) => {
    busyRef.current = nextBusy;
    setBusy(nextBusy);
  }, []);

  const isSignedIn = Boolean(getAccessToken());
  const hasLocalCommunityAnchor = localCommunityAnchor.count > 0;
  const needsLocalCommunityFirst =
    !isSignedIn || (!localCommunityAnchor.loading && !hasLocalCommunityAnchor);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof document !== "undefined") {
      document.title = "GSN | Purchase Community Domain";
    }

    return () => {
      mountedRef.current = false;
      templateLoadSequence.current += 1;
      availabilityCheckSequence.current += 1;
      draftCreateSequence.current += 1;
      domainLookupSequence.current += 1;
    };
  }, []);

  useEffect(() => {
    if (demoDraft?.domainName || demoDraft?.organizationName) {
      const requestedDemoName = demoDraft.domainName || "";
      const requestId = availabilityCheckSequence.current + 1;
      setOrganizationName(demoDraft.organizationName || "");
      setDomainName(demoDraft.domainName || "");
      setCountry(demoDraft.country || "");
      setStateName(demoDraft.stateName || "");
      const nextTemplateKey = demoDraft.templateKey || DEFAULT_COMMUNITY_DOMAIN_TEMPLATE_KEY;
      setTemplateKey(nextTemplateKey);
      setDomainSetupToggles(
        normalizeDomainSetupToggles(
          demoDraft.domainSetupToggles,
          templateForKey(nextTemplateKey, templates)
        )
      );
      setExistingDomainName(demoDraft.domainName || "");
      setAvailability(null);
      setDraftResult(null);
      setQuoteResult(null);
      setMessage(
        "Pillar of Hope demo fields and profile are filled. GSN is checking the domain name."
      );


      if (needsLocalCommunityFirst) {
        setAvailability(null);
        setMessage(
          "Pillar of Hope needs the normal GSN community first. Create that local community, then continue Domain filling."
        );
        return;
      }
      if (requestedDemoName.trim().length >= 2) {
        availabilityCheckSequence.current = requestId;
        const canApply = () =>
          mountedRef.current && availabilityCheckSequence.current === requestId;

        setBusyState("availability");
        void checkCommunityDomainAvailability(requestedDemoName)
          .then((result) => {
            if (!canApply()) return;
            setAvailability(result);
            setMessage(
              result?.available
                ? "Pillar of Hope domain name is available. Create the normal GSN community first if it is not already under this owner."
                : availabilityReasonText(result?.reason)
            );
          })
          .catch((err: any) => {
            if (!canApply()) return;
            setAvailability(null);
            setMessage(
              err?.message ||
                "GSN could not check the Pillar of Hope domain name right now."
            );
          })
          .finally(() => {
            if (canApply() && busyRef.current === "availability") {
              setBusyState(null);
            }
          });
      }
      return;
    }

    if (restoredDraft?.domainName || restoredDraft?.organizationName) {
      setMessage(
        "Your Community Domain draft was restored after sign-in. GSN will use your local community first, then continue Domain setup."
      );
    }
  }, [demoDraft, restoredDraft, needsLocalCommunityFirst, setBusyState, templates]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= COMMUNITY_DOMAIN_PURCHASE_COMPACT_WIDTH);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setBusyState]);

  useEffect(() => {
    if (!isSignedIn) {
      setLocalCommunityAnchor({
        checked: true,
        loading: false,
        count: 0,
        firstName: "",
        error: "",
      });
      return;
    }

    let cancelled = false;
    setLocalCommunityAnchor((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    void listMyClans({ timeoutMs: 9000 })
      .then((payload) => {
        if (cancelled || !mountedRef.current) return;
        const communities = rowsOf(payload);
        setLocalCommunityAnchor({
          checked: true,
          loading: false,
          count: communities.length,
          firstName: readableCommunityName(communities[0]),
          error: "",
        });
      })
      .catch((err: any) => {
        if (cancelled || !mountedRef.current) return;
        setLocalCommunityAnchor({
          checked: true,
          loading: false,
          count: 0,
          firstName: "",
          error:
            err?.message ||
            "GSN could not check whether this owner already has a local community.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  useEffect(() => {
    const requestId = templateLoadSequence.current + 1;
    templateLoadSequence.current = requestId;
    const canApply = () =>
      mountedRef.current && templateLoadSequence.current === requestId;

    async function loadTemplates() {
      setBusyState("templates");
      try {
        const payload = await listCommunityDomainTemplates();
        if (!canApply()) return;
        const nextTemplates = normalizeTemplateItems(payload);
        setTemplates(nextTemplates);
        setTemplateKey((currentTemplateKey) => {
          const nextTemplateKey = nextTemplates.some(
            (item) => item.template_key === currentTemplateKey
          )
            ? currentTemplateKey
            : nextTemplates.some(
                (item) => item.template_key === DEFAULT_COMMUNITY_DOMAIN_TEMPLATE_KEY
              )
            ? DEFAULT_COMMUNITY_DOMAIN_TEMPLATE_KEY
            : nextTemplates[0]?.template_key || DEFAULT_COMMUNITY_DOMAIN_TEMPLATE_KEY;
          if (nextTemplateKey !== currentTemplateKey) {
            setDomainSetupToggles(
              defaultDomainSetupToggles(templateForKey(nextTemplateKey, nextTemplates))
            );
          }
          return nextTemplateKey;
        });
      } catch {
        if (canApply()) {
          setTemplates(FALLBACK_TEMPLATES);
        }
      } finally {
        if (canApply() && busyRef.current === "templates") setBusyState(null);
      }
    }

    loadTemplates();
  }, [setBusyState]);

  const selectedTemplate = useMemo(
    () => templateForKey(templateKey, templates),
    [templateKey, templates]
  );
  const domainSetupRecommendation = useMemo(
    () => domainSetupRecommendationFor(selectedTemplate),
    [selectedTemplate]
  );
  const selectedCreateEntryProfile = useMemo(
    () => createEntryProfileForTemplate(selectedTemplate),
    [selectedTemplate]
  );
  const enabledSetupLabels = useMemo(
    () => enabledDomainSetupLabels(domainSetupToggles),
    [domainSetupToggles]
  );
  const demoProfile = compactOptional(demoDraft?.publicProfile);

  const availabilityKind: "ready" | "blocked" | "waiting" = availability
    ? availability.available
      ? "ready"
      : "blocked"
    : "waiting";
  const hasCreatedDraft = Boolean(draftResult?.community_domain?.id);
  const draftFormLocked = hasCreatedDraft || busy === "draft";
  const draftActionLabel = draftResult
    ? "Draft request created"
    : busy === "draft"
    ? "Creating draft..."
    : !availability
    ? "Check name first"
    : !availability.available
    ? "Choose another name"
    : needsLocalCommunityFirst
    ? "Create GSN community first"
    : localCommunityAnchor.loading
    ? "Checking local community..."
    : "Create Domain draft";
  const purchaseReviewMode = Boolean(availability);
  const checkedDomainCode = domainDisplayCode(
    availability?.normalized_domain_name || domainName
  );
  const checkedDomainStatus = availability
    ? availability.available
      ? "Available"
      : "Unavailable"
    : busy === "templates"
    ? "Loading templates"
    : "Not checked";
  const locationLabel = [compactOptional(country), compactOptional(stateName)]
    .filter(Boolean)
    .join(" / ");

  function saveDraftAndOpenLocalCommunityPath() {
    const requestedOrganizationName = organizationName.trim();
    const requestedPublicProfile =
      compactOptional(demoDraft?.publicProfile) ||
      `Local GSN community for ${requestedOrganizationName || "this organization"}.`;
    const createEntryGovernanceToggles = createEntryGovernanceTogglesFromDomainSetup(
      selectedCreateEntryProfile,
      domainSetupToggles
    );
    savePurchaseDraftSnapshot({
      organizationName,
      domainName,
      country,
      stateName,
      templateKey,
      publicProfile: demoDraft?.publicProfile,
      domainSetupToggles,
    });

    if (isSignedIn) {
      navigate("/app/clans", {
        state: {
          create_community: {
            name: requestedOrganizationName,
            description: requestedPublicProfile,
            community_type: selectedCreateEntryProfile.communityType,
            governance_weight: selectedCreateEntryProfile.governanceWeight,
            governance_toggles: createEntryGovernanceToggles,
            follow_up_community_domain: true,
            follow_up_path: "/community-domain/purchase",
          },
          source: "community-domain-local-anchor",
        },
      });
      return;
    }

    const params = new URLSearchParams();
    if (requestedOrganizationName) params.set("clan_name", requestedOrganizationName);
    if (requestedPublicProfile) params.set("clan_description", requestedPublicProfile);
    params.set("community_type", selectedCreateEntryProfile.communityType);
    params.set("governance_weight", selectedCreateEntryProfile.governanceWeight);
    params.set("source", "community-domain-local-anchor");
    navigate(`/create?${params.toString()}`, {
      state: {
        create_entry: {
          clan_name: requestedOrganizationName,
          clan_description: requestedPublicProfile,
          community_type: selectedCreateEntryProfile.communityType,
          governance_weight: selectedCreateEntryProfile.governanceWeight,
          governance_toggles: createEntryGovernanceToggles,
        },
        source: "community-domain-local-anchor",
      },
    });
  }

  function handleDomainNameChange(nextDomainName: string) {
    availabilityCheckSequence.current += 1;
    setDomainName(nextDomainName);
    setAvailability(null);
    setDraftResult(null);
    setQuoteResult(null);
    if (busyRef.current === "availability") setBusyState(null);
  }

  function handleTemplateKeyChange(nextTemplateKey: string) {
    const nextTemplate = templateForKey(nextTemplateKey, templates);
    setTemplateKey(nextTemplate.template_key);
    setDomainSetupToggles(defaultDomainSetupToggles(nextTemplate));
    setDraftResult(null);
    setQuoteResult(null);
  }

  function handleDomainSetupToggleChange(key: DomainSetupToggleKey, value: boolean) {
    setDomainSetupToggles((current) => ({ ...current, [key]: value }));
    setDraftResult(null);
    setQuoteResult(null);
  }
  function handleCheckAnotherName() {
    availabilityCheckSequence.current += 1;
    setAvailability(null);
    setDraftResult(null);
    setQuoteResult(null);
    setMessage("Update the requested name and check availability again.");
    if (busyRef.current === "availability") setBusyState(null);
  }

  function handleExistingDomainNameChange(nextDomainName: string) {
    domainLookupSequence.current += 1;
    setExistingDomainName(nextDomainName);
    setDomainLookup(null);
    if (busyRef.current === "lookup") setBusyState(null);
  }

  async function handleCheckAvailability(event: React.FormEvent) {
    event.preventDefault();
    const requestId = availabilityCheckSequence.current + 1;
    availabilityCheckSequence.current = requestId;
    setMessage("");
    setDraftResult(null);
    setQuoteResult(null);

    const requestedName = domainName.trim();
    const canApply = () =>
      mountedRef.current &&
      availabilityCheckSequence.current === requestId &&
      domainName.trim() === requestedName;

    if (requestedName.length < 2) {
      setAvailability(null);
      setMessage("Enter the domain name or code you want GSN to reserve for this institution.");
      return;
    }

    setBusyState("availability");
    try {
      const result = await checkCommunityDomainAvailability(requestedName);
      if (!canApply()) return;
      setAvailability(result);
      setMessage(
        result?.available
          ? "Name available. Create the normal GSN community first, then continue the Community Domain draft."
          : availabilityReasonText(result?.reason)
      );
    } catch (err: any) {
      if (canApply()) {
        setAvailability(null);
        setMessage(err?.message || "GSN could not check that domain name right now.");
      }
    } finally {
      if (canApply() && busyRef.current === "availability") setBusyState(null);
    }
  }

  async function handleCreateDraft() {
    const requestId = draftCreateSequence.current + 1;
    draftCreateSequence.current = requestId;
    setMessage("");

    if (!availability) {
      setMessage("Check an available domain name before creating a draft request.");
      return;
    }

    if (!availability.available) {
      setMessage("Choose an available domain name before creating a draft request.");
      return;
    }

    if (!organizationName.trim()) {
      setMessage("Add the organization name before creating a draft request.");
      return;
    }

    const requestedOrganizationName = organizationName.trim();
    const requestedDomainName = availability.normalized_domain_name || domainName.trim();
    const requestedTemplate = selectedTemplate;
    const requestedCountry = country.trim();
    const requestedStateName = stateName.trim();
    const requestedPublicProfile =
      compactOptional(demoDraft?.publicProfile) ||
      `Draft institutional Community Domain request for ${requestedOrganizationName}.`;
    const canApply = () =>
      mountedRef.current && draftCreateSequence.current === requestId;

    if (!isSignedIn) {
      setMessage(
        "Create the normal GSN community first. That gives Pillar of Hope its local community record before Domain setup."
      );
      saveDraftAndOpenLocalCommunityPath();
      return;
    }

    if (localCommunityAnchor.loading) {
      setMessage("GSN is checking whether this owner already has a local community.");
      return;
    }

    if (!hasLocalCommunityAnchor) {
      setMessage(
        "Create the normal GSN community first. The Domain draft comes after the local community exists under this GSN ID."
      );
      saveDraftAndOpenLocalCommunityPath();
      return;
    }

    setBusyState("draft");
    try {
      const draft = await createCommunityDomainDraft({
        domain_name: requestedDomainName,
        display_name: requestedOrganizationName,
        domain_type: requestedTemplate.domain_type,
        template_key: requestedTemplate.template_key,
        country: requestedCountry || null,
        state: requestedStateName || null,
        public_profile: requestedPublicProfile,
        setup_preferences: domainSetupToggles,
      });

      if (!canApply()) return;
      setDraftResult(draft);
      clearPurchaseDraftSnapshot();

      const domainId = draft?.community_domain?.id;
      if (domainId) {
        try {
          const quote = await createCommunityDomainPackageQuote(domainId);
          if (canApply()) setQuoteResult(quote);
        } catch (quoteErr: any) {
          if (canApply()) {
            setQuoteResult({
              error:
                quoteErr?.message || "Package quote could not be generated from this screen.",
            });
          }
        }
      }

      if (!canApply()) return;
      setMessage(
        "Draft request created. It is not active, paid, or verified until payment instruction, confirmation, and admin activation happen."
      );
    } catch (err: any) {
      if (canApply()) {
        setMessage(err?.message || "GSN could not create the draft request.");
      }
    } finally {
      if (canApply() && busyRef.current === "draft") setBusyState(null);
    }
  }

  async function handleFindExistingDomain() {
    const requestId = domainLookupSequence.current + 1;
    domainLookupSequence.current = requestId;
    const requestedName = existingDomainName.trim();
    const canApply = () =>
      mountedRef.current &&
      domainLookupSequence.current === requestId &&
      existingDomainName.trim() === requestedName;

    setDomainLookup(null);
    if (requestedName.length < 2) {
      setMessage("Enter the Community Domain code or name your organization gave you.");
      return;
    }

    setBusyState("lookup");
    setMessage("");
    try {
      const payload = await lookupCommunityDomainByName(requestedName);
      if (!canApply()) return;
      const entry = payload?.community_domain || null;
      setDomainLookup(entry);
      setMessage(
        entry?.display_name
          ? `Found ${entry.display_name}. Open it next; if you are not already a member, GSN will let you request access.`
          : "Community Domain found. Open it next; if you are not already a member, GSN will let you request access."
      );
    } catch (err: any) {
      if (canApply()) {
        setDomainLookup(null);
        setMessage(
          err?.message ||
            "GSN could not find that Community Domain code. Check the spelling or ask the organization for its GSN domain code."
        );
      }
    } finally {
      if (canApply() && busyRef.current === "lookup") setBusyState(null);
    }
  }

  function openFoundDomain() {
    const path =
      compactOptional(domainLookup?.dashboard_path) ||
      (domainLookup?.id
        ? `/app/community-domain/${encodeURIComponent(String(domainLookup.id))}`
        : "");
    if (!path) {
      setMessage("Find a Community Domain before opening the access path.");
      return;
    }
    if (isSignedIn) {
      navigate(path);
      return;
    }
    navigate(`/login?force=1&next=${encodeURIComponent(path)}`);
  }

  return (
    <main style={pageShell()}>
      <section style={glassCard()}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at top, rgba(201,154,39,0.08) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at bottom right, rgba(110,145,186,0.08) 0%, rgba(110,145,186,0) 32%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 16 }}>
          <header
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "44px minmax(0, 1fr)" : "44px minmax(0, 1fr) 110px",
              gap: 12,
              alignItems: "start",
            }}
          >
            <EntryBackLink to="/" />
            <div style={{ display: "grid", gap: 8, justifyItems: isCompact ? "start" : "center" }}>
              <div style={labelText()}>GSN / Community Domain</div>
              <h1
                style={{
                  margin: 0,
                  color: "#F8FBFF",
                  fontSize: isCompact ? (purchaseReviewMode ? 27 : 31) : 44,
                  lineHeight: 1.03,
                  fontWeight: 950,
                  textAlign: isCompact ? "left" : "center",
                  letterSpacing: 0,
                }}
              >
                Purchase Community Domain
              </h1>
              {!purchaseReviewMode ? (
                <>
                  <p
                    style={{
                      ...helperText(),
                      margin: 0,
                      maxWidth: 760,
                      textAlign: isCompact ? "left" : "center",
                    }}
                  >
                    Check the institutional domain name first. A draft request is not a live
                    domain, not a payment, and not a verified public record.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "repeat(3, minmax(0, 1fr))"
                        : "repeat(4, minmax(0, 1fr))",
                      gap: 10,
                      width: "100%",
                      maxWidth: 900,
                      marginTop: 4,
                    }}
                  >
                    {isCompact
                      ? DOMAIN_PURCHASE_MOBILE_FACTS.map((label) => (
                          <div
                            key={label}
                            style={{
                              minHeight: 42,
                              borderRadius: 14,
                              border: "1px solid rgba(220,231,243,0.16)",
                              background: "rgba(255,255,255,0.075)",
                              display: "grid",
                              placeItems: "center",
                              padding: "8px 6px",
                              color: "rgba(255,255,255,0.88)",
                              fontSize: 12,
                              fontWeight: 900,
                              textAlign: "center",
                              lineHeight: 1.2,
                            }}
                          >
                            {label}
                          </div>
                        ))
                      : DOMAIN_ENGINE_POINTS.map((point) => (
                          <div
                            key={point.label}
                            style={{
                              borderRadius: 16,
                              border: "1px solid rgba(220,231,243,0.16)",
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.095) 0%, rgba(255,255,255,0.045) 100%)",
                              padding: "11px 12px",
                              minHeight: 92,
                              display: "grid",
                              alignContent: "start",
                              gap: 6,
                            }}
                          >
                            <div style={labelText()}>
                              {point.label}
                            </div>
                            <div
                              style={{
                                color: "rgba(255,255,255,0.82)",
                                fontSize: 13,
                                lineHeight: 1.45,
                              }}
                            >
                              {point.text}
                            </div>
                          </div>
                        ))}
                  </div>
                </>
              ) : null}
            </div>
            {isCompact ? null : <div />}
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                isCompact || purchaseReviewMode
                  ? "1fr"
                  : "minmax(0, 1.15fr) minmax(330px, 0.85fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            {!purchaseReviewMode && needsLocalCommunityFirst ? (
              <section style={whiteCard()}>
                <div style={{ display: "grid", gap: 16 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "72px minmax(0, 1fr)",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 22,
                        display: "grid",
                        placeItems: "center",
                        background:
                          "linear-gradient(180deg, rgba(9,31,51,0.08) 0%, rgba(9,31,51,0.035) 100%)",
                        border: "1px solid rgba(9,31,51,0.10)",
                      }}
                    >
                      <GsnRealisticIcon name="community-building" size={58} decorative />
                    </div>
                    <div style={{ display: "grid", gap: 5 }}>
                      <div style={labelText(false)}>Local community first</div>
                      <div style={{ fontSize: 24, lineHeight: 1.08, fontWeight: 950 }}>
                        Create the normal GSN community.
                      </div>
                      <div style={helperText(false)}>
                        Pillar of Hope needs its local community record and GSN number before the Domain layer is filled. After that, Domain setup can protect the wider institutional name and governance.
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    {[
                      "GSN community",
                      "Local ID / number",
                      "Domain filling after",
                    ].map((label) => (
                      <div
                        key={label}
                        style={{
                          minHeight: 42,
                          borderRadius: 14,
                          border: "1px solid rgba(9,31,51,0.10)",
                          background: "rgba(9,31,51,0.04)",
                          display: "grid",
                          placeItems: "center",
                          padding: "8px 6px",
                          color: "#10253B",
                          fontSize: 12,
                          fontWeight: 900,
                          textAlign: "center",
                          lineHeight: 1.2,
                        }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  <EntryActionButton
                    type="button"
                    onClick={saveDraftAndOpenLocalCommunityPath}
                    debugId="community-domain-purchase.open-create-community-first"
                    style={{ width: "100%" }}
                  >
                    Create GSN community first
                  </EntryActionButton>
                </div>
              </section>
            ) : !purchaseReviewMode ? (
            <form onSubmit={handleCheckAvailability} style={whiteCard()}>
              <div style={{ display: "grid", gap: 16 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "72px minmax(0, 1fr)",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 22,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(180deg, rgba(9,31,51,0.08) 0%, rgba(9,31,51,0.035) 100%)",
                      border: "1px solid rgba(9,31,51,0.10)",
                    }}
                  >
                    <GsnRealisticIcon name="public-globe" size={58} decorative />
                  </div>
                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={labelText(false)}>Institutional path</div>
                    <div style={{ fontSize: 24, lineHeight: 1.08, fontWeight: 950 }}>
                      Reserve the name before setup.
                    </div>
                    <div style={helperText(false)}>
                      Use this for schools, unions, churches, markets, and other
                      recognized organizations. The free self-created path remains a
                      Committee/community entry.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <label>
                    <div style={fieldLabel()}>Organization name</div>
                    <input
                      value={organizationName}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      disabled={hasCreatedDraft || busy === "draft"}
                      placeholder="Example: Pillar of Hope"
                      style={inputStyle()}
                    />
                  </label>

                  <label>
                    <div style={fieldLabel()}>Requested domain name</div>
                    <input
                      value={domainName}
                      onChange={(event) => handleDomainNameChange(event.target.value)}
                      disabled={hasCreatedDraft || busy === "draft"}
                      placeholder="pillar-of-hope"
                      style={inputStyle()}
                    />
                  </label>
                </div>

                {isCompact ? (
                  <EntryActionButton
                    type="submit"
                    disabled={busy === "availability" || draftFormLocked}
                    debugId="community-domain-purchase.check-domain"
                    style={{ width: "100%" }}
                  >
                    {hasCreatedDraft
                      ? "Draft created"
                      : busy === "availability"
                      ? "Checking..."
                      : "Check domain name"}
                  </EntryActionButton>
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <label>
                    <div style={fieldLabel()}>Kind of community</div>
                    <select
                      value={templateKey}
                      onChange={(event) => handleTemplateKeyChange(event.target.value)}
                      disabled={hasCreatedDraft || busy === "draft"}
                      style={inputStyle()}
                    >
                      {templates.map((template) => (
                        <option key={template.template_key} value={template.template_key}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <div style={fieldLabel()}>Country</div>
                    <input
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      disabled={hasCreatedDraft || busy === "draft"}
                      placeholder="United Kingdom"
                      style={inputStyle()}
                    />
                  </label>

                  <label>
                    <div style={fieldLabel()}>State / region</div>
                    <input
                      value={stateName}
                      onChange={(event) => setStateName(event.target.value)}
                      disabled={hasCreatedDraft || busy === "draft"}
                      placeholder="Scotland / Aberdeen"
                      style={inputStyle()}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div style={helperText(false)}>
                    {selectedTemplate.summary || "Choose the closest match."} GSN uses this
                    choice to recommend governance and service switches; activation,
                    verification, and billing happen later.
                  </div>
                  {!isCompact ? (
                    <EntryActionButton
                      type="submit"
                      disabled={busy === "availability" || draftFormLocked}
                      debugId="community-domain-purchase.check-domain"
                      style={{ minWidth: 190 }}
                    >
                      {hasCreatedDraft
                        ? "Draft created"
                        : busy === "availability"
                        ? "Checking..."
                        : "Check domain name"}
                    </EntryActionButton>
                  ) : null}
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(9,31,51,0.10)",
                    background:
                      "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(239,246,253,0.94) 100%)",
                    padding: 14,
                    display: "grid",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <div style={labelText(false)}>GSN recommends</div>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: 18,
                          fontWeight: 950,
                          lineHeight: 1.16,
                        }}
                      >
                        {domainSetupRecommendation.governanceLabel}
                      </div>
                      <div style={helperText(false)}>
                        {domainSetupRecommendation.summary}
                      </div>
                    </div>
                    <div
                      style={{
                        ...statusPill("waiting"),
                        justifySelf: isCompact ? "start" : "end",
                      }}
                    >
                      Setup preferences
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    {domainSetupRecommendation.requirements.map((item) => (
                      <div
                        key={item}
                        style={{
                          minHeight: 42,
                          borderRadius: 14,
                          border: "1px solid rgba(17,37,58,0.10)",
                          background: "rgba(255,255,255,0.78)",
                          color: "#10253B",
                          fontSize: 12.5,
                          fontWeight: 850,
                          lineHeight: 1.35,
                          padding: "9px 10px",
                          boxSizing: "border-box",
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                    <div style={fieldLabel()}>Simple setup choices</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {DOMAIN_SETUP_TOGGLE_OPTIONS.map((item) => {
                        const isEnabled = Boolean(domainSetupToggles[item.key]);
                        return (
                          <label
                            key={item.key}
                            style={{
                              minHeight: 72,
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              borderRadius: 14,
                              border: "1px solid rgba(17,37,58,0.10)",
                              background: "rgba(255,255,255,0.82)",
                              color: "#0B1F33",
                              fontSize: 12.5,
                              fontWeight: 900,
                              lineHeight: 1.3,
                              padding: "10px",
                              boxSizing: "border-box",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              disabled={draftFormLocked}
                              onChange={(event) =>
                                handleDomainSetupToggleChange(item.key, event.target.checked)
                              }
                              style={{ width: 18, height: 18, flex: "0 0 auto", marginTop: 2 }}
                            />
                            <span style={{ display: "grid", gap: 4, minWidth: 0, flex: "1 1 auto" }}>
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  minWidth: 0,
                                }}
                              >
                                <span>{item.label}</span>
                                <span
                                  aria-hidden="true"
                                  style={{
                                    ...statusPill(isEnabled ? "ready" : "waiting"),
                                    minHeight: 24,
                                    padding: "3px 8px",
                                    fontSize: 11,
                                    flex: "0 0 auto",
                                  }}
                                >
                                  {isEnabled ? "On" : "Off"}
                                </span>
                              </span>
                              <span
                                style={{
                                  color: "#526B83",
                                  fontSize: 11.5,
                                  fontWeight: 750,
                                  lineHeight: 1.35,
                                }}
                              >
                                {item.summary}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ ...helperText(false), fontSize: 12.5, lineHeight: 1.5 }}>
                      Selected now: {enabledSetupLabels.length ? enabledSetupLabels.join(", ") : "none"}. These are draft setup preferences; payment, verification, and service activation still happen later.
                    </div>
                  </div>
                </div>
                {demoProfile ? (
                  <div
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(9,31,51,0.10)",
                      background:
                        "linear-gradient(180deg, rgba(236,251,244,0.92) 0%, rgba(247,250,255,0.96) 100%)",
                      padding: 14,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={fieldLabel()}>Pillar of Hope profile</div>
                    <div style={helperText(false)}>{demoProfile}</div>
                  </div>
                ) : null}
              </div>
            </form>
            ) : null}

            <aside
              style={{
                display: purchaseReviewMode ? "grid" : "none",
                gap: 12,
                minWidth: 0,
              }}
            >
              {purchaseReviewMode ? (
                <>
                  <section style={stepCard()}>
                    <div style={labelText()}>2. Availability</div>
                    <div style={resultBanner(availabilityKind)}>
                      <div style={resultMark(availabilityKind)}>
                        {availability?.available ? "OK" : "NO"}
                      </div>
                      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                        <div
                          style={{
                            color: availability?.available ? "#4ADE80" : "#FCA5A5",
                            fontSize: 18,
                            fontWeight: 950,
                            lineHeight: 1.1,
                          }}
                        >
                          {checkedDomainStatus}
                        </div>
                        <div
                          style={{
                            color: "#F8FBFF",
                            fontSize: 15,
                            fontWeight: 850,
                            overflowWrap: "normal",
                            wordBreak: "normal",
                            hyphens: "none",
                          }}
                        >
                          {checkedDomainCode}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section style={stepCard()}>
                    <div style={labelText()}>Domain details</div>
                    <div style={{ display: "grid", gap: 9 }}>
                      <div style={detailRow()}>
                        <span>Domain</span>
                        <strong style={detailValue()}>{checkedDomainCode}</strong>
                      </div>
                      <div style={detailRow()}>
                        <span>Status</span>
                        <strong
                          style={{
                            ...detailValue(),
                            color: availability?.available ? "#4ADE80" : "#FCA5A5",
                          }}
                        >
                          {checkedDomainStatus}
                        </strong>
                      </div>
                      <div style={detailRow()}>
                        <span>Kind</span>
                        <strong style={detailValue()}>{selectedTemplate.label}</strong>
                      </div>
                      <div style={detailRow()}>
                        <span>Recommended setup</span>
                        <strong style={detailValue()}>
                          {selectedCreateEntryProfile.governanceLabel}
                        </strong>
                      </div>
                      <div style={detailRow()}>
                        <span>Choices</span>
                        <strong style={detailValue()}>
                          {enabledSetupLabels.length} selected
                        </strong>
                      </div>
                      <div style={detailRow()}>
                        <span>Location</span>
                        <strong style={detailValue()}>
                          {locationLabel || "Not set"}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section style={stepCard()}>
                    <div style={labelText()}>3. Draft & quote</div>
                    <div
                      style={{
                        ...statusPill(
                          draftResult
                            ? "ready"
                            : availability?.available
                            ? "waiting"
                            : "blocked"
                        ),
                        justifySelf: "start",
                      }}
                    >
                      {draftResult ? "Draft created" : "Waiting for owner"}
                    </div>
                    {draftResult?.community_domain ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={detailRow()}>
                          <span>Draft ID</span>
                          <strong style={detailValue()}>
                            {draftResult.community_domain.id}
                          </strong>
                        </div>
                        <div style={detailRow()}>
                          <span>Status</span>
                          <strong style={detailValue()}>
                            {draftResult.community_domain.status}
                          </strong>
                        </div>
                        <div style={detailRow()}>
                          <span>Verification</span>
                          <strong style={detailValue()}>
                            {draftResult.community_domain.verification_status}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 0 }}>
                        <div style={stepLine()}>
                          <span style={smallLineIcon()}>1</span>
                          <span>Create the normal GSN community first.</span>
                        </div>
                        <div style={stepLine()}>
                          <span style={smallLineIcon()}>2</span>
                          <span>Then continue Domain setup under that same owner.</span>
                        </div>
                        <div style={stepLine()}>
                          <span style={smallLineIcon()}>3</span>
                          <span>Draft is not active, paid, or verified yet.</span>
                        </div>
                      </div>
                    )}
                    {quoteResult ? (
                      <div style={helperText()}>
                        {quoteResult.error ? (
                          <>Package quote: {quoteResult.error}</>
                        ) : (
                          <>
                            Package quote:{" "}
                            <strong>
                              {compactValue(
                                quoteResult?.quote?.status ||
                                  quoteResult?.quote?.quote_status,
                                "generated"
                              )}
                            </strong>
                          </>
                        )}
                      </div>
                    ) : null}
                    {draftResult?.community_domain?.id ? (
                      <EntryActionButton
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          navigate(
                            `/app/community-domain/${encodeURIComponent(
                              String(draftResult.community_domain.id)
                            )}`
                          )
                        }
                        debugId="community-domain-purchase.open-dashboard"
                        style={{ width: "100%" }}
                      >
                        Open domain dashboard
                      </EntryActionButton>
                    ) : null}
                    <EntryActionButton
                      type="button"
                      onClick={handleCreateDraft}
                      disabled={
                        busy === "draft" ||
                        Boolean(draftResult) ||
                        !availability?.available
                      }
                      debugId="community-domain-purchase.create-draft"
                      style={{ width: "100%" }}
                    >
                      {availability?.available ? draftActionLabel : "Choose another name"}
                    </EntryActionButton>
                  </section>

                  <section style={stepCard()}>
                    <div style={labelText()}>4. Payment</div>
                    <div style={{ ...statusPill("waiting"), justifySelf: "start" }}>
                      Not generated
                    </div>
                    <div style={{ display: "grid", gap: 0 }}>
                      <div style={stepLine()}>
                        <span style={smallLineIcon()}>1</span>
                        <span>Payment instructions appear in the draft.</span>
                      </div>
                      <div style={stepLine()}>
                        <span style={smallLineIcon()}>2</span>
                        <span>Confirmation and activation are separate.</span>
                      </div>
                      <div style={stepLine()}>
                        <span style={smallLineIcon()}>3</span>
                        <span>This page does not confirm verification.</span>
                      </div>
                    </div>
                    <EntryActionButton
                      type="button"
                      variant="secondary"
                      onClick={handleCheckAnotherName}
                      debugId="community-domain-purchase.check-another-name"
                      style={{ width: "100%" }}
                    >
                      Check another name
                    </EntryActionButton>
                  </section>
                </>
              ) : (
                <>
              <div style={whiteCard()}>
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                  <div style={labelText(false)}>Availability result</div>
                  <div style={statusPill(availabilityKind)}>
                    {availability
                      ? availability.available
                        ? "Available"
                        : "Unavailable"
                      : busy === "templates"
                      ? "Loading templates"
                      : "Not checked"}
                  </div>
                  <div
                    style={{
                      ...helperText(false),
                      minWidth: 0,
                      overflowWrap: "normal",
                      wordBreak: "normal",
                      hyphens: "none",
                    }}
                  >
                    {availability ? (
                      <>
                        Requested name:{" "}
                        <strong>{compactValue(availability.domain_name || domainName)}</strong>
                        <br />
                        Domain code:{" "}
                        <strong>
                          {compactValue(availability.normalized_domain_name, "Not returned")}
                        </strong>
                        {availability.reason ? (
                          <>
                            <br />
                            Reason: <strong>{availabilityReasonText(availability.reason)}</strong>
                          </>
                        ) : null}
                      </>
                    ) : (
                      "GSN checks the requested domain code, not the display name."
                    )}
                  </div>
                </div>
              </div>

              <div style={whiteCard()}>
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                  <div style={labelText(false)}>Draft and quote state</div>
                  <div style={statusPill(draftResult ? "ready" : "waiting")}>
                    {draftResult ? "Draft created" : "Waiting for owner"}
                  </div>
                  <div
                    style={{
                      ...helperText(false),
                      minWidth: 0,
                      overflowWrap: "normal",
                      wordBreak: "normal",
                      hyphens: "none",
                    }}
                  >
                    {draftResult?.community_domain ? (
                      <>
                        Draft ID: <strong>{draftResult.community_domain.id}</strong>
                        <br />
                        Status: <strong>{draftResult.community_domain.status}</strong>
                        <br />
                        Verification:{" "}
                        <strong>{draftResult.community_domain.verification_status}</strong>
                      </>
                    ) : (
                      "Signed-in owners create or choose the normal GSN community first. The Domain draft then follows that local community anchor."
                    )}
                  </div>
                  {quoteResult ? (
                    <div
                      style={{
                        ...helperText(false),
                        minWidth: 0,
                        overflowWrap: "normal",
                        wordBreak: "normal",
                        hyphens: "none",
                      }}
                    >
                      {quoteResult.error ? (
                        <>Package quote: {quoteResult.error}</>
                      ) : (
                        <>
                          Package quote:{" "}
                          <strong>
                            {compactValue(
                              quoteResult?.quote?.status || quoteResult?.quote?.quote_status,
                              "generated"
                            )}
                          </strong>
                        </>
                      )}
                    </div>
                  ) : null}
                  {draftResult?.community_domain?.id ? (
                    <EntryActionButton
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/app/community-domain/${encodeURIComponent(
                            String(draftResult.community_domain.id)
                          )}`
                        )
                      }
                      debugId="community-domain-purchase.open-dashboard"
                      style={{
                        width: "100%",
                        color: "#10253B",
                        border: "1px solid rgba(16,37,59,0.14)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,246,253,0.98) 100%)",
                        boxShadow:
                          "0 14px 28px rgba(7,20,36,0.07), inset 0 1px 0 rgba(255,255,255,0.86)",
                      }}
                    >
                      Open domain dashboard
                    </EntryActionButton>
                  ) : null}
                  {!needsLocalCommunityFirst ? (
                    <EntryActionButton
                      type="button"
                      variant="secondary"
                      onClick={handleCreateDraft}
                      disabled={busy === "draft" || Boolean(draftResult)}
                      debugId="community-domain-purchase.create-draft"
                      style={{
                        width: "100%",
                        color: "#10253B",
                        border: "1px solid rgba(16,37,59,0.14)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,246,253,0.98) 100%)",
                        boxShadow:
                          "0 14px 28px rgba(7,20,36,0.07), inset 0 1px 0 rgba(255,255,255,0.86)",
                      }}
                    >
                      {draftActionLabel}
                    </EntryActionButton>
                  ) : null}
                </div>
              </div>

              <div style={whiteCard()}>
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                  <div style={labelText(false)}>Payment instruction</div>
                  <div style={{ ...statusPill("waiting"), justifySelf: "start" }}>
                    Not generated here
                  </div>
                  <div
                    style={{
                      ...helperText(false),
                      minWidth: 0,
                      overflowWrap: "normal",
                      wordBreak: "normal",
                      hyphens: "none",
                    }}
                  >
                    Payment instructions, confirmation, and activation are separate.
                    This page will not claim the institution is active or verified.
                  </div>
                </div>
              </div>
                </>
              )}
            </aside>
          </div>

          {message ? (
            <div
              role="status"
              style={{
                ...darkPanel(),
                color: "#F8FBFF",
                borderColor: availability?.available
                  ? "rgba(243,208,106,0.28)"
                  : "rgba(220,231,243,0.18)",
              }}
            >
              {message}
            </div>
          ) : null}

          {(
            <details style={darkPanel()}>
              <StableDisclosureSummary
                debugId="community-domain-purchase.other-paths"
                style={{
                  cursor: "pointer",
                  color: "#F8FBFF",
                  fontWeight: 950,
                  fontSize: 15,
                }}
              >
                Other paths
              </StableDisclosureSummary>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(220,231,243,0.14)",
                  }}
                >
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={labelText()}>Committee path</div>
                    <div style={{ fontSize: 21, fontWeight: 950, lineHeight: 1.12 }}>
                      Create a free Committee
                    </div>
                    <div style={helperText()}>
                      Use this for a lightweight group created by members. It stays separate
                      from paid institutional Community Domains.
                    </div>
                    <EntryActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => navigate("/create")}
                      debugId="community-domain-purchase.open-create-community"
                      style={{ width: "100%" }}
                    >
                      Create free Committee
                    </EntryActionButton>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    paddingTop: 14,
                    borderTop: "1px solid rgba(220,231,243,0.14)",
                  }}
                >
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={labelText()}>Existing domain</div>
                    <div style={{ fontSize: 21, fontWeight: 950, lineHeight: 1.12 }}>
                      Find an institution domain
                    </div>
                    <div style={helperText()}>
                      Enter the domain code your organization gave you, or open the
                      Community Domains already linked to your account.
                    </div>
                    <label>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.88)",
                          fontSize: 13,
                          fontWeight: 900,
                          marginBottom: 6,
                        }}
                      >
                        Existing domain code
                      </div>
                      <input
                        value={existingDomainName}
                        onChange={(event) => handleExistingDomainNameChange(event.target.value)}
                        placeholder="pillar-of-hope"
                        style={inputStyle()}
                      />
                    </label>
                    {domainLookup ? (
                      <div
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(220,231,243,0.18)",
                          background: "rgba(255,255,255,0.08)",
                          padding: 12,
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div style={{ color: "#F8FBFF", fontWeight: 950 }}>
                          {compactValue(domainLookup.display_name, "Community Domain")}
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Code: <strong>{compactValue(domainLookup.domain_name)}</strong>
                          <br />
                          Status:{" "}
                          <strong>{compactValue(domainLookup.status, "not recorded")}</strong>
                          {" / "}
                          Verification:{" "}
                          <strong>
                            {compactValue(domainLookup.verification_status, "not recorded")}
                          </strong>
                        </div>
                      </div>
                    ) : null}
                    <EntryActionButton
                      type="button"
                      variant="secondary"
                      onClick={handleFindExistingDomain}
                      disabled={busy === "lookup"}
                      debugId="community-domain-purchase.lookup-existing-domain"
                      style={{ width: "100%" }}
                    >
                      {busy === "lookup" ? "Finding domain..." : "Find domain"}
                    </EntryActionButton>
                    {domainLookup ? (
                      <EntryActionButton
                        type="button"
                        variant="secondary"
                        onClick={openFoundDomain}
                        debugId="community-domain-purchase.open-found-domain"
                        style={{ width: "100%" }}
                      >
                        {isSignedIn ? "Open or request access" : "Sign in to request access"}
                      </EntryActionButton>
                    ) : null}
                    <EntryActionButton
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        isSignedIn
                          ? navigate("/app/community-domain")
                          : navigate(
                              `/login?force=1&next=${encodeURIComponent(
                                "/app/community-domain"
                              )}`
                            )
                      }
                      debugId="community-domain-purchase.open-my-domains"
                      style={{ width: "100%" }}
                    >
                      {isSignedIn ? "Open my Community Domains" : "Sign in to open domains"}
                    </EntryActionButton>
                  </div>
                </div>
              </div>
            </details>
          )}

          <details style={darkPanel()}>
            <StableDisclosureSummary
              debugId="community-domain-purchase.after-draft"
              style={{
                cursor: "pointer",
                color: "#F8FBFF",
                fontWeight: 950,
                fontSize: 15,
              }}
            >
              What happens after the draft?
            </StableDisclosureSummary>
            <div style={{ ...helperText(), marginTop: 10 }}>
              The owner first creates the normal GSN community, then reviews the draft, requests a package quote, receives payment
              instructions only when that rail exists, and waits for payment confirmation
              plus admin activation. Public verification language should only appear after
              the live domain status confirms it.
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
