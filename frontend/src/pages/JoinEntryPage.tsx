import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EntryBackLink } from "../components/EntryControls";
import OriginLink from "../components/OriginLink";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import {
  getJoinApprovalStatus,
  getJoinInvitePreview,
  getJoinInviteRequestStatus,
  submitJoinRequest,
} from "../lib/api";
import {
  ENTRY_INVITE_CODE_KEY,
  readStorage,
  writeStorage,
} from "../lib/entryFlow";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(37,78,119,0.20)",
    padding: 24,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(37,78,119,0.18)",
    padding: 18,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(37,78,119,0.16)",
    padding: 14,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.16)",
    outline: "none",
    fontSize: 14,
    color: "#0B1F33",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 6px 14px rgba(10,24,49,0.04)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function textareaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 110,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "min(100%, 68%)",
    padding: "14px 18px",
    borderRadius: 16,
    background: disabled
      ? "linear-gradient(180deg, #D7DEE8 0%, #C8D2DF 100%)"
      : "linear-gradient(180deg, #1A6BE1 0%, #0B63D1 58%, #09479C 100%)",
    color: disabled ? "#6B7B8D" : "#FFFFFF",
    textDecoration: "none",
    fontWeight: 1000,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.82 : 1,
    textAlign: "center",
    boxShadow: disabled
      ? "0 10px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.52)"
      : "0 18px 32px rgba(11,99,209,0.24), inset 0 1px 0 rgba(255,255,255,0.24)",
    textShadow: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    transform: "none",
    outlineOffset: 4,
  };
}

function secondaryLink(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    borderRadius: 999,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,247,253,0.98) 62%, rgba(224,234,244,0.98) 100%)",
    color: "#123055",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(16,37,59,0.12)",
    fontSize: 14,
    boxShadow:
      "0 12px 24px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.84)",
    textShadow: "0 1px 0 rgba(255,255,255,0.52)",
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    transform: "none",
    outlineOffset: 4,
  };
}

function guardButtonPress(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function mergeSearchIntoPath(to: string, currentSearch: string): string {
  const [basePath, baseQueryRaw = ""] = String(to || "").split("?");
  const merged = new URLSearchParams(baseQueryRaw);
  const current = new URLSearchParams(currentSearch);

  current.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.append(key, value);
    }
  });

  const finalQuery = merged.toString();
  return finalQuery ? `${basePath}?${finalQuery}` : basePath;
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onMouseDown: guardButtonPress,
  };
}

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F768D",
    lineHeight: 1.75,
    fontSize: 14,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "#EAF2FF" : "#F8FAFC",
    border: primary
      ? "1px solid rgba(29,78,216,0.16)"
      : "1px solid rgba(11,31,51,0.08)",
    color: primary ? "#1D4ED8" : "#475569",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "normal",
  };
}

function noticeStyle(kind: "success" | "error" | "info"): React.CSSProperties {
  if (kind === "success") {
    return {
      borderRadius: 16,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      padding: 16,
      lineHeight: 1.75,
      fontSize: 14,
    };
  }

  if (kind === "error") {
    return {
      borderRadius: 16,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      padding: 16,
      lineHeight: 1.75,
      fontSize: 14,
    };
  }

  return {
    borderRadius: 16,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.08)",
    color: "#35516B",
    padding: 16,
    lineHeight: 1.75,
    fontSize: 14,
  };
}

const COUNTRY_OPTIONS = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Benin",
  "Brazil",
  "Cameroon",
  "Canada",
  "China",
  "Cote d'Ivoire",
  "Denmark",
  "Egypt",
  "Ethiopia",
  "France",
  "Gambia",
  "Germany",
  "Ghana",
  "India",
  "Ireland",
  "Italy",
  "Japan",
  "Kenya",
  "Liberia",
  "Malaysia",
  "Morocco",
  "Netherlands",
  "New Zealand",
  "Niger",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Philippines",
  "Portugal",
  "Rwanda",
  "Senegal",
  "Sierra Leone",
  "South Africa",
  "Spain",
  "Tanzania",
  "Togo",
  "Turkey",
  "Uganda",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Zambia",
  "Zimbabwe",
];

const COUNTRY_DIAL_CODES: Record<string, string> = {
  Afghanistan: "+93",
  Albania: "+355",
  Algeria: "+213",
  Argentina: "+54",
  Australia: "+61",
  Austria: "+43",
  Bangladesh: "+880",
  Belgium: "+32",
  Benin: "+229",
  Brazil: "+55",
  Cameroon: "+237",
  Canada: "+1",
  China: "+86",
  "Cote d'Ivoire": "+225",
  Denmark: "+45",
  Egypt: "+20",
  Ethiopia: "+251",
  France: "+33",
  Gambia: "+220",
  Germany: "+49",
  Ghana: "+233",
  India: "+91",
  Ireland: "+353",
  Italy: "+39",
  Japan: "+81",
  Kenya: "+254",
  Liberia: "+231",
  Malaysia: "+60",
  Morocco: "+212",
  Netherlands: "+31",
  "New Zealand": "+64",
  Niger: "+227",
  Nigeria: "+234",
  Norway: "+47",
  Pakistan: "+92",
  Philippines: "+63",
  Portugal: "+351",
  Rwanda: "+250",
  Senegal: "+221",
  "Sierra Leone": "+232",
  "South Africa": "+27",
  Spain: "+34",
  Tanzania: "+255",
  Togo: "+228",
  Turkey: "+90",
  Uganda: "+256",
  "United Arab Emirates": "+971",
  "United Kingdom": "+44",
  "United States": "+1",
  Zambia: "+260",
  Zimbabwe: "+263",
};

const WORK_OPTIONS = [
  {
    value: "trader",
    label: "Trader / market seller",
    hint: "Food seller, clothes, phone accessories, spare parts, provisions.",
  },
  {
    value: "service",
    label: "Service work / skill",
    hint: "Driver, plumber, tailor, hairdresser, mechanic, electrician.",
  },
  {
    value: "salary",
    label: "Salary worker / civil servant",
    hint: "Teacher, nurse, office worker, security, government or company work.",
  },
  {
    value: "farming",
    label: "Farming / agriculture",
    hint: "Crop farming, poultry, livestock, produce trading.",
  },
  {
    value: "student",
    label: "Student / apprentice",
    hint: "School, training, learning a skill, early work stage.",
  },
  {
    value: "home",
    label: "Home support / family work",
    hint: "Family care, home trading, helping a household business.",
  },
  {
    value: "none",
    label: "Not working yet",
    hint: "You can still join if the community knows you.",
  },
  {
    value: "other",
    label: "Other",
    hint: "Write the closest simple description.",
  },
];

function cleanText(value: any): string {
  return String(value || "").trim();
}

function dialCodeForCountry(country: string): string {
  return COUNTRY_DIAL_CODES[cleanText(country)] || "";
}

function workOptionFor(value: string) {
  return WORK_OPTIONS.find((item) => item.value === value) || null;
}

function buildWorkSummary(category: string, detail: string): string {
  const option = workOptionFor(category);
  const safeDetail = cleanText(detail);

  if (!option) return safeDetail;
  if (!safeDetail) return option.label;

  return `${option.label}: ${safeDetail}`;
}

function friendlyJoinError(value: any): string {
  const raw = cleanText(value);
  const lower = raw.toLowerCase();

  if (
    lower.includes("invitation not found") ||
    lower.includes("invite not found") ||
    lower.includes("not copied fully")
  ) {
    return (
      "This invitation link is no longer valid or was not copied fully. " +
      "Ask the person who invited you to send a fresh GSN invite link."
    );
  }

  if (lower.includes("expired")) {
    return "This invitation has expired. Ask the person who invited you to send a fresh GSN invite link.";
  }

  if (lower.includes("usage limit")) {
    return "This invitation has already reached its use limit. Ask the inviter to create a fresh GSN invite link.";
  }

  if (lower.includes("pending join request already exists")) {
    return (
      "Your join request is already waiting for community review. " +
      "You do not need to submit it again. Because this is not a new request, " +
      "the community will not receive a second review notification."
    );
  }

  return raw || "Unable to submit your join request.";
}

function phoneDigits(value: string): string {
  return cleanText(value).replace(/\D/g, "");
}

function approvalRouteFor(result: any): string {
  const resultPath = cleanText(result?.result_path || "");
  const resultChannel = cleanText(result?.result_channel || "").toLowerCase();
  if (resultPath && resultChannel === "request-rejected") return resultPath;

  const approvalPath = cleanText(result?.approval_path || "");
  if (approvalPath) return approvalPath;

  const requestId = cleanText(result?.request_id || "");
  if (!requestId) return "";
  return `/join-approval/${encodeURIComponent(requestId)}`;
}

function activationRouteFor(result: any, currentSearch: string): string {
  const resultPath = cleanText(result?.result_path || "");
  const resultChannel = cleanText(result?.result_channel || "").toLowerCase();
  if (resultPath && resultChannel === "activation-ready") {
    return mergeSearchIntoPath(resultPath, currentSearch);
  }

  const activationPath = cleanText(result?.activation_path || "");
  if (activationPath) {
    return mergeSearchIntoPath(activationPath, currentSearch);
  }

  const activationLink = cleanText(result?.activation_link || "");
  if (activationLink && typeof window !== "undefined") {
    try {
      const url = new URL(activationLink, window.location.origin);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      // Fall through to gmfn_id activation path fallback below.
    }
  }

  const gmfnId = cleanText(result?.gmfn_id || "");
  if (!gmfnId) return "";

  const params = new URLSearchParams();
  params.set("gmfn_id", gmfnId);
  const requestId = cleanText(result?.request_id || "");
  if (requestId) params.set("request_id", requestId);
  return mergeSearchIntoPath(
    `/activate-membership?${params.toString()}`,
    currentSearch
  );
}

function joinInviteHelpMessage(
  rawMessage: string,
  blocked: boolean
): string {
  const raw = cleanText(rawMessage);
  const lower = raw.toLowerCase();

  if (!blocked) {
    return (
      "This page opened without a usable GSN invite code. Ask the person who invited you to send the latest GSN join link again."
    );
  }

  if (
    !raw ||
    lower.includes("not copied fully") ||
    lower.includes("fresh gsn invite link") ||
    lower.includes("invitation not found") ||
    lower.includes("invite not found")
  ) {
    return (
      "This invitation link is no longer valid or was not copied fully. Ask the person who invited you to send a fresh GSN join link."
    );
  }

  if (lower.includes("expired")) {
    return (
      "This invitation has expired. Ask the person who invited you to send a fresh GSN join link."
    );
  }

  if (lower.includes("use limit") || lower.includes("usage limit")) {
    return (
      "This invitation has already reached its use limit. Ask the person who invited you to send a fresh GSN join link."
    );
  }

  return raw;
}

function looksLikeSystemId(value: string): boolean {
  const v = cleanText(value).toUpperCase();
  if (!v) return false;
  if (v.startsWith("GMFN-U-")) return true;
  if (v.startsWith("GMFN-C-")) return true;
  return false;
}

function decodeFriendly(value: string): string {
  return cleanText(value).replace(/\+/g, " ");
}

function emailPrefix(value: string): string {
  const raw = cleanText(value);
  if (!raw.includes("@")) return raw;
  return raw.split("@")[0].trim();
}

function humanInviterLabel(rawInviter: string): string {
  const v = decodeFriendly(rawInviter);
  if (!v) return "A known GSN member";

  if (looksLikeSystemId(v)) {
    return "A known GSN member";
  }

  if (v.includes("@")) {
    const prefix = emailPrefix(v);
    return prefix || "A known GSN member";
  }

  return v;
}

function safeDateTime(value: any): string {
  const raw = cleanText(value);
  if (!raw) return "Not available yet";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function buildInviteLetter(args: {
  receiver: string;
  communityName: string;
  inviter: string;
  marketplaceName: string;
  expiresAt: string;
  customMessage: string;
}): string[] {
  const receiver = cleanText(args.receiver);
  const communityName = cleanText(args.communityName) || "this GSN community";
  const inviter = cleanText(args.inviter) || "a known GSN member";
  const marketplaceName = cleanText(args.marketplaceName);
  const expiresAt = cleanText(args.expiresAt);
  const customMessage = cleanText(args.customMessage);

  const lines: string[] = [];

  lines.push(receiver ? `Hello ${receiver},` : "Hello,");
  lines.push(
    `${inviter} is inviting you to begin the join request process for ${communityName}.`
  );

  if (marketplaceName) {
    lines.push(`Community / Market: ${marketplaceName}.`);
  }

  lines.push(
    "We have already built trust by knowing, helping, lending, supporting, and standing for one another."
  );
  lines.push(
    "GSN helps make that trust visible, recordable, and useful, so the good things people do for each other can become proof for tomorrow."
  );
  lines.push(
    "With GSN, a trusted circle can trade, support small needs, lend, borrow, repay, and build a clearer record of reliability."
  );
  lines.push(
    "Over time, those records can help members carry their good name further, even beyond the people who already know them."
  );

  if (customMessage) {
    lines.push(`Message: ${customMessage}`);
  }

  if (expiresAt) {
    lines.push(`This invitation remains open until ${safeDateTime(expiresAt)}.`);
  }

  lines.push(
    "If you wish to continue, complete the form below and your request will return to the community for review."
  );

  return lines;
}

function joinDraftStorageKey(inviteCode: string, communityCode: string): string {
  const invite = cleanText(inviteCode) || "unknown-invite";
  const community = cleanText(communityCode) || "unknown-community";
  return `gmfn_join_draft:${community}:${invite}`;
}

function joinRequestStorageKey(inviteCode: string, communityCode: string): string {
  const invite = cleanText(inviteCode) || "unknown-invite";
  const community = cleanText(communityCode) || "unknown-community";
  return `gmfn_join_request:${community}:${invite}`;
}

export default function JoinEntryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams<Record<string, string | undefined>>();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

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
    if (typeof document !== "undefined") {
      document.title = "GSN | Join Entry";
    }
  }, []);

  const inviteCode = useMemo(() => {
    return cleanText(
      searchParams.get("invite") ||
        searchParams.get("code") ||
        searchParams.get("invite_code") ||
        searchParams.get("join_code") ||
        routeParams.code ||
        ""
    );
  }, [searchParams, routeParams.code]);

  useEffect(() => {
    if (inviteCode) {
      writeStorage(ENTRY_INVITE_CODE_KEY, inviteCode);
    }
  }, [inviteCode]);

  const communityName = useMemo(() => {
    return decodeFriendly(
      searchParams.get("community_name") ||
        searchParams.get("clan_name") ||
        "this GSN community"
    );
  }, [searchParams]);

  const communityCode = useMemo(() => {
    return cleanText(searchParams.get("community_code") || "");
  }, [searchParams]);

  const marketplaceName = useMemo(() => {
    return decodeFriendly(searchParams.get("marketplace_name") || "");
  }, [searchParams]);

  const inviterNameRaw = useMemo(() => {
    return cleanText(
      searchParams.get("inviter_name") ||
        searchParams.get("invited_by") ||
        searchParams.get("sender_name") ||
        ""
    );
  }, [searchParams]);

  const inviterLabel = useMemo(() => {
    return humanInviterLabel(inviterNameRaw);
  }, [inviterNameRaw]);

  const intendedReceiver = useMemo(() => {
    return decodeFriendly(
      searchParams.get("receiver_name") ||
        searchParams.get("receiver") ||
        searchParams.get("to") ||
        ""
    );
  }, [searchParams]);

  const inviteExpiry = useMemo(() => {
    return cleanText(
      searchParams.get("expires_at") ||
        searchParams.get("expiry") ||
        searchParams.get("expires") ||
        ""
    );
  }, [searchParams]);

  const inviteMessage = useMemo(() => {
    return decodeFriendly(
      searchParams.get("message") ||
        searchParams.get("note") ||
        searchParams.get("invite_message") ||
        ""
    );
  }, [searchParams]);

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [workCategory, setWorkCategory] = useState("");
  const [workDetail, setWorkDetail] = useState("");
  const [note, setNote] = useState("");
  const [formOpen, setFormOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 980;
  });
  const [invitePreview, setInvitePreview] = useState<any>(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  const resolvedCommunityName = useMemo(() => {
    const queryName = cleanText(communityName);
    if (queryName && queryName.toLowerCase() !== "this gsn community") {
      return queryName;
    }
    return (
      decodeFriendly(invitePreview?.community_name || "") || "this GSN community"
    );
  }, [communityName, invitePreview]);

  const resolvedMarketplaceName = useMemo(() => {
    return (
      decodeFriendly(marketplaceName || "") ||
      decodeFriendly(invitePreview?.marketplace_name || "")
    );
  }, [marketplaceName, invitePreview]);

  const resolvedInviteExpiry = useMemo(() => {
    return inviteExpiry || cleanText(invitePreview?.expires_at || "");
  }, [inviteExpiry, invitePreview]);

  const inviteLetter = useMemo(() => {
    return buildInviteLetter({
      receiver: intendedReceiver,
      communityName: resolvedCommunityName,
      inviter: inviterLabel,
      marketplaceName: resolvedMarketplaceName,
      expiresAt: resolvedInviteExpiry,
      customMessage: inviteMessage,
    });
  }, [
    intendedReceiver,
    resolvedCommunityName,
    inviterLabel,
    resolvedMarketplaceName,
    resolvedInviteExpiry,
    inviteMessage,
  ]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const [storedRequest, setStoredRequest] = useState<any>(null);
  const [resumeBusy, setResumeBusy] = useState(false);

  const joinDraftKey = useMemo(() => {
    if (!inviteCode) return "";
    return joinDraftStorageKey(inviteCode, communityCode);
  }, [inviteCode, communityCode]);

  const joinRequestKey = useMemo(() => {
    if (!inviteCode) return "";
    return joinRequestStorageKey(inviteCode, communityCode);
  }, [inviteCode, communityCode]);

  useEffect(() => {
    let alive = true;

    if (!inviteCode) {
      setInviteChecking(false);
      setInvitePreview({
        valid: false,
        status: "missing",
        message:
          "This page opened without a usable GSN invite code. Ask the person who invited you to send the latest join link again.",
      });
      return;
    }

    setInviteChecking(true);
    setInvitePreview(null);

    getJoinInvitePreview(inviteCode, {
      community_code: communityCode || undefined,
    })
      .then((out) => {
        if (!alive) return;
        setInvitePreview(out || null);
      })
      .catch(() => {
        if (!alive) return;
        setInvitePreview(null);
      })
      .finally(() => {
        if (!alive) return;
        setInviteChecking(false);
      });

    return () => {
      alive = false;
    };
  }, [inviteCode, communityCode]);

  const effectiveInviteCode = useMemo(() => {
    return cleanText(invitePreview?.invite_code || inviteCode);
  }, [invitePreview, inviteCode]);

  const inviteBlocked = Boolean(
    inviteCode && invitePreview && invitePreview.valid === false
  );
  const inviteReady = Boolean(invitePreview && invitePreview.valid === true);
  const invitePreviewMessage = cleanText(invitePreview?.message);
  const canOpenForm = Boolean(inviteCode) && !inviteBlocked && !inviteChecking;
  const showInviteLauncher = Boolean(inviteCode) && !inviteBlocked;
  const inviteHelpMessage = joinInviteHelpMessage(
    invitePreviewMessage,
    inviteBlocked
  );

  const canSubmit =
    !!effectiveInviteCode &&
    !inviteBlocked &&
    !inviteChecking &&
    !!cleanText(firstName) &&
    !!cleanText(surname) &&
    !!cleanText(phone) &&
    !!cleanText(country) &&
    !busy;

  const submittedRequestId = cleanText(
    success?.request?.id || success?.request_id || ""
  );

  const continueExistingRequest = useCallback(
    (result: any): boolean => {
      const requestId = cleanText(result?.request_id || "");
      const status = cleanText(result?.status || "pending").toLowerCase();
      const community = cleanText(
        result?.community_name || resolvedCommunityName
      );

      if (!requestId) return false;

      if (status === "approved") {
        const activationTo = activationRouteFor(result, location.search);
        if (!activationTo) return false;

        navigate(activationTo, {
          replace: true,
          state: {
            gmfn_id: cleanText(result?.gmfn_id || ""),
            request_id: requestId,
          },
        });
        return true;
      }

      if (status === "rejected") {
        const approvalTo = mergeSearchIntoPath(
          approvalRouteFor(result),
          location.search
        );
        if (!approvalTo) return false;

        navigate(approvalTo, {
          replace: true,
          state: {
            request_id: requestId,
            community_name: community,
            clan_name: community,
            status,
          },
        });
        return true;
      }

      const pendingTo = mergeSearchIntoPath(
        result?.result_path ||
          result?.pending_status_path ||
          `/pending-approval?request_id=${encodeURIComponent(requestId)}`,
        location.search
      );

      navigate(pendingTo, {
        replace: true,
        state: {
          request_id: requestId,
          community_name: community,
          clan_name: community,
          status,
          submitted_at: cleanText(result?.submitted_at || ""),
        },
      });
      return true;
    },
    [location.search, navigate, resolvedCommunityName]
  );

  const storeExistingRequest = useCallback(
    (result: any, fallbackPhone = "") => {
      if (!joinRequestKey) return;

      const requestId = cleanText(result?.request_id || "");
      if (!requestId) return;

      writeStorage(
        joinRequestKey,
        JSON.stringify({
          request_id: requestId,
          status: cleanText(result?.status || "pending"),
          community_name: cleanText(
            result?.community_name || resolvedCommunityName
          ),
          marketplace_name: cleanText(result?.marketplace_name || ""),
          submitted_at: cleanText(result?.submitted_at || ""),
          gmfn_id: cleanText(result?.gmfn_id || ""),
          activation_path: cleanText(result?.activation_path || ""),
          approval_path: cleanText(result?.approval_path || ""),
          pending_status_path: cleanText(result?.pending_status_path || ""),
          phone_e164: cleanText(result?.phone_e164 || fallbackPhone),
        })
      );
    },
    [joinRequestKey, resolvedCommunityName]
  );

  const clearStoredRequest = useCallback(() => {
    if (!joinRequestKey) return;
    writeStorage(joinRequestKey, null);
    setStoredRequest(null);
  }, [joinRequestKey]);

  useEffect(() => {
    if (!joinDraftKey) return;

    const raw = readStorage(joinDraftKey);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<{
        first_name: string;
        surname: string;
        phone: string;
        country: string;
        work_category: string;
        work_detail: string;
        note: string;
      }>;

      if (!cleanText(firstName) && cleanText(draft.first_name)) {
        setFirstName(cleanText(draft.first_name));
      }
      if (!cleanText(surname) && cleanText(draft.surname)) {
        setSurname(cleanText(draft.surname));
      }
      if (!cleanText(phone) && cleanText(draft.phone)) {
        setPhone(cleanText(draft.phone));
      }
      if (!cleanText(country) && cleanText(draft.country)) {
        setCountry(cleanText(draft.country));
      }
      if (!cleanText(workCategory) && cleanText(draft.work_category)) {
        setWorkCategory(cleanText(draft.work_category));
      }
      if (!cleanText(workDetail) && cleanText(draft.work_detail)) {
        setWorkDetail(cleanText(draft.work_detail));
      }
      if (!cleanText(note) && cleanText(draft.note)) {
        setNote(cleanText(draft.note));
      }
    } catch {
      // Ignore malformed local draft data and let the normal form flow continue.
    }
  }, [
    country,
    firstName,
    joinDraftKey,
    note,
    phone,
    surname,
    workCategory,
    workDetail,
  ]);

  useEffect(() => {
    if (!joinRequestKey) {
      setStoredRequest(null);
      return;
    }

    const raw = readStorage(joinRequestKey);
    if (!raw) {
      setStoredRequest(null);
      return;
    }

    try {
      setStoredRequest(JSON.parse(raw));
    } catch {
      setStoredRequest(null);
    }
  }, [joinRequestKey]);

  useEffect(() => {
    if (!joinDraftKey) return;

    const hasAnyDraftValue = [
      firstName,
      surname,
      phone,
      country,
      workCategory,
      workDetail,
      note,
    ].some((value) => cleanText(value));

    if (!hasAnyDraftValue) {
      writeStorage(joinDraftKey, null);
      return;
    }

    writeStorage(
      joinDraftKey,
      JSON.stringify({
        first_name: cleanText(firstName),
        surname: cleanText(surname),
        phone: cleanText(phone),
        country: cleanText(country),
        work_category: cleanText(workCategory),
        work_detail: cleanText(workDetail),
        note: cleanText(note),
      })
    );
  }, [
    country,
    firstName,
    joinDraftKey,
    note,
    phone,
    surname,
    workCategory,
    workDetail,
  ]);

  useEffect(() => {
    if (!inviteReady || !canOpenForm || success) return;
    setFormOpen(true);
  }, [inviteReady, canOpenForm, success]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const safeInviteCode = cleanText(effectiveInviteCode);
    const safePhone = cleanText(phone);
    const digits = phoneDigits(safePhone);

    if (!inviteReady) return;
    if (inviteBlocked || inviteChecking || busy || success) return;
    if (!safeInviteCode || digits.length < 8) return;

    let alive = true;
    const timeoutId = window.setTimeout(() => {
      getJoinInviteRequestStatus(safeInviteCode, safePhone, {
        community_code: communityCode || undefined,
      })
        .then((out) => {
          if (!alive) return;
          if (!out?.found) return;
          storeExistingRequest(out, safePhone);
          continueExistingRequest(out);
        })
        .catch(() => {
          // Ignore lookup misses here. The normal join submit path stays available.
        });
    }, 450);

    return () => {
      alive = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    busy,
    communityCode,
    continueExistingRequest,
    effectiveInviteCode,
    inviteBlocked,
    inviteChecking,
    inviteReady,
    phone,
    storeExistingRequest,
    success,
  ]);

  const selectedDialCode = useMemo(() => {
    return dialCodeForCountry(country);
  }, [country]);

  const selectedWorkOption = useMemo(() => {
    return workOptionFor(workCategory);
  }, [workCategory]);

  function handleCountryChange(nextCountry: string) {
    const previousDialCode = dialCodeForCountry(country);
    const nextDialCode = dialCodeForCountry(nextCountry);

    setCountry(nextCountry);

    if (!nextDialCode) return;

    setPhone((current) => {
      const safeCurrent = cleanText(current);

      if (!safeCurrent) return `${nextDialCode} `;
      if (previousDialCode && safeCurrent === previousDialCode) {
        return `${nextDialCode} `;
      }
      if (previousDialCode && safeCurrent === `${previousDialCode} `) {
        return `${nextDialCode} `;
      }

      return current;
    });
  }

  function handleWorkCategoryChange(nextCategory: string) {
    setWorkCategory(nextCategory);
    setWorkDetail("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setErr(null);
    setSuccess(null);

    try {
      const safeInviteCode = cleanText(effectiveInviteCode);
      const safeFirstName = cleanText(firstName);
      const safeSurname = cleanText(surname);
      const safePhone = cleanText(phone);
      const safeCountry = cleanText(country);
      const safeBusinessName = buildWorkSummary(workCategory, workDetail);
      const safeNote = cleanText(note);

      if (!safeInviteCode) {
        throw new Error("Invite code is missing from this join link.");
      }
      if (inviteBlocked) {
        throw new Error(invitePreviewMessage || "This invite link is not ready.");
      }
      if (inviteChecking) {
        throw new Error("The app is still checking this invite link. Please wait a moment.");
      }
      if (!safeFirstName) {
        throw new Error("Enter first name.");
      }
      if (!safeSurname) {
        throw new Error("Enter surname.");
      }
      if (!safePhone) {
        throw new Error("Enter phone number.");
      }
      if (!safeCountry) {
        throw new Error("Enter country.");
      }

      const res = await submitJoinRequest({
        invite_code: safeInviteCode,
        first_name: safeFirstName,
        surname: safeSurname,
        phone_e164: safePhone,
        country: safeCountry,
        business_name: safeBusinessName || undefined,
        note: safeNote || undefined,
      });

      const existingRequest =
        Boolean(res?.existing_request) ||
        Boolean(res?.existing_pending_request) ||
        /_request_exists$/.test(cleanText(res?.code).toLowerCase());

      if (existingRequest) {
        storeExistingRequest(res, safePhone);
        if (continueExistingRequest(res)) {
          return;
        }
      }

      setSuccess(res);
      setFirstName("");
      setSurname("");
      setPhone("");
      setCountry("");
      setWorkCategory("");
      setWorkDetail("");
      setNote("");
      setFormOpen(false);

      const nextRequestId = cleanText(res?.request?.id || res?.request_id || "");
      const nextCommunityName = cleanText(
        res?.community_name || res?.request?.clan_name || resolvedCommunityName
      );

      if (nextRequestId) {
        storeExistingRequest(
          {
            request_id: nextRequestId,
            status: cleanText(res?.request?.status || res?.status || "pending"),
            community_name: nextCommunityName,
            submitted_at: cleanText(
              res?.request?.created_at ||
                res?.submitted_at ||
                new Date().toISOString()
            ),
            pending_status_path: res?.pending_status_path || "",
          },
          safePhone
        );

        const pendingTo = mergeSearchIntoPath(
          `/pending-approval?request_id=${encodeURIComponent(nextRequestId)}`,
          location.search
        );

        navigate(pendingTo, {
          replace: true,
          state: {
            request_id: nextRequestId,
            community_name: nextCommunityName,
            clan_name: nextCommunityName,
            status: cleanText(res?.request?.status || res?.status || "pending"),
            submitted_at: cleanText(
              res?.request?.created_at ||
                res?.submitted_at ||
                new Date().toISOString()
            ),
          },
        });
        return;
      }
    } catch (e: any) {
      setErr(friendlyJoinError(e?.message));
    } finally {
      setBusy(false);
    }
  }

  async function resumeStoredRequest() {
    const requestId = cleanText(storedRequest?.request_id || "");
    if (!requestId) return;

    setResumeBusy(true);
    setErr(null);

    try {
      const live = await getJoinApprovalStatus(requestId);
      const merged = {
        ...storedRequest,
        ...live,
        request_id: requestId,
      };
      storeExistingRequest(merged, cleanText(storedRequest?.phone_e164 || ""));
      continueExistingRequest(merged);
    } catch {
      if (!continueExistingRequest(storedRequest)) {
        setErr(
          "Unable to reopen the saved join request right now. Please enter the phone number again or try once more."
        );
      }
    } finally {
      setResumeBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(94,146,214,0.14) 0%, rgba(11,31,51,0) 24%), radial-gradient(circle at top right, rgba(214,173,82,0.08) 0%, rgba(11,31,51,0) 22%), radial-gradient(circle at bottom left, rgba(54,98,156,0.18) 0%, rgba(54,98,156,0) 26%), linear-gradient(180deg, #07101C 0%, #0B1F33 38%, #173654 74%, #24496E 100%)",
        padding: "22px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 26,
            border: "1px solid rgba(196,210,226,0.18)",
            background:
              "linear-gradient(180deg, rgba(246,250,255,0.98) 0%, rgba(232,240,250,0.96) 58%, rgba(217,228,242,0.93) 100%)",
            boxShadow:
              "0 24px 58px rgba(5,16,38,0.28), inset 0 1px 0 rgba(255,255,255,0.80)",
            padding: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              borderRadius: 22,
              background:
                "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)",
              border: "1px solid rgba(16,37,59,0.16)",
              boxShadow:
                "0 18px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
              padding: 18,
              position: "relative",
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 28%), radial-gradient(circle at bottom, rgba(123,181,255,0.10) 0%, rgba(123,181,255,0) 30%)",
              }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "grid",
                gridTemplateColumns: "56px 1fr",
                alignItems: "center",
                gap: 12,
              }}
            >
              <EntryBackLink to="/welcome" />
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 1000,
                    letterSpacing: 4.2,
                    color: "#F3D06A",
                    textTransform: "uppercase",
                    textShadow: "0 1px 0 rgba(255,255,255,0.14)",
                  }}
                >
                  GSN
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#E9F2FF",
                    fontSize: 17,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Community invitation
                </div>
              </div>
            </div>
          </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "0.95fr 1.05fr",
            gap: 18,
          }}
        >
          <div style={pageCard()}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Invitation message
            </div>

            <div style={{ marginTop: 18, ...softCard() }}>
              {storedRequest?.request_id ? (
                <div
                  style={{
                    ...innerCard("#F8FBFF"),
                    marginBottom: 14,
                  }}
                >
                  <div style={labelText()}>Saved progress on this device</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 17,
                    }}
                  >
                    A previous join request is already tied to this same invite.
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    Request ID: {cleanText(storedRequest?.request_id || "")}
                    {cleanText(storedRequest?.community_name || "")
                      ? ` \u2022 Community: ${cleanText(storedRequest?.community_name || "")}`
                      : ""}
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
                      style={primaryBtn(resumeBusy)}
                      disabled={resumeBusy}
                      {...buttonGuardProps()}
                      onClick={resumeStoredRequest}
                    >
                      {resumeBusy ? "Opening saved request..." : "Reopen saved request"}
                    </button>
                    <button
                      type="button"
                      style={secondaryLink()}
                      {...buttonGuardProps()}
                      onClick={clearStoredRequest}
                    >
                      Clear saved request
                    </button>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <span style={badge(true)}>Invited by {inviterLabel}</span>
                <span style={badge(false)}>
                  {resolvedCommunityName || "This GSN community"}
                </span>
                {resolvedInviteExpiry ? (
                  <span style={badge(false)}>
                    Expires {safeDateTime(resolvedInviteExpiry)}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 15,
                }}
              >
                Invitation letter
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#35516B",
                  lineHeight: 1.82,
                  fontSize: 15,
                  display: "grid",
                  gap: 10,
                }}
              >
                {inviteLetter.map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={pageCard()}>
            <div style={labelText()}>Join request form</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 22,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Submit your request
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              Tell the community enough to know who is asking to join. Your
              request still goes back to people for review, because trust stays
              protected.
            </div>

            {showInviteLauncher ? (
              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ ...labelText(), marginBottom: 4 }}>Request form</div>
                  <div style={{ color: "#35516B", fontSize: 14, lineHeight: 1.6 }}>
                    Open this when you are ready to return your request to the
                    community.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canOpenForm}
                  {...buttonGuardProps()}
                  onClick={() => {
                    if (!canOpenForm) return;
                    setFormOpen((prev) => !prev);
                  }}
                  style={{
                    ...secondaryLink(),
                    opacity: canOpenForm ? 1 : 0.62,
                    cursor: canOpenForm ? "pointer" : "not-allowed",
                  }}
                >
                  {inviteChecking
                    ? "Checking"
                    : formOpen
                    ? "Collapse form"
                    : "Open request form"}
                </button>
              </div>
            ) : null}

            {inviteChecking ? (
              <div style={{ marginTop: 18, ...noticeStyle("info") }}>
                Checking this GSN invite link before you fill the form.
              </div>
            ) : null}

            {!inviteCode || inviteBlocked ? (
              <div style={{ marginTop: 18, ...noticeStyle("error") }}>
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>
                  {inviteBlocked ? "Fresh invite link needed." : "Join link needed."}
                </div>
                <div>{inviteHelpMessage}</div>
              </div>
            ) : null}

            {inviteReady ? (
              <div style={{ marginTop: 18, ...noticeStyle("success") }}>
                Invite checked. You can send your join request for community
                review.
              </div>
            ) : null}

            {err ? (
              <div style={{ marginTop: 18, ...noticeStyle("error") }}>
                {err}
              </div>
            ) : null}

            {success ? (
              <div style={{ marginTop: 18, ...noticeStyle("success") }}>
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>
                  Join request submitted successfully.
                </div>

                <div>
                  Your request has been sent for community review. Admission is
                  not automatic. Once approval is reached, you will be able to
                  proceed to activation with your GSN identity.
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Request status:</strong>{" "}
                  {String(success?.request?.status || success?.status || "pending")}
                </div>

                <div style={{ marginTop: 6 }}>
                  <strong>Community:</strong>{" "}
                  {String(
                    success?.community_name ||
                      success?.request?.clan_name ||
                      resolvedCommunityName ||
                      "Community not stated yet"
                  )}
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {submittedRequestId ? (
                    <OriginLink
                      to={`/join-approval/${submittedRequestId}`}
                      style={secondaryLink()}
                    >
                      Check approval status
                    </OriginLink>
                  ) : (
                    <OriginLink to="/join-request/pending" style={secondaryLink()}>
                      Open pending page
                    </OriginLink>
                  )}
                </div>
              </div>
            ) : null}

            {formOpen && canOpenForm ? (
            <form onSubmit={onSubmit}>
              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={labelText()}>First name</div>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={labelText()}>Surname</div>
                  <input
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Enter surname"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={labelText()}>Phone number</div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={
                      selectedDialCode
                        ? `${selectedDialCode} then your number`
                        : "Preferably +E164 format"
                    }
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                  {selectedDialCode ? (
                    <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                      Phone starts with {selectedDialCode} for {country}. Add
                      the rest of your number after it.
                    </div>
                  ) : null}
                </div>

                <div>
                  <div style={labelText()}>Country</div>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={labelText()}>Work, business, or trade (optional)</div>
                <select
                  value={workCategory}
                  onChange={(e) => handleWorkCategoryChange(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="">Select the closest one</option>
                  {WORK_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Choose the nearest fit. This only helps the community
                  understand you faster.
                </div>
              </div>

              {workCategory && workCategory !== "none" ? (
                <div style={{ marginTop: 12 }}>
                  <div style={labelText()}>Short detail (optional)</div>
                  <input
                    value={workDetail}
                    onChange={(e) => setWorkDetail(e.target.value)}
                    placeholder={selectedWorkOption?.hint || "Add a few words if needed"}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              ) : null}

              {workCategory === "none" ? (
                <div style={{ marginTop: 12, ...noticeStyle("info") }}>
                  That is okay. GSN is not judging income. The community can
                  still review you by relationship, trust, and what they know
                  about you.
                </div>
              ) : null}

              <div style={{ marginTop: 12 }}>
                <div style={labelText()}>Short note to the community (optional)</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a short note"
                  style={{ ...textareaStyle(), marginTop: 8 }}
                />
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gap: 12,
                  justifyItems: isCompact ? "stretch" : "center",
                }}
              >
                <button
                  type="submit"
                  disabled={!canSubmit}
                  {...buttonGuardProps()}
                  style={primaryBtn(!canSubmit)}
                >
                  {busy ? "Submitting Request..." : "Submit Join Request"}
                </button>
              </div>
            </form>
            ) : null}
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <OriginLink to="/welcome" style={secondaryLink()}>
            Back to Welcome
          </OriginLink>
        </div>
        </div>
      </div>
    </div>
  );
}



