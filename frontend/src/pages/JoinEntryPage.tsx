import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EntryBackLink } from "../components/EntryControls";
import GSNBrandMark from "../components/GSNBrandMark";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
} from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import {
  getJoinApprovalStatus,
  getJoinInvitePreview,
  getJoinInviteRequestStatus,
  getMe,
  getStoredGmfnId,
  isAuthenticated,
  logout,
  submitJoinRequest,
} from "../lib/api";
import { resolveCtaTarget, type CtaTarget } from "../lib/ctaTargets";
import {
  ENTRY_INVITE_CODE_KEY,
  readStorage,
  writeStorage,
} from "../lib/entryFlow";
import {
  clearJoinEntryDraft,
  readJoinEntryDraft,
  saveJoinEntryDraft,
} from "../lib/entryDraft";
import { buildJoinInviteLetter } from "../lib/joinInviteMessaging";
import { structuredErrorDetail } from "../lib/structuredErrors";

type JoinPathChoice = "existing" | "new" | null;

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(37,78,119,0.20)",
    padding: 24,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(37,78,119,0.18)",
    padding: 18,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
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
    gap: 6,
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

function invitationPaperStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: isCompact ? 26 : 30,
    padding: isCompact ? 18 : 22,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(248,252,255,0.96) 52%, rgba(255,247,222,0.92) 100%)",
    border: "1px solid rgba(214,170,69,0.34)",
    boxShadow:
      "0 24px 46px rgba(9,35,63,0.14), inset 0 1px 0 rgba(255,255,255,0.78)",
  };
}

function invitationPaperContentStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: 14,
  };
}

function invitationPaperHeaderStyle(isCompact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: isCompact ? 10 : 12,
    alignItems: "center",
    minWidth: 0,
  };
}

function invitationPaperSealStyle(isCompact: boolean): React.CSSProperties {
  return {
    width: isCompact ? 48 : 56,
    height: isCompact ? 48 : 56,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(145deg, #071D33 0%, #0B2D4A 100%)",
    border: "1px solid rgba(246,215,122,0.36)",
    boxShadow: "0 14px 28px rgba(7,29,51,0.24)",
  };
}

function invitationPaperEyebrowStyle(): React.CSSProperties {
  return {
    color: "#8A640E",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  };
}

function invitationPaperTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: 2,
    color: "#07172C",
    fontSize: isCompact ? 22 : 28,
    lineHeight: 1.08,
    fontWeight: 1000,
  };
}

function invitationPaperMessageStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: "14px 16px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(37,78,119,0.12)",
    color: "#243E59",
    lineHeight: 1.58,
    fontSize: 14,
    display: "grid",
    gap: 8,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  };
}

function invitationPaperFooterStyle(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    color: "#7A5C17",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  };
}

function joinEntryIconText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 24
) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        lineHeight: 1.12,
        textAlign: "center",
        whiteSpace: "normal",
      }}
    >
      <GsnLegacyIcon
        name={name}
        size={size}
        style={{ display: "inline-grid", flex: "0 0 auto" }}
      />
      <span
        style={{
          minWidth: 0,
          maxWidth: "100%",
          overflow: "hidden",
          overflowWrap: "normal",
          wordBreak: "normal",
          hyphens: "none",
          textAlign: "center",
          whiteSpace: "normal",
        }}
      >
        {label}
      </span>
    </span>
  );
}

function joinEntryIconTile(name: GsnIconName, size = 48) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 17,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: `0 0 ${size}px`,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(233,241,250,0.86) 100%)",
        border: "1px solid rgba(37,78,119,0.14)",
        boxShadow:
          "0 14px 28px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.86)",
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(28, size - 12)} />
    </span>
  );
}

function entryChoiceActionStyle(kind: "primary" | "secondary"): React.CSSProperties {
  const primary = kind === "primary";
  return {
    width: "100%",
    minHeight: 52,
    height: 52,
    maxHeight: 52,
    borderRadius: 16,
    minWidth: 0,
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0 14px",
    fontSize: 14,
    fontWeight: 1000,
    lineHeight: 1.15,
    textAlign: "center",
    whiteSpace: "normal",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    border: primary
      ? "1px solid rgba(28,76,126,0.28)"
      : "1px solid rgba(28,76,126,0.18)",
    background: primary
      ? "linear-gradient(180deg, #0B2D4A 0%, #08233A 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,247,255,0.98) 100%)",
    color: primary ? "#FFFFFF" : "#123055",
    boxShadow: primary
      ? "0 14px 26px rgba(8,35,58,0.18), inset 0 1px 0 rgba(255,255,255,0.14)"
      : "0 10px 20px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function entryActionGrid(compact = false, columns = 2): React.CSSProperties {
  return {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: compact
      ? "1fr"
      : `repeat(${columns}, minmax(0, 1fr))`,
    gap: 10,
    alignItems: "stretch",
    width: "100%",
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

function ctaPath(target: CtaTarget): string {
  return typeof target.to === "string" ? target.to : String(target.to);
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
  const parsed = structuredErrorDetail(raw);
  const parsedCode = cleanText(parsed?.code).toLowerCase();
  if (
    parsedCode === "existing_account_login_required" ||
    parsedCode === "existing_gsn_id_required"
  ) {
    return (
      cleanText(parsed?.message) ||
      "This phone is already tied to an existing GSN identity. Enter that GSN number here so the request can reuse one identity."
    );
  }

  if (parsedCode === "join_identity_match_review_required") {
    return (
      cleanText(parsed?.message) ||
      "These details look like an existing GSN identity. Enter the existing GSN number if it belongs to you, or ask the community helper to review it before creating another identity."
    );
  }

  if (parsed?.message) {
    return cleanText(parsed.message);
  }

  const lower = raw.toLowerCase();

  if (
    lower.includes("existing_account_login_required") ||
    lower.includes("existing_gsn_id_required") ||
    lower.includes("already tied to an existing gmfn identity") ||
    lower.includes("already tied to an existing gsn identity")
  ) {
    return (
      "This phone is already tied to an existing GSN identity. Enter that GSN number here so the request can reuse one identity."
    );
  }

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

function joinRequestStorageKey(inviteCode: string, communityCode: string): string {
  const invite = cleanText(inviteCode) || "unknown-invite";
  const community = cleanText(communityCode) || "unknown-community";
  return `gmfn_join_request:${community}:${invite}`;
}

const JOIN_REQUEST_RESUME_TTL_MS = 24 * 60 * 60 * 1000;

function readStoredJoinRequest(key: string): any | null {
  const raw = readStorage(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const updatedAt = Number(parsed?.updatedAt || 0);
    if (
      !Number.isFinite(updatedAt) ||
      updatedAt <= 0 ||
      Date.now() - updatedAt > JOIN_REQUEST_RESUME_TTL_MS
    ) {
      writeStorage(key, null);
      return null;
    }
    return parsed;
  } catch {
    writeStorage(key, null);
    return null;
  }
}

function BrandedInvitationPaper({
  lines,
  inviterLabel,
  communityName,
  expiresAt,
  isCompact,
}: {
  lines: string[];
  inviterLabel: string;
  communityName: string;
  expiresAt?: string;
  isCompact: boolean;
}) {
  return (
    <section style={invitationPaperStyle(isCompact)} aria-label="GSN invitation">
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          opacity: 0.055,
          pointerEvents: "none",
          transform: "translateY(8px)",
        }}
      >
        <GSNBrandMark width={isCompact ? 210 : 280} height={isCompact ? 265 : 352} />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 10,
          borderRadius: isCompact ? 20 : 24,
          border: "1px solid rgba(214,170,69,0.18)",
          pointerEvents: "none",
        }}
      />

      <div style={invitationPaperContentStyle()}>
        <div style={invitationPaperHeaderStyle(isCompact)}>
          <div style={invitationPaperSealStyle(isCompact)}>
            <GSNBrandMark width={isCompact ? 28 : 32} height={isCompact ? 36 : 42} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={invitationPaperEyebrowStyle()}>Global Support Network</div>
            <div style={invitationPaperTitleStyle(isCompact)}>
              Community invitation
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(true)}>{joinEntryIconText("id", inviterLabel, 18)}</span>
          <span style={badge(false)}>
            {joinEntryIconText("community", communityName || "GSN community", 18)}
          </span>
          {expiresAt ? (
            <span style={badge(false)}>
              {joinEntryIconText("calendar", `Open until ${safeDateTime(expiresAt)}`, 18)}
            </span>
          ) : null}
        </div>

        <div style={invitationPaperMessageStyle()}>
          {lines.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>

        <div style={invitationPaperFooterStyle()}>
          <span>Official GSN invite</span>
          <span>One identity. Community review.</span>
        </div>
      </div>
    </section>
  );
}

export default function JoinEntryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams<Record<string, string | undefined>>();
  const [manualInviteCode, setManualInviteCode] = useState("");

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

  function openManualInviteCode() {
    const nextCode = cleanText(manualInviteCode);
    if (!nextCode) return;
    navigate(`/join/${encodeURIComponent(nextCode)}`, { replace: true });
  }

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

  const restoredJoinDraft = useMemo(() => {
    return readJoinEntryDraft(inviteCode, communityCode);
  }, [inviteCode, communityCode]);

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

  const [firstName, setFirstName] = useState(() => restoredJoinDraft?.firstName || "");
  const [surname, setSurname] = useState(() => restoredJoinDraft?.surname || "");
  const [phone, setPhone] = useState(() => restoredJoinDraft?.phone || "");
  const [country, setCountry] = useState(() => restoredJoinDraft?.country || "");
  const [dateOfBirth, setDateOfBirth] = useState(() => restoredJoinDraft?.dateOfBirth || "");
  const [birthCountry, setBirthCountry] = useState(() => restoredJoinDraft?.birthCountry || "");
  const [birthPlace, setBirthPlace] = useState(() => restoredJoinDraft?.birthPlace || "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(
    () => restoredJoinDraft?.countryOfOrigin || ""
  );
  const [residentialArea, setResidentialArea] = useState(
    () => restoredJoinDraft?.residentialArea || ""
  );
  const [workCategory, setWorkCategory] = useState(
    () => restoredJoinDraft?.workCategory || ""
  );
  const [workDetail, setWorkDetail] = useState(() => restoredJoinDraft?.workDetail || "");
  const [note, setNote] = useState(() => restoredJoinDraft?.note || "");
  const [existingGsnId, setExistingGsnId] = useState(
    () => restoredJoinDraft?.existingGsnId || ""
  );
  const [identityNoteOpen, setIdentityNoteOpen] = useState(false);
  const [inviteAcknowledged, setInviteAcknowledged] = useState<boolean>(() =>
    Boolean(restoredJoinDraft?.inviteAcknowledged)
  );
  const [formOpen, setFormOpen] = useState<boolean>(() => {
    if (typeof restoredJoinDraft?.formOpen === "boolean") return restoredJoinDraft.formOpen;
    return false;
  });
  const [joinPathChoice, setJoinPathChoice] = useState<JoinPathChoice>(() => {
    if (cleanText(restoredJoinDraft?.existingGsnId || "")) return "existing";
    if (restoredJoinDraft?.formOpen) return "new";
    return null;
  });
  const [invitePreview, setInvitePreview] = useState<any>(null);
  const [inviteChecking, setInviteChecking] = useState(false);
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [currentMemberChecked, setCurrentMemberChecked] = useState(false);

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
    return buildJoinInviteLetter({
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
  const [joinResumeNotice, setJoinResumeNotice] = useState<string | null>(() =>
    restoredJoinDraft
      ? "A saved join form was found on this phone."
      : null
  );

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

  useEffect(() => {
    let alive = true;

    if (!isAuthenticated()) {
      setCurrentMember(null);
      setCurrentMemberChecked(true);
      return;
    }

    setCurrentMemberChecked(false);
    getMe()
      .then((out) => {
        if (!alive) return;
        setCurrentMember(out || null);
      })
      .catch(() => {
        if (!alive) return;
        setCurrentMember(null);
      })
      .finally(() => {
        if (!alive) return;
        setCurrentMemberChecked(true);
      });

    return () => {
      alive = false;
    };
  }, []);

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
  const currentGmfnId = cleanText(currentMember?.gmfn_id || getStoredGmfnId() || "");
  const hasStoredSession = isAuthenticated();
  const usingExistingIdentity = Boolean(currentMember);
  const lockedAuthenticatedWithoutGmfn =
    currentMemberChecked && hasStoredSession && !usingExistingIdentity;
  const canUseNewMemberForm =
    currentMemberChecked && !usingExistingIdentity;
  const hasExistingGsnClaim = Boolean(cleanText(existingGsnId));
  const showUnclearSessionRecovery =
    lockedAuthenticatedWithoutGmfn && joinPathChoice !== "new";
  const showDraftRecovery =
    Boolean(joinResumeNotice) &&
    !showUnclearSessionRecovery &&
    joinPathChoice === null &&
    !success;
  const showJoinPathLauncher =
    showInviteLauncher &&
    canUseNewMemberForm &&
    !showUnclearSessionRecovery &&
    !showDraftRecovery;

  const canSubmit =
    !!effectiveInviteCode &&
    !inviteBlocked &&
    !inviteChecking &&
    inviteAcknowledged &&
    !hasExistingGsnClaim &&
    !!cleanText(firstName) &&
    !!cleanText(surname) &&
    !!cleanText(phone) &&
    !!cleanText(country) &&
    !!cleanText(dateOfBirth) &&
    !!cleanText(birthPlace) &&
    !busy;
  const canSubmitExistingGsn =
    !!effectiveInviteCode &&
    !inviteBlocked &&
    !inviteChecking &&
    inviteAcknowledged &&
    hasExistingGsnClaim &&
    !!cleanText(firstName) &&
    !!cleanText(surname) &&
    !busy;

  const submittedRequestId = cleanText(
    success?.request?.id || success?.request_id || ""
  );
  const welcomeCta = useMemo(
    () =>
      resolveCtaTarget("welcome", {
        debugId: "join-entry.back-welcome",
      }),
    []
  );
  const alreadyMemberCta = useMemo(
    () =>
      resolveCtaTarget("marketplace", {
        communityId: cleanText(success?.community_id || ""),
        debugId: "join-entry.open-community",
      }),
    [success]
  );
  const pendingCta = useMemo(
    () =>
      resolveCtaTarget("joinPending", {
        requestId: submittedRequestId,
        debugId: "join-entry.open-pending",
      }),
    [submittedRequestId]
  );
  const approvalStatusCta = useMemo(
    () =>
      resolveCtaTarget("joinPending", {
        explicitTo: submittedRequestId ? `/join-approval/${submittedRequestId}` : undefined,
        debugId: "join-entry.check-approval",
      }),
    [submittedRequestId]
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
        const resultChannel = cleanText(result?.result_channel || "").toLowerCase();
        const activationRequired = result?.activation_required !== false;

        if (!activationRequired || resultChannel === "approved-existing-member") {
          const communityId = cleanText(result?.community_id || "");
          const openTo = mergeSearchIntoPath(
            cleanText(result?.result_path || "") ||
              (communityId
                ? `/app/community/${encodeURIComponent(communityId)}`
                : "/app/community"),
            location.search
          );

          navigate(openTo, {
            replace: true,
            state: {
              request_id: requestId,
              community_name: community,
              clan_name: community,
              status,
              gmfn_id: cleanText(result?.gmfn_id || ""),
            },
          });
          return true;
        }

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
    (result: any) => {
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
          activation_path: cleanText(result?.activation_path || ""),
          approval_path: cleanText(result?.approval_path || ""),
          pending_status_path: cleanText(result?.pending_status_path || ""),
          result_path: cleanText(result?.result_path || ""),
          result_channel: cleanText(result?.result_channel || ""),
          activation_required: result?.activation_required !== false,
          community_id: cleanText(result?.community_id || ""),
          updatedAt: Date.now(),
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
    if (!joinRequestKey) {
      setStoredRequest(null);
      return;
    }

    const stored = readStoredJoinRequest(joinRequestKey);
    if (!stored) {
      setStoredRequest(null);
      return;
    }

    setStoredRequest(stored);
  }, [joinRequestKey]);

  useEffect(() => {
    if (!inviteCode) return;

    saveJoinEntryDraft(inviteCode, communityCode, {
      existingGsnId,
      firstName,
      surname,
      phone,
      country,
      dateOfBirth,
      birthCountry,
      birthPlace,
      countryOfOrigin,
      residentialArea,
      workCategory,
      workDetail,
      note,
      inviteAcknowledged,
      formOpen,
    });
  }, [
    country,
    dateOfBirth,
    birthCountry,
    birthPlace,
    countryOfOrigin,
    communityCode,
    existingGsnId,
    firstName,
    formOpen,
    inviteCode,
    inviteAcknowledged,
    note,
    phone,
    residentialArea,
    surname,
    workCategory,
    workDetail,
  ]);

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
          storeExistingRequest(out);
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

  function clearUnclearSessionAndOpenForm() {
    logout();
    setCurrentMember(null);
    setCurrentMemberChecked(true);
    setJoinPathChoice("new");
    setFormOpen(true);
    setErr(null);
    setSuccess(null);
  }

  function chooseExistingGsnPath() {
    setJoinPathChoice("existing");
    setFormOpen(false);
    setIdentityNoteOpen(false);
    setErr(null);
    setSuccess(null);
  }

  function chooseNewRequesterPath() {
    setJoinPathChoice("new");
    setExistingGsnId("");
    setIdentityNoteOpen(false);
    setFormOpen(true);
    setJoinResumeNotice(null);
    setErr(null);
    setSuccess(null);
  }

  function continueRestoredDraft() {
    setJoinResumeNotice(null);
    if (hasExistingGsnClaim) {
      setJoinPathChoice("existing");
      setFormOpen(false);
      return;
    }
    setJoinPathChoice("new");
    setFormOpen(true);
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
      const safeDateOfBirth = cleanText(dateOfBirth);
      const safeBirthCountry = cleanText(birthCountry) || safeCountry;
      const safeBirthPlace = cleanText(birthPlace);
      const safeCountryOfOrigin = cleanText(countryOfOrigin);
      const safeResidentialArea = cleanText(residentialArea);
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
      if (!safeDateOfBirth) {
        throw new Error("Enter date of birth.");
      }
      if (!safeBirthPlace) {
        throw new Error("Enter place of birth.");
      }

      const res = await submitJoinRequest(
        {
          invite_code: safeInviteCode,
          first_name: safeFirstName,
          surname: safeSurname,
          phone_e164: safePhone,
          country: safeCountry,
          date_of_birth: safeDateOfBirth,
          birth_country: safeBirthCountry,
          birth_place: safeBirthPlace,
          country_of_origin: safeCountryOfOrigin || undefined,
          residential_area: safeResidentialArea || undefined,
          business_name: safeBusinessName || undefined,
          note: safeNote || undefined,
        },
        {
          includeAuth: false,
        }
      );

      const existingRequest =
        Boolean(res?.existing_request) ||
        Boolean(res?.existing_pending_request) ||
        /_request_exists$/.test(cleanText(res?.code).toLowerCase());

      if (existingRequest) {
        storeExistingRequest(res);
        clearJoinEntryDraft(inviteCode, communityCode);
        if (continueExistingRequest(res)) {
          return;
        }
      }

      setSuccess(res);
      clearJoinEntryDraft(inviteCode, communityCode);
      setFirstName("");
      setSurname("");
      setPhone("");
      setCountry("");
      setWorkCategory("");
      setWorkDetail("");
      setNote("");
      setFormOpen(false);
      setJoinPathChoice(null);

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
          }
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

  async function requestJoinWithExistingIdentity() {
    setBusy(true);
    setErr(null);
    setSuccess(null);

    try {
      const safeInviteCode = cleanText(effectiveInviteCode);

      if (!safeInviteCode) {
        throw new Error("Invite code is missing from this join link.");
      }
      if (inviteBlocked) {
        throw new Error(invitePreviewMessage || "This invite link is not ready.");
      }
      if (inviteChecking) {
        throw new Error("The app is still checking this invite link. Please wait a moment.");
      }
      if (!usingExistingIdentity) {
        throw new Error("Use the GSN ID option on this invite before sending the request.");
      }

      const displayName = cleanText(currentMember?.display_name || currentMember?.nickname || "");
      const [firstPart = "Existing", ...restParts] = displayName.split(/\s+/).filter(Boolean);
      const res = await submitJoinRequest({
        invite_code: safeInviteCode,
        first_name: firstPart,
        surname: restParts.join(" ") || "GSN member",
        phone_e164: cleanText(currentMember?.phone_e164 || "") || undefined,
        country: "Existing GSN identity",
      });

      const existingRequest =
        Boolean(res?.existing_request) ||
        Boolean(res?.existing_pending_request) ||
        /_request_exists$/.test(cleanText(res?.code).toLowerCase());

      if (existingRequest) {
        storeExistingRequest(res);
        clearJoinEntryDraft(inviteCode, communityCode);
        if (continueExistingRequest(res)) {
          return;
        }
      }

      setSuccess(res);
      clearJoinEntryDraft(inviteCode, communityCode);
      setJoinPathChoice(null);

      const resultStatus = cleanText(res?.result_status || res?.code || "").toLowerCase();
      if (resultStatus === "already_member") {
        return;
      }

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
          }
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
            gmfn_id: cleanText(res?.gmfn_id || currentGmfnId),
          },
        });
      }
    } catch (e: any) {
      setErr(friendlyJoinError(e?.message));
    } finally {
      setBusy(false);
    }
  }

  async function requestJoinWithExistingGsnId() {
    setBusy(true);
    setErr(null);
    setSuccess(null);

    try {
      const safeInviteCode = cleanText(effectiveInviteCode);
      const safeExistingGsnId = cleanText(existingGsnId).toUpperCase();

      if (!safeInviteCode) {
        throw new Error("Invite code is missing from this join link.");
      }
      if (inviteBlocked) {
        throw new Error(invitePreviewMessage || "This invite link is not ready.");
      }
      if (inviteChecking) {
        throw new Error("The app is still checking this invite link. Please wait a moment.");
      }
      if (!safeExistingGsnId) {
        throw new Error("Enter your GSN number first.");
      }
      const safeFirstName = cleanText(firstName);
      const safeSurname = cleanText(surname);
      const safeBusinessName = buildWorkSummary(workCategory, workDetail);

      if (!safeFirstName || !safeSurname) {
        throw new Error("Add your name with the GSN number before sending the request.");
      }

      const res = await submitJoinRequest(
        {
          invite_code: safeInviteCode,
          existing_gmfn_id: safeExistingGsnId,
          first_name: safeFirstName,
          surname: safeSurname,
          business_name: safeBusinessName || undefined,
          note: cleanText(note) || undefined,
        },
        { includeAuth: false }
      );

      const existingRequest =
        Boolean(res?.existing_request) ||
        Boolean(res?.existing_pending_request) ||
        /_request_exists$/.test(cleanText(res?.code).toLowerCase());

      if (existingRequest) {
        storeExistingRequest(res);
        clearJoinEntryDraft(inviteCode, communityCode);
        if (continueExistingRequest(res)) {
          return;
        }
      }

      setSuccess(res);
      clearJoinEntryDraft(inviteCode, communityCode);
      setJoinPathChoice(null);

      const resultStatus = cleanText(res?.result_status || res?.code || "").toLowerCase();
      if (resultStatus === "already_member") {
        return;
      }

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
          }
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
            gmfn_id: cleanText(res?.gmfn_id || safeExistingGsnId),
          },
        });
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
      storeExistingRequest(merged);
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

  function startFreshJoinDraft() {
    clearJoinEntryDraft(inviteCode, communityCode);
    setExistingGsnId("");
    setFirstName("");
    setSurname("");
    setPhone("");
    setCountry("");
    setDateOfBirth("");
    setBirthCountry("");
    setBirthPlace("");
    setCountryOfOrigin("");
    setResidentialArea("");
    setWorkCategory("");
    setWorkDetail("");
    setNote("");
    setInviteAcknowledged(true);
    setJoinPathChoice("new");
    setFormOpen(true);
    setJoinResumeNotice(null);
    setErr(null);
    setSuccess(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(94,146,214,0.14) 0%, rgba(11,31,51,0) 24%), radial-gradient(circle at top right, rgba(214,173,82,0.08) 0%, rgba(11,31,51,0) 22%), radial-gradient(circle at bottom left, rgba(54,98,156,0.18) 0%, rgba(54,98,156,0) 26%), linear-gradient(180deg, #07101C 0%, #0B1F33 38%, #173654 74%, #24496E 100%)",
        padding: isCompact ? "16px 14px 24px" : "22px",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1120, margin: "0 auto", boxSizing: "border-box" }}>
        <div
          style={{
            borderRadius: 26,
            border: "1px solid rgba(196,210,226,0.18)",
            background:
              "linear-gradient(180deg, rgba(246,250,255,0.98) 0%, rgba(232,240,250,0.96) 58%, rgba(217,228,242,0.93) 100%)",
            boxShadow:
              "0 24px 58px rgba(5,16,38,0.28), inset 0 1px 0 rgba(255,255,255,0.80)",
            padding: isCompact ? 14 : 20,
            overflow: "hidden",
            boxSizing: "border-box",
            width: "100%",
            maxWidth: "100%",
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
              padding: isCompact ? 14 : 18,
              position: "relative",
              overflow: "hidden",
              marginBottom: 16,
              boxSizing: "border-box",
              width: "100%",
              maxWidth: "100%",
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
                  {joinEntryIconText("join-person-plus", "Community invitation", 22)}
                </div>
              </div>
            </div>
          </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact || !inviteAcknowledged ? "1fr" : "0.95fr 1.05fr",
            gap: 18,
          }}
        >
          <div style={pageCard()}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {joinEntryIconTile("document", 48)}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                Invitation message
              </div>
            </div>

            <div style={{ marginTop: 18, ...softCard() }}>
              {storedRequest?.request_id ? (
                <div
                  style={{
                    ...innerCard("#F8FBFF"),
                    marginBottom: 14,
                  }}
                >
                  <div style={labelText()}>
                    {joinEntryIconText("records-folder", "Saved progress on this device", 22)}
                  </div>
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
                  <CardActionRow align="stretch" style={entryActionGrid(isCompact)}>
                    <PrimaryButton
                      type="button"
                      disabled={resumeBusy}
                      onClick={resumeStoredRequest}
                      debugId="join-entry.resume-saved-request"
                      stableHeight={52}
                      style={entryChoiceActionStyle("primary")}
                    >
                      {joinEntryIconText(
                        "refresh",
                        resumeBusy ? "Opening saved request..." : "Reopen saved request"
                      )}
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={clearStoredRequest}
                      debugId="join-entry.clear-saved-request"
                      stableHeight={52}
                      style={entryChoiceActionStyle("secondary")}
                    >
                      {joinEntryIconText("lock", "Clear saved request")}
                    </SecondaryButton>
                  </CardActionRow>
                </div>
              ) : null}

              <BrandedInvitationPaper
                lines={inviteLetter}
                inviterLabel={`Invited by ${inviterLabel}`}
                communityName={resolvedCommunityName || "This GSN community"}
                expiresAt={resolvedInviteExpiry}
                isCompact={isCompact}
              />

              {!inviteAcknowledged ? (
                <div style={{ marginTop: 18 }}>
                  <PrimaryButton
                    type="button"
                    disabled={!canOpenForm}
                    onClick={() => {
                      if (!canOpenForm) return;
                      setInviteAcknowledged(true);
                      setFormOpen(false);
                    }}
                    debugId="join-entry.acknowledge-invite"
                    stableHeight={52}
                    style={{
                      ...entryChoiceActionStyle("primary"),
                      width: "min(100%, 420px)",
                    }}
                  >
                    {joinEntryIconText(
                      "navigation",
                      inviteChecking ? "Checking invite..." : "Continue"
                    )}
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          </div>

          {inviteAcknowledged ? (
          <div style={pageCard()}>
            <div style={labelText()}>
              {joinEntryIconText("join-person-plus", "Join request form", 22)}
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 22,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              {joinEntryIconText("pen", "Request to join", 24)}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              Use your existing GSN ID if you have one. If you are new, fill the
              short form for community review.
            </div>

            {showDraftRecovery ? (
              <div style={{ marginTop: 14, ...innerCard("#F8FBFF") }}>
                <div style={labelText()}>
                  {joinEntryIconText("refresh", "Saved form found", 22)}
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  {joinResumeNotice}
                </div>
                <CardActionRow align="stretch" style={entryActionGrid(isCompact)}>
                  <PrimaryButton
                    type="button"
                    onClick={continueRestoredDraft}
                    debugId="join-entry.resume-draft-continue"
                    stableHeight={52}
                    style={entryChoiceActionStyle("primary")}
                  >
                    {joinEntryIconText("navigation", "Continue saved form")}
                  </PrimaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={startFreshJoinDraft}
                    debugId="join-entry.resume-draft-start-fresh"
                    stableHeight={52}
                    style={entryChoiceActionStyle("secondary")}
                  >
                    {joinEntryIconText("refresh", "Start again")}
                  </SecondaryButton>
                </CardActionRow>
              </div>
            ) : null}

            {currentMemberChecked && usingExistingIdentity ? (
              <div style={{ marginTop: 14, ...innerCard("#F8FBFF") }}>
                <div style={labelText()}>
                  {joinEntryIconText("id", "Existing GSN identity", 22)}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 1000,
                    fontSize: 18,
                    lineHeight: 1.35,
                  }}
                >
                  {joinEntryIconText(
                    "community",
                    currentGmfnId
                      ? "Join this community with your existing GSN identity."
                      : "Join this community with your current GSN account.",
                    26
                  )}
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  This adds a new community membership request for{" "}
                  {resolvedCommunityName}. It does not create a new GSN ID or a
                  duplicate account. Community approval may still be required.
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={badge(true)}>
                    {joinEntryIconText(
                      "id",
                      currentGmfnId
                        ? `GSN ID ${currentGmfnId}`
                        : "GSN ID will be confirmed",
                      20
                    )}
                  </span>
                  <span style={badge(false)}>
                    {joinEntryIconText(
                      "check",
                      cleanText(currentMember?.email || "Signed in"),
                      20
                    )}
                  </span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <PrimaryButton
                    type="button"
                    disabled={!inviteReady || inviteBlocked || inviteChecking || busy}
                    onClick={requestJoinWithExistingIdentity}
                    debugId="join-entry.existing-identity"
                    busy={busy}
                    busyLabel="Sending request..."
                    stableHeight={52}
                    style={entryChoiceActionStyle("primary")}
                  >
                    {joinEntryIconText("id", "Join with GSN ID")}
                  </PrimaryButton>
                </div>
              </div>
            ) : null}

            {showUnclearSessionRecovery ? (
              <div style={{ marginTop: 14, ...noticeStyle("info") }}>
                <div>
                  This phone has an old saved access state. Enter your GSN
                  number here, or continue without one.
                </div>
                <CardActionRow align="stretch" style={entryActionGrid(isCompact)}>
                  <SecondaryButton
                    type="button"
                    onClick={chooseExistingGsnPath}
                    debugId="join-entry.use-existing-gsn-after-unclear-session"
                    stableHeight={52}
                    style={entryChoiceActionStyle("secondary")}
                  >
                    {joinEntryIconText("id", "Use GSN ID")}
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={clearUnclearSessionAndOpenForm}
                    debugId="join-entry.clear-unclear-session-open-form"
                    stableHeight={52}
                    style={entryChoiceActionStyle("secondary")}
                  >
                    {joinEntryIconText("join-person-plus", "No GSN ID")}
                  </SecondaryButton>
                </CardActionRow>
              </div>
            ) : null}

            {showJoinPathLauncher ? (
              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  marginTop: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ ...labelText(), marginBottom: 0 }}>
                    {joinEntryIconText("id", "Do you already have a GSN number?", 22)}
                  </div>
                  <div
                    style={{
                      color: "#35516B",
                      fontSize: 14,
                      lineHeight: 1.55,
                    }}
                  >
                    If you already have one, enter it here so GSN does not
                    issue another identity after approval. If you do not have
                    one, fill the short request form for community review.
                  </div>
                  {inviteReady ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(true)}>
                        {joinEntryIconText("check", "Invite checked", 18)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div style={entryActionGrid(isCompact)}>
                  <SecondaryButton
                    type="button"
                    disabled={!canOpenForm}
                    onClick={() => {
                      if (!canOpenForm) return;
                      chooseExistingGsnPath();
                    }}
                    debugId="join-entry.choose-existing-gsn"
                    stableHeight={52}
                    style={{
                      ...entryChoiceActionStyle(
                        joinPathChoice === "existing" ? "primary" : "secondary"
                      ),
                      opacity: canOpenForm ? 1 : 0.62,
                      cursor: canOpenForm ? "pointer" : "not-allowed",
                    }}
                  >
                    {joinEntryIconText("id", "Use GSN ID")}
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    disabled={!canOpenForm}
                    onClick={chooseNewRequesterPath}
                    debugId="join-entry.toggle-new-member-request-form"
                    stableHeight={52}
                    style={{
                      ...entryChoiceActionStyle(
                        joinPathChoice === "new" ? "primary" : "secondary"
                      ),
                      opacity: canOpenForm ? 1 : 0.62,
                      cursor: canOpenForm ? "pointer" : "not-allowed",
                    }}
                  >
                    {joinEntryIconText(
                      "join-person-plus",
                      inviteChecking
                        ? "Checking"
                        : "No GSN ID"
                    )}
                  </SecondaryButton>
                </div>

                {joinPathChoice === "existing" ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div style={labelText()}>Existing GSN number</div>
                      <input
                        value={existingGsnId}
                        onChange={(event) => {
                          setExistingGsnId(event.target.value);
                          setJoinPathChoice("existing");
                          setFormOpen(false);
                        }}
                        placeholder="Example: GMFN-U-..."
                        autoComplete="off"
                        style={{ ...inputStyle(), marginTop: 8 }}
                      />
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={labelText()}>First name</div>
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          placeholder="Enter first name"
                          style={{ ...inputStyle(), marginTop: 8 }}
                        />
                      </div>
                      <div>
                        <div style={labelText()}>Surname</div>
                        <input
                          value={surname}
                          onChange={(event) => setSurname(event.target.value)}
                          placeholder="Enter surname"
                          style={{ ...inputStyle(), marginTop: 8 }}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={labelText()}>Work, business, or trade (optional)</div>
                      <select
                        value={workCategory}
                        onChange={(event) => handleWorkCategoryChange(event.target.value)}
                        style={{ ...inputStyle(), marginTop: 8 }}
                      >
                        <option value="">Select the closest one</option>
                        {WORK_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {workCategory && workCategory !== "none" ? (
                      <div>
                        <div style={labelText()}>Short detail (optional)</div>
                        <input
                          value={workDetail}
                          onChange={(event) => setWorkDetail(event.target.value)}
                          placeholder={selectedWorkOption?.hint || "Add a few words if needed"}
                          style={{ ...inputStyle(), marginTop: 8 }}
                        />
                      </div>
                    ) : null}
                    <div>
                      <div style={labelText()}>Short note to the community (optional)</div>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Add a short note"
                        style={{ ...textareaStyle(), marginTop: 8, minHeight: 84 }}
                      />
                    </div>
                    {identityNoteOpen ? (
                      <div style={{ ...noticeStyle("info"), marginTop: 0 }}>
                        One person should keep one GSN identity across
                        communities. If the community accepts this request, GSN
                        uses that same identity instead of creating another one.
                      </div>
                    ) : null}
                    <div style={entryActionGrid(isCompact)}>
                      <PrimaryButton
                        type="button"
                        disabled={
                          !canSubmitExistingGsn ||
                          !canOpenForm ||
                          inviteChecking ||
                          inviteBlocked ||
                          busy
                        }
                        onClick={requestJoinWithExistingGsnId}
                        debugId="join-entry.submit-existing-gsn"
                        busy={busy}
                        busyLabel="Sending request..."
                        stableHeight={52}
                        style={{
                          ...entryChoiceActionStyle("primary"),
                          opacity:
                            canSubmitExistingGsn && canOpenForm && !busy ? 1 : 0.62,
                          cursor:
                            canSubmitExistingGsn && canOpenForm && !busy
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        {joinEntryIconText("id", "Send with GSN ID")}
                      </PrimaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => {
                          setIdentityNoteOpen((prev) => !prev);
                        }}
                        debugId="join-entry.identity-note-toggle"
                        stableHeight={52}
                        style={entryChoiceActionStyle("secondary")}
                      >
                        {joinEntryIconText(
                          "eye",
                          identityNoteOpen ? "Hide note" : "Why one ID"
                        )}
                      </SecondaryButton>
                    </div>
                  </div>
                ) : null}

                {hasExistingGsnClaim ? (
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      setExistingGsnId("");
                      setJoinPathChoice(null);
                      setFormOpen(false);
                    }}
                    debugId="join-entry.clear-existing-gsn"
                    stableHeight={52}
                    style={entryChoiceActionStyle("secondary")}
                  >
                    {joinEntryIconText("refresh", "Clear GSN ID")}
                  </SecondaryButton>
                ) : null}
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
                {!inviteCode ? (
                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <input
                      value={manualInviteCode}
                      onChange={(event) => setManualInviteCode(event.target.value)}
                      placeholder="Enter invite code"
                      autoComplete="off"
                      style={inputStyle()}
                    />
                    <PrimaryButton
                      type="button"
                      onClick={openManualInviteCode}
                      disabled={!cleanText(manualInviteCode)}
                      debugId="join-entry.manual-code.open"
                      stableHeight={52}
                      style={entryChoiceActionStyle("primary")}
                    >
                      {joinEntryIconText("search", "Check code")}
                    </PrimaryButton>
                  </div>
                ) : null}
              </div>
            ) : null}

            {err ? (
              <div style={{ marginTop: 18, ...noticeStyle("error") }}>
                {err}
                {err.toLowerCase().includes("enter that gsn number") ? (
                  <div style={{ marginTop: 12 }}>
                    <SecondaryButton
                      type="button"
                      onClick={chooseExistingGsnPath}
                      debugId="join-entry.use-existing-gsn-after-error"
                      stableHeight={52}
                      style={entryChoiceActionStyle("secondary")}
                    >
                      {joinEntryIconText("id", "Use GSN ID")}
                    </SecondaryButton>
                  </div>
                ) : null}
              </div>
            ) : null}

            {success ? (
              <div style={{ marginTop: 18, ...noticeStyle("success") }}>
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>
                  Join request submitted successfully.
                </div>

                <div>
                  {cleanText(success?.result_status || success?.code || "").toLowerCase() ===
                  "already_member"
                    ? "You already belong to this community. Your current GSN identity stays the same."
                    : success?.existing_identity || success?.identity_reused
                    ? "Your request has been sent for community review using your existing GSN identity. Admission is not automatic, and no new GSN ID will be created."
                    : "Your request has been sent for community review. Admission is not automatic. Once approval is reached, you will be able to proceed to activation with your GSN identity."}
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

                <div style={entryActionGrid(isCompact, 1)}>
                  {cleanText(success?.result_status || success?.code || "").toLowerCase() ===
                  "already_member" ? (
                    <StableCtaLink
                      to={ctaPath(alreadyMemberCta)}
                      kind="secondary"
                      debugId={alreadyMemberCta.debugId}
                      stableHeight={52}
                      style={entryChoiceActionStyle("secondary")}
                    >
                      {joinEntryIconText("community", "Open this community")}
                    </StableCtaLink>
                  ) : submittedRequestId ? (
                    <StableCtaLink
                      to={ctaPath(approvalStatusCta)}
                      kind="secondary"
                      debugId={approvalStatusCta.debugId}
                      stableHeight={52}
                      style={entryChoiceActionStyle("secondary")}
                    >
                      {joinEntryIconText("eye", "Approval status")}
                    </StableCtaLink>
                  ) : (
                    <StableCtaLink
                      to={ctaPath(pendingCta)}
                      kind="secondary"
                      debugId={pendingCta.debugId}
                      stableHeight={52}
                      style={entryChoiceActionStyle("secondary")}
                    >
                      {joinEntryIconText("document", "Pending page")}
                    </StableCtaLink>
                  )}
                </div>
              </div>
            ) : null}

            {formOpen &&
            joinPathChoice === "new" &&
            canOpenForm &&
            canUseNewMemberForm &&
            !hasExistingGsnClaim ? (
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

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={labelText()}>Date of birth</div>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={labelText()}>Place of birth</div>
                  <input
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Town, city, or area"
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
                  <div style={labelText()}>Birth country (optional)</div>
                  <select
                    value={birthCountry}
                    onChange={(e) => setBirthCountry(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="">Same as country</option>
                    {COUNTRY_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={labelText()}>Residential area (optional)</div>
                  <input
                    value={residentialArea}
                    onChange={(e) => setResidentialArea(e.target.value)}
                    placeholder="Area or district"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={labelText()}>Country of origin (optional)</div>
                <select
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="">Not added</option>
                  {COUNTRY_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 12, ...noticeStyle("info") }}>
                Used only to help avoid duplicate GSN identities. This is not
                government verification.
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
                <PrimaryButton
                  type="submit"
                  disabled={!canSubmit}
                  debugId="join-entry.submit-new-request"
                  busy={busy}
                  busyLabel="Submitting Request..."
                  stableHeight={56}
                  style={{
                    ...entryChoiceActionStyle("primary"),
                    width: isCompact ? "100%" : "min(100%, 420px)",
                  }}
                >
                  {joinEntryIconText("join-person-plus", "Submit request")}
                </PrimaryButton>
              </div>
            </form>
            ) : null}
          </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <StableCtaLink
            to={ctaPath(welcomeCta)}
            kind="secondary"
            debugId={welcomeCta.debugId}
            stableHeight={52}
            style={{
              ...entryChoiceActionStyle("secondary"),
              width: "min(100%, 260px)",
            }}
          >
            {joinEntryIconText("home", "Back to Welcome")}
          </StableCtaLink>
        </div>
        </div>
      </div>
    </div>
  );
}



