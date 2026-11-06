import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import PageTopNav from "../components/PageTopNav";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
} from "../components/StableButton";
import {
  adminApproveJoinRequest,
  type CommunityAdmissionMode,
  getCommunityAdmissionPolicy,
  getCommunityJoinRequests,
  getJoinApprovalStatus,
  issueJoinActivationAssistance,
  safeCopy,
  selectClan,
  updateCommunityAdmissionPolicy,
  voteOnJoinRequest,
} from "../lib/api";
import { navigateToCta, resolveCtaTarget, type CtaTarget } from "../lib/ctaTargets";
import {
  communityQrPolicyByKey,
  isCommunityQrPolicyKey,
} from "../lib/communityQrPolicies";
import { buildActionSuccessMessage } from "../lib/actionResponseProtocol";
import { emitWorkspaceDataChanged } from "../lib/workspaceEvents";

type JoinRequestItem = {
  id: number;
  clan_id?: number;
  community_code?: string | null;
  clan_name?: string | null;
  marketplace_name?: string | null;
  applicant_user_id?: number | null;
  applicant_name?: string | null;
  applicant_nickname?: string | null;
  applicant_phone_e164?: string | null;
  applicant_email?: string | null;
  applicant_gmfn_id?: string | null;
  invite_id?: number | null;
  invite_code?: string | null;
  qr_policy_key?: string | null;
  invited_by_user_id?: number | null;
  invited_by_email?: string | null;
  invited_by_display?: string | null;
  status?: string;
  created_at?: string;
  decided_at?: string | null;
  approvals?: number;
  rejects?: number;
  neutrals?: number;
  total_votes?: number;
  active_member_count?: number;
  required_approvals?: number;
  base_required_approvals?: number;
  qr_policy_required_approval_floor?: number;
  qr_policy_review_guardrail?: {
    approval_posture?: string | null;
    summary?: string | null;
    requires_manual_review?: boolean;
    requires_later_verification?: boolean;
    requires_payment_or_permit_check?: boolean;
    strict_multi_reviewer_review?: boolean;
    pilot_override_blocked?: boolean;
  } | null;
  threshold_ratio?: string;
  governance_profile?: any;
  admission_mode?: CommunityAdmissionMode;
  admission_mode_label?: string;
  voting_admin_override?: boolean;
  admin_approval_available?: boolean;
  admin_approval_basis?: string | null;
  reviewer_can_admin_approve?: boolean;
};

type ApprovalResult = {
  ok?: boolean;
  status?: string;
  gmfn_id?: string | null;
  user_id?: number;
  membership_id?: number;
  message?: string;
  community_id?: number;
  community_code?: string | null;
  community_name?: string | null;
  marketplace_name?: string | null;
  invited_by_user_id?: number | null;
  invited_by_email?: string | null;
  invited_by_display?: string | null;
  activation_link?: string | null;
  activation_message?: string | null;
  lineage?: {
    origin_community_id?: number;
    origin_community_code?: string | null;
    origin_community_name?: string | null;
    inviter_user_id?: number | null;
    invite_id?: number | null;
    join_request_id?: number | null;
  } | null;
};

type ActivationAssistanceResult = {
  ok?: boolean;
  request_id?: number;
  community_id?: number;
  gmfn_id?: string | null;
  code?: string | null;
  expires_at?: string | null;
  expires_in_seconds?: number;
  activation_link?: string | null;
  phone_verified?: boolean;
  message?: string | null;
};

type VoteResponse = {
  ok?: boolean;
  community_id?: number;
  community_code?: string | null;
  approved_now?: boolean;
  rejected_now?: boolean;
  pilot_override?: boolean;
  admin_approval_basis?: string | null;
  status_already_final?: boolean;
  message?: string | null;
  approval_result?: ApprovalResult | null;
  rejection_result?: {
    status?: string;
    decision_message?: string | null;
    approval_path?: string | null;
  } | null;
  request?: JoinRequestItem;
};

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100%",
    margin: "0",
    padding: "0 clamp(12px, 4vw, 20px) 34px",
    background:
      "radial-gradient(circle at 82% 6%, rgba(53,111,181,0.22) 0%, rgba(53,111,181,0) 32%), radial-gradient(circle at 4% 38%, rgba(64,112,169,0.16) 0%, rgba(64,112,169,0) 28%), linear-gradient(180deg, #031222 0%, #061B2D 36%, #08233A 100%)",
    boxSizing: "border-box",
    overflowX: "hidden",
  };
}

function contentRail(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "min(980px, 100%)",
    minWidth: 0,
    margin: "0 auto",
    display: "grid",
    gap: 16,
    boxSizing: "border-box",
    overflowX: "hidden",
  };
}

function darkPanel(padding = 18): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    borderRadius: 22,
    border: "1px solid rgba(123,161,204,0.30)",
    background:
      "linear-gradient(180deg, rgba(8,32,57,0.96) 0%, rgba(6,24,43,0.985) 100%)",
    boxShadow:
      "0 22px 54px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding,
    boxSizing: "border-box",
  };
}

function whitePanel(padding = 18): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 34px rgba(0,0,0,0.16)",
    padding,
    boxSizing: "border-box",
  };
}

function sectionLabel(color = "#D6AA45"): React.CSSProperties {
  return {
    fontSize: 12,
    color,
    fontWeight: 1000,
    letterSpacing: 0.55,
    textTransform: "uppercase",
  };
}


function requestFactTile(): React.CSSProperties {
  return {
    minWidth: 0,
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 0,
    padding: "9px 11px",
    minHeight: 62,
    background: "#FBFCFE",
    boxSizing: "border-box",
  };
}

function requestFactLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.1,
  };
}

function requestFactValue(): React.CSSProperties {
  return {
    marginTop: 5,
    color: "#0B1F33",
    fontWeight: 900,
    lineHeight: 1.35,
    wordBreak: "break-word",
  };
}

function navActionStyle(kind: "light" | "blue" = "light"): React.CSSProperties {
  const blue = kind === "blue";
  return {
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
    minHeight: 58,
    height: 58,
    maxHeight: 58,
    borderRadius: 14,
    padding: "0 10px",
    fontSize: 13,
    fontWeight: 1000,
    lineHeight: 1.08,
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "clip",
    overflowWrap: "normal",
    wordBreak: "normal",
    background: blue
      ? "linear-gradient(180deg, #2278F2 0%, #0D57C7 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F5F8FC 100%)",
    color: blue ? "#FFFFFF" : "#0B1F33",
    border: blue ? "1px solid rgba(172,204,255,0.42)" : "1px solid rgba(11,31,51,0.08)",
    boxShadow: blue
      ? "0 14px 24px rgba(13,87,199,0.30), inset 0 1px 0 rgba(255,255,255,0.18)"
      : "0 12px 22px rgba(0,8,18,0.12), inset 0 1px 0 rgba(255,255,255,0.86)",
  };
}

type JoinVoteDecision = "approve" | "neutral" | "reject";

type VoteReasonOption = {
  code: string;
  text: string;
};

const MARKET_ACCESS_APPROVAL_REASON_OPTIONS: VoteReasonOption[] = [
  {
    code: "market_dues_or_permit_checked",
    text: "I checked their dues, stall, shop, permit, or spoke to an organiser.",
  },
  {
    code: "known_from_marketplace",
    text: "I know this person from market, trade, or service dealings.",
  },
];

const JOIN_VOTE_REASON_OPTIONS: Record<JoinVoteDecision, VoteReasonOption[]> = {
  approve: [
    {
      code: "know_directly",
      text: "I know this person and believe they should join.",
    },
    ...MARKET_ACCESS_APPROVAL_REASON_OPTIONS,
    {
      code: "known_from_family_or_group",
      text: "I know this person through family, school, faith, or group life.",
    },
  ],
  neutral: [
    {
      code: "do_not_know_enough",
      text: "I do not know this person well enough to decide.",
    },
    {
      code: "need_more_information",
      text: "I need more information before I decide.",
    },
    {
      code: "no_direct_relationship",
      text: "I have no direct relationship with this person.",
    },
  ],
  reject: [
    {
      code: "identity_not_clear",
      text: "I cannot clearly confirm who this person is.",
    },
    {
      code: "community_concern",
      text: "I have a concern and do not think this person should join.",
    },
    {
      code: "relationship_not_confirmed",
      text: "I cannot confirm how this person is connected to our community.",
    },
  ],
};

function decisionButtonStyle(kind: JoinVoteDecision): React.CSSProperties {
  const approve = kind === "approve";
  const neutral = kind === "neutral";
  return {
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
    minHeight: 58,
    height: 58,
    maxHeight: 58,
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 1000,
    background: approve
      ? "linear-gradient(180deg, #1977F2 0%, #0754C7 100%)"
      : neutral
        ? "linear-gradient(180deg, #FFF7DA 0%, #F7E3A5 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
    color: approve ? "#FFFFFF" : "#0B1F33",
    border: approve
      ? "1px solid rgba(172,204,255,0.44)"
      : neutral
        ? "1px solid rgba(201,161,54,0.30)"
        : "1px solid rgba(11,31,51,0.12)",
  };
}

function statTile(color: string): React.CSSProperties {
  return {
    minWidth: 0,
    minHeight: 98,
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 16px 30px rgba(0,0,0,0.14)",
    padding: 14,
    display: "grid",
    alignContent: "center",
    gap: 9,
    color,
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

function statusPill(status: string): React.CSSProperties {
  const approved = status === "approved";
  const rejected = status === "rejected";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    padding: "8px 14px",
    borderRadius: 12,
    background: approved ? "#EEF9EF" : rejected ? "#FEF2F2" : "#FFF8E7",
    border: approved
      ? "1px solid rgba(34,197,94,0.18)"
      : rejected
        ? "1px solid rgba(239,68,68,0.18)"
        : "1px solid rgba(214,170,69,0.22)",
    color: approved ? "#2E7D32" : rejected ? "#B91C1C" : "#8A5A08",
    fontWeight: 1000,
    maxWidth: "100%",
    whiteSpace: "normal",
  };
}

type JoinRequestIconName =
  | "approve"
  | "clock"
  | "copy"
  | "home"
  | "id"
  | "invite"
  | "market"
  | "neutral"
  | "person"
  | "refresh"
  | "reject"
  | "review"
  | "shield";

const JOIN_REQUEST_ICON_MAP = {
  approve: "check",
  clock: "document",
  copy: "copy",
  home: "home",
  id: "id",
  invite: "join-person-plus",
  market: "shop",
  neutral: "document",
  person: "user",
  refresh: "refresh",
  reject: "alert",
  review: "shield",
  shield: "shield",
} satisfies Record<JoinRequestIconName, GsnIconName>;

function JoinRequestIcon({
  name,
  size = 20,
}: {
  name: JoinRequestIconName;
  size?: number;
}) {
  return (
    <GsnLegacyIcon
      name={JOIN_REQUEST_ICON_MAP[name]}
      size={Math.max(size, Math.round(size * 1.25))}
      decorative
      style={{ display: "inline-grid", flex: "0 0 auto" }}
    />
  );
}

function iconText(name: JoinRequestIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
      }}
    >
      <JoinRequestIcon name={name} size={18} />
      <span style={{ minWidth: 0 }}>{label}</span>
    </span>
  );
}

function iconTile(name: JoinRequestIconName, tone: "navy" | "gold" | "green" | "red" = "navy"): React.CSSProperties {
  const palette =
    tone === "gold"
      ? {
          color: "#7C5A06",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(201,161,54,0.28)",
        }
      : tone === "green"
        ? {
            color: "#137B4C",
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(46,155,98,0.24)",
          }
        : tone === "red"
          ? {
              color: "#991B1B",
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(239,68,68,0.24)",
            }
          : {
              color: "#0B2D4A",
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(13,95,168,0.14)",
            };

  void name;
  return {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 44px",
    boxShadow:
      "0 10px 18px rgba(2,8,23,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
    ...palette,
  };
}

function StatusMark({ status }: { status: string }) {
  const approved = status === "approved";
  const rejected = status === "rejected";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 20px",
      }}
    >
      <JoinRequestIcon
        name={approved ? "approve" : rejected ? "reject" : "clock"}
        size={18}
      />
    </span>
  );
}

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function publicApplicantEmail(value: any): string {
  const email = safeStr(value);
  return email.toLowerCase().endsWith("@pending.gmfn.local") ? "" : email;
}

function ctaPath(target: CtaTarget): string {
  return typeof target.to === "string" ? target.to : String(target.to);
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "Not ready yet";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function friendlyStatus(value: any): string {
  const raw = safeStr(value, "pending").toLowerCase();
  if (raw === "approve" || raw === "approved") return "approved";
  if (raw === "reject" || raw === "rejected") return "rejected";
  return raw;
}

function statusLabel(value: any): string {
  const status = friendlyStatus(value);
  if (status === "approved") return "Accepted";
  if (status === "rejected") return "Not accepted";
  return "Waiting";
}


function qrPolicyReviewContext(
  item: JoinRequestItem | undefined | null
): { badge: string; label: string; text: string; guardrail?: string } | null {
  const key = safeStr(item?.qr_policy_key);
  if (!isCommunityQrPolicyKey(key)) return null;
  const policy = communityQrPolicyByKey(key);
  return {
    badge: policy.badge,
    label: policy.label,
    text: policy.boundary,
    guardrail: safeStr(item?.qr_policy_review_guardrail?.summary),
  };
}

function approvalProgress(item: JoinRequestItem | undefined | null): {
  approvals: number;
  required: number;
  remaining: number;
} {
  const approvals = Math.max(0, Number(item?.approvals || 0));
  const required = Math.max(1, Number(item?.required_approvals || 1));
  return {
    approvals,
    required,
    remaining: Math.max(0, required - approvals),
  };
}

function approvalProgressText(item: JoinRequestItem | undefined | null): string {
  const progress = approvalProgress(item);
  if (progress.remaining <= 0) return "Enough people have agreed";
  if (progress.approvals <= 0) {
    return `No one has agreed yet. ${progress.required} ${
      progress.required === 1 ? "person needs" : "people need"
    } to agree`;
  }
  return `${progress.approvals} ${
    progress.approvals === 1 ? "person has" : "people have"
  } agreed. ${progress.remaining} more ${
    progress.remaining === 1 ? "person is" : "people are"
  } needed`;
}

function approvalNextStepText(
  item: JoinRequestItem | undefined | null,
  canAdminApproveNow = false
): string {
  const progress = approvalProgress(item);
  if (friendlyStatus(item?.status) === "approved") return "This person can now finish joining.";
  if (friendlyStatus(item?.status) === "rejected") return "This person was not accepted.";
  if (progress.remaining <= 0) return "The decision is ready.";
  if (canAdminApproveNow) return "You can accept this person now.";
  return "Please wait for the other people to answer.";
}

function approvalSuccessText(res: VoteResponse, fallback: string): string {
  const request = res?.request;
  if (res?.status_already_final) {
    return buildActionSuccessMessage({
      prefix: "Already decided.",
      message: "This person already has an answer.",
    });
  }
  if (res?.approved_now) {
    return buildActionSuccessMessage({
      prefix: "Person accepted.",
      message: `${approvalProgressText(request)}.`,
      nextStep: approvalNextStepText(request),
    });
  }
  if (res?.rejected_now) {
    return buildActionSuccessMessage({
      prefix: "Person not accepted.",
      message: fallback,
      nextStep: approvalNextStepText(request),
    });
  }
  return buildActionSuccessMessage({
    prefix: "Answer saved.",
    message: `${fallback} ${approvalProgressText(request)}.`,
    nextStep: approvalNextStepText(request),
  });
}

export default function CommunityJoinRequestsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clanId } = useParams();
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [items, setItems] = useState<JoinRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activationPack, setActivationPack] = useState<ApprovalResult | null>(null);
  const [activationPackDetailsOpen, setActivationPackDetailsOpen] = useState(false);
  const [activationCopyStatus, setActivationCopyStatus] = useState("");
  const [activationHandoffBusyId, setActivationHandoffBusyId] = useState<number | null>(null);
  const [assistanceRequestId, setAssistanceRequestId] = useState<number | null>(null);
  const [assistanceNote, setAssistanceNote] = useState("");
  const [assistanceConfirmed, setAssistanceConfirmed] = useState(false);
  const [assistanceBusyId, setAssistanceBusyId] = useState<number | null>(null);
  const [assistancePack, setAssistancePack] =
    useState<ActivationAssistanceResult | null>(null);
  const [assistanceCopyStatus, setAssistanceCopyStatus] = useState("");
  const activationPackRef = useRef<HTMLDivElement | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [reviewerRole, setReviewerRole] = useState<string>("user");
  const [reviewerCanPilotApprove, setReviewerCanPilotApprove] = useState(false);
  const [loadedCommunityName, setLoadedCommunityName] = useState("");
  const [admissionMode, setAdmissionMode] =
    useState<CommunityAdmissionMode>("community_vote");
  const [votingAdminOverride, setVotingAdminOverride] = useState(false);
  const [canManageAdmission, setCanManageAdmission] = useState(false);
  const [admissionSaving, setAdmissionSaving] = useState(false);
  const [voteDecisions, setVoteDecisions] = useState<Record<number, JoinVoteDecision>>({});
  const [voteReasonCodes, setVoteReasonCodes] = useState<Record<number, string>>({});
  const [showCompletedRequests, setShowCompletedRequests] = useState(false);

  const clanNum = Number(clanId || 0);
  const reviewerIsAdmin = reviewerRole.toLowerCase() === "admin";

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!clanNum) {
        throw new Error("This community could not be opened.");
      }

      const [data, policy] = await Promise.all([
        getCommunityJoinRequests(clanNum),
        getCommunityAdmissionPolicy(clanNum),
      ]);
      const rows = Array.isArray(data) ? data : data?.items || [];
      setItems(rows);
      setReviewerRole(safeStr(data?.reviewer_role || "user", "user"));
      setLoadedCommunityName(
        safeStr(policy?.community_name || data?.community_name || "")
      );
      setReviewerCanPilotApprove(
        Boolean(
          data?.reviewer_can_admin_approve ??
            data?.reviewer_can_pilot_approve
        )
      );
      setAdmissionMode(
        (safeStr(
          policy?.admission_mode || data?.admission_mode || "community_vote"
        ) as CommunityAdmissionMode)
      );
      setVotingAdminOverride(
        Boolean(policy?.voting_admin_override ?? data?.voting_admin_override)
      );
      setCanManageAdmission(
        Boolean(
          policy?.can_manage ??
            (safeStr(data?.reviewer_role || "user").toLowerCase() === "admin")
        )
      );
    } catch (err: any) {
      setError("The list could not be opened. Please try again.");
      setItems([]);
      setReviewerRole("user");
      setReviewerCanPilotApprove(false);
      setLoadedCommunityName("");
      setCanManageAdmission(false);
    } finally {
      setLoading(false);
    }
  }, [clanNum]);

  useEffect(() => {
    if (!clanNum) {
      setError("This community could not be opened.");
      setLoading(false);
      return;
    }

    (async () => {
      await selectClan(clanNum).catch(() => null);
      await load();
    })();
  }, [clanNum, load]);

  const selectedCommunityName = useMemo(() => {
    const first = items[0];
    return safeStr(
      first?.clan_name ||
        first?.marketplace_name ||
        loadedCommunityName ||
        `Community ${clanNum}`
    );
  }, [items, loadedCommunityName, clanNum]);

  const summary = useMemo(() => {
    const pending = items.filter(
      (item) => friendlyStatus(item.status) === "pending"
    ).length;
    const approved = items.filter(
      (item) => friendlyStatus(item.status) === "approved"
    ).length;
    const rejected = items.filter(
      (item) => friendlyStatus(item.status) === "rejected"
    ).length;
    return {
      pending,
      approved,
      rejected,
    };
  }, [items]);

  const visibleItems = useMemo(() => {
    if (showCompletedRequests) return items;
    return items.filter((item) => friendlyStatus(item.status) === "pending");
  }, [items, showCompletedRequests]);

  useEffect(() => {
    if (!visibleItems.length) {
      setActiveRequestId(null);
      return;
    }

    const stillVisible = visibleItems.some((item) => item.id === activeRequestId);
    if (stillVisible) return;

    const firstPending = visibleItems.find((item) => friendlyStatus(item.status) === "pending");
    setActiveRequestId(firstPending?.id || visibleItems[0]?.id || null);
  }, [activeRequestId, visibleItems]);

  useEffect(() => {
    if (!activationPack?.gmfn_id || !activationPackRef.current) return;

    activationPackRef.current.scrollIntoView({
      block: "start",
    });
  }, [activationPack?.gmfn_id]);

  const communityHomeCta = useMemo(
    () =>
      resolveCtaTarget("communityHome", {
        explicitTo: clanNum ? `/app/community/${clanNum}` : "/app/community",
        communityId: clanNum,
        debugId: "community-join-requests.community-home",
      }),
    [clanNum]
  );
  const marketplaceCta = useMemo(
    () =>
      resolveCtaTarget("marketplace", {
        communityId: clanNum,
        debugId: "community-join-requests.marketplace",
      }),
    [clanNum]
  );

  function voteReasonOptions(
    item: JoinRequestItem | undefined | null,
    vote: JoinVoteDecision
  ): VoteReasonOption[] {
    if (
      vote === "approve" &&
      item?.qr_policy_review_guardrail?.requires_payment_or_permit_check
    ) {
      return MARKET_ACCESS_APPROVAL_REASON_OPTIONS;
    }
    return JOIN_VOTE_REASON_OPTIONS[vote];
  }

  function selectedVoteReason(
    requestId: number,
    vote: JoinVoteDecision,
    item?: JoinRequestItem | null
  ): VoteReasonOption {
    const options = voteReasonOptions(item, vote);
    const selectedCode = safeStr(voteReasonCodes[requestId]);
    return options.find((reason) => reason.code === selectedCode) || options[0];
  }

  async function handleVote(requestId: number, vote: JoinVoteDecision) {
    try {
      setBusyId(requestId);
      setError("");
      setSuccess("");
      setActivationPack(null);
      setActivationPackDetailsOpen(false);
      setActivationCopyStatus("");

      await selectClan(clanNum).catch(() => null);

      const item = items.find((request) => request.id === requestId) || null;
      const reason = selectedVoteReason(requestId, vote, item);
      const res = (await voteOnJoinRequest(requestId, vote, {
        reason_code: reason.code,
        reason_text: reason.text,
      })) as VoteResponse;

      if (vote === "approve" && res?.approved_now && res?.approval_result?.gmfn_id) {
        setSuccess(approvalSuccessText(res, "This person was accepted. Their joining details are ready to send."));
        setActivationPack(res.approval_result || null);
        setActivationPackDetailsOpen(true);
      } else if (vote === "approve") {
        setSuccess(approvalSuccessText(res, "Your answer was saved."));
      } else if (res?.rejected_now) {
        setSuccess(approvalSuccessText(res, "You chose not to accept this person."));
      } else if (vote === "neutral") {
        setSuccess(
          approvalSuccessText(
            res,
            "You said you are not sure. Your reason was saved."
          )
        );
      } else {
        setSuccess(approvalSuccessText(res, "You chose not to accept this person."));
      }

      emitWorkspaceDataChanged({
        scope: "community-join-request",
        requestId,
        status: safeStr(res?.request?.status, "pending"),
        reviewerActionCompleted: true,
      });

      await load();
    } catch (err: any) {
      setError("Your answer could not be saved. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePilotApprove(requestId: number) {
    try {
      setBusyId(requestId);
      setError("");
      setSuccess("");
      setActivationPack(null);
      setActivationPackDetailsOpen(false);
      setActivationCopyStatus("");

      await selectClan(clanNum).catch(() => null);

      const res = (await adminApproveJoinRequest(requestId)) as VoteResponse;

      if (res?.approval_result?.gmfn_id) {
        setSuccess(
          approvalSuccessText(
            res,
            "This person was accepted. Their joining details are ready to send."
          )
        );
        setActivationPack(res.approval_result || null);
        setActivationPackDetailsOpen(true);
      } else {
        setSuccess(approvalSuccessText(res, "This person was accepted."));
      }

      emitWorkspaceDataChanged({
        scope: "community-join-request",
        requestId,
        status: safeStr(
          res?.request?.status,
          res?.approved_now ? "approved" : "pending"
        ),
        reviewerActionCompleted: true,
      });

      await load();
    } catch (err: any) {
      setError("This person could not be accepted. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function openApprovedHandoff(item: JoinRequestItem) {
    try {
      setActivationHandoffBusyId(item.id);
      setError("");
      setSuccess("");
      setActivationCopyStatus("");

      const result = (await getJoinApprovalStatus(item.id)) as ApprovalResult;
      if (!result?.gmfn_id) {
        throw new Error("The joining details are not ready yet. Please try again.");
      }

      setActivationPack(result);
      setActivationPackDetailsOpen(Boolean(result.activation_message));
      setSuccess(
        result.activation_message
          ? "The joining message is ready. Copy it and send it to the person."
          : "This person already has an account. No new joining message is needed."
      );
    } catch (err: any) {
      setError("The joining details could not be opened. Please try again.");
    } finally {
      setActivationHandoffBusyId(null);
    }
  }

  function toggleActivationAssistance(item: JoinRequestItem) {
    const nextRequestId = assistanceRequestId === item.id ? null : item.id;
    setAssistanceRequestId(nextRequestId);
    setAssistanceNote("");
    setAssistanceConfirmed(false);
    setAssistancePack(null);
    setAssistanceCopyStatus("");
    setError("");
  }

  async function handleIssueActivationAssistance(item: JoinRequestItem) {
    const verificationNote = assistanceNote.trim();
    if (!assistanceConfirmed) {
      setError("Please confirm that you know this person.");
      return;
    }
    if (verificationNote.length < 8) {
      setError("Write a short note explaining how you know this person.");
      return;
    }

    try {
      setAssistanceBusyId(item.id);
      setError("");
      setSuccess("");
      setAssistanceCopyStatus("");
      const result = (await issueJoinActivationAssistance(clanNum, item.id, {
        confirmed_identity: true,
        verification_note: verificationNote,
      })) as ActivationAssistanceResult;
      setAssistancePack(result);
      setSuccess(
        "The private number is ready. Give it only to this person, in private."
      );
    } catch (err: any) {
      setError("The private number could not be made. Please try again.");
    } finally {
      setAssistanceBusyId(null);
    }
  }

  async function copyAssistanceText(text: string, successMessage: string) {
    const value = safeStr(text);
    if (!value) {
      setAssistanceCopyStatus("Nothing is ready to copy yet.");
      return;
    }
    const copied = await safeCopy(value);
    setAssistanceCopyStatus(
      copied ? successMessage : "Clipboard copy was blocked. Copy it manually."
    );
  }

  async function saveAdmissionPolicy() {
    try {
      setAdmissionSaving(true);
      setError("");
      setSuccess("");
      const result = await updateCommunityAdmissionPolicy(clanNum, {
        admission_mode: admissionMode,
        voting_admin_override:
          admissionMode === "community_vote" && votingAdminOverride,
      });
      setAdmissionMode(
        safeStr(result?.admission_mode || admissionMode) as CommunityAdmissionMode
      );
      setVotingAdminOverride(Boolean(result?.voting_admin_override));
      setSuccess(
        Number(result?.retired_invites || 0) > 0
          ? "Saved. Old invite links no longer work. Make a new invite."
          : "Saved."
      );
      await load();
    } catch (err: any) {
      setError("This choice could not be saved. Please try again.");
    } finally {
      setAdmissionSaving(false);
    }
  }

  function goBack() {
    navigateToCta(navigate, location, communityHomeCta);
  }

  async function copyActivationText(text: string, successMessage: string) {
    const safe = safeStr(text);
    if (!safe) {
      setActivationCopyStatus("Nothing is ready to copy yet.");
      return;
    }

    const copied = await safeCopy(safe);
    setActivationCopyStatus(
      copied
        ? successMessage
        : "The copy button did not work. Open the message and copy it by hand."
    );
  }

  return (
    <div style={pageShell()}>
      <PageTopNav
        sectionLabel="New Members"
        title="People Joining"
        subtitle=""
      />

      <div style={contentRail()}>
        <section
          style={{
            ...darkPanel(isCompact ? 18 : 26),
            display: "grid",
            gridTemplateColumns: isCompact ? "minmax(0, 1fr)" : "minmax(0, 1fr) 220px",
            gap: isCompact ? 10 : 18,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={sectionLabel()}>New members</div>
            <h1
              style={{
                margin: "12px 0 0",
                color: "#FFFFFF",
                fontSize: isCompact ? 28 : 40,
                lineHeight: 1.06,
                fontWeight: 1000,
                overflowWrap: "break-word",
              }}
            >
              Check the person before you answer
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                color: "#D7E3F1",
                fontSize: isCompact ? 17 : 21,
                lineHeight: 1.5,
              }}
            >
              Look at their name and phone. If you know them, choose an answer.
            </p>
          </div>
          <div
            aria-hidden="true"
            style={{
              display: isCompact ? "none" : "grid",
              placeItems: "center",
              minHeight: isCompact ? 118 : 172,
            }}
          >
            <span style={iconTile("shield", "gold")}>
              <JoinRequestIcon name="shield" size={28} />
            </span>
          </div>
        </section>

        <section
          style={{
            ...darkPanel(isCompact ? 18 : 26),
            display: "grid",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "minmax(0, 1fr)" : "minmax(0, 1fr) 190px",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>For this community</div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: isCompact ? 27 : 40,
                  fontWeight: 1000,
                  color: "#FFFFFF",
                  lineHeight: 1.08,
                  overflowWrap: "break-word",
                }}
              >
                {selectedCommunityName}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#D7E3F1",
                  fontSize: isCompact ? 15 : 18,
                }}
              >
                {admissionMode === "instant_invite"
                  ? "Anyone with a fresh invite can join."
                  : admissionMode === "admin_approval"
                    ? "One community leader decides."
                    : "Several trusted people must agree."}
              </div>

            </div>
            <div
              aria-hidden="true"
              style={{
                display: isCompact ? "none" : "grid",
                placeItems: "center",
              }}
            >
              <span style={iconTile("home", "gold")}>
                <JoinRequestIcon name="home" size={28} />
              </span>
            </div>
          </div>

          <CardActionRow
            align="stretch"
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "minmax(0, 1fr) minmax(0, 1fr)"
                : "repeat(3, minmax(0, 1fr))",
              gap: isCompact ? 10 : 12,
              minHeight: 0,
              width: "100%",
              minWidth: 0,
            }}
          >
            <SecondaryButton
              type="button"
              onClick={goBack}
              stableHeight={58}
              fullWidth
              debugId={communityHomeCta.debugId}
              style={navActionStyle("light")}
            >
              {iconText("home", "Home")}
            </SecondaryButton>

            <StableCtaLink
              to={ctaPath(marketplaceCta)}
              kind="secondary"
              stableHeight={58}
              fullWidth
              debugId={marketplaceCta.debugId}
              style={navActionStyle("light")}
            >
              {iconText("market", "Market")}
            </StableCtaLink>

            <PrimaryButton
              type="button"
              onClick={() => void load()}
              disabled={loading}
              busy={loading}
              busyLabel="Refreshing..."
              stableHeight={58}
              fullWidth
              debugId="community-join-requests.refresh"
              style={{
                ...navActionStyle("blue"),
                gridColumn: isCompact ? "1 / -1" : undefined,
              }}
            >
              {iconText("refresh", "Refresh")}
            </PrimaryButton>
          </CardActionRow>
        </section>

        <details style={{ ...whitePanel(16) }}>
          <summary
            style={{
              cursor: "pointer",
              color: "#0B1F33",
              fontSize: isCompact ? 18 : 21,
              fontWeight: 1000,
              lineHeight: 1.35,
            }}
          >
            Change how people join
          </summary>
          <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          <div>
            <div style={sectionLabel("#64748B")}>Who decides?</div>
            <div
              style={{
                marginTop: 6,
                color: "#0B1F33",
                fontSize: isCompact ? 20 : 24,
                fontWeight: 1000,
              }}
            >
              Choose one simple option
            </div>
            <div style={{ marginTop: 6, color: "#52667C", lineHeight: 1.5 }}>
              Joining only means the person is part of this community. It does not mean every claim about them has been checked.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "minmax(0, 1fr)"
                : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {[
              {
                value: "instant_invite",
                title: "Join with an invite",
                note: "A fresh invite lets one person join without waiting.",
              },
              {
                value: "admin_approval",
                title: "One leader decides",
                note: "One community leader says yes or no.",
              },
              {
                value: "community_vote",
                title: "Several people agree",
                note: "Trusted community members answer before the person joins.",
              },
            ].map((option) => {
              const selected = admissionMode === option.value;
              return (
                <label
                  key={option.value}
                  style={{
                    border: selected ? "2px solid #C9A136" : "1px solid #D7E1EC",
                    borderRadius: 16,
                    padding: 14,
                    background: selected ? "#FFF8E3" : "#FFFFFF",
                    display: "grid",
                    gridTemplateColumns: "22px minmax(0, 1fr)",
                    gap: 10,
                    cursor: canManageAdmission ? "pointer" : "default",
                  }}
                >
                  <input
                    type="radio"
                    name="community-admission-mode"
                    value={option.value}
                    checked={selected}
                    disabled={!canManageAdmission}
                    onChange={() =>
                      setAdmissionMode(option.value as CommunityAdmissionMode)
                    }
                    style={{ width: 18, height: 18, marginTop: 2 }}
                  />
                  <span>
                    <span style={{ display: "block", color: "#0B1F33", fontWeight: 1000 }}>
                      {option.title}
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        color: "#52667C",
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      {option.note}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {admissionMode === "community_vote" ? (
            <label
              style={{
                display: "grid",
                gridTemplateColumns: "22px minmax(0, 1fr)",
                gap: 10,
                alignItems: "start",
                color: "#334155",
                fontWeight: 800,
              }}
            >
              <input
                type="checkbox"
                checked={votingAdminOverride}
                disabled={!canManageAdmission}
                onChange={(event) => setVotingAdminOverride(event.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>Let one community leader accept someone without waiting for everyone.</span>
            </label>
          ) : null}

          {canManageAdmission ? (
            <PrimaryButton
              type="button"
              onClick={() => void saveAdmissionPolicy()}
              disabled={admissionSaving}
              busy={admissionSaving}
              busyLabel="Saving..."
              stableHeight={54}
              fullWidth
              debugId="community-join-requests.save-admission-policy"
            >
              Save this choice
            </PrimaryButton>
          ) : null}
          </div>
        </details>

        {error ? (
          <div
            style={{
              ...whitePanel(16),
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontWeight: 900,
            }}
          >
            {iconText("reject", error)}
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              ...whitePanel(16),
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontWeight: 900,
            }}
          >
            {iconText("approve", success)}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(3, minmax(0, 1fr))",
            gap: isCompact ? 10 : 14,
            width: "100%",
            minWidth: 0,
          }}
        >
          {[
            ["clock", "Waiting", summary.pending, "#9A6A10"],
            ["approve", "Accepted", summary.approved, "#2E9B62"],
            ["reject", "Not accepted", summary.rejected, "#DC2626"],
          ].map(([icon, label, value, color]) => (
            <div
              key={String(label)}
              style={{
                ...statTile(String(color)),
                gridColumn:
                  isCompact && label === "Not accepted" ? "1 / -1" : undefined,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontWeight: 1000,
                  fontSize: isCompact ? 13 : 15,
                }}
              >
                <JoinRequestIcon name={icon as JoinRequestIconName} size={17} />
                {label}
              </div>
              <div style={{ fontSize: isCompact ? 30 : 36, fontWeight: 1000 }}>
                {value}
              </div>
            </div>
          ))}
        </section>


        <section
          style={{
            ...whitePanel(14),
            display: "grid",
            gridTemplateColumns: isCompact ? "minmax(0, 1fr)" : "minmax(0, 1fr) 190px",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 17 }}>
              {iconText("review", showCompletedRequests ? "Past decisions" : "People waiting")}
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#475569",
                lineHeight: 1.45,
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              {showCompletedRequests
                ? "You can see people who were accepted or not accepted."
                : "Start with the people who still need an answer."}
            </div>
          </div>
          <SecondaryButton
            type="button"
            onClick={() => setShowCompletedRequests((value) => !value)}
            stableHeight={52}
            fullWidth
            debugId="community-join-requests.toggle-completed"
            style={{
              minWidth: 0,
              borderRadius: 12,
              fontSize: 13,
              padding: "0 10px",
            }}
          >
            {iconText("review", showCompletedRequests ? "Hide past decisions" : "Show past decisions")}
          </SecondaryButton>
        </section>

      {activationPack?.gmfn_id ? (
        <div
          ref={activationPackRef}
          style={{
            ...whitePanel(18),
            scrollMarginTop: 96,
          }}
          data-gsn-activation-handoff="admin-share"
        >
          <div style={{ fontWeight: 1000, fontSize: 18, color: "#0B1F33" }}>
            {iconText("approve", "Send joining details")}
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#334155",
              lineHeight: 1.55,
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Send these details to the person you accepted so they can finish joining.
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              background: "#F8FAFC",
              color: "#334155",
              fontWeight: 850,
              lineHeight: 1.5,
            }}
          >
            Community: {safeStr(activationPack.community_name || "This community")}
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: "#F8FAFC",
              borderRadius: 12,
              border: "1px solid rgba(11,31,51,0.08)",
              color: "#475569",
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.5,
            }}
          >
            Use a button below to copy the message. You still need to send it to the person.
          </div>

          {activationCopyStatus ? (
            <div
              style={{
                marginTop: 12,
                color: activationCopyStatus.toLowerCase().includes("copied") ? "#065F46" : "#8A5A08",
                fontWeight: 900,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {activationCopyStatus}
            </div>
          ) : null}

          <CardActionRow
            align="stretch"
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
              minHeight: 0,
            }}
          >
            <PrimaryButton
              type="button"
              disabled={!safeStr(activationPack.activation_message || "")}
              onClick={() =>
                void copyActivationText(
                  safeStr(activationPack.activation_message || ""),
                  "Message copied. Send it to the person."
                )
              }
              debugId="community-join-requests.copy-activation-message"
              fullWidth
            >
              {iconText("copy", "Copy full message")}
            </PrimaryButton>

            <SecondaryButton
              type="button"
              disabled={!safeStr(activationPack.activation_link || "")}
              onClick={() =>
                void copyActivationText(
                  safeStr(activationPack.activation_link || ""),
                  "Joining link copied. Send it to the person."
                )
              }
              debugId="community-join-requests.copy-activation-link"
              fullWidth
            >
              {iconText("copy", "Copy joining link")}
            </SecondaryButton>

            <SecondaryButton
              type="button"
              onClick={() => setActivationPackDetailsOpen((value) => !value)}
              debugId="community-join-requests.toggle-activation-details"
              fullWidth
            >
              {iconText(
                "review",
                activationPackDetailsOpen ? "Hide message" : "Show message"
              )}
            </SecondaryButton>
          </CardActionRow>

          {activationPackDetailsOpen ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid rgba(11,31,51,0.08)",
              }}
              data-gsn-activation-message-preview="collapsed-until-opened"
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 1000,
                  color: "#64748B",
                  marginBottom: 8,
                  letterSpacing: 0.35,
                }}
              >
                MESSAGE TO SEND
              </div>

              <div
                style={{
                  marginBottom: 10,
                  color: "#334155",
                  lineHeight: 1.5,
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Invited by:{" "}
                {safeStr(
                  activationPack.invited_by_display || "a community member"
                )}
              </div>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "inherit",
                  color: "#0B1F33",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                {safeStr(activationPack.activation_message || "")}
              </pre>

              <div
                style={{
                  marginTop: 12,
                  color: "#475569",
                  lineHeight: 1.5,
                  fontSize: 13,
                  fontWeight: 800,
                  wordBreak: "break-word",
                }}
              >
                Joining link:{" "}
                {safeStr(activationPack.activation_link || "Not ready yet")}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div style={whitePanel(18)}>
          <strong>{iconText("clock", "Opening the list...")}</strong>
        </div>
      ) : null}

      {!loading && !error && !items.length ? (
        <div style={whitePanel(18)}>
          <strong>{iconText("review", "No one is waiting to join.")}</strong>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 && !visibleItems.length ? (
        <div style={whitePanel(18)}>
          <strong>{iconText("approve", "Everyone has an answer.")}</strong>
          <div
            style={{
              marginTop: 8,
              color: "#475569",
              lineHeight: 1.5,
              fontWeight: 750,
            }}
          >
            Past decisions are hidden. Use Show past decisions if you need to see them.
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        {visibleItems.map((item) => {
          const status = friendlyStatus(item.status);
          const isPending = status === "pending";
          const qrGuardrail = item.qr_policy_review_guardrail || null;
          const pilotOverrideBlocked = Boolean(
            qrGuardrail?.pilot_override_blocked &&
              (qrGuardrail.approval_posture === "market_access" ||
                Number(item.active_member_count || 0) > 1)
          );
          const requestAdmissionMode = safeStr(
            item.admission_mode || admissionMode
          ) as CommunityAdmissionMode;
          const canAdminApproveRequest = Boolean(
            item.reviewer_can_admin_approve ??
              (reviewerCanPilotApprove &&
                (requestAdmissionMode === "admin_approval" ||
                  (requestAdmissionMode === "community_vote" &&
                    votingAdminOverride)))
          );
          const canAdminApproveNow =
            canAdminApproveRequest && !pilotOverrideBlocked;
          const isBusy = busyId === item.id;
          const applicantName = safeStr(
            item.applicant_name || item.applicant_nickname
          );
          const applicantPhone = safeStr(item.applicant_phone_e164);
          const applicantEmail = publicApplicantEmail(item.applicant_email);
          const applicantLabel = safeStr(
            applicantName ||
              applicantPhone ||
              applicantEmail ||
              item.applicant_gmfn_id ||
              "Applicant"
          );
          const isActive = activeRequestId === item.id;
          const governanceProfile =
            item.governance_profile && typeof item.governance_profile === "object"
              ? item.governance_profile
              : null;
          const qrPolicyContext = qrPolicyReviewContext(item);
          const shouldCollapse = isCompact && activeRequestId !== null && !isActive;

          if (shouldCollapse) {
            return (
              <article
                key={item.id}
                style={{
                  ...whitePanel(12),
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 112px",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      fontSize: 15,
                    }}
                  >
                    <StatusMark status={status} />
                    <span style={{ minWidth: 0, overflowWrap: "break-word" }}>
                      {statusLabel(status)}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      color: "#475569",
                      fontSize: 13,
                      fontWeight: 750,
                      lineHeight: 1.35,
                      overflowWrap: "break-word",
                    }}
                  >
                    {applicantLabel}
                  </div>
                  {applicantPhone && applicantPhone !== applicantLabel ? (
                    <div
                      style={{
                        marginTop: 2,
                        color: "#334155",
                        fontSize: 12,
                        fontWeight: 850,
                        lineHeight: 1.3,
                      }}
                    >
                      {applicantPhone}
                    </div>
                  ) : null}

                </div>
                <SecondaryButton
                  type="button"
                  onClick={() => setActiveRequestId(item.id)}
                  stableHeight={48}
                  fullWidth
                  debugId="community-join-requests.review-request"
                  style={{
                    minWidth: 0,
                    fontSize: 13,
                    borderRadius: 12,
                    padding: "0 10px",
                  }}
                >
                  {iconText("review", "Open")}
                </SecondaryButton>
              </article>
            );
          }

          return (
            <article
              key={item.id}
              style={{
                ...whitePanel(isCompact ? 16 : 20),
                border: isActive
                  ? "1px solid rgba(34,120,242,0.36)"
                  : "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "minmax(0, 1fr)" : "minmax(0, 1fr) auto",
                  alignItems: "start",
                  gap: 12,
                  marginBottom: 8,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: isCompact ? 26 : 32,
                      fontWeight: 1000,
                      color: "#0B1F33",
                      overflowWrap: "break-word",
                    }}
                  >
                    {applicantLabel}
                  </div>

                  {applicantPhone && applicantPhone !== applicantLabel ? (
                    <div
                      style={{
                        marginTop: 2,
                        color: "#1D4ED8",
                        fontSize: 14,
                        lineHeight: 1.4,
                        fontWeight: 900,
                      }}
                    >
                      Phone: {applicantPhone}
                    </div>
                  ) : null}
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: "#334155",
                      fontWeight: 700,
                    }}
                  >
                    Invited by{" "}
                    <strong>
                      {safeStr(
                        item.invited_by_display || "a community member"
                      )}
                    </strong>
                  </div>
                  <div style={{ marginTop: 2, fontSize: 13, color: "#334155", fontWeight: 700 }}>
                    Wants to join <strong>{safeStr(item.clan_name || "this community")}</strong>
                  </div>
                </div>
                <span style={statusPill(status)}>
                  <StatusMark status={status} />
                  {statusLabel(status)}
                </span>
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "minmax(0, 1fr)"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: 0,
                    overflow: "hidden",
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.08)",
                  }}
                >
                  {[
                    ["Sent", safeDateTime(item.created_at)],
                    ["What others said", approvalProgressText(item)],
                  ].map(([label, value]) => (
                    <div key={`${item.id}-${label}`} style={requestFactTile()}>
                      <div style={requestFactLabel()}>{label}</div>
                      <div style={requestFactValue()}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              {qrPolicyContext || governanceProfile ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(34,120,242,0.20)",
                    background: "#EFF6FF",
                  }}
                >
                  <div style={sectionLabel("#1D4ED8")}>Before you choose</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#1E3A8A",
                      lineHeight: 1.6,
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {pilotOverrideBlocked
                      ? "Make sure this person is known by more than one trusted community member."
                      : "Make sure you know this person, or that someone you trust can confirm who they are."}
                  </div>
                </div>
              ) : null}
              {!isPending ? (
                <>
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: 12,
                      border: status === "approved"
                        ? "1px solid rgba(34,197,94,0.18)"
                        : "1px solid rgba(239,68,68,0.18)",
                      background: status === "approved" ? "#F0FDF4" : "#FEF2F2",
                      color: "#0B1F33",
                      fontWeight: 800,
                    }}
                  >
                    {iconText(
                      status === "approved" ? "approve" : "reject",
                      <>
                        {status === "approved"
                          ? "This person was accepted."
                          : "This person was not accepted."}
                      </>
                    )}
                  </div>
                  {status === "approved" ? (
                    <>
                      <SecondaryButton
                        type="button"
                        onClick={() => void openApprovedHandoff(item)}
                        disabled={activationHandoffBusyId === item.id}
                        busy={activationHandoffBusyId === item.id}
                        busyLabel="Opening..."
                        stableHeight={54}
                        fullWidth
                        debugId="community-join-requests.open-approved-handoff"
                        style={{ marginTop: 12 }}
                      >
                        {iconText("id", "Send joining details")}
                      </SecondaryButton>

                      {reviewerIsAdmin ? (
                        <>
                          <SecondaryButton
                            type="button"
                            onClick={() => toggleActivationAssistance(item)}
                            stableHeight={54}
                            fullWidth
                            debugId="community-join-requests.open-activation-assistance"
                            style={{ marginTop: 10 }}
                          >
                            {iconText(
                              "approve",
                              assistanceRequestId === item.id
                                ? "Close joining help"
                                : "Help them finish joining"
                            )}
                          </SecondaryButton>

                          {assistanceRequestId === item.id ? (
                            <div
                              style={{
                                marginTop: 12,
                                padding: isCompact ? 14 : 18,
                                borderRadius: 18,
                                border: "1px solid rgba(201,161,54,0.38)",
                                background: "#FFF8E3",
                              }}
                            >
                              <div style={sectionLabel("#8A5A08")}>
                                Private help
                              </div>
                              <div
                                style={{
                                  marginTop: 8,
                                  color: "#0B1F33",
                                  fontWeight: 1000,
                                  fontSize: 18,
                                }}
                              >
                                Help {applicantLabel} finish joining
                              </div>
                              <div
                                style={{
                                  marginTop: 8,
                                  color: "#5B4631",
                                  fontSize: 14,
                                  fontWeight: 750,
                                  lineHeight: 1.6,
                                }}
                              >
                                Only do this if you know this person. The private number lets
                                them set up their password. It does not prove that the phone
                                number belongs to them.
                              </div>

                              {assistancePack?.request_id === item.id &&
                              safeStr(assistancePack.code) ? (
                                <div
                                  style={{
                                    marginTop: 14,
                                    display: "grid",
                                    gap: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: 16,
                                      borderRadius: 16,
                                      background: "#FFFFFF",
                                      border: "2px solid #C9A136",
                                      textAlign: "center",
                                    }}
                                  >
                                    <div style={sectionLabel("#8A5A08")}>
                                      Private number (15 minutes)
                                    </div>
                                    <div
                                      style={{
                                        marginTop: 8,
                                        color: "#0B1F33",
                                        fontWeight: 1000,
                                        fontSize: isCompact ? 34 : 40,
                                        letterSpacing: "0.18em",
                                      }}
                                    >
                                      {safeStr(assistancePack.code)}
                                    </div>
                                    <div
                                      style={{
                                        marginTop: 8,
                                        color: "#52667C",
                                        fontSize: 13,
                                        fontWeight: 800,
                                      }}
                                    >
                                      Works until {safeDateTime(assistancePack.expires_at)}
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      padding: 12,
                                      borderRadius: 14,
                                      background: "#FEF2F2",
                                      border: "1px solid #FECACA",
                                      color: "#991B1B",
                                      lineHeight: 1.55,
                                      fontSize: 13,
                                      fontWeight: 850,
                                    }}
                                  >
                                    Tell this number to the person in private. Do not post it
                                    in a group or on a public notice.
                                  </div>

                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: isCompact
                                        ? "minmax(0, 1fr)"
                                        : "repeat(2, minmax(0, 1fr))",
                                      gap: 10,
                                    }}
                                  >
                                    <PrimaryButton
                                      type="button"
                                      onClick={() =>
                                        void copyAssistanceText(
                                          safeStr(assistancePack.code),
                                          "Private number copied."
                                        )
                                      }
                                      stableHeight={52}
                                      fullWidth
                                      debugId="community-join-requests.copy-assisted-code"
                                    >
                                      Copy private number
                                    </PrimaryButton>
                                    <SecondaryButton
                                      type="button"
                                      onClick={() =>
                                        void copyAssistanceText(
                                          safeStr(assistancePack.activation_link),
                                          "Joining link copied."
                                        )
                                      }
                                      stableHeight={52}
                                      fullWidth
                                      debugId="community-join-requests.copy-assisted-link"
                                    >
                                      Copy joining link
                                    </SecondaryButton>
                                  </div>
                                  {assistanceCopyStatus ? (
                                    <div
                                      role="status"
                                      style={{
                                        color: "#334155",
                                        fontSize: 13,
                                        fontWeight: 850,
                                        lineHeight: 1.45,
                                      }}
                                    >
                                      {assistanceCopyStatus}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    marginTop: 14,
                                    display: "grid",
                                    gap: 12,
                                  }}
                                >
                                  <label
                                    style={{
                                      display: "grid",
                                      gap: 7,
                                      color: "#0B1F33",
                                      fontWeight: 900,
                                      fontSize: 14,
                                    }}
                                  >
                                    How do you know this person?
                                    <textarea
                                      value={assistanceNote}
                                      onChange={(event) =>
                                        setAssistanceNote(event.target.value)
                                      }
                                      maxLength={240}
                                      rows={3}
                                      placeholder="For example: I met her in person at the workshop."
                                      style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        resize: "vertical",
                                        border: "1px solid #CBD5E1",
                                        borderRadius: 14,
                                        padding: "12px 14px",
                                        background: "#FFFFFF",
                                        color: "#0B1F33",
                                        font: "inherit",
                                        lineHeight: 1.5,
                                      }}
                                    />
                                  </label>
                                  <label
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "22px minmax(0, 1fr)",
                                      gap: 10,
                                      alignItems: "start",
                                      color: "#334155",
                                      fontWeight: 850,
                                      lineHeight: 1.5,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={assistanceConfirmed}
                                      onChange={(event) =>
                                        setAssistanceConfirmed(event.target.checked)
                                      }
                                      style={{ width: 18, height: 18, marginTop: 2 }}
                                    />
                                    <span>
                                      I know this person and checked their name.
                                    </span>
                                  </label>
                                  <PrimaryButton
                                    type="button"
                                    onClick={() =>
                                      void handleIssueActivationAssistance(item)
                                    }
                                    disabled={
                                      assistanceBusyId === item.id ||
                                      !assistanceConfirmed ||
                                      assistanceNote.trim().length < 8
                                    }
                                    busy={assistanceBusyId === item.id}
                                    busyLabel="Creating..."
                                    stableHeight={54}
                                    fullWidth
                                    debugId="community-join-requests.issue-activation-assistance"
                                  >
                                    Make private number
                                  </PrimaryButton>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(59,130,246,0.15)",
                      background: "#EFF6FF",
                      color: "#1E3A8A",
                      fontWeight: 800,
                    }}
                  >
                    {iconText(
                      "clock",
                      <>
                        {approvalProgressText(item)}.{" "}
                        {approvalNextStepText(item, canAdminApproveNow)}
                      </>
                    )}
                  </div>

                  {canAdminApproveRequest && requestAdmissionMode === "community_vote" ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 12,
                        background: "#FFF7E8",
                        border: "1px solid rgba(201,161,54,0.24)",
                      }}
                    >
                      <div style={sectionLabel("#8A5A08")}>You can decide now</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#5B4631",
                          lineHeight: 1.75,
                          fontSize: 14,
                        }}
                      >
                        {pilotOverrideBlocked
                          ? qrGuardrail?.approval_posture === "market_access"
                            ? "Check that this person is known in the market or has a real stall, shop, permit, dues record, or organiser who knows them."
                            : "More than one trusted person must agree before this person can join."
                          : item.admin_approval_basis === "current_community_setting"
                            ? "You can accept this person now without waiting for the other answers."
                            : "You can accept this person now without waiting for the other answers."}
                      </div>
                    </div>
                  ) : null}

                  {requestAdmissionMode === "community_vote" ? <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "220px minmax(0, 1fr)",
                      gap: 10,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <div style={sectionLabel("#64748B")}>Your answer</div>
                      <select
                        value={voteDecisions[item.id] || "approve"}
                        onChange={(event) => {
                          const nextVote = event.target.value as JoinVoteDecision;
                          setVoteDecisions((prev) => ({
                            ...prev,
                            [item.id]: nextVote,
                          }));
                          setVoteReasonCodes((prev) => ({
                            ...prev,
                            [item.id]: voteReasonOptions(item, nextVote)[0].code,
                          }));
                        }}
                        style={{
                          marginTop: 8,
                          width: "100%",
                          minHeight: 50,
                          borderRadius: 12,
                          border: "1px solid rgba(11,31,51,0.12)",
                          padding: "0 12px",
                          fontWeight: 850,
                          color: "#0B1F33",
                          background: "#FFFFFF",
                        }}
                      >
                        <option value="approve">Let this person join</option>
                        <option value="neutral">I am not sure</option>
                        <option value="reject">Do not let this person join</option>
                      </select>
                    </div>

                    <div>
                      <div style={sectionLabel("#64748B")}>Why?</div>
                      <select
                        value={
                          voteReasonCodes[item.id] ||
                          voteReasonOptions(item, voteDecisions[item.id] || "approve")[0].code
                        }
                        onChange={(event) =>
                          setVoteReasonCodes((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        style={{
                          marginTop: 8,
                          width: "100%",
                          minHeight: 50,
                          borderRadius: 12,
                          border: "1px solid rgba(11,31,51,0.12)",
                          padding: "0 12px",
                          fontWeight: 850,
                          color: "#0B1F33",
                          background: "#FFFFFF",
                        }}
                      >
                        {voteReasonOptions(item, voteDecisions[item.id] || "approve").map((reason) => (
                          <option key={reason.code} value={reason.code}>
                            {reason.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div> : null}

                  <CardActionRow
                    align="stretch"
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "repeat(3, minmax(0, 1fr))",
                      gap: 12,
                      minHeight: 0,
                      width: "100%",
                    }}
                  >
                    <PrimaryButton
                      type="button"
                      onClick={() =>
                        canAdminApproveNow
                          ? handlePilotApprove(item.id)
                          : handleVote(item.id, "approve")
                      }
                      disabled={
                        isBusy ||
                        (requestAdmissionMode === "admin_approval" &&
                          !canAdminApproveNow)
                      }
                      busy={isBusy}
                      busyLabel="Working..."
                      stableHeight={58}
                      debugId="community-join-requests.approve"
                      style={decisionButtonStyle("approve")}
                      fullWidth
                    >
                      {iconText(
                        "approve",
                        "Let this person join"
                      )}
                    </PrimaryButton>

                    {requestAdmissionMode === "community_vote" ? <SecondaryButton
                      type="button"
                      onClick={() => handleVote(item.id, "neutral")}
                      disabled={isBusy}
                      busy={isBusy}
                      busyLabel="Working..."
                      stableHeight={58}
                      debugId="community-join-requests.neutral"
                      style={decisionButtonStyle("neutral")}
                      fullWidth
                    >
                      {iconText("neutral", "Not sure")}
                    </SecondaryButton> : null}

                    <SecondaryButton
                      type="button"
                      onClick={() => handleVote(item.id, "reject")}
                      disabled={isBusy}
                      busy={isBusy}
                      busyLabel="Working..."
                      stableHeight={58}
                      debugId="community-join-requests.reject"
                      style={decisionButtonStyle("reject")}
                      fullWidth
                    >
                      {iconText("reject", "Do not let them join")}
                    </SecondaryButton>

                  </CardActionRow>
                </>
              )}
            </article>
          );
        })}
      </div>
      </div>
    </div>
  );
}
