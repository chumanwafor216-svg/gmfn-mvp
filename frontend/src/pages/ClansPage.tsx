import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import { PrimaryButton, SecondaryButton, StableCtaLink } from "../components/StableButton";
import {
  canonicalJoinInviteUrl,
  compactJoinInviteUrl,
  normalizedJoinInviteUrl,
  personalizedJoinInviteUrl,
} from "../lib/joinLinks";
import { navigateWithOrigin } from "../lib/nav";
import { publicFrontendUrl } from "../lib/publicLinks";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  COMMUNITY_QR_POLICIES,
  communityQrPolicyByKey,
  type CommunityQrPolicyKey,
} from "../lib/communityQrPolicies";
import {
  buildGsnInviteLinkMessage,
  buildGsnInviteLinkPackage,
} from "../lib/gsnSnapshotPaper";
import {
  bulkCreateClanQrPreApprovals,
  createClan,
  createClanInvite,
  createClanQrPreApproval,
  getClanInviteLink,
  getMe,
  listClanQrPreApprovals,
  getSelectedClanId,
  listMyClans,
  safeCopy,
  selectClan,
  updateClanQrPreApprovalStatus,
} from "../lib/api";

type CommunityItem = {
  id?: number;
  name?: string | null;
  display_name?: string | null;
  title?: string | null;
  description?: string | null;
  invite_code?: string | null;
  invite_link?: string | null;
  invite_url?: string | null;
  community_id?: string | null;
  marketplace_id?: string | null;
  gmfn_id?: string | null;
  clan_code?: string | null;
  members?: any[];
  memberships?: any[];
  member_rows?: any[];
  created_at?: string | null;
  governance_profile?: any;
};

type InviteState = {
  code?: string | null;
  link?: string | null;
  expiresAt?: string | null;
  guideUrl?: string | null;
  fallbackGuideUrl?: string | null;
  packagedShareText?: string | null;
  whatsappShareText?: string | null;
};

type QrPreApprovalItem = {
  id?: number;
  display_name?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  gmfn_id?: string | null;
  match_type?: string | null;
  match_value?: string | null;
  approval_note?: string | null;
  status?: string | null;
  matched_join_request_id?: number | null;
  matched_at?: string | null;
};
function overlayShell(): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(54,38,24,0.52)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 50,
  };
}

function modalCard(): React.CSSProperties {
  return {
    width: "min(100%, 720px)",
    borderRadius: 26,
    border: "1px solid rgba(190,143,55,0.26)",
    background:
      "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(249,240,224,0.96) 58%, rgba(238,222,196,0.92) 100%)",
    boxShadow:
      "0 26px 64px rgba(54,38,24,0.24), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 20,
    overflow: "hidden",
  };
}

function darkPanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,250,240,0.98) 0%, rgba(246,232,206,0.96) 100%)",
    border: "1px solid rgba(190,143,55,0.22)",
    boxShadow:
      "0 18px 34px rgba(54,38,24,0.14), inset 0 1px 0 rgba(255,255,255,0.72)",
    padding: 18,
    position: "relative",
    overflow: "hidden",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(128,91,44,0.18)",
    padding: "13px 14px",
    outline: "none",
    fontSize: 16,
    color: "#241A12",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,250,242,0.98) 100%)",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 6px 14px rgba(54,38,24,0.05)",
  };
}

function textareaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 120,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.65,
  };
}

function modalChip(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(243,208,106,0.18)" : "rgba(128,91,44,0.08)",
    color: primary ? "#8A6508" : "#6B5D50",
    border: primary
      ? "1px solid rgba(243,208,106,0.28)"
      : "1px solid rgba(128,91,44,0.10)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(190,143,55,0.20)",
    background:
      bg === "#FFFFFF" || bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(249,240,224,0.97) 56%, rgba(242,228,205,0.95) 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 22px 48px rgba(54,38,24,0.14), 0 2px 8px rgba(92,62,32,0.05)",
    overflow: "hidden",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(190,143,55,0.18)",
    background:
      bg === "#FFFFFF" || bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 14px 30px rgba(54,38,24,0.12), inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(190,143,55,0.16)",
    background:
      bg === "#F8FBFF" || bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(255,253,248,0.98) 0%, rgba(250,242,229,0.96) 100%)"
        : bg,
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(54,38,24,0.10), inset 0 1px 0 rgba(255,255,255,0.74)",
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 13px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(174,121,32,0.34)"
      : "1px solid rgba(128,91,44,0.18)",
    background: disabled
      ? "#D8CFC0"
      : primary
      ? "linear-gradient(180deg, #F2C766 0%, #D9A441 100%)"
      : "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
    color: primary ? "#241A12" : "#3A2A1C",
    fontWeight: 900,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    fontSize: 14,
    boxShadow: primary
      ? undefined
      : "0 12px 24px rgba(54,38,24,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(214,170,69,0.28)" : "rgba(128,91,44,0.10)",
    color: primary ? "#5F410D" : "#5F5143",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#8A735C",
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function parseQrPreApprovalBulkText(raw: string) {
  const entries: Array<{
    display_name?: string | null;
    phone_e164?: string | null;
    email?: string | null;
    gmfn_id?: string | null;
    approval_note?: string | null;
  }> = [];
  let ignored = 0;

  safeStr(raw)
    .split(/\r?\n/)
    .slice(0, 250)
    .forEach((line) => {
      const cleanLine = safeStr(line);
      if (!cleanLine) return;
      const parts = cleanLine
        .split(/[|,\t]/)
        .map((part) => safeStr(part))
        .filter(Boolean);
      const entry = {
        display_name: "",
        phone_e164: "",
        email: "",
        gmfn_id: "",
        approval_note: "",
      };

      parts.forEach((part) => {
        const digitCount = (part.match(/\d/g) || []).length;
        const looksLikePhone = digitCount >= 7 && /^[+\d\s().-]+$/.test(part);
        const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part);
        const looksLikeGsnId = /^(GSN|GMFN|GMFM|GSM)[\s-]?[A-Z0-9-]{3,}$/i.test(part);

        if (!entry.email && looksLikeEmail) {
          entry.email = part;
        } else if (!entry.phone_e164 && looksLikePhone) {
          entry.phone_e164 = part;
        } else if (!entry.gmfn_id && looksLikeGsnId) {
          entry.gmfn_id = part;
        } else if (!entry.display_name) {
          entry.display_name = part;
        } else {
          entry.approval_note = safeStr(`${entry.approval_note} ${part}`);
        }
      });

      if (!entry.phone_e164 && !entry.email && !entry.gmfn_id) {
        ignored += 1;
        return;
      }
      entries.push({
        display_name: entry.display_name || null,
        phone_e164: entry.phone_e164 || null,
        email: entry.email || null,
        gmfn_id: entry.gmfn_id || null,
        approval_note: entry.approval_note || null,
      });
    });

  return { entries, ignored };
}
function communityName(item: any): string {
  return safeStr(item?.display_name || item?.name || item?.title || "Community");
}

function communityIdentity(item: any): string {
  return safeStr(
    item?.community_id ||
      item?.marketplace_id ||
      item?.gmfn_id ||
      item?.clan_code ||
      item?.id ||
      "Not available yet"
  );
}

function extractMembers(community: any): any[] {
  return Array.isArray(community?.members)
    ? community.members
    : Array.isArray(community?.member_rows)
    ? community.member_rows
    : Array.isArray(community?.memberships)
    ? community.memberships
    : [];
}

function buildGuideUrl(): string {
  return publicFrontendUrl("/guide");
}

function buildGuideFallbackUrl(): string {
  return publicFrontendUrl("/guide");
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { explicitTo?: string } = {}
): string {
  return resolveCtaTarget(intent, { communityId, debugId, ...extra }).to as string;
}

function addInviteSearchParams(
  rawLink: string,
  params: Record<string, string | null | undefined>
): string {
  const direct = safeStr(rawLink);
  if (!direct) return "";

  try {
    const url = new URL(direct, publicFrontendUrl("/"));
    Object.entries(params).forEach(([key, value]) => {
      const cleanValue = safeStr(value);
      if (cleanValue) url.searchParams.set(key, cleanValue);
    });
    return publicFrontendUrl(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return direct;
  }
}
function buildInviteState(
  raw: any,
  senderName: string,
  receiverField: string,
  shortMessage: string,
  selectedCommunityName: string,
  extraSearchParams: Record<string, string | null | undefined> = {}
): InviteState {
  const code = safeStr(raw?.code || raw?.invite_code || "");
  const baseLink =
    normalizedJoinInviteUrl(raw) ||
    canonicalJoinInviteUrl(code);
  const personalizedLink =
    personalizedJoinInviteUrl(baseLink, {
      inviterName: senderName,
      recipientName: receiverField,
      communityName: selectedCommunityName,
      marketplaceName: selectedCommunityName,
      message: shortMessage,
    }) || baseLink;
  const link = addInviteSearchParams(personalizedLink, extraSearchParams);
  const expiresAt = safeStr(raw?.expires_at || raw?.expiry || "");
  const guideUrl = buildGuideUrl();
  const fallbackGuideUrl = buildGuideFallbackUrl();
  const hasExtraSearchParams = Object.values(extraSearchParams).some((value) => safeStr(value));
  const shareLink = hasExtraSearchParams ? link : compactJoinInviteUrl(link) || link;

  const personalNote = safeStr(shortMessage);
  const receiver = safeStr(receiverField);

  const packagedShareText = buildGsnInviteLinkPackage({
    senderName: senderName || "A known GSN member",
    communityName: selectedCommunityName,
    inviteLink: shareLink,
    messageLines: [
      receiver ? `Recipient: ${receiver}` : "",
      `${senderName || "A known GSN member"} from ${selectedCommunityName} is inviting you to begin the GSN join request for ${selectedCommunityName}.`,
      "This link lets you send your request back to the community for review. It is not automatic entry.",
      personalNote ? `Personal note: ${personalNote}` : "",
      "GSN helps existing trust become visible, recordable, and useful.",
      code ? `Invite code: ${code}` : "",
      expiresAt ? `Expiry: ${safeDateTime(expiresAt)}` : "",
      "Guide: My GSN and I",
      guideUrl,
      "Fallback PDF guide:",
      fallbackGuideUrl,
      "Sent through GSN",
    ],
  });
  const compactShareText = buildGsnInviteLinkMessage({
    senderName: senderName || "A known GSN member",
    communityName: selectedCommunityName,
    inviteLink: shareLink,
    note: personalNote || "Open this invite to request access.",
  });

  return {
    code,
    link,
    expiresAt,
    guideUrl,
    fallbackGuideUrl,
    packagedShareText,
    whatsappShareText: compactShareText,
  };
}

export default function ClansPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const createCommunityState =
    (location.state as {
      create_community?: {
        name?: string | null;
        description?: string | null;
        follow_up_community_domain?: boolean | null;
        follow_up_path?: string | null;
      };
    } | null)?.create_community || null;
  const followUpCommunityDomain = Boolean(
    createCommunityState?.follow_up_community_domain
  );
  const followUpCommunityDomainPath =
    safeStr(createCommunityState?.follow_up_path) || "/community-domain/purchase";
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 720 : false
  );

  const [me, setMe] = useState<any>(null);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number>(0);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteState, setInviteState] = useState<InviteState | null>(null);
  const [copied, setCopied] = useState("");
  const [inviteComposerOpen, setInviteComposerOpen] = useState(false);
  const [qrSheetOpen, setQrSheetOpen] = useState(false);
  const [qrPolicyKey, setQrPolicyKey] = useState<CommunityQrPolicyKey>("reviewed_access");
  const [qrPreApprovals, setQrPreApprovals] = useState<QrPreApprovalItem[]>([]);
  const [qrPreApprovalLoading, setQrPreApprovalLoading] = useState(false);
  const [qrPreApprovalSaving, setQrPreApprovalSaving] = useState(false);
  const [qrPreApprovalMessage, setQrPreApprovalMessage] = useState("");
  const [qrPreApprovalForm, setQrPreApprovalForm] = useState({
    display_name: "",
    phone_e164: "",
    email: "",
    gmfn_id: "",
    approval_note: "",
  });
  const [qrPreApprovalBulkText, setQrPreApprovalBulkText] = useState("");
  const [qrPreApprovalBulkSaving, setQrPreApprovalBulkSaving] = useState(false);

  const [communityNameInput, setCommunityNameInput] = useState(
    safeStr(createCommunityState?.name)
  );
  const [communityDescriptionInput, setCommunityDescriptionInput] = useState(
    safeStr(createCommunityState?.description)
  );
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  const [inviteReceiver, setInviteReceiver] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsCompact(window.innerWidth <= 720);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function loadCommunities(preferredId?: number) {
    setLoadingCommunities(true);
    try {
      const [meRes, res] = await Promise.all([
        getMe().catch(() => null),
        listMyClans().catch(() => []),
      ]);

      const rows: CommunityItem[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.items)
        ? (res as any).items
        : [];

      setMe(meRes || null);
      setCommunities(rows);

      const storedId = Number(getSelectedClanId() || 0);
      const fallbackId = Number(preferredId || storedId || rows?.[0]?.id || 0);

      setSelectedCommunityId(fallbackId || 0);
    } finally {
      setLoadingCommunities(false);
    }
  }

  useEffect(() => {
    loadCommunities();
  }, []);

  async function loadQrPreApprovals(clanId: number) {
    if (!clanId) {
      setQrPreApprovals([]);
      return;
    }
    setQrPreApprovalLoading(true);
    try {
      const res = await listClanQrPreApprovals(clanId);
      setQrPreApprovals(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setQrPreApprovals([]);
    } finally {
      setQrPreApprovalLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedCommunityId) {
      setQrPreApprovals([]);
      return;
    }
    void loadQrPreApprovals(selectedCommunityId);
  }, [selectedCommunityId]);

  const selectedCommunity = useMemo(() => {
    return (
      communities.find((item) => Number(item?.id || 0) === selectedCommunityId) ||
      null
    );
  }, [communities, selectedCommunityId]);

  const communityCount = communities.length;
  const selectedCommunityMemberCount = selectedCommunity
    ? extractMembers(selectedCommunity).length
    : 0;
  const selectedQrPolicy = communityQrPolicyByKey(qrPolicyKey);
  const activeQrPreApprovals = qrPreApprovals.filter(
    (item) => safeStr(item.status || "active") === "active"
  );
  const recentQrPreApprovals = qrPreApprovals.slice(0, 4);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedCommunityId, "clans.route.dashboard"),
      community: routeTarget("communityHome", selectedCommunityId, "clans.route.community"),
      communityDetail: selectedCommunityId
        ? routeTarget("communityDetail", selectedCommunityId, "clans.route.community-detail")
        : routeTarget("communityHome", selectedCommunityId, "clans.route.community-fallback"),
      buildFirstCircle: routeTarget(
        "buildFirstCircle",
        selectedCommunityId,
        "clans.route.build-first-circle"
      ),
      demandBox: routeTarget("demandBox", selectedCommunityId, "clans.route.demand-box"),
      shop: routeTarget("shop", selectedCommunityId, "clans.route.shop"),
      marketplace: routeTarget("marketplace", selectedCommunityId, "clans.route.marketplace"),
    }),
    [selectedCommunityId]
  );

  const senderName = safeStr(
    me?.display_name || me?.full_name || me?.nickname || me?.email || "Community member"
  );

  async function handleSelectCommunity(clanId: number) {
    if (!clanId) return;
    try {
      await selectClan(clanId).catch(() => null);
    } finally {
      setSelectedCommunityId(clanId);
      setInviteState(null);
      setQrSheetOpen(false);
      setCreateMessage("");
      setQrPreApprovalMessage("");
    }
  }

  function updateQrPreApprovalForm(field: keyof typeof qrPreApprovalForm, value: string) {
    setQrPreApprovalForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveQrPreApproval() {
    if (!selectedCommunityId) return;

    const payload = {
      display_name: safeStr(qrPreApprovalForm.display_name) || null,
      phone_e164: safeStr(qrPreApprovalForm.phone_e164) || null,
      email: safeStr(qrPreApprovalForm.email) || null,
      gmfn_id: safeStr(qrPreApprovalForm.gmfn_id) || null,
      approval_note: safeStr(qrPreApprovalForm.approval_note) || null,
    };

    if (!payload.phone_e164 && !payload.email && !payload.gmfn_id) {
      setQrPreApprovalMessage("Add a phone number, email, or GSN ID first.");
      return;
    }

    setQrPreApprovalSaving(true);
    setQrPreApprovalMessage("");
    try {
      const res = await createClanQrPreApproval(selectedCommunityId, payload);
      setQrPreApprovalMessage(
        res?.created ? "Pre-approved entry saved." : "Pre-approved entry updated."
      );
      setQrPreApprovalForm({
        display_name: "",
        phone_e164: "",
        email: "",
        gmfn_id: "",
        approval_note: "",
      });
      await loadQrPreApprovals(selectedCommunityId);
    } catch (err: any) {
      setQrPreApprovalMessage(err?.message || "Could not save this pre-approved entry.");
    } finally {
      setQrPreApprovalSaving(false);
    }
  }

  async function handleBulkSaveQrPreApprovals() {
    if (!selectedCommunityId) return;
    const parsed = parseQrPreApprovalBulkText(qrPreApprovalBulkText);
    if (!parsed.entries.length) {
      setQrPreApprovalMessage("Paste at least one line with phone, email, or GSN ID.");
      return;
    }

    setQrPreApprovalBulkSaving(true);
    setQrPreApprovalMessage("");
    try {
      const res = await bulkCreateClanQrPreApprovals(selectedCommunityId, parsed.entries);
      const created = Number(res?.created_count || 0);
      const updated = Number(res?.updated_count || 0);
      const skipped = Number(res?.skipped_count || 0) + parsed.ignored;
      const skippedText = skipped ? ` ${skipped} skipped.` : "";
      setQrPreApprovalMessage(`Bulk import saved: ${created} new, ${updated} updated.${skippedText}`);
      setQrPreApprovalBulkText("");
      await loadQrPreApprovals(selectedCommunityId);
    } catch (err: any) {
      setQrPreApprovalMessage(err?.message || "Could not import these pre-approved entries.");
    } finally {
      setQrPreApprovalBulkSaving(false);
    }
  }
  function handleDownloadQrPreApprovalTemplate() {
    const rows = [
      "Name,Phone number,Email,GSN ID,Approval note",
      "Ada Market,+2348011112222,,,Known member",
      "John Trader,,john@example.com,,Paid dues",
      "Existing Member,,,GSN-10293,Already has GSN ID",
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gsn-pre-approved-members-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setQrPreApprovalMessage("Template prepared for your member list.");
  }

  async function handleQrPreApprovalFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 256 * 1024) {
      setQrPreApprovalMessage("Use a smaller file for this quick import.");
      event.target.value = "";
      return;
    }
    try {
      const body = await file.text();
      const cleanBody = safeStr(body);
      setQrPreApprovalBulkText(cleanBody);
      const parsed = parseQrPreApprovalBulkText(cleanBody);
      setQrPreApprovalMessage(
        parsed.entries.length
          ? `Loaded ${parsed.entries.length} usable entries from ${file.name}.`
          : "No usable phone, email, or GSN ID found in that file."
      );
    } catch {
      setQrPreApprovalMessage("Could not read that file. Try pasting the list instead.");
    } finally {
      event.target.value = "";
    }
  }
  async function handleDeactivateQrPreApproval(item: QrPreApprovalItem) {
    const id = Number(item.id || 0);
    if (!selectedCommunityId || !id) return;
    setQrPreApprovalSaving(true);
    setQrPreApprovalMessage("");
    try {
      await updateClanQrPreApprovalStatus(selectedCommunityId, id, "inactive");
      setQrPreApprovalMessage("Pre-approved entry turned off.");
      await loadQrPreApprovals(selectedCommunityId);
    } catch (err: any) {
      setQrPreApprovalMessage(err?.message || "Could not update this pre-approved entry.");
    } finally {
      setQrPreApprovalSaving(false);
    }
  }

  async function handleCreateInvite() {
    if (!selectedCommunityId || !selectedCommunity) return;

    setInviteLoading(true);
    try {
      const res = await createClanInvite(selectedCommunityId);
      const source = res || {};
      const nextInviteState = buildInviteState(
        source,
        senderName,
        inviteReceiver,
        inviteMessage,
        communityName(selectedCommunity)
      );

      if (!safeStr(nextInviteState.link) || !safeStr(nextInviteState.code)) {
        throw new Error(
          "GSN could not prepare a fresh join link yet. Please try again."
        );
      }

      setInviteState(
        nextInviteState
      );
      setInviteComposerOpen(false);
    } catch {
      setInviteState(null);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCreateCommunityQrPack() {
    if (!selectedCommunityId || !selectedCommunity) return;

    setInviteLoading(true);
    try {
      const res = await getClanInviteLink(selectedCommunityId, { qr_policy_key: qrPolicyKey });
      const source = res || {};
      const nextInviteState = buildInviteState(
        source,
        senderName,
        "",
        selectedQrPolicy.announcement,
        communityName(selectedCommunity),
        { qr_policy: qrPolicyKey }
      );

      if (!safeStr(nextInviteState.link) || !safeStr(nextInviteState.code)) {
        throw new Error(
          "GSN could not prepare a community QR link yet. Please try again."
        );
      }

      setInviteState(nextInviteState);
      setInviteComposerOpen(false);
    } catch {
      setInviteState(null);
    } finally {
      setInviteLoading(false);
    }
  }

  function copyText(value: string, tag: string) {
    const text = safeStr(value);
    if (!text) return;

    safeCopy(text);
    setCopied(tag);
    window.setTimeout(() => setCopied(""), 1400);
  }

  function shareViaWhatsApp() {
    const text = safeStr(inviteState?.whatsappShareText || "");
    if (!text) return;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function communityQrAnnouncementText(): string {
    const title = selectedCommunity ? communityName(selectedCommunity) : "this community";
    const link = safeStr(inviteState?.link || "");

    return [
      `${title} is opening GSN community access.`,
      "Scan the QR code or use the link to begin your join request.",
      selectedQrPolicy.announcement,
      selectedQrPolicy.boundary,
      link ? `Join link: ${link}` : "",
      "Sent through GSN",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function copyCommunityQrAnnouncement() {
    copyText(communityQrAnnouncementText(), "qr-announcement");
  }

  function printCommunityQrSheet() {
    window.print();
  }

  async function handleCreateCommunity(e: React.FormEvent) {
    e.preventDefault();

    const name = safeStr(communityNameInput);
    const description = safeStr(communityDescriptionInput);

    if (!name) return;

    setCreatingCommunity(true);
    try {
      const res = await createClan({
        name,
        description: description || undefined,
      }).catch(() => null);

      const newId = Number((res as any)?.id || 0);
      await loadCommunities(newId || undefined);

      if (newId) {
        await selectClan(newId).catch(() => null);
        setSelectedCommunityId(newId);
      }

      const createdCommunityName = name;
      setCommunityNameInput("");
      setCommunityDescriptionInput("");
      setInviteState(null);

      if (newId && followUpCommunityDomain) {
        navigateWithOrigin(navigate, followUpCommunityDomainPath, location, {
          replace: false,
          state: {
            community_domain_anchor: {
              clan_id: newId,
              clan_name: createdCommunityName,
            },
            source: "community-domain-local-anchor-created",
          },
        });
        return;
      }
      if (newId) {
        navigateWithOrigin(navigate, routes.buildFirstCircle, location, {
          replace: false,
          state: {
            created_clan_id: newId,
            created_clan_name: createdCommunityName,
            next_action: "invite-trusted-people",
          },
        });
        return;
      }

      setCreateMessage(
        "Community created. GSN could not open the next page automatically, so choose the new community below and continue into your next step."
      );
    } finally {
      setCreatingCommunity(false);
    }
  }

  async function handleOpenMarketplace(clanId: number) {
    if (!clanId) return;
    await handleSelectCommunity(clanId);
    navigateWithOrigin(
      navigate,
      routeTarget("marketplace", clanId, "clans.community.marketplace-target"),
      location
    );
  }

  return (
    <div
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        padding: isCompact ? "0 10px calc(104px + env(safe-area-inset-bottom, 0px))" : 0,
        paddingBottom: isCompact
          ? "calc(104px + env(safe-area-inset-bottom, 0px))"
          : 36,
        display: "grid",
        gap: isCompact ? 12 : 18,
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <ExplainToggle
        label="What this screen does"
        what="This screen helps you create a new community or return to a community you already belong to."
        why="It keeps community creation and community selection in one guided place instead of scattering them across the app."
        next="If you are starting something new, create the community first. If you already belong somewhere, choose the community you want to enter."
        tone="light"
      />

      <div
        style={{
          ...pageCard(
            "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(249,240,224,0.97) 56%, rgba(242,228,205,0.95) 100%)"
          ),
          marginTop: isCompact ? 10 : 18,
          padding: isCompact ? 16 : 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div style={sectionLabel()}>Create Community</div>

            <h1
              style={{
                margin: "14px 0 8px",
                fontSize: isCompact ? 24 : 30,
                lineHeight: 1.15,
                color: "#241A12",
              }}
            >
              Create a new community
            </h1>

            <div
              style={{
                color: "#5F5143",
                fontSize: isCompact ? 14 : 15,
                lineHeight: isCompact ? 1.55 : 1.7,
                maxWidth: 760,
              }}
            >
              Start here with community creation. Create a community, select the one
              you want active, then move into invite, demand, marketplace, shop,
              or Community Home.
            </div>
          </div>

          <div
            style={{
              minWidth: isCompact ? 0 : 240,
              width: isCompact ? "100%" : undefined,
              flex: isCompact ? "1 1 100%" : "0 1 300px",
              ...softCard("rgba(255,252,246,0.96)"),
              border: "1px solid rgba(190,143,55,0.18)",
              boxShadow: "0 18px 38px rgba(54,38,24,0.12)",
            }}
          >
            <div style={{ fontSize: 13, color: "#6B5D50", fontWeight: 900 }}>
              Quick links
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <StableCtaLink
                to={routes.community}
                debugId="clans.quick.community"
                style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
              >
                Community Home
              </StableCtaLink>
              <StableCtaLink
                to={routes.dashboard}
                kind="primary"
                debugId="clans.quick.dashboard"
                style={{ ...btn(true), width: isCompact ? "100%" : undefined }}
              >
                Dashboard
              </StableCtaLink>
            </div>
          </div>
        </div>

        <ExplainToggle
          label="What this does"
          what="This create-community block starts a new community and reminds you that the next steps continue into activation, invite, and community work."
          why="It helps you treat community creation as the first guided move, not the whole workflow."
          next="Create the community here first, then select it and move into the next page you need."
          tone="dark"
          style={{ marginTop: 14 }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: isCompact ? 10 : 14,
          order: isCompact ? 2 : undefined,
        }}
      >
        <div style={card()}>
          <div style={{ fontSize: 13, color: "#6B5D50", fontWeight: 800 }}>
            My communities
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#241A12",
            }}
          >
            {communityCount}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 13, color: "#6B5D50", fontWeight: 800 }}>
            Selected community
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 1000,
              color: "#241A12",
              lineHeight: 1.35,
            }}
          >
            {selectedCommunity ? communityName(selectedCommunity) : "None selected"}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 13, color: "#6B5D50", fontWeight: 800 }}>
            Selected members
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#241A12",
            }}
          >
            {selectedCommunityMemberCount}
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), order: isCompact ? 1 : undefined }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1.05fr 0.95fr",
            gap: isCompact ? 12 : 16,
            alignItems: "start",
          }}
        >
          <div style={{ ...softCard(), minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#241A12" }}>
              Community creation form
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#6B5D50",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Keep the name clear and the description short. This stays
              creation-first, not overloaded with extra control pages.
            </div>

            {createMessage ? (
              <div
                style={{
                  marginTop: 14,
                  borderRadius: 14,
                  border: "1px solid #A7F3D0",
                  background: "#ECFDF5",
                  color: "#065F46",
                  fontWeight: 900,
                  padding: 12,
                }}
              >
                {createMessage}
              </div>
            ) : null}

            <form
              onSubmit={handleCreateCommunity}
              style={{
                marginTop: 14,
                display: "grid",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#3A2A1C",
                    fontWeight: 900,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  Community name
                </div>
                <input
                  value={communityNameInput}
                  onChange={(e) => setCommunityNameInput(e.target.value)}
                  placeholder="Enter community name"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(128,91,44,0.16)",
                    padding: "12px 14px",
                    outline: "none",
                    fontSize: 16,
                    color: "#241A12",
                    background: "#FFFFFF",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    color: "#3A2A1C",
                    fontWeight: 900,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  Short description
                </div>
                <textarea
                  value={communityDescriptionInput}
                  onChange={(e) => setCommunityDescriptionInput(e.target.value)}
                  placeholder="Describe what this community represents"
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(128,91,44,0.16)",
                    padding: "12px 14px",
                    outline: "none",
                    fontSize: 16,
                    color: "#241A12",
                    background: "#FFFFFF",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <PrimaryButton
                  type="submit"
                  busy={creatingCommunity}
                  busyLabel="Creating..."
                  debugId="clans.create-community"
                  style={{
                    ...btn(true, creatingCommunity || !safeStr(communityNameInput)),
                    width: isCompact ? "100%" : undefined,
                  }}
                  disabled={creatingCommunity || !safeStr(communityNameInput)}
                >
                  Create community
                </PrimaryButton>

                <StableCtaLink
                  to={routes.community}
                  debugId="clans.create.open-community"
                  style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                >
                  Open Community Home
                </StableCtaLink>
              </div>
            </form>
          </div>

          <div style={{ ...softCard(), minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#241A12" }}>
              Current community
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#6B5D50",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Use one current community as your active base for next steps.
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  color: "#3A2A1C",
                  fontWeight: 900,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                Active community
              </div>

              <select
                value={selectedCommunityId || ""}
                onChange={(e) => handleSelectCommunity(Number(e.target.value))}
                disabled={loadingCommunities || communities.length === 0}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(128,91,44,0.16)",
                  background: "#FFFFFF",
                  padding: "12px 14px",
                  fontSize: 16,
                  color: "#241A12",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                {communities.length === 0 ? (
                  <option value="">No communities available</option>
                ) : (
                  communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {communityName(community)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={card("#F8FBFF")}>
                <div style={{ color: "#241A12", fontWeight: 1000, fontSize: 16 }}>
                  {selectedCommunity
                    ? communityName(selectedCommunity)
                    : "No community selected"}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {selectedCommunity ? (
                    <>
                      <span style={badge(true)}>
                        ID: {communityIdentity(selectedCommunity)}
                      </span>
                      <span style={badge(false)}>
                        Members: {selectedCommunityMemberCount}
                      </span>
                    </>
                  ) : null}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#6B5D50",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {selectedCommunity
                    ? safeStr(
                        selectedCommunity.description ||
                          "Community governance and relationship layer."
                      )
                    : "Create or select a community to continue."}
                </div>
              </div>

              <div style={card()}>
                <div style={{ color: "#241A12", fontWeight: 1000, fontSize: 16 }}>
                  After creation / next steps
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#6B5D50",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  Move from creation into the pages that matter next.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <StableCtaLink
                    to={routes.communityDetail}
                    debugId="clans.next.community"
                    style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  >
                    Community Home
                  </StableCtaLink>
                  <StableCtaLink
                    to={routes.demandBox}
                    debugId="clans.next.demand-box"
                    style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  >
                    Demand Box
                  </StableCtaLink>
                  <StableCtaLink
                    to={routes.shop}
                    debugId="clans.next.shop-control"
                    style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  >
                    My Shop Tools
                  </StableCtaLink>
                  <StableCtaLink
                    to={routes.marketplace}
                    debugId="clans.next.marketplace"
                    style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  >
                    Marketplace
                  </StableCtaLink>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(128,91,44,0.10)",
                    background: "#F8FBFF",
                    padding: 12,
                    color: "#6B5D50",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Spotlight entry has no separate page active yet. Use shop tools
                  and marketplace visibility for now.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), order: isCompact ? 3 : undefined }}>
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
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#241A12" }}>
              Invite package
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#6B5D50",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Create a QR and join package for your current community. People can scan it to request access; approval still stays with the community. Choose the entry policy before sharing.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              minWidth: isCompact ? "100%" : 280,
              flex: isCompact ? undefined : "1 1 280px",
            }}
          >
            <div style={sectionLabel()}>QR entry policy</div>
            <select
              value={qrPolicyKey}
              onChange={(event) =>
                setQrPolicyKey(event.target.value as CommunityQrPolicyKey)
              }
              style={{ ...inputStyle(), fontWeight: 900 }}
              aria-label="QR entry policy"
            >
              {COMMUNITY_QR_POLICIES.map((policy) => (
                <option key={policy.key} value={policy.key}>
                  {policy.label}
                </option>
              ))}
            </select>
            <div
              style={{
                color: "#6B5D50",
                fontSize: 13,
                lineHeight: 1.55,
                fontWeight: 750,
              }}
            >
              {selectedQrPolicy.summary}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              width: isCompact ? "100%" : undefined,
            }}
          >
            <PrimaryButton
              style={{
                ...btn(true, !selectedCommunityId || inviteLoading),
                width: isCompact ? "100%" : undefined,
              }}
              onClick={() => void handleCreateCommunityQrPack()}
              disabled={!selectedCommunityId || inviteLoading}
              busy={inviteLoading}
              busyLabel="Creating..."
              debugId="clans.invite.create-community-qr.top"
            >
              Create community QR
            </PrimaryButton>
            <SecondaryButton
              style={{
                ...btn(false, !selectedCommunityId || inviteLoading),
                width: isCompact ? "100%" : undefined,
              }}
              onClick={() => setInviteComposerOpen(true)}
              disabled={!selectedCommunityId || inviteLoading}
              debugId="clans.invite.open-form.top"
            >
              Personal invite
            </SecondaryButton>
          </div>
        </div>

        <div style={{ ...softCard(), marginTop: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 0.9fr) minmax(0, 1.1fr)",
              gap: 14,
              alignItems: "start",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 1000, color: "#241A12" }}>
                Pre-approved entry
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#6B5D50",
                  fontSize: 13,
                  lineHeight: 1.65,
                  fontWeight: 750,
                }}
              >
                Add people the community already accepts. If their scan matches phone, email, or GSN ID, GSN approves the join request and still keeps verification separate.
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  color: "#6B5D50",
                  fontSize: 13,
                  fontWeight: 850,
                }}
              >
                <span>{activeQrPreApprovals.length} active</span>
                <span>{qrPreApprovals.length} total</span>
                {qrPreApprovalLoading ? <span>Loading...</span> : null}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}
              >
                <input
                  value={qrPreApprovalForm.display_name}
                  onChange={(event) => updateQrPreApprovalForm("display_name", event.target.value)}
                  placeholder="Name"
                  style={inputStyle()}
                />
                <input
                  value={qrPreApprovalForm.phone_e164}
                  onChange={(event) => updateQrPreApprovalForm("phone_e164", event.target.value)}
                  placeholder="Phone number"
                  style={inputStyle()}
                />
                <input
                  value={qrPreApprovalForm.email}
                  onChange={(event) => updateQrPreApprovalForm("email", event.target.value)}
                  placeholder="Email"
                  style={inputStyle()}
                />
                <input
                  value={qrPreApprovalForm.gmfn_id}
                  onChange={(event) => updateQrPreApprovalForm("gmfn_id", event.target.value)}
                  placeholder="GSN ID"
                  style={inputStyle()}
                />
              </div>
              <input
                value={qrPreApprovalForm.approval_note}
                onChange={(event) => updateQrPreApprovalForm("approval_note", event.target.value)}
                placeholder="Approval note"
                style={inputStyle()}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "#6B5D50", fontSize: 13, fontWeight: 800 }}>
                  {qrPreApprovalMessage || "Match uses phone, email, or existing GSN ID."}
                </div>
                <PrimaryButton
                  type="button"
                  onClick={() => void handleSaveQrPreApproval()}
                  disabled={!selectedCommunityId || qrPreApprovalSaving}
                  busy={qrPreApprovalSaving}
                  busyLabel="Saving..."
                  debugId="clans.qr-preapproval.save"
                  style={{ ...btn(true, !selectedCommunityId || qrPreApprovalSaving), width: isCompact ? "100%" : undefined }}
                >
                  Save pre-approval
                </PrimaryButton>
              </div>

              <details
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(36,26,18,0.08)",
                  background: "rgba(255,255,255,0.62)",
                  padding: "10px 12px",
                }}
              >
                <summary
                  style={{
                    color: "#241A12",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 950,
                  }}
                >
                  Paste many at once
                </summary>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv,text/csv,text/plain"
                      onChange={handleQrPreApprovalFileUpload}
                      style={inputStyle()}
                    />
                    <SecondaryButton
                      type="button"
                      onClick={handleDownloadQrPreApprovalTemplate}
                      debugId="clans.qr-preapproval.template"
                      style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                    >
                      Download template
                    </SecondaryButton>
                  </div>
                  <textarea
                    value={qrPreApprovalBulkText}
                    onChange={(event) => setQrPreApprovalBulkText(event.target.value)}
                    placeholder={"Ada Market, +234 801 111 2222\nJohn Trader | john@example.com | Paid dues\nGSN-10293"}
                    rows={5}
                    style={{ ...textareaStyle(), minHeight: 110 }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ color: "#6B5D50", fontSize: 12, fontWeight: 800 }}>
                      One person per line. GSN ignores name-only lines.
                    </div>
                    <SecondaryButton
                      type="button"
                      onClick={() => void handleBulkSaveQrPreApprovals()}
                      disabled={!selectedCommunityId || qrPreApprovalSaving || qrPreApprovalBulkSaving}
                      debugId="clans.qr-preapproval.bulk-save"
                      style={{
                        ...btn(false, !selectedCommunityId || qrPreApprovalSaving || qrPreApprovalBulkSaving),
                        width: isCompact ? "100%" : undefined,
                      }}
                    >
                      {qrPreApprovalBulkSaving ? "Importing..." : "Import list"}
                    </SecondaryButton>
                  </div>
                </div>
              </details>
              {recentQrPreApprovals.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {recentQrPreApprovals.map((item) => {
                    const isActive = safeStr(item.status || "active") === "active";
                    const title = safeStr(
                      item.display_name || item.gmfn_id || item.phone_e164 || item.email || "Pre-approved member"
                    );
                    const detail = safeStr(
                      item.gmfn_id || item.phone_e164 || item.email || item.match_value || "Ready for matching"
                    );
                    return (
                      <div
                        key={item.id || `${item.match_type}-${item.match_value}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                          gap: 8,
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.72)",
                          border: "1px solid rgba(36,26,18,0.08)",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#241A12", fontWeight: 950 }}>{title}</div>
                          <div style={{ marginTop: 2, color: "#6B5D50", fontSize: 12, fontWeight: 750 }}>
                            {isActive ? "Active" : "Inactive"} - {detail}
                            {item.matched_join_request_id ? " - matched" : ""}
                          </div>
                        </div>
                        {isActive ? (
                          <SecondaryButton
                            type="button"
                            onClick={() => void handleDeactivateQrPreApproval(item)}
                            disabled={qrPreApprovalSaving}
                            debugId="clans.qr-preapproval.deactivate"
                            style={{ ...btn(false, qrPreApprovalSaving), width: isCompact ? "100%" : undefined }}
                          >
                            Turn off
                          </SecondaryButton>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
          gap: isCompact ? 12 : 16,
        }}
      >
          <div style={{ ...softCard(), minWidth: 0 }}>
            <div
              style={{
                color: "#241A12",
                fontWeight: 1000,
                fontSize: 16,
              }}
            >
              Invite form summary
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={modalChip(true)}>Sender known</span>
                <span style={modalChip(false)}>
                  {selectedCommunity ? communityName(selectedCommunity) : "No community selected"}
                </span>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(128,91,44,0.10)",
                  background:
                    "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
                  padding: "12px 14px",
                  color: "#3A2A1C",
                  fontWeight: 700,
                }}
              >
                Sender: {senderName}
              </div>

              <div style={{ color: "#6B5D50", lineHeight: 1.7, fontSize: 14 }}>
                Use the invite form to attach the receiver name and short note
                before the join package is generated.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <PrimaryButton
                  style={{
                    ...btn(true, !selectedCommunityId || inviteLoading),
                    width: isCompact ? "100%" : undefined,
                  }}
                  onClick={() => void handleCreateCommunityQrPack()}
                  disabled={!selectedCommunityId || inviteLoading}
                  busy={inviteLoading}
                  busyLabel="Creating..."
                  debugId="clans.invite.create-community-qr.summary"
                >
                  Create community QR
                </PrimaryButton>
                <SecondaryButton
                  style={{
                    ...btn(false, !selectedCommunityId || inviteLoading),
                    width: isCompact ? "100%" : undefined,
                  }}
                  onClick={() => setInviteComposerOpen(true)}
                  disabled={!selectedCommunityId || inviteLoading}
                  debugId="clans.invite.open-form.summary"
                >
                  Personal invite
                </SecondaryButton>
              </div>
            </div>
          </div>

          <div style={{ ...softCard(), minWidth: 0 }}>
            {!selectedCommunityId ? (
              <div style={{ color: "#6B5D50", lineHeight: 1.7 }}>
                Select a community to create an invitation.
              </div>
            ) : inviteState?.link || inviteState?.code ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={card("#F8FBFF")}>
                  <div
                    style={{
                      color: "#241A12",
                      fontWeight: 1000,
                      fontSize: 16,
                    }}
                  >
                    Invitation ready
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#6B5D50",
                      fontSize: 14,
                      lineHeight: 1.7,
                    }}
                  >
                    Show this QR at a meeting or send the link. It starts a join request; it does not approve membership. Current policy: {selectedQrPolicy.label}.
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    {inviteState.link ? (
                      <div
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(190,143,55,0.22)",
                          background: "#FFFFFF",
                          padding: isCompact ? 14 : 16,
                          display: "grid",
                          gap: 12,
                          justifyItems: "center",
                        }}
                      >
                        <div style={{ ...sectionLabel(), textAlign: "center" }}>
                          Community join QR
                        </div>
                        <div
                          style={{
                            borderRadius: 14,
                            border: "1px solid rgba(7,23,44,0.10)",
                            background: "#FFFFFF",
                            padding: 10,
                            lineHeight: 0,
                          }}
                        >
                          <QRCodeSVG
                            value={inviteState.link}
                            size={isCompact ? 168 : 196}
                            bgColor="#FFFFFF"
                            fgColor="#07172C"
                            level="M"
                            marginSize={1}
                          />
                        </div>
                        <div
                          style={{
                            color: "#5F5143",
                            fontSize: 13,
                            fontWeight: 800,
                            lineHeight: 1.5,
                            textAlign: "center",
                            maxWidth: 300,
                          }}
                        >
                          {selectedQrPolicy.scanCopy}
                        </div>
                      </div>
                    ) : null}
                    {inviteState.code ? (
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B5D50",
                            fontWeight: 900,
                            marginBottom: 6,
                            textTransform: "uppercase",
                          }}
                        >
                          Invite code
                        </div>
                        <div
                          style={{
                            borderRadius: 12,
                            border: "1px solid rgba(128,91,44,0.10)",
                            background:
                              "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
                            padding: "12px 14px",
                            color: "#241A12",
                            fontWeight: 900,
                            wordBreak: "break-word",
                          }}
                        >
                          {inviteState.code}
                        </div>
                      </div>
                    ) : null}

                    {inviteState.link ? (
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B5D50",
                            fontWeight: 900,
                            marginBottom: 6,
                            textTransform: "uppercase",
                          }}
                        >
                          Join link
                        </div>
                        <div
                          style={{
                            borderRadius: 12,
                            border: "1px solid rgba(128,91,44,0.10)",
                            background:
                              "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
                            padding: "12px 14px",
                            color: "#241A12",
                            fontWeight: 700,
                            wordBreak: "break-word",
                          }}
                        >
                          {inviteState.link}
                        </div>
                      </div>
                    ) : null}

                    {inviteState.expiresAt ? (
                      <div
                        style={{
                          color: "#6B5D50",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Expiry: {safeDateTime(inviteState.expiresAt)}
                      </div>
                    ) : null}

                    {inviteState.whatsappShareText ? (
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B5D50",
                            fontWeight: 900,
                            marginBottom: 6,
                            textTransform: "uppercase",
                          }}
                        >
                          Share message
                        </div>
                        <div
                          style={{
                            borderRadius: 12,
                            border: "1px solid rgba(128,91,44,0.10)",
                            background:
                              "linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(246,235,216,0.96) 100%)",
                            padding: "12px 14px",
                            color: "#241A12",
                            fontWeight: 700,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            lineHeight: 1.7,
                          }}
                        >
                          {inviteState.whatsappShareText}
                        </div>
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {inviteState.link ? (
                        <SecondaryButton
                          style={btn(false)}
                          onClick={() => copyText(inviteState.link || "", "link")}
                          debugId="clans.invite.copy-link"
                        >
                          {copied === "link" ? "Copied link" : "Copy link"}
                        </SecondaryButton>
                      ) : null}

                      {inviteState.whatsappShareText ? (
                        <SecondaryButton
                          style={btn(false)}
                          onClick={() =>
                            copyText(inviteState.whatsappShareText || "", "share")
                          }
                          debugId="clans.invite.copy-package"
                        >
                          {copied === "share"
                            ? "Copied message"
                            : "Copy share message"}
                        </SecondaryButton>
                      ) : null}

                      {inviteState.link ? (
                        <SecondaryButton
                          style={btn(false)}
                          onClick={copyCommunityQrAnnouncement}
                          debugId="clans.invite.copy-qr-announcement"
                        >
                          {copied === "qr-announcement"
                            ? "Copied announcement"
                            : "Copy announcement"}
                        </SecondaryButton>
                      ) : null}

                      {inviteState.link ? (
                        <SecondaryButton
                          style={btn(false)}
                          onClick={() => setQrSheetOpen(true)}
                          debugId="clans.invite.open-qr-sheet"
                        >
                          QR sheet
                        </SecondaryButton>
                      ) : null}

                      {inviteState.guideUrl ? (
                        <SecondaryButton
                          style={btn(false)}
                          onClick={() => {
                            window.open(
                              inviteState.guideUrl || "",
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                          debugId="clans.invite.open-guide"
                        >
                          Open guide
                        </SecondaryButton>
                      ) : null}

                      {inviteState.whatsappShareText ? (
                        <PrimaryButton
                          style={{ ...btn(true), width: isCompact ? "100%" : undefined }}
                          onClick={shareViaWhatsApp}
                          debugId="clans.invite.share-whatsapp"
                        >
                          Share on WhatsApp
                        </PrimaryButton>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={card("#F8FBFF")}>
                <div
                  style={{
                    color: "#241A12",
                    fontWeight: 1000,
                    fontSize: 16,
                  }}
                >
                  No active invite yet
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#6B5D50",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  Create the community QR when you are ready. The package includes the join link, WhatsApp copy, selected policy, and approval-verification boundary.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {qrSheetOpen && inviteState?.link ? (
        <div style={{ ...overlayShell(), padding: isCompact ? 10 : 18 }}>
          <div
            style={{
              ...modalCard(),
              width: "min(100%, 560px)",
              maxHeight: isCompact ? "calc(100svh - 32px)" : undefined,
              overflowY: isCompact ? "auto" : "hidden",
            }}
          >
            <div style={{ ...darkPanel(), marginBottom: 16 }}>
              <div style={sectionLabel()}>GSN community access</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#241A12",
                  fontSize: isCompact ? 24 : 28,
                  fontWeight: 1000,
                  lineHeight: 1.12,
                }}
              >
                {selectedCommunity ? communityName(selectedCommunity) : "Community QR"}
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: "#5F5143",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {selectedQrPolicy.sheetIntro}
              </div>
            </div>

            <div
              style={{
                ...softCard("#FFFFFF"),
                display: "grid",
                gap: 14,
                justifyItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <span style={badge(true)}>
                  {selectedCommunity ? communityIdentity(selectedCommunity) : "Community ID"}
                </span>
                <span style={badge(false)}>Request access</span>
                <span style={badge(false)}>Approval required</span>
                <span style={badge(false)}>{selectedQrPolicy.badge}</span>
              </div>

              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(7,23,44,0.10)",
                  background: "#FFFFFF",
                  padding: 12,
                  lineHeight: 0,
                  boxShadow: "0 12px 28px rgba(7,23,44,0.08)",
                }}
              >
                <QRCodeSVG
                  value={inviteState.link}
                  size={isCompact ? 220 : 260}
                  bgColor="#FFFFFF"
                  fgColor="#07172C"
                  level="M"
                  marginSize={1}
                />
              </div>

              <div
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(128,91,44,0.10)",
                  background: "#F8FBFF",
                  padding: 12,
                  color: "#241A12",
                  fontSize: 13,
                  fontWeight: 800,
                  lineHeight: 1.55,
                  textAlign: "center",
                  wordBreak: "break-word",
                  boxSizing: "border-box",
                }}
              >
                {inviteState.link}
              </div>

              <div
                style={{
                  color: "#5F5143",
                  fontSize: 13,
                  lineHeight: 1.55,
                  textAlign: "center",
                }}
              >
                {selectedQrPolicy.boundary}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <SecondaryButton
                onClick={() => setQrSheetOpen(false)}
                style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                debugId="clans.qr-sheet.close"
              >
                Close
              </SecondaryButton>
              <SecondaryButton
                onClick={copyCommunityQrAnnouncement}
                style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                debugId="clans.qr-sheet.copy-announcement"
              >
                {copied === "qr-announcement" ? "Copied announcement" : "Copy announcement"}
              </SecondaryButton>
              <PrimaryButton
                onClick={printCommunityQrSheet}
                style={{ ...btn(true), width: isCompact ? "100%" : undefined }}
                debugId="clans.qr-sheet.print"
              >
                Print or save
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
      {inviteComposerOpen ? (
        <div style={{ ...overlayShell(), padding: isCompact ? 10 : 18 }}>
          <div
            style={{
              ...modalCard(),
              maxHeight: isCompact ? "calc(100svh - 32px)" : undefined,
              overflowY: isCompact ? "auto" : "hidden",
            }}
          >
            <div style={{ ...darkPanel(), marginBottom: 16 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 28%), radial-gradient(circle at bottom, rgba(123,181,255,0.10) 0%, rgba(123,181,255,0) 30%)",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#F3D06A",
                    fontWeight: 1000,
                    letterSpacing: 3.2,
                    textTransform: "uppercase",
                  }}
                >
                  GSN
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#241A12",
                    fontSize: 24,
                    fontWeight: 1000,
                    lineHeight: 1.2,
                  }}
                >
                  Invite sender form
                </div>
                <div
                  style={{
                    marginTop: 10,
                    color: "#5F5143",
                    fontSize: 14,
                    lineHeight: 1.7,
                    maxWidth: 560,
                  }}
                >
                  Fill the receiver name and short note here. GSN will use this
                  together with the selected community to prepare the outgoing join
                  invitation.
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={softCard()}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <span style={modalChip(true)}>Sender known</span>
                  <span style={modalChip(false)}>
                    {selectedCommunity ? communityName(selectedCommunity) : "No community selected"}
                  </span>
                </div>
                <div style={sectionLabel()}>Sender</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#241A12",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  {senderName}
                </div>
              </div>

              <div style={softCard()}>
                <div style={sectionLabel()}>Selected community</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#241A12",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  {selectedCommunity ? communityName(selectedCommunity) : "No community selected"}
                </div>
              </div>

              <div style={softCard()}>
                <div style={sectionLabel()}>Receiver name</div>
                <input
                  value={inviteReceiver}
                  onChange={(e) => setInviteReceiver(e.target.value)}
                  placeholder="Enter the name of the person you want to invite"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div style={softCard()}>
                <div style={sectionLabel()}>Short invitation note</div>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a short personal note"
                  rows={4}
                  style={{ ...textareaStyle(), marginTop: 8 }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <SecondaryButton
                  onClick={() => setInviteComposerOpen(false)}
                  style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                  disabled={inviteLoading}
                  debugId="clans.invite-modal.cancel"
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => void handleCreateInvite()}
                  style={{
                    ...btn(true, inviteLoading || !selectedCommunityId),
                    width: isCompact ? "100%" : undefined,
                  }}
                  disabled={inviteLoading || !selectedCommunityId}
                  busy={inviteLoading}
                  busyLabel="Creating..."
                  debugId="clans.invite-modal.create-package"
                >
                  Create invite package
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ ...pageCard(), order: isCompact ? 4 : undefined }}>
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
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#241A12" }}>
              Existing communities
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#6B5D50",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Keep this compact. Community Home remains the real main page.
            </div>
          </div>

          <StableCtaLink
            to={routes.community}
            kind="primary"
            debugId="clans.existing.open-community"
            style={{ ...btn(true), width: isCompact ? "100%" : undefined }}
          >
            Open Community Home
          </StableCtaLink>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 10,
          }}
        >
          {loadingCommunities ? (
            <div style={{ color: "#6B5D50", lineHeight: 1.7 }}>
              Loading your communities...
            </div>
          ) : communities.length === 0 ? (
            <div style={card("#F8FBFF")}>
              <div
                style={{
                  color: "#241A12",
                  fontWeight: 1000,
                  fontSize: 17,
                }}
              >
                No community yet
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#6B5D50",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                Create your first community above.
              </div>
            </div>
          ) : (
            communities.map((item, idx) => {
              const id = Number(item?.id || 0);
              const isActive = id === selectedCommunityId;
              const memberCount = extractMembers(item).length;

              return (
                <div
                  key={`${id || "community"}-${idx}`}
                  style={{
                    ...card(),
                    border: isActive
                      ? "1px solid rgba(174,121,32,0.30)"
                      : "1px solid rgba(128,91,44,0.10)",
                    boxShadow: isActive
                      ? "0 12px 28px rgba(174,121,32,0.12)"
                      : "0 12px 30px rgba(54,38,24,0.07)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: isCompact ? 0 : 220, flex: 1 }}>
                      <div
                        style={{
                          color: "#241A12",
                          fontWeight: 1000,
                          fontSize: 17,
                        }}
                      >
                        {communityName(item)}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#6B5D50",
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
                        {safeStr(
                          item?.description ||
                            "Community governance and relationship layer."
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(true)}>
                          ID: {communityIdentity(item)}
                        </span>
                        <span style={badge(false)}>
                          {memberCount} member{memberCount === 1 ? "" : "s"}
                        </span>
                        {isActive ? <span style={badge(false)}>Active</span> : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: isCompact ? "grid" : "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                        width: isCompact ? "100%" : undefined,
                      }}
                    >
                      <SecondaryButton
                        style={{
                          ...(isActive ? btn(true) : btn(false)),
                          width: isCompact ? "100%" : undefined,
                        }}
                        onClick={() => handleSelectCommunity(id)}
                        debugId={`clans.community.${id}.select`}
                      >
                        {isActive ? "Selected" : "Select"}
                      </SecondaryButton>

                      <SecondaryButton
                        style={{ ...btn(false), width: isCompact ? "100%" : undefined }}
                        onClick={() => handleOpenMarketplace(id)}
                        debugId={`clans.community.${id}.marketplace`}
                      >
                        Open Marketplace
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
