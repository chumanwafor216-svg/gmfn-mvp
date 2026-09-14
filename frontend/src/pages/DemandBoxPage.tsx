import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  StableDisclosureSummary,
  SubtleButton,
} from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import {
  createMarketplaceRequest,
  getCurrentClan,
  getMe,
  getSelectedClanId,
  listMyClans,
  listMyCommunityDomains,
  listMarketplaceRequests,
  listClanMembers,
  selectClan,
  setSelectedClanId as persistSelectedClanId,
  safeCopy,
  updateMarketplaceRequestStatus,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildGsnSnapshotPaper } from "../lib/gsnSnapshotPaper";
import {
  communityDomainFeatureIsOff,
  communityDomainFeatureModeFromPayload,
  communityDomainFeatureOffMessage,
} from "../lib/communityDomainFeaturePolicy";
import { revealElementWithoutJump } from "../lib/mobileRevealStability";
import { buildPhoneCallUrl, buildWhatsAppChatUrl } from "../lib/whatsappLinks";
import { getContextualEvidencePosture } from "../lib/trustBandLanguage";

const CommunityNoticeModal = lazy(
  () => import("../components/CommunityNoticeModal")
);

type DemandRow = {
  id?: number;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  urgency?: string | null;
  area?: string | null;
  whatsapp_number?: string | null;
  payment_mode?: string | null;
  allow_trust_credit?: boolean;
  status?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  requester_name?: string | null;
  requester_nickname?: string | null;
  requester_gmfn_id?: string | null;
  requester_email?: string | null;
  requester_trust_score?: number | null;
  requester_trust_band?: string | null;
  is_mine?: boolean;
  mine?: boolean;
  source?: string | null;
  source_label?: string | null;
  need_type?: string | null;
  queue_keys?: string[] | null;
  mentioned_handles?: string[] | null;
  mentioned_member_count?: number | null;
  is_tagged_for_me?: boolean | null;
  routing_status?: string | null;
  routing_hint?: string | null;
};

type NoticeTone = "success" | "error";
type DemandPaperScope = "owner" | "community";
type DemandNoticeExpiryPolicy = "standard" | "urgent" | "event" | "pinned";
type DemandQueueLane = "open" | "tagged" | "for_me" | "mine" | "ask_community" | "urgent" | "categories";
type DemandTagMember = { userId: number; gsnId: string; label: string; role: string };

const DEMAND_BOX_PAGE_SIZE = 200;

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.24)",
    padding: 20,
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.14), 0 10px 22px rgba(8,40,72,0.08), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(20,52,83,0.20)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(20,52,83,0.18)",
  };
}

function detailsShell(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(13,95,168,0.12)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)",
    boxShadow:
      "0 14px 28px rgba(7,24,39,0.06), inset 0 1px 0 rgba(255,255,255,0.88)",
    overflow: "hidden",
  };
}

function detailsSummary(): React.CSSProperties {
  return {
    padding: "16px 18px",
    fontWeight: 900,
    color: "#0B1F33",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(13,95,168,0.11)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #FCFEFF 100%)",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.92), 0 8px 18px rgba(15,23,42,0.025)",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 82,
    resize: "vertical" as const,
    lineHeight: 1.6,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4E6680",
    fontWeight: 900,
    letterSpacing: 0.55,
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
      ? "linear-gradient(180deg, rgba(11,99,209,0.14) 0%, rgba(11,99,209,0.08) 100%)"
      : "linear-gradient(180deg, rgba(100,116,139,0.12) 0%, rgba(100,116,139,0.08) 100%)",
    color: primary ? "#0B63D1" : "#31506D",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(148,163,184,0.14)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
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

function demandBrandShell(): React.CSSProperties {
  return {
    borderRadius: 26,
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "radial-gradient(circle at top left, rgba(11,99,209,0.35) 0%, rgba(11,99,209,0.00) 30%), linear-gradient(180deg, #08111F 0%, #0B1F33 54%, #102A43 100%)",
    padding: 20,
    boxShadow:
      "0 22px 48px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.10)",
    overflow: "hidden",
  };
}

function communityChoiceStyle(active: boolean): React.CSSProperties {
  return {
    height: 58,
    minHeight: 58,
    maxHeight: 58,
    justifyContent: "space-between",
    textAlign: "left",
    borderRadius: 16,
    padding: "0 13px",
    lineHeight: 1.24,
    border: active ? "1px solid rgba(11,99,209,0.24)" : undefined,
    background: active
      ? "linear-gradient(180deg, #FFFFFF 0%, #E7EFFA 100%)"
      : undefined,
    color: active ? "#123055" : undefined,
    fontWeight: active ? 900 : undefined,
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function demandActionRowStyle(
  isCompact: boolean,
  height = 54,
  minColumn = 156,
  marginTop = 0
): React.CSSProperties {
  return {
    marginTop,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "1fr"
      : `repeat(auto-fit, minmax(${minColumn}px, 1fr))`,
    gridAutoRows: `${height}px`,
    gap: 10,
    alignItems: "stretch",
    justifyContent: "stretch",
    minHeight: height,
    overflowAnchor: "none",
    transition: "none",
  };
}

function demandActionStyle(height = 54): React.CSSProperties {
  return {
    width: "100%",
    height,
    minHeight: height,
    maxHeight: height,
    padding: "0 13px",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    lineHeight: 1.16,
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    textOverflow: "ellipsis",
    flexShrink: 0,
    overflowAnchor: "none",
    transition: "none",
  };
}

function demandIconText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 22
): React.ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        maxWidth: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <GsnLegacyIcon
        name={name}
        size={size}
        style={{ flex: "0 0 auto" }}
      />
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </span>
  );
}

function demandEmptyStateIcon(name: GsnIconName): React.ReactElement {
  return (
    <GsnLegacyIcon
      name={name}
      size={42}
      style={{
        flex: "0 0 auto",
        filter: "drop-shadow(0 12px 18px rgba(8,32,54,0.12))",
      }}
    />
  );
}

function demandHeroActionRowStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 14 : 18,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "minmax(0, 1fr) minmax(0, 1fr)"
      : "repeat(3, minmax(0, 1fr))",
    gridAutoRows: isCompact ? "52px" : "54px",
    gap: 10,
    alignItems: "stretch",
    overflowAnchor: "none",
    transition: "none",
  };
}

function demandHeroPrimaryActionStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...demandActionStyle(isCompact ? 52 : 54),
    gridColumn: isCompact ? "1 / -1" : undefined,
  };
}

function recordCard(): React.CSSProperties {
  return {
    ...innerCard("#FCFEFF"),
    border: "1px solid rgba(11,99,209,0.11)",
    boxShadow:
      "0 14px 28px rgba(15,23,42,0.055), inset 0 1px 0 rgba(255,255,255,0.84)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#466078",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function urgencyLabel(value?: string | null): string {
  const v = safeStr(value).toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

function isUrgentDemand(row: DemandRow): boolean {
  if (queueKeysOf(row).includes("urgent")) return true;
  if (safeStr(row?.urgency).toLowerCase() === "high") return true;

  const expiresAt = safeStr(row?.expires_at);
  if (!expiresAt) return false;

  const time = new Date(expiresAt).getTime();
  if (!Number.isFinite(time)) return false;

  const hoursLeft = (time - Date.now()) / 3600000;
  return hoursLeft > 0 && hoursLeft <= 24;
}

function categoryLabel(row: DemandRow): string {
  return firstTruthy(row?.need_type, row?.category, row?.area, "General");
}

function queueKeysOf(row: DemandRow): string[] {
  return Array.isArray(row?.queue_keys)
    ? row.queue_keys.map((key) => safeStr(key).toLowerCase()).filter(Boolean)
    : [];
}

function mentionedHandlesOf(row: DemandRow): string[] {
  return Array.isArray(row?.mentioned_handles)
    ? row.mentioned_handles.map(safeStr).filter(Boolean).slice(0, 3)
    : [];
}

function isTaggedForMe(row: DemandRow): boolean {
  return row?.is_tagged_for_me === true || queueKeysOf(row).includes("tagged_for_me");
}

function routingLabel(row: DemandRow): string {
  const status = safeStr(row?.routing_status).toLowerCase();
  if (isTaggedForMe(row)) return "Tagged for you";
  if (status === "member_tagged") return "Tagged member";
  if (mentionedHandlesOf(row).length > 0) return "Handle typed";
  if (isAskCommunityDemand(row)) return "Ask lane";
  return "Community queue";
}

function isAskCommunityDemand(row: DemandRow): boolean {
  const queueKeys = queueKeysOf(row);
  const source = safeStr(row?.source).toLowerCase();
  const category = safeStr(row?.category).toLowerCase();
  const description = safeStr(row?.description).toLowerCase();
  return (
    queueKeys.includes("ask_community") ||
    source === "ask_community" ||
    category === "community ask" ||
    category === "ask community" ||
    description.includes("community ask posted through demandbox")
  );
}

function uniqueDemandRows(rows: DemandRow[]): DemandRow[] {
  const seen = new Set<string>();
  const out: DemandRow[] = [];

  for (const row of rows) {
    const key =
      safeStr(row?.id) ||
      [row?.title, row?.created_at, row?.requester_gmfn_id]
        .map(safeStr)
        .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}
function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function communityName(currentClan: any, selectedClanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
  );
}

function cciLabel(me: any): string {
  const band = firstTruthy(
    me?.cci_class,
    me?.cci_band,
    me?.cross_community_integrity_class,
    me?.cross_community_integrity_band
  );
  if (band) return getContextualEvidencePosture(null, band).shortLabel;

  const score = firstTruthy(me?.cci_score, me?.cross_community_integrity_score);
  return score ? getContextualEvidencePosture(score).shortLabel : "";
}

function requesterTrustPostureLabel(row?: DemandRow | null): string {
  const band = safeStr(row?.requester_trust_band);
  const score =
    row?.requester_trust_score === null || row?.requester_trust_score === undefined
      ? ""
      : safeStr(row?.requester_trust_score);

  if (!band && !score) return "";

  const label = getContextualEvidencePosture(
    score || null,
    band || undefined
  ).shortLabel;

  return label && label !== "Not shown" ? label : "";
}

function normalizeGsnMention(value: string): string {
  const handle = safeStr(value)
    .replace(/^@+/, "")
    .split(/\s+/)[0]
    .replace(/[^A-Za-z0-9_.-]/g, "");

  return handle ? `@${handle}` : "";
}

function normalizeDemandTagMember(raw: any): DemandTagMember | null {
  const userId = positiveNumber(raw?.user_id || raw?.userId || raw?.id);
  const gsnId = safeStr(raw?.gmfn_id || raw?.gsn_id || raw?.gmfnId || raw?.gsnId).toUpperCase();
  if (!gsnId) return null;

  return {
    userId,
    gsnId,
    label: firstTruthy(raw?.display_name, raw?.name, gsnId),
    role: firstTruthy(raw?.role, raw?.membership_role),
  };
}
function demandTaggedHandleLine(targetHandle: string): string {
  const mention = normalizeGsnMention(targetHandle);
  return mention ? `Tagged GSN handle: ${mention}.` : "";
}

function buildDemandDescription(
  description: string,
  responseEvidence: string,
  targetHandle: string
): string | undefined {
  const body = safeStr(description);
  const evidence = safeStr(responseEvidence);
  const taggedHandle = demandTaggedHandleLine(targetHandle);
  const parts = body ? [body] : [];

  if (taggedHandle) {
    parts.push(taggedHandle);
  }

  if (evidence) {
    parts.push(`Response evidence expected: ${evidence}.`);
  }

  return parts.join("\n\n") || undefined;
}

function demandTitleFromAskCommunity(body: string): string {
  const text = safeStr(body);
  if (text.length <= 170) return text;
  return `${text.slice(0, 167).trim()}...`;
}

function demandExpiryHoursFromAskCommunity(options?: {
  expiry_policy?: DemandNoticeExpiryPolicy;
  expires_at?: string;
}): number {
  const explicitExpiry = safeStr(options?.expires_at);
  if (explicitExpiry) {
    const expiresAt = new Date(explicitExpiry).getTime();
    const now = Date.now();
    if (Number.isFinite(expiresAt) && expiresAt > now) {
      return Math.min(168, Math.max(1, Math.ceil((expiresAt - now) / 3600000)));
    }
  }

  if (options?.expiry_policy === "urgent") return 48;
  if (options?.expiry_policy === "pinned") return 168;
  return 72;
}

function buildAskCommunityDemandDescription(
  body: string,
  targetHandle: string,
  options?: {
    full_body?: string | null;
    attachment_url?: string | null;
    attachment_label?: string | null;
    attachment_kind?: "link" | "video" | "poster" | "document" | null;
  }
): string {
  const parts = [
    "Community Ask posted through DemandBox. Responses should stay in DemandBox or the requester's approved private contact path, not on the Community Bulletin.",
  ];
  const fullBody = safeStr(options?.full_body);
  if (fullBody && fullBody !== safeStr(body)) {
    parts.push(fullBody);
  }

  const taggedHandle = demandTaggedHandleLine(targetHandle);
  if (taggedHandle) {
    parts.push(taggedHandle);
  }

  const attachmentUrl = safeStr(options?.attachment_url);
  if (attachmentUrl) {
    const attachmentLabel = firstTruthy(options?.attachment_label, options?.attachment_kind, "attachment");
    parts.push(`Attachment: ${attachmentLabel} - ${attachmentUrl}`);
  }

  return parts.join("\n\n");
}

function demandContactMessage(row: DemandRow, currentCommunityName: string): string {
  return [
    `Hello ${requesterName(row)}.`,
    `I saw your GSN DemandBox request: ${firstTruthy(row?.title, "Community demand request")}.`,
    `Community: ${currentCommunityName}.`,
  ].join("\n");
}

function requesterName(row: DemandRow): string {
  return (
    firstTruthy(
      row?.requester_name,
      row?.requester_nickname,
      row?.requester_email,
      row?.requester_gmfn_id
    ) || "Member"
  );
}

function isMineRow(row: DemandRow, me: any): boolean {
  if (row?.is_mine === true || row?.mine === true) return true;

  const myGmfnId = safeStr(me?.gmfn_id).toUpperCase();
  const rowGmfnId = safeStr(row?.requester_gmfn_id).toUpperCase();

  if (myGmfnId && rowGmfnId && myGmfnId === rowGmfnId) return true;

  const myEmail = safeStr(me?.email).toLowerCase();
  const rowEmail = safeStr(row?.requester_email).toLowerCase();

  if (myEmail && rowEmail && myEmail === rowEmail) return true;

  return false;
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { hash?: string } = {}
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId, ...extra }).to);
}

function appendRouteQueryParam(to: string, key: string, value: string): string {
  const [baseAndQuery, hash = ""] = to.split("#");
  const separator = baseAndQuery.includes("?") ? "&" : "?";
  const query = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  return `${baseAndQuery}${separator}${query}${hash ? `#${hash}` : ""}`;
}

export default function DemandBoxPage() {
  const location = useLocation();
  const routeSelectedClanId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(
      query.get("clan_id") ||
        query.get("community") ||
        query.get("community_id")
    );
  }, [location.search]);
  const [selectedClanId, setSelectedClanIdState] = useState<number>(() =>
    routeSelectedClanId || Number(getSelectedClanId() || 0)
  );
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "demand-box.nav.dashboard"),
      community: routeTarget("communityHome", selectedClanId, "demand-box.open-community"),
      marketplace: routeTarget("marketplace", selectedClanId, "demand-box.return"),
      askCommunity: appendRouteQueryParam(
        routeTarget("demandBox", selectedClanId, "demand-box.ask-community"),
        "mode",
        "ask_community"
      ),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "demand-box.open-notifications"
      ),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [communityDomainPolicyPayload, setCommunityDomainPolicyPayload] =
    useState<any>(null);
  const [myOpenRows, setMyOpenRows] = useState<DemandRow[]>([]);
  const [visibleRows, setVisibleRows] = useState<DemandRow[]>([]);
  const [visibleRowsRawLoaded, setVisibleRowsRawLoaded] = useState(0);
  const [hasMoreVisibleRows, setHasMoreVisibleRows] = useState(false);
  const [loadingMoreVisibleRows, setLoadingMoreVisibleRows] = useState(false);
  const [tagMembers, setTagMembers] = useState<DemandTagMember[]>([]);
  const [activeQueueLane, setActiveQueueLane] = useState<DemandQueueLane>("open");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [targetHandle, setTargetHandle] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [paymentMode, setPaymentMode] = useState("");
  const [responseEvidence, setResponseEvidence] = useState("");
  const [allowTrustCredit, setAllowTrustCredit] = useState(false);

  const [creating, setCreating] = useState(false);
  const [marketNeedPulseOpen, setMarketNeedPulseOpen] = useState(false);
  const [marketNeedPulsePosting, setMarketNeedPulsePosting] = useState(false);
  const [selectingClanId, setSelectingClanId] = useState<number>(0);
  const [updatingDemandId, setUpdatingDemandId] = useState<number>(0);
  const [createCommunityConfirmed, setCreateCommunityConfirmed] =
    useState(false);
  const demandCreateRevealRef = useRef<number | null>(null);
  const demandMountedRef = useRef(true);
  const demandLoadSeqRef = useRef(0);
  const demandLoadContextRef = useRef("");

  useEffect(() => {
    if (routeSelectedClanId <= 0) return;
    persistSelectedClanId(routeSelectedClanId);
    setSelectedClanIdState(routeSelectedClanId);
  }, [routeSelectedClanId]);

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
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadPage = useCallback(async (clanId = selectedClanId) => {
    const effectiveClanId = Number(clanId || 0);
    const contextKey = `community:${effectiveClanId || "none"}`;
    const loadSeq = demandLoadSeqRef.current + 1;
    demandLoadSeqRef.current = loadSeq;
    demandLoadContextRef.current = contextKey;

    function isCurrentDemandLoad() {
      return (
        demandMountedRef.current &&
        demandLoadSeqRef.current === loadSeq &&
        demandLoadContextRef.current === contextKey
      );
    }

    setLoading(true);
    setCurrentClan(null);
    setCommunityDomainPolicyPayload(null);
    setMyOpenRows([]);
    setVisibleRows([]);
    setVisibleRowsRawLoaded(0);
    setHasMoreVisibleRows(false);
    setLoadingMoreVisibleRows(false);
    setTagMembers([]);

    try {
      const [
        meRes,
        currentClanRes,
        clansRes,
        domainsRes,
        myRes,
        visibleRes,
        visibleProbeRes,
        membersRes,
      ] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMyClans().catch(() => []),
        listMyCommunityDomains().catch(() => null),
        listMarketplaceRequests({
          clan_id: effectiveClanId || undefined,
          mine_only: true,
          status: "open",
          limit: DEMAND_BOX_PAGE_SIZE,
          offset: 0,
        }).catch(() => []),
        listMarketplaceRequests({
          clan_id: effectiveClanId || undefined,
          mine_only: false,
          status: "open",
          limit: DEMAND_BOX_PAGE_SIZE,
          offset: 0,
        }).catch(() => []),
        effectiveClanId
          ? listMarketplaceRequests({
              clan_id: effectiveClanId,
              mine_only: false,
              status: "open",
              limit: 1,
              offset: DEMAND_BOX_PAGE_SIZE,
            }).catch(() => [])
          : Promise.resolve([]),
        effectiveClanId
          ? listClanMembers(effectiveClanId).catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
      ]);

      const communityRows = rowsOf<any>(clansRes);
      const selectedCommunity =
        communityRows.find(
          (row) => Number(row?.id || row?.clan_id || 0) === effectiveClanId
        ) || currentClanRes || null;
      const myRows = rowsOf<DemandRow>(myRes);
      const visibleAll = rowsOf<DemandRow>(visibleRes);
      const visibleProbeRows = rowsOf<DemandRow>(visibleProbeRes);
      const availableTagMembers = rowsOf<any>(membersRes)
        .map(normalizeDemandTagMember)
        .filter(Boolean) as DemandTagMember[];

      const filteredVisible = visibleAll.filter(
        (row) => !isMineRow(row, meRes || null)
      );

      if (!isCurrentDemandLoad()) return;

      setMe(meRes || null);
      setCurrentClan(selectedCommunity);
      setCommunities(communityRows);
      setCommunityDomainPolicyPayload(domainsRes);
      setMyOpenRows(myRows);
      setVisibleRows(filteredVisible);
      setVisibleRowsRawLoaded(visibleAll.length);
      setHasMoreVisibleRows(visibleProbeRows.length > 0);
      setTagMembers(availableTagMembers);
    } finally {
      if (isCurrentDemandLoad()) setLoading(false);
    }
  }, [selectedClanId]);

  useEffect(() => {
    void loadPage(selectedClanId);
  }, [loadPage, selectedClanId]);

  const showNotice = useCallback((tone: NoticeTone, text: string) => {
    setNotice({ tone, text });
  }, []);

  const loadOlderVisibleDemandRows = useCallback(async () => {
    const effectiveClanId = Number(selectedClanId || 0);
    if (!effectiveClanId || loadingMoreVisibleRows || !hasMoreVisibleRows) return;

    setLoadingMoreVisibleRows(true);
    try {
      const nextRes = await listMarketplaceRequests({
        clan_id: effectiveClanId,
        mine_only: false,
        status: "open",
        limit: DEMAND_BOX_PAGE_SIZE,
        offset: visibleRowsRawLoaded,
      });
      const nextRawRows = rowsOf<DemandRow>(nextRes);
      const nextVisibleRows = nextRawRows.filter((row) => !isMineRow(row, me));
      const nextOffset = visibleRowsRawLoaded + nextRawRows.length;
      const nextProbeRows =
        nextRawRows.length === DEMAND_BOX_PAGE_SIZE
          ? rowsOf<DemandRow>(
              await listMarketplaceRequests({
                clan_id: effectiveClanId,
                mine_only: false,
                status: "open",
                limit: 1,
                offset: nextOffset,
              })
            )
          : [];

      setVisibleRows((currentRows) =>
        uniqueDemandRows([...currentRows, ...nextVisibleRows])
      );
      setVisibleRowsRawLoaded(nextOffset);
      setHasMoreVisibleRows(nextProbeRows.length > 0);

      if (nextRawRows.length === 0) {
        showNotice("success", "No older open requests found for this community.");
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Older DemandBox requests could not be loaded."
      );
    } finally {
      setLoadingMoreVisibleRows(false);
    }
  }, [
    hasMoreVisibleRows,
    loadingMoreVisibleRows,
    me,
    showNotice,
    selectedClanId,
    visibleRowsRawLoaded,
  ]);

  function openDemandWhatsAppChat(row: DemandRow) {
    const chatUrl = buildWhatsAppChatUrl(
      row?.whatsapp_number,
      demandContactMessage(row, currentCommunityName)
    );

    if (!chatUrl || typeof window === "undefined") {
      showNotice(
        "error",
        "This request does not have a ready WhatsApp contact path yet."
      );
      return;
    }

    window.open(chatUrl, "_blank", "noopener,noreferrer");
    showNotice("success", "WhatsApp chat opened for this DemandBox request.");
  }

  function openDemandWhatsAppCall(row: DemandRow) {
    const callUrl = buildPhoneCallUrl(row?.whatsapp_number);

    if (!callUrl || typeof window === "undefined") {
      showNotice(
        "error",
        "This request does not have a ready call contact path yet."
      );
      return;
    }

    window.location.href = callUrl;
    showNotice("success", "Call path opened for this DemandBox request.");
  }

  function buildDemandRequestPaper(
    row: DemandRow,
    scope: DemandPaperScope
  ): string {
    const rowId = Number(row?.id || 0);
    const requester =
      scope === "owner" ? memberName : requesterName(row);
    const requesterGsnId =
      scope === "owner"
        ? safeStr(me?.gmfn_id)
        : safeStr(row?.requester_gmfn_id);
    const details = [
      `Request title: ${firstTruthy(row?.title, "Community demand request")}`,
      row?.description ? `Request detail: ${safeStr(row.description)}` : "",
      row?.category ? `Category: ${safeStr(row.category)}` : "",
      `Urgency: ${urgencyLabel(row?.urgency)}`,
      row?.area ? `Area: ${safeStr(row.area)}` : "",
      row?.payment_mode ? `Terms preference: ${safeStr(row.payment_mode)}` : "",
      row?.allow_trust_credit
        ? "Trust-credit openness is a request preference, not approval to release goods, credit, or money."
        : "",
      row?.whatsapp_number
        ? "Public contact path: WhatsApp contact is available from this DemandBox request."
        : "",
      requesterTrustPostureLabel(row)
        ? `Visible trust posture: ${requesterTrustPostureLabel(row)}`
        : "",
      row?.status ? `Request status: ${safeStr(row.status)}` : "",
      row?.created_at ? `Created: ${safeDateTime(row.created_at)}` : "",
      row?.expires_at ? `Expires: ${safeDateTime(row.expires_at)}` : "",
      "Reader boundary: confirm identity evidence, TrustSlip context, price, availability, and fit before acting.",
      "Do not treat this request paper as release authority for goods, money, credit, or service.",
    ];

    return buildGsnSnapshotPaper({
      title: "GSN Demand Request Paper",
      purpose:
        "Keep a community demand request with its visible requester and community context.",
      reference: rowId ? `Demand #${rowId}` : requesterGsnId,
      context: [
        { label: "Requester", value: requester },
        { label: "Requester GSN ID", value: requesterGsnId },
        { label: "Community", value: currentCommunityName },
        { label: "Community ID", value: selectedClanId || "" },
        { label: "Page", value: "DemandBox" },
        { label: "Audience", value: scope === "owner" ? "request owner" : "community responder" },
      ],
      bodyLines: details,
      privacyNote:
        "Privacy: only request facts already visible on this DemandBox page are shown.",
      limitationNote:
        "Limitation: request evidence only. Not approval to release goods, credit, money, or service, not a bank guarantee, and not proof that the request was fulfilled.",
    });
  }

  async function handleCopyDemandPaper(
    row: DemandRow,
    scope: DemandPaperScope
  ) {
    const copied = await safeCopy(buildDemandRequestPaper(row, scope));
    showNotice(
      copied ? "success" : "error",
      copied
        ? "GSN demand request paper copied."
        : "Clipboard copy was blocked. Use the request details shown here."
    );
  }

  function demandPaperAction(
    row: DemandRow,
    scope: DemandPaperScope,
    debugId: string
  ): React.ReactElement {
    return (
      <SubtleButton
        onClick={() => void handleCopyDemandPaper(row, scope)}
        debugId={debugId}
        style={demandActionStyle(54)}
      >
        {demandIconText("copy", "Copy paper", 20)}
      </SubtleButton>
    );
  }

  const revealDemandCreate = useCallback((attempt = 0) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    if (demandCreateRevealRef.current !== null) {
      window.cancelAnimationFrame(demandCreateRevealRef.current);
      demandCreateRevealRef.current = null;
    }

    const target = document.getElementById("demand-box-create");
    if (!target) {
      if (attempt >= 6) return;
      demandCreateRevealRef.current = window.requestAnimationFrame(() => {
        revealDemandCreate(attempt + 1);
      });
      return;
    }

    revealElementWithoutJump(target, {
      surface: "demand-box",
      targetId: "demand-box-create",
      reason: "create-reveal",
    });

    demandCreateRevealRef.current = null;
  }, []);

  async function handleChooseDemandCommunity(community: any) {
    const clanId = Number(community?.id || community?.clan_id || 0);
    if (!clanId) {
      showNotice("error", "This community cannot be selected yet.");
      return;
    }

    setSelectingClanId(clanId);

    try {
      await selectClan(clanId);
      setSelectedClanIdState(clanId);
      setCurrentClan(community);
      if (isCreateMode) {
        setCreateCommunityConfirmed(true);
      }
      showNotice(
        "success",
        `${communityName(community, clanId)} selected for this demand.`
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Could not select that community."
      );
    } finally {
      setSelectingClanId(0);
    }
  }

  async function handleCreateDemand() {
    if (!selectedClanId) {
      showNotice("error", "Select a community first before creating a demand.");
      return;
    }

    if (demandBoxFeatureOff) {
      showNotice("error", demandBoxFeatureOffText);
      return;
    }

    if (!safeStr(title)) {
      showNotice("error", "Add what you need first.");
      return;
    }

    setCreating(true);

    try {
      await createMarketplaceRequest({
        title: safeStr(title),
        description: buildDemandDescription(description, responseEvidence, targetHandle),
        category: safeStr(category) || undefined,
        urgency: safeStr(urgency) || undefined,
        area: safeStr(area) || undefined,
        whatsapp_number: safeStr(whatsappNumber) || undefined,
        expires_in_hours: Number(expiresInHours || 0) > 0 ? Number(expiresInHours) : undefined,
        payment_mode: safeStr(paymentMode) || undefined,
        allow_trust_credit: allowTrustCredit,
        clan_id: selectedClanId,
      });

      setTitle("");
      setDescription("");
      setUrgency("normal");
      setArea("");
      setCategory("");
      setTargetHandle("");
      setWhatsappNumber("");
      setExpiresInHours("72");
      setPaymentMode("");
      setResponseEvidence("");
      setAllowTrustCredit(false);

      await loadPage();
      showNotice("success", "Demand posted successfully.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Demand could not be created."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateDemandStatus(
    row: DemandRow,
    status: "fulfilled" | "cancelled"
  ) {
    const demandId = Number(row?.id || 0);
    if (!demandId) {
      showNotice("error", "This demand does not have a usable ID.");
      return;
    }

    setUpdatingDemandId(demandId);

    try {
      await updateMarketplaceRequestStatus(demandId, status);
      await loadPage();
      showNotice(
        "success",
        status === "fulfilled"
          ? "Demand marked as fulfilled."
          : "Demand cancelled."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Demand status could not be updated."
      );
    } finally {
      setUpdatingDemandId(0);
    }
  }

  const currentCommunityName = useMemo(
    () => communityName(currentClan, selectedClanId),
    [currentClan, selectedClanId]
  );
  const demandBoxDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        selectedClanId,
        "demand_box"
      ),
    [communityDomainPolicyPayload, selectedClanId]
  );
  const demandBoxFeatureOff = communityDomainFeatureIsOff(
    demandBoxDomainFeatureMatch
  );
  const demandBoxFeatureOffText = communityDomainFeatureOffMessage(
    "DemandBox",
    demandBoxDomainFeatureMatch?.domainName || currentCommunityName
  );

  const openMarketNeedPulse = useCallback(() => {
    if (!selectedClanId) {
      showNotice("error", "Select a community first before asking the community.");
      return;
    }

    if (demandBoxFeatureOff) {
      showNotice("error", demandBoxFeatureOffText);
      return;
    }

    setMarketNeedPulseOpen(true);
  }, [demandBoxFeatureOff, demandBoxFeatureOffText, selectedClanId, showNotice]);

  async function submitMarketNeedPulse(
    body: string,
    options?: {
      expiry_policy?: DemandNoticeExpiryPolicy;
      expires_at?: string;
      public_qr_enabled?: boolean;
      availability_enabled?: boolean;
      full_body?: string | null;
      attachment_url?: string | null;
      attachment_label?: string | null;
      attachment_kind?: "link" | "video" | "poster" | "document" | null;
      notice_mode?: "notice" | "market_need_pulse";
    }
  ) {
    if (!selectedClanId) {
      showNotice("error", "Select a community first before asking the community.");
      return;
    }

    if (demandBoxFeatureOff) {
      showNotice("error", demandBoxFeatureOffText);
      return;
    }

    const questionTitle = demandTitleFromAskCommunity(body);
    if (!questionTitle) {
      showNotice("error", "Add the community question first.");
      return;
    }

    setMarketNeedPulsePosting(true);
    try {
      await createMarketplaceRequest({
        clan_id: selectedClanId,
        title: questionTitle,
        description: buildAskCommunityDemandDescription(body, targetHandle, options),
        category: "Community Ask",
        urgency: "medium",
        whatsapp_number: safeStr(whatsappNumber) || undefined,
        expires_in_hours: demandExpiryHoursFromAskCommunity(options),
      });
      setMarketNeedPulseOpen(false);
      setTargetHandle("");
      await loadPage();
      showNotice("success", "Community question posted in DemandBox.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Community question could not be posted in DemandBox."
      );
      throw err;
    } finally {
      setMarketNeedPulsePosting(false);
    }
  }

  function demandContactActions(row: DemandRow, debugBase: string) {
    const hasContact = Boolean(safeStr(row?.whatsapp_number));
    return (
      <>
        <SecondaryButton
          onClick={() => openDemandWhatsAppChat(row)}
          debugId={`${debugBase}.whatsapp-chat`}
          style={demandActionStyle(54)}
        >
          {demandIconText("phone", "WhatsApp Chat", 20)}
        </SecondaryButton>
        <SubtleButton
          onClick={() => openDemandWhatsAppCall(row)}
          debugId={`${debugBase}.whatsapp-call`}
          style={demandActionStyle(54)}
        >
          {demandIconText("phone", hasContact ? "WhatsApp Call" : "Call not ready", 20)}
        </SubtleButton>
      </>
    );
  }

  function renderQueueEmptyState(
    icon: GsnIconName,
    titleText: string,
    bodyText: string
  ): React.ReactElement {
    return (
      <div
        style={{
          ...recordCard(),
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        {demandEmptyStateIcon(icon)}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#0B1F33", fontWeight: 900 }}>{titleText}</div>
          <div style={{ marginTop: 8, ...helperText() }}>{bodyText}</div>
        </div>
      </div>
    );
  }

  function renderDemandRecord(
    row: DemandRow,
    scope: DemandPaperScope,
    debugBase: string,
    options: { canClose?: boolean; index?: number } = {}
  ): React.ReactElement {
    const fallbackIndex = Number(options.index || 0);
    const index = fallbackIndex;
    const debugIndex = `${debugBase}.${fallbackIndex}`;
    const rowKey = safeStr(row?.id) || debugIndex;
    const rowId = Number(row?.id || 0);
    const busy = updatingDemandId === rowId;
    const canClose = options.canClose === true;
    const trustPosture = requesterTrustPostureLabel(row);
    const fromAskCommunity = isAskCommunityDemand(row);
    const mentionedHandles = mentionedHandlesOf(row);
    const ownedCopyDebugId = `demand-box.request.${row?.id || index}.copy-paper`;
    const ownedFallbackCopyDebugId = `demand-box.request.${row?.id || debugIndex}.copy-paper`;
    const visibleCopyDebugId = `demand-box.visible-request.${row?.id || index}.copy-paper`;
    const visibleFallbackCopyDebugId = `demand-box.visible-request.${row?.id || debugIndex}.copy-paper`;
    const copyDebugId =
      scope === "owner"
        ? rowId
          ? ownedCopyDebugId
          : ownedFallbackCopyDebugId
        : rowId
          ? visibleCopyDebugId
          : visibleFallbackCopyDebugId;

    return (
      <div key={rowKey} style={recordCard()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              color: "#0B1F33",
              fontWeight: 900,
              lineHeight: 1.32,
              minWidth: 0,
            }}
          >
            {firstTruthy(row?.title, "Need")}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>{urgencyLabel(row?.urgency)}</span>
            {safeStr(row?.status) ? (
              <span style={badge(false)}>{safeStr(row?.status)}</span>
            ) : null}
            {trustPosture && scope === "community" ? (
              <span style={badge(false)}>Trust: {trustPosture}</span>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 8, ...helperText() }}>
          {firstTruthy(row?.description, "No extra detail yet.")}
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={badge(fromAskCommunity)}>
            Source: {fromAskCommunity ? "Ask Community" : "DemandBox"}
          </span>
          <span style={badge(false)}>Need type: {categoryLabel(row)}</span>
          <span data-gsn-demand-routing-chip="true" style={badge(mentionedHandles.length > 0)}>
            Route: {routingLabel(row)}
          </span>
          {mentionedHandles.length > 0 ? (
            <span style={badge(false)}>Typed tag: {mentionedHandles.join(", ")}</span>
          ) : null}
          {scope === "community" ? (
            <span style={badge(false)}>By: {requesterName(row)}</span>
          ) : null}
          {safeStr(row?.requester_gmfn_id) && scope === "community" ? (
            <span style={badge(false)}>GSN ID {safeStr(row?.requester_gmfn_id)}</span>
          ) : null}
          {safeStr(row?.whatsapp_number) ? (
            <span style={badge(false)}>Contact path: WhatsApp</span>
          ) : null}
          {safeStr(row?.area) ? (
            <span style={badge(false)}>Area: {safeStr(row?.area)}</span>
          ) : null}
          {safeStr(row?.payment_mode) ? (
            <span style={badge(false)}>Terms: {safeStr(row?.payment_mode)}</span>
          ) : null}
          {row?.allow_trust_credit ? (
            <span style={badge(false)}>Trust-credit openness only</span>
          ) : null}
          {safeStr(row?.created_at) ? (
            <span style={badge(false)}>{safeDateTime(row?.created_at)}</span>
          ) : null}
        </div>

        <div style={demandActionRowStyle(isCompact, 54, 156, 12)}>
          {canClose ? (
            <>
              <SecondaryButton
                onClick={() => handleUpdateDemandStatus(row, "fulfilled")}
                disabled={busy}
                busy={busy}
                busyLabel="Updating..."
                debugId={`${debugBase}.fulfilled`}
                style={demandActionStyle(54)}
              >
                {demandIconText("check", "Fulfilled", 20)}
              </SecondaryButton>

              <SubtleButton
                onClick={() => handleUpdateDemandStatus(row, "cancelled")}
                disabled={busy}
                busy={busy}
                busyLabel="Updating..."
                debugId={`${debugBase}.cancelled`}
                style={demandActionStyle(54)}
              >
                {demandIconText("lock", "Cancel", 20)}
              </SubtleButton>
            </>
          ) : null}

          {demandPaperAction(row, scope, copyDebugId)}
          {demandContactActions(row, `${debugBase}.contact`)}
        </div>
      </div>
    );
  }
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
  const memberCciLabel = cciLabel(me);

  const tagHandleOptions = useMemo(() => {
    const myGsnId = safeStr(me?.gmfn_id).toUpperCase();
    const seen = new Set<string>();

    return tagMembers
      .filter((member) => member.gsnId && member.gsnId !== myGsnId)
      .filter((member) => {
        const key = member.gsnId.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 40);
  }, [me, tagMembers]);

  const demandMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeStr(params.get("mode") || "").toLowerCase();
  }, [location.search]);
  const shouldOpenDemandQueues = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const queueMode = safeStr(params.get("queue") || "").toLowerCase();
    return ["open", "queue", "all", "tagged", "for_me", "community", "mine", "ask_community", "ask-community", "urgent", "categories"].includes(queueMode);
  }, [location.search]);
  const allOpenRows = useMemo(
    () => uniqueDemandRows([...visibleRows, ...myOpenRows]),
    [myOpenRows, visibleRows]
  );
  const urgentRows = useMemo(() => allOpenRows.filter(isUrgentDemand), [allOpenRows]);
  const askCommunityRows = useMemo(
    () => allOpenRows.filter(isAskCommunityDemand),
    [allOpenRows]
  );
  const taggedRows = useMemo(
    () => allOpenRows.filter(isTaggedForMe),
    [allOpenRows]
  );
  const categoryBuckets = useMemo(() => {
    const buckets = new Map<string, DemandRow[]>();

    for (const row of allOpenRows) {
      const label = categoryLabel(row);
      const rows = buckets.get(label) || [];
      rows.push(row);
      buckets.set(label, rows);
    }

    return Array.from(buckets.entries())
      .map(([label, rows]) => ({
        label,
        rows,
        urgentCount: rows.filter(isUrgentDemand).length,
      }))
      .sort((a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label));
  }, [allOpenRows]);
  const queueLaneRows = useMemo<Record<DemandQueueLane, DemandRow[]>>(
    () => ({
      open: allOpenRows,
      tagged: taggedRows,
      for_me: visibleRows,
      mine: myOpenRows,
      ask_community: askCommunityRows,
      urgent: urgentRows,
      categories: allOpenRows,
    }),
    [allOpenRows, askCommunityRows, myOpenRows, taggedRows, urgentRows, visibleRows]
  );
  const queueLanes = useMemo<Array<{ key: DemandQueueLane; label: string; count: number; icon: GsnIconName; detail: string }>>(
    () => [
      { key: "open", label: "All open", count: allOpenRows.length, icon: "briefcase", detail: "Every loaded open request" },
      { key: "tagged", label: "Tagged", count: taggedRows.length, icon: "tag", detail: "Requests mentioning your GSN ID" },
      { key: "for_me", label: "For me", count: visibleRows.length, icon: "community", detail: "Community requests you can answer" },
      { key: "mine", label: "Mine", count: myOpenRows.length, icon: "user", detail: "Needs you posted" },
      { key: "ask_community", label: "Ask Community", count: askCommunityRows.length, icon: "community", detail: "Questions posted through DemandBox" },
      { key: "urgent", label: "Urgent", count: urgentRows.length, icon: "alert", detail: "Needs time attention" },
      { key: "categories", label: "Need types", count: categoryBuckets.length, icon: "tag", detail: "Grouped by need type" },
    ],
    [allOpenRows.length, askCommunityRows.length, categoryBuckets.length, myOpenRows.length, taggedRows.length, urgentRows.length, visibleRows.length]
  );
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queueMode = safeStr(params.get("queue") || "").toLowerCase();
    const directLanes: DemandQueueLane[] = ["open", "tagged", "for_me", "mine", "ask_community", "urgent", "categories"];
    const normalizedQueueMode = queueMode === "ask-community" || queueMode === "community" || queueMode === "queue" || queueMode === "all" ? "open" : queueMode;

    if (directLanes.includes(normalizedQueueMode as DemandQueueLane)) {
      setActiveQueueLane(normalizedQueueMode as DemandQueueLane);
      return;
    }

    if (shouldOpenDemandQueues) {
      setActiveQueueLane("open");
    }
  }, [location.search, shouldOpenDemandQueues]);
  const routeAskCommunityMode = ["ask_community", "ask-community", "market_need_pulse"].includes(demandMode);
  const hasLegacyCreateHash = location.hash === "#demand-box-create";
  const isCreateMode = demandMode === "create" || routeAskCommunityMode || hasLegacyCreateHash;
  const currentPath = `${location.pathname}${location.search}${
    hasLegacyCreateHash ? location.hash : ""
  }`;
  const originPath = useMemo(() => {
    if (!location.state || typeof location.state !== "object") return "";
    return safeStr(
      (location.state as any).originPath || (location.state as any).from || ""
    );
  }, [location.state]);
  const demandReturnTo =
    originPath && originPath !== currentPath ? originPath : routes.marketplace;
  const demandReturnLabel =
    originPath && originPath !== currentPath ? "Back to source" : "Marketplace";

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (loading) return;
    if (!isCreateMode) return;
    if (communities.length > 1 && !createCommunityConfirmed) return;

    revealDemandCreate();
    if (routeAskCommunityMode) {
      openMarketNeedPulse();
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(location.search);
      if (params.get("mode") === "create" || routeAskCommunityMode) {
        params.delete("mode");
      }
      const nextSearch = params.toString();
      const cleanUrl = `${location.pathname}${
        nextSearch ? `?${nextSearch}` : ""
      }`;
      window.history.replaceState(window.history.state, "", cleanUrl);
    }
  }, [
    communities.length,
    createCommunityConfirmed,
    isCreateMode,
    loading,
    location.pathname,
    location.search,
    openMarketNeedPulse,
    revealDemandCreate,
    routeAskCommunityMode,
  ]);

  useEffect(() => {
    demandMountedRef.current = true;

    return () => {
      demandMountedRef.current = false;
      demandLoadSeqRef.current += 1;

      if (
        typeof window !== "undefined" &&
        demandCreateRevealRef.current !== null
      ) {
        window.cancelAnimationFrame(demandCreateRevealRef.current);
      }
    };
  }, []);

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
          sectionLabel="DemandBox"
          title="DemandBox"
          subtitle="Loading DemandBox..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={demandReturnTo}
          backLabel={demandReturnLabel}
        />

        <section style={pageCard("#FFFFFF")}>
          <div
            style={{
              color: "#64748B",
              lineHeight: 1.8,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 900,
            }}
          >
            <GsnLegacyIcon name="refresh" size={30} />
            <span>Loading DemandBox...</span>
          </div>
        </section>
      </div>
    );
  }

  if (!selectedClanId) {
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
          sectionLabel="DemandBox"
          title="DemandBox"
          subtitle="Choose the community before posting your personal request."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={demandReturnTo}
          backLabel={demandReturnLabel}
        />

        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

        <section style={demandBrandShell()}>
          <div style={{ ...sectionLabel(), color: "#C9D7E8" }}>
            Choose community first
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#F8FBFF",
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.15,
              maxWidth: 760,
            }}
          >
            Open Community Home first, then choose the community where this need belongs.
          </div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              color: "#D7E3F1",
              maxWidth: 860,
            }}
          >
            Pick the community first. That helps people know where your request
            is coming from before they answer.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gap: 10,
            }}
          >
            {communities.length > 0 ? (
              communities.map((community, index) => {
                const clanId = Number(community?.id || community?.clan_id || 0);
                const busy = selectingClanId === clanId;

                return (
                  <SecondaryButton
                    key={`${clanId || index}`}
                    onClick={() => handleChooseDemandCommunity(community)}
                    disabled={busy || !clanId}
                    busy={busy}
                    busyLabel={
                      <>
                        <span>{communityName(community, clanId)}</span>
                        <span style={{ opacity: 0.76 }}>Selecting...</span>
                      </>
                    }
                    fullWidth
                    stableHeight={58}
                    debugId={`demand-box.community-missing.${clanId || index}`}
                    style={communityChoiceStyle(false)}
                  >
                    <span>{communityName(community, clanId)}</span>
                    <span style={{ opacity: 0.76 }}>
                      Choose
                    </span>
                  </SecondaryButton>
                );
              })
            ) : (
              <div style={{ color: "#D7E3F1", lineHeight: 1.8 }}>
                No community is available yet. Create or join a community first,
                then return to DemandBox.
              </div>
            )}

            <div style={demandActionRowStyle(isCompact, 54, 168)}>
              <StableCtaLink
                to={routes.community}
                debugId="demand-box.open-community"
                stableHeight={54}
                style={demandActionStyle(54)}
              >
                {demandIconText("community", "Community", 20)}
              </StableCtaLink>
              <StableCtaLink
                to={routes.dashboard}
                debugId="demand-box.missing-community-dashboard"
                stableHeight={54}
                style={demandActionStyle(54)}
              >
                {demandIconText("home", "Dashboard", 20)}
              </StableCtaLink>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isCreateMode && communities.length > 1 && !createCommunityConfirmed) {
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
          sectionLabel="DemandBox"
          title="Choose community"
          subtitle="Community Home holds all your communities. Pick the one this demand should come from."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={demandReturnTo}
          backLabel={demandReturnLabel}
        />

        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

        <section style={demandBrandShell()}>
          <div style={{ ...sectionLabel(), color: "#C9D7E8" }}>
            Demand flow
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#F8FBFF",
              fontSize: isCompact ? 28 : 34,
              fontWeight: 900,
              lineHeight: 1.12,
              maxWidth: 780,
            }}
          >
            Choose the community for this demand.
          </div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              color: "#D7E3F1",
              maxWidth: 860,
            }}
          >
            Your request is personal. The community gives it the right trusted
            context. After you choose, GSN opens that community's marketplace
            demand form.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(false)}>Step 1: choose community</span>
            <span style={badge(false)}>Step 2: fill request</span>
            <span style={badge(false)}>Step 3: post demand</span>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {communities.map((community, index) => {
              const clanId = Number(community?.id || community?.clan_id || 0);
              const active = clanId > 0 && clanId === selectedClanId;
              const busy = selectingClanId === clanId;
              const ChoiceButton = active ? PrimaryButton : SecondaryButton;

              return (
                <ChoiceButton
                  key={`${clanId || index}`}
                  onClick={() => handleChooseDemandCommunity(community)}
                  disabled={busy || !clanId}
                  busy={busy}
                  busyLabel={
                    <>
                      <span>{communityName(community, clanId)}</span>
                      <span style={{ opacity: 0.82 }}>Opening...</span>
                    </>
                  }
                  fullWidth
                  stableHeight={58}
                  debugId={`demand-box.create-community.${clanId || index}`}
                  style={communityChoiceStyle(active)}
                >
                  <span>{communityName(community, clanId)}</span>
                  <span style={{ opacity: 0.82 }}>
                    {active ? "Use this" : "Choose"}
                  </span>
                </ChoiceButton>
              );
            })}
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
        sectionLabel="DemandBox"
        title={
          isCreateMode
            ? `${currentCommunityName} DemandBox`
            : "DemandBox"
        }
        subtitle={
          isCreateMode
            ? `You are posting from the ${currentCommunityName} marketplace.`
            : "Ask for what you need, from the right community, with trust attached."
        }
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={demandReturnTo}
        backLabel={demandReturnLabel}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {marketNeedPulseOpen ? (
        <Suspense fallback={null}>
          <CommunityNoticeModal
            open
            communityName={currentCommunityName}
            busy={marketNeedPulsePosting}
            mode="market_need_pulse"
            pulseDestination="demand_box"
            clanId={selectedClanId}
            onClose={() => setMarketNeedPulseOpen(false)}
            onSubmit={submitMarketNeedPulse}
          />
        </Suspense>
      ) : null}

      {!isCreateMode ? (
      <section
        style={{
          ...demandBrandShell(),
          padding: isCompact ? 16 : 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#C9D7E8" }}>
              Trusted request
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 24 : 34,
                lineHeight: 1.12,
              }}
            >
              Ask clearly from {currentCommunityName}.
            </div>

            <div
              style={{
                marginTop: 10,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 840,
                lineHeight: isCompact ? 1.45 : 1.75,
              }}
            >
              Post one real need, keep the community context attached, and close
              it when it is answered.
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>From: {memberName}</span>
              <span style={badge(false)}>{currentCommunityName}</span>
              <span style={badge(false)}>My open needs: {myOpenRows.length}</span>
              <span style={badge(false)}>Visible needs: {visibleRows.length}</span>
              {memberCciLabel ? (
                <span style={badge(false)}>Evidence: {memberCciLabel}</span>
              ) : null}
            </div>

            <div style={demandHeroActionRowStyle(isCompact)}>
              <SecondaryButton
                onClick={() => {
                  revealDemandCreate();
                }}
                debugId="demand-box.create"
                stableHeight={isCompact ? 52 : 54}
                style={demandHeroPrimaryActionStyle(isCompact)}
              >
                {demandIconText("document", "Create demand", 20)}
              </SecondaryButton>
              <StableCtaLink
                to={routes.askCommunity}
                debugId="demand-box.ask-community"
                stableHeight={isCompact ? 52 : 54}
                style={demandActionStyle(isCompact ? 52 : 54)}
              >
                {demandIconText("community", "Ask Community", 20)}
              </StableCtaLink>
              <StableCtaLink
                to={demandReturnTo}
                debugId="demand-box.return"
                stableHeight={isCompact ? 52 : 54}
                style={demandActionStyle(isCompact ? 52 : 54)}
              >
                {demandIconText("shop", demandReturnLabel, 20)}
              </StableCtaLink>
              <StableCtaLink
                to={routes.dashboard}
                debugId="demand-box.hero-dashboard"
                stableHeight={isCompact ? 52 : 54}
                style={demandActionStyle(isCompact ? 52 : 54)}
              >
                {demandIconText("home", "Dashboard", 20)}
              </StableCtaLink>
            </div>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.16)",
            }}
          >
            <div style={sectionLabel()}>Current state</div>

            <div
              style={{
                marginTop: 8,
                color: "#123055",
                fontWeight: 900,
                lineHeight: 1.28,
                fontSize: isCompact ? 18 : 20,
              }}
            >
              {myOpenRows.length > 0
                ? "You already have live demand."
                : "No personal demand is open."}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(myOpenRows.length > 0)}>
                Mine: {myOpenRows.length}
              </span>
              <span style={badge(visibleRows.length > 0)}>
                Community: {visibleRows.length}
              </span>
              <span style={badge(true)}>Next: post or review</span>
              {safeStr(me?.gmfn_id) ? (
                <span style={badge(false)}>GSN ID: {safeStr(me?.gmfn_id)}</span>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#31506D",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.45,
              }}
            >
              Create only one clear request at a time. Mark it fulfilled or
              cancel it when the need is resolved.
            </div>
          </div>
        </div>
      </section>
      ) : null}

      <section
        id="demand-box-create"
        style={pageCard(
          isCreateMode
            ? "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
            : "#FFFFFF"
        )}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={sectionLabel()}>
              {isCreateMode ? "Marketplace demand form" : "Create demand"}
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: isCompact ? 24 : 30,
                fontWeight: 900,
                lineHeight: 1.12,
              }}
            >
              {isCreateMode
                ? `Create demand from ${currentCommunityName}.`
                : "Tell your community what you need."}
            </div>
            <div
              style={{
                marginTop: 8,
                ...helperText(),
                maxWidth: 760,
              }}
            >
              {isCreateMode
                ? "Fill in the need, area, and evidence expectation. GSN keeps the community context attached."
                : "Keep it simple: what you need, where it is needed, and what evidence or payment should be clear first."}
            </div>
          </div>
        </div>

        {isCreateMode ? (
          <div
            style={{
              marginTop: 14,
              ...innerCard("#F8FBFF"),
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={badge(true)}>Community: {currentCommunityName}</span>
            <span style={badge(false)}>Marketplace context active</span>
            <span style={badge(false)}>Step 2: fill the request</span>
            <span style={badge(false)}>Step 3: post demand</span>
          </div>
        ) : null}

        {!isCreateMode ? (
        <details
          style={{
            marginTop: 14,
            ...innerCard("#F8FBFF"),
            padding: 0,
            overflow: "hidden",
          }}
        >
          <StableDisclosureSummary
            style={{
              ...detailsSummary(),
              padding: "0 14px",
            }}
            stableHeight={50}
            debugId="demand-box.change-community.summary"
          >
            <span>Change community</span>
            <span style={{ color: "#64748B", fontSize: 13 }}>
              {currentCommunityName}
            </span>
          </StableDisclosureSummary>

          <div
            style={{
              padding: "0 14px 14px",
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {communities.length > 0 ? (
              communities.map((community, index) => {
                const clanId = Number(community?.id || community?.clan_id || 0);
                const active = clanId > 0 && clanId === selectedClanId;
                const busy = selectingClanId === clanId;
                const ChoiceButton = active ? PrimaryButton : SecondaryButton;

                return (
                  <ChoiceButton
                    key={`${clanId || index}`}
                    onClick={() => handleChooseDemandCommunity(community)}
                    disabled={busy || !clanId}
                    busy={busy}
                    busyLabel={
                      <>
                        <span>{communityName(community, clanId)}</span>
                        <span style={{ opacity: 0.82 }}>Selecting...</span>
                      </>
                    }
                    fullWidth
                    stableHeight={58}
                    debugId={`demand-box.form-community.${clanId || index}`}
                    style={communityChoiceStyle(active)}
                  >
                    <span>{communityName(community, clanId)}</span>
                    <span style={{ opacity: 0.82 }}>
                      {active ? "Selected" : "Choose"}
                    </span>
                  </ChoiceButton>
                );
              })
            ) : (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No community is available yet. Create or join one first.
              </div>
            )}
          </div>
        </details>
        ) : null}

        <div
          style={{
            marginTop: 12,
            ...innerCard("#FCFEFF"),
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={badge(true)}>Community: {currentCommunityName}</span>
          <span style={badge(false)}>Evidence optional</span>
          <span style={badge(false)}>Payment terms optional</span>
        </div>

        <div
          style={{
            marginTop: 14,
            ...innerCard("#FCFEFF"),
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={sectionLabel()}>Demand type</div>
            <div style={{ marginTop: 6, color: "#0B1F33", fontSize: 16, fontWeight: 900, lineHeight: 1.3 }}>
              Post a direct need or ask the community first.
            </div>
            <div style={{ marginTop: 6, ...helperText(), fontSize: 13, lineHeight: 1.5 }}>
              Use normal demand when you already know what you need. Use Ask Community when you need yes, maybe, or no opinions before stocking, pricing, or offering something.
            </div>
          </div>
          <div style={demandActionRowStyle(isCompact, 52, 160, 0)}>
            <SecondaryButton
              type="button"
              debugId="demand-box.mode.normal-demand"
              stableHeight={52}
              style={demandActionStyle(52)}
              onClick={() => revealDemandCreate()}
            >
              {demandIconText("document", "Post demand", 20)}
            </SecondaryButton>
            <SecondaryButton
              type="button"
              debugId="demand-box.ask-community.inline"
              stableHeight={52}
              style={demandActionStyle(52)}
              onClick={openMarketNeedPulse}
            >
              {demandIconText("community", "Ask Community", 20)}
            </SecondaryButton>
          </div>
        </div>
        {demandBoxFeatureOff ? (
          <div
            style={{
              marginTop: 12,
              ...noticeCard("error"),
            }}
          >
            {demandBoxFeatureOffText} Existing DemandBox requests can still be
            reviewed or closed; new requests are paused by this domain policy.
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                <div style={sectionLabel()}>What do you need?</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Need 5 bags of rice this week"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>
              <div>
                <div style={sectionLabel()}>Need type tag</div>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Food, vacancy, repair, transport"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div>
                <div style={sectionLabel()}>Tag GSN member</div>
                <input
                  value={targetHandle}
                  onChange={(e) => setTargetHandle(e.target.value)}
                  placeholder="GSN-U-RESPONDER"
                  list="demand-box-gsn-member-handles"
                  autoCapitalize="characters"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
                {tagHandleOptions.length > 0 ? (
                  <datalist id="demand-box-gsn-member-handles">
                    {tagHandleOptions.map((member) => (
                      <option key={member.gsnId} value={member.gsnId}>
                        {member.label}
                        {member.role ? ` - ${member.role}` : ""}
                      </option>
                    ))}
                  </datalist>
                ) : null}
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  Optional. Start typing or choose a known GSN ID. Do not use a phone number.
                </div>
              </div>

              <div>
                <div style={sectionLabel()}>Area / location</div>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Area"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                <div style={sectionLabel()}>Explain briefly</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a short explanation so people can understand the need quickly"
                  style={{ ...textAreaStyle(), marginTop: 8 }}
                />
              </div>

              <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                <div style={sectionLabel()}>Contact path override</div>
                <input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Optional WhatsApp number if your approved profile contact should not be used"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div>
                <div style={sectionLabel()}>Urgency</div>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <div style={sectionLabel()}>Payment terms</div>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="">Choose if needed</option>
                  <option value="Pay now">Pay now</option>
                  <option value="Pay later">Pay later</option>
                  <option value="Trust credit">Trust credit</option>
                  <option value="Negotiable">Negotiable</option>
                  <option value="Support / no payment">Support / no payment</option>
                </select>
              </div>

              <div>
                <div style={sectionLabel()}>Evidence from responder</div>
                <select
                  value={responseEvidence}
                  onChange={(e) => setResponseEvidence(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="">Choose if needed</option>
                  <option value="Please share your GSN ID before work starts">
                    Share GSN ID first
                  </option>
                  <option value="Please share your TrustSlip before work starts">
                    Share TrustSlip first
                  </option>
                  <option value="Please confirm GSN ID and TrustSlip before work starts">
                    GSN ID and TrustSlip
                  </option>
                  <option value="No extra evidence needed before response">
                    No extra evidence
                  </option>
                </select>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                ...innerCard("#F8FBFF"),
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={badge(false)}>Sent by {memberName}</span>
              {safeStr(me?.gmfn_id) ? (
                <span style={badge(false)}>GSN ID {safeStr(me?.gmfn_id)}</span>
              ) : null}
              {memberCciLabel ? (
                <span style={badge(false)}>Wider evidence {memberCciLabel}</span>
              ) : null}
              <span style={badge(false)}>From {currentCommunityName}</span>
            </div>

            <div style={demandActionRowStyle(isCompact, 54, 180, 14)}>
              <PrimaryButton
                onClick={() => handleCreateDemand()}
                disabled={creating}
                busy={creating}
                busyLabel="Posting..."
                fullWidth
                stableHeight={54}
                debugId="demand-box.post"
                style={demandActionStyle(54)}
              >
                {demandIconText("document", "Post demand", 20)}
              </PrimaryButton>

              <StableCtaLink
                to={routes.notifications}
                fullWidth
                stableHeight={54}
                debugId="demand-box.open-notifications"
                style={demandActionStyle(54)}
              >
                {demandIconText("alert", "Notifications", 20)}
              </StableCtaLink>
            </div>
          </div>

          <div style={detailsShell()}>
            <details>
              <StableDisclosureSummary
                style={detailsSummary()}
                stableHeight={52}
                debugId="demand-box.more-detail"
              >
                <span>More detail</span>
                <span style={{ color: "#64748B", fontSize: 13 }}>Optional</span>
              </StableDisclosureSummary>

              <div style={{ padding: "0 18px 18px", display: "grid", gap: 12 }}>

                <div>
                  <div style={sectionLabel()}>Expiry in hours</div>
                  <input
                    type="number"
                    min="1"
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    placeholder="72"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "#0B1F33",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allowTrustCredit}
                      onChange={(e) => setAllowTrustCredit(e.target.checked)}
                    />
                    Open to trust credit where appropriate
                  </label>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                    Trust-credit openness is a request preference, not approval to
                    release goods, credit, or money.
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {!isCreateMode ? (
        <section id="demand-box-queue-board" style={pageCard("#FFFFFF")}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 320px" }}>
              <div style={sectionLabel()}>Organised request queue</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: isCompact ? 24 : 30,
                  fontWeight: 900,
                  lineHeight: 1.12,
                }}
              >
                See the right demand before it gets buried.
              </div>
              <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
                GSN shows demand as lanes, not chat. Matched GSN handles move into the Tagged lane.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(allOpenRows.length > 0)}>All open: {allOpenRows.length}</span>
              <span style={badge(myOpenRows.length > 0)}>Mine: {myOpenRows.length}</span>
              <span style={badge(askCommunityRows.length > 0)}>Ask: {askCommunityRows.length}</span>
              <span style={badge(urgentRows.length > 0)}>Urgent: {urgentRows.length}</span>
              <span style={badge(visibleRows.length > 0)}>For me: {visibleRows.length}</span>
              <span style={badge(hasMoreVisibleRows)}>More: {hasMoreVisibleRows ? "available" : "none shown"}</span>
            </div>
          </div>

          <div
            data-gsn-demand-queue-lanes="true"
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(5, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {queueLanes.map((lane) => {
              const active = activeQueueLane === lane.key;
              const Button = active ? PrimaryButton : SecondaryButton;

              return (
                <Button
                  key={lane.key}
                  onClick={() => setActiveQueueLane(lane.key)}
                  debugId={`demand-box.queue-lane.${lane.key}`}
                  style={{
                    minHeight: 82,
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    padding: isCompact ? "10px" : "12px",
                    gap: 8,
                    whiteSpace: "normal",
                    lineHeight: 1.2,
                  }}
                >
                  <GsnLegacyIcon name={lane.icon} size={26} />
                  <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <span style={{ fontWeight: 900 }}>{lane.label}</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>{lane.key === "categories" ? `${lane.count} groups` : `${lane.count} open`}</span>
                  </span>
                </Button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 14,
              ...innerCard("#F8FBFF"),
              border: "1px solid rgba(13,95,168,0.1)",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={badge(true)}>
              Active lane: {queueLanes.find((lane) => lane.key === activeQueueLane)?.label || "All open"}
            </span>
            <span style={badge(taggedRows.length > 0)}>Tagged: {taggedRows.length}</span>
            <span style={badge(false)}>Not a chat feed</span>
            <span style={badge(false)}>Fetched: {visibleRowsRawLoaded}</span>
          </div>

          <details
            data-gsn-demand-routing-readiness="true"
            style={{ ...detailsShell(), marginTop: 14 }}
          >
            <StableDisclosureSummary
              style={detailsSummary()}
              stableHeight={54}
              debugId="demand-box.routing-readiness.summary"
            >
              <span>Routing readiness</span>
              <span style={{ color: "#64748B", fontSize: 13 }}>Collapsed</span>
            </StableDisclosureSummary>
            <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
              <div style={{ ...innerCard("#FCFEFF"), display: "grid", gap: 8 }}>
                <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                  Current pilot sorting uses saved queue signals, matched GSN handles, need type, urgency, owner, and Ask Community source.
                </div>
                <div style={{ ...helperText(), fontSize: 13, lineHeight: 1.55 }}>
                  Matched GSN handles can route a notification to the tagged lane. Load older requests extends the visible queue in batches; ranked queues, moderation rules, rate limits, and saved assignments still need governed records work before very large communities use DemandBox at full scale.
                </div>
              </div>
            </div>
          </details>

          {activeQueueLane === "categories" ? (
            <div
              data-gsn-demand-category-buckets="true"
              style={{ marginTop: 14, display: "grid", gap: 12 }}
            >
              {categoryBuckets.length === 0
                ? renderQueueEmptyState(
                    "tag",
                    "No demand category is open right now.",
                    "When requests arrive, GSN will group them by the need type already recorded on the request."
                  )
                : categoryBuckets.map((bucket, bucketIndex) => (
                    <details
                      key={bucket.label}
                      open={bucketIndex === 0 && !isCompact ? true : undefined}
                      style={detailsShell()}
                    >
                      <StableDisclosureSummary
                        style={detailsSummary()}
                        stableHeight={54}
                        debugId={`demand-box.category.${bucketIndex}.summary`}
                      >
                        <span>{bucket.label}</span>
                        <span style={{ color: "#64748B", fontSize: 13 }}>
                          {bucket.rows.length} open{bucket.urgentCount > 0 ? `, ${bucket.urgentCount} urgent` : ""}
                        </span>
                      </StableDisclosureSummary>

                      <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
                        {bucket.rows.slice(0, 12).map((row, rowIndex) =>
                          renderDemandRecord(
                            row,
                            isMineRow(row, me) ? "owner" : "community",
                            `demand-box.category.${bucketIndex}.${row?.id || rowIndex}`,
                            { canClose: isMineRow(row, me), index: rowIndex }
                          )
                        )}
                      </div>
                    </details>
                  ))}
            </div>
          ) : (
            <div
              data-gsn-demand-queue-results="true"
              style={{ marginTop: 14, display: "grid", gap: 12 }}
            >
              {(queueLaneRows[activeQueueLane] || []).length === 0
                ? renderQueueEmptyState(
                    activeQueueLane === "mine" ? "document" : activeQueueLane === "urgent" ? "alert" : activeQueueLane === "tagged" ? "tag" : "community",
                    activeQueueLane === "mine"
                      ? "You have no open demand right now."
                      : activeQueueLane === "urgent"
                        ? "No urgent demand is waiting right now."
                        : activeQueueLane === "tagged"
                          ? "No tagged demand is waiting right now."
                          : activeQueueLane === "for_me"
                            ? "No responder-facing demand is waiting right now."
                            : "No open demand is waiting right now.",
                    activeQueueLane === "mine"
                      ? "Create one clear request when you need goods, service, support, or help."
                      : activeQueueLane === "tagged"
                        ? "When a request mentions your GSN ID and matches your community record, it appears here."
                        : activeQueueLane === "for_me"
                          ? "Use All open when you need to see every loaded community request."
                          : "When someone in this community asks for help, their request will appear here."
                  )
                : (queueLaneRows[activeQueueLane] || [])
                    .slice(0, isCompact ? 12 : 24)
                    .map((row, index) =>
                      renderDemandRecord(
                        row,
                        activeQueueLane === "mine" || isMineRow(row, me) ? "owner" : "community",
                        `demand-box.queue.${activeQueueLane}.${row?.id || index}`,
                        {
                          canClose: activeQueueLane === "mine" || isMineRow(row, me),
                          index,
                        }
                      )
                    )}
              {(queueLaneRows[activeQueueLane] || []).length > (isCompact ? 12 : 24) ? (
                <div style={{ ...helperText(), ...innerCard("#F8FBFF") }}>
                  Showing the first {isCompact ? 12 : 24} rows in this lane. Use
                  Need types, Urgent, or Tagged to narrow the queue, or load older community requests if more are available.
                </div>
              ) : null}
            </div>
          )}

          {hasMoreVisibleRows ? (
            <div
              data-gsn-demand-load-older="true"
              style={{ marginTop: 14, display: "grid", gap: 8 }}
            >
              <SecondaryButton
                onClick={loadOlderVisibleDemandRows}
                disabled={loadingMoreVisibleRows}
                busy={loadingMoreVisibleRows}
                busyLabel="Loading older requests..."
                fullWidth
                stableHeight={54}
                debugId="demand-box.queue.load-older"
              >
                {demandIconText("refresh", "Load older requests", 20)}
              </SecondaryButton>
              <div style={{ ...helperText(), textAlign: "center" }}>
                GSN loads DemandBox in batches so large communities stay readable.
              </div>
            </div>
          ) : null}
          <div style={demandActionRowStyle(isCompact, 54, 156, 14)}>
            <StableCtaLink
              to={demandReturnTo}
              debugId="demand-box.bottom-return"
              stableHeight={54}
              style={demandActionStyle(54)}
            >
              {demandIconText("shop", demandReturnLabel, 20)}
            </StableCtaLink>
            <StableCtaLink
              to={routes.dashboard}
              debugId="demand-box.bottom-dashboard"
              stableHeight={54}
              style={demandActionStyle(54)}
            >
              {demandIconText("home", "Dashboard", 20)}
            </StableCtaLink>
          </div>
        </section>
      ) : null}
    </div>
  );
}
