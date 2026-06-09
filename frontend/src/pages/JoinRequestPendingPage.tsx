import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CardActionRow, StableCtaLink } from "../components/StableButton";
import { getJoinApprovalStatus } from "../lib/api";
import { resolveCtaTarget, type CtaTarget } from "../lib/ctaTargets";

type ReviewerLine = {
  display: string;
  gmfnId: string;
  role: string;
  roleLabel: string;
};

type IconName =
  | "approval"
  | "book"
  | "community"
  | "decision"
  | "details"
  | "entry"
  | "eye"
  | "focus"
  | "lock"
  | "market"
  | "progress"
  | "request"
  | "shield"
  | "welcome";

type FactRow = {
  icon: IconName;
  label: string;
  value: string;
};

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function ctaPath(target: CtaTarget): string {
  return typeof target.to === "string" ? target.to : String(target.to);
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

function statusLabel(value: string): string {
  const raw = safeStr(value, "pending").toLowerCase();
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function reviewerRoleLabel(role: string): string {
  const raw = safeStr(role);
  if (!raw) return "";
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function shellStyle(isCompact: boolean): React.CSSProperties {
  return {
    minHeight: "100vh",
    padding: isCompact ? "16px 14px 28px" : "28px 20px 40px",
    background:
      "radial-gradient(circle at 86% 4%, rgba(70,118,181,0.20) 0%, rgba(70,118,181,0.00) 29%), radial-gradient(circle at 50% 38%, rgba(28,89,156,0.16) 0%, rgba(28,89,156,0.00) 42%), linear-gradient(180deg, #020816 0%, #06182A 26%, #08233A 64%, #061827 100%)",
    color: "#F8FBFF",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  };
}

function pageRail(isCompact: boolean): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: isCompact ? 430 : 880,
    margin: "0 auto",
    display: "grid",
    gap: isCompact ? 12 : 18,
  };
}

function panelStyle(padding = 18): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(123,161,204,0.22)",
    background:
      "linear-gradient(180deg, rgba(8,32,57,0.88) 0%, rgba(7,27,49,0.92) 100%)",
    boxShadow:
      "0 24px 54px rgba(0,4,12,0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
    padding,
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#8EA9CA",
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.65,
    textTransform: "uppercase",
  };
}

function mutedText(size = 14): React.CSSProperties {
  return {
    color: "#C7D6E8",
    fontSize: size,
    lineHeight: 1.58,
    fontWeight: 650,
  };
}

function iconBubble(size = 46): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: size >= 44 ? 16 : 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: `0 0 ${size}px`,
    background:
      "linear-gradient(180deg, rgba(73,115,177,0.54) 0%, rgba(36,70,123,0.52) 100%)",
    border: "1px solid rgba(142,184,238,0.22)",
    boxShadow:
      "0 12px 26px rgba(2,8,23,0.28), inset 0 1px 0 rgba(255,255,255,0.10)",
    color: "#DCEBFF",
    fontWeight: 1000,
    fontSize: size >= 44 ? 18 : 13,
    lineHeight: 1,
  };
}

function IconGlyph({
  name,
  size = 22,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "approval":
      return (
        <svg {...common}>
          <path d="M4 11.5 9.2 6l5.2 5.5v8.5H4z" />
          <path d="M9 20v-5h5v5" />
          <path d="M15.8 11.2h4.2v8.8h-4.2" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M5 5.5c2.5-1.2 4.6-1.2 7 0v14c-2.4-1.2-4.5-1.2-7 0z" />
          <path d="M12 5.5c2.4-1.2 4.5-1.2 7 0v14c-2.5-1.2-4.6-1.2-7 0z" />
        </svg>
      );
    case "community":
      return (
        <svg {...common}>
          <path d="M4 20v-7l8-7 8 7v7" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "decision":
      return (
        <svg {...common}>
          <path d="M12 3.5 19 6v5.7c0 4.1-2.6 7-7 8.8-4.4-1.8-7-4.7-7-8.8V6z" />
          <path d="m8.6 12.2 2.2 2.2 4.8-5" />
        </svg>
      );
    case "details":
      return (
        <svg {...common}>
          <path d="M7 4h10v16H7z" />
          <path d="M10 8h4" />
          <path d="M10 12h4" />
          <path d="M10 16h3" />
        </svg>
      );
    case "entry":
      return (
        <svg {...common}>
          <path d="M12 3.5 19 6v5.7c0 4.1-2.6 7-7 8.8-4.4-1.8-7-4.7-7-8.8V6z" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5z" />
          <circle cx="12" cy="12" r="2.4" />
        </svg>
      );
    case "focus":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 5v3" />
          <path d="M19 12h-3" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          <path d="M6.5 11h11v9h-11z" />
          <path d="M12 15v2" />
        </svg>
      );
    case "market":
      return (
        <svg {...common}>
          <path d="M6 8h12l-1 12H7z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </svg>
      );
    case "progress":
      return (
        <svg {...common}>
          <path d="M5 19V9" />
          <path d="M10 19V5" />
          <path d="M15 19v-7" />
          <path d="M20 19V7" />
        </svg>
      );
    case "request":
      return (
        <svg {...common}>
          <path d="M7 4h10v16H7z" />
          <path d="M9.5 9h5" />
          <path d="M9.5 13h5" />
          <path d="M9.5 17h3" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3.5 19 6v5.7c0 4.1-2.6 7-7 8.8-4.4-1.8-7-4.7-7-8.8V6z" />
          <path d="M8.3 13h7.4" />
          <path d="M12 9.3v7.4" />
        </svg>
      );
    case "welcome":
      return (
        <svg {...common}>
          <path d="M5 12c2-4 4.4-4 6.4 0 1.9 3.8 4.2 3.8 6.6 0" />
          <path d="M4 17h16" />
          <path d="M7 7h.01" />
        </svg>
      );
    default:
      return null;
  }
}

function GsnMark({ isCompact }: { isCompact: boolean }) {
  const size = isCompact ? 38 : 44;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
        flex: `0 0 ${size}px`,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: 999,
          border: "6px solid #4B8DFF",
          borderRightColor: "transparent",
          transform: "rotate(34deg)",
          boxShadow: "0 0 20px rgba(75,141,255,0.34)",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: 999,
          border: "6px solid #6EA6FF",
          borderLeftColor: "transparent",
          transform: "rotate(-34deg)",
          opacity: 0.9,
        }}
      />
    </span>
  );
}

function ShieldVisual({ isCompact }: { isCompact: boolean }) {
  const width = isCompact ? 112 : 152;
  const height = isCompact ? 130 : 168;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width,
        height,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: width * 0.78,
          height: 26,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(90,156,255,0.95) 0%, rgba(44,97,198,0.36) 54%, rgba(44,97,198,0.00) 72%)",
          filter: "blur(1px)",
        }}
      />
      <div
        style={{
          width: width * 0.82,
          height: height * 0.82,
          borderRadius: "42px 42px 50px 50px",
          clipPath: "polygon(50% 0%, 92% 16%, 88% 67%, 50% 100%, 12% 67%, 8% 16%)",
          background:
            "linear-gradient(180deg, rgba(111,173,255,0.96) 0%, rgba(39,101,202,0.94) 68%, rgba(17,55,120,0.98) 100%)",
          border: "1px solid rgba(190,220,255,0.72)",
          boxShadow:
            "0 24px 44px rgba(24,100,220,0.38), inset 0 2px 0 rgba(255,255,255,0.30)",
          display: "grid",
          placeItems: "center",
          color: "#DCEBFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "end", gap: 5 }}>
          {[18, 26, 18].map((dotSize, index) => (
            <span
              key={index}
              style={{
                display: "grid",
                placeItems: "center",
                width: dotSize,
                height: dotSize,
                borderRadius: 999,
                background:
                  "linear-gradient(180deg, rgba(218,236,255,0.98), rgba(117,166,244,0.96))",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function actionStyle(kind: "primary" | "secondary"): React.CSSProperties {
  const primary = kind === "primary";
  return {
    minHeight: 62,
    height: 62,
    maxHeight: 62,
    minWidth: 0,
    width: "100%",
    borderRadius: 18,
    padding: "0 14px",
    border: primary
      ? "1px solid rgba(172,204,255,0.58)"
      : "1px solid rgba(214,228,242,0.42)",
    background: primary
      ? "linear-gradient(180deg, #2E74FF 0%, #1A49DC 100%)"
      : "linear-gradient(180deg, rgba(247,250,255,0.98) 0%, rgba(229,237,249,0.96) 100%)",
    color: primary ? "#FFFFFF" : "#11263F",
    boxShadow: primary
      ? "0 14px 26px rgba(30,86,220,0.28), inset 0 1px 0 rgba(255,255,255,0.22)"
      : "0 12px 22px rgba(0,8,18,0.16), inset 0 1px 0 rgba(255,255,255,0.86)",
    fontWeight: 1000,
    fontSize: 15,
    lineHeight: 1.15,
    whiteSpace: "normal",
    overflowWrap: "normal",
  };
}

function helpfulLinkStyle(isCompact: boolean): React.CSSProperties {
  return {
    minHeight: isCompact ? 56 : 50,
    height: isCompact ? 56 : 50,
    maxHeight: isCompact ? 56 : 50,
    minWidth: 0,
    width: "100%",
    borderRadius: 999,
    padding: isCompact ? "0 8px" : "0 12px",
    border: "1px solid rgba(142,184,238,0.24)",
    background:
      "linear-gradient(180deg, rgba(13,43,74,0.84) 0%, rgba(9,31,56,0.84) 100%)",
    color: "#DCEBFF",
    boxShadow:
      "0 10px 20px rgba(0,8,18,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
    fontWeight: 900,
    fontSize: isCompact ? 12 : 14,
    lineHeight: 1.1,
    whiteSpace: "normal",
    overflowWrap: "normal",
  };
}

function inlineButtonContent(icon: IconName, label: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minWidth: 0,
        width: "100%",
      }}
    >
      <IconGlyph name={icon} size={21} />
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
    </span>
  );
}

function progressPercent(approvals: number, requiredApprovals: number): number {
  if (!requiredApprovals || requiredApprovals <= 0) return approvals > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((approvals / requiredApprovals) * 100)));
}

export default function JoinRequestPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [handoffStarted, setHandoffStarted] = useState(false);
  const [reviewDetailsOpen, setReviewDetailsOpen] = useState(false);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 720;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 720);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Pending Review";
    }
  }, []);

  const state = useMemo(
    () =>
      ((location.state as {
        request_id?: string | number;
        community_name?: string;
        clan_name?: string;
        status?: string;
        submitted_at?: string;
      }) || {}),
    [location.state]
  );

  const requestId = useMemo(
    () => safeStr(state.request_id || searchParams.get("request_id") || ""),
    [state, searchParams]
  );

  useEffect(() => {
    let alive = true;

    async function loadStatus() {
      if (!requestId) {
        setLiveStatus(null);
        return;
      }

      try {
        const res = await getJoinApprovalStatus(requestId);
        if (!alive) return;
        setLiveStatus(res || null);
      } catch {
        if (!alive) return;
        setLiveStatus(null);
      }
    }

    void loadStatus();
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 8000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, [requestId]);

  const communityName = useMemo(
    () =>
      safeStr(
        liveStatus?.community_name ||
          state.community_name ||
          state.clan_name ||
          searchParams.get("community_name") ||
          searchParams.get("clan_name") ||
          "the community",
        "the community"
      ),
    [liveStatus, state, searchParams]
  );

  const marketplaceName = useMemo(
    () =>
      safeStr(
        liveStatus?.marketplace_name || searchParams.get("marketplace_name") || ""
      ),
    [liveStatus, searchParams]
  );

  const statusText = useMemo(
    () =>
      safeStr(
        liveStatus?.status || state.status || searchParams.get("status") || "pending"
      ),
    [liveStatus, state, searchParams]
  );

  const communityCode = useMemo(
    () => safeStr(liveStatus?.community_code || searchParams.get("community_code") || ""),
    [liveStatus, searchParams]
  );

  const communityId = useMemo(
    () => safeStr(liveStatus?.community_id || searchParams.get("community_id") || ""),
    [liveStatus, searchParams]
  );

  const approvals = useMemo(() => Number(liveStatus?.approvals || 0), [liveStatus]);
  const rejects = useMemo(() => Number(liveStatus?.rejects || 0), [liveStatus]);
  const totalVotes = useMemo(
    () => Number(liveStatus?.total_votes || approvals + rejects || 0),
    [liveStatus, approvals, rejects]
  );
  const activeMembers = useMemo(
    () => Number(liveStatus?.active_member_count || 0),
    [liveStatus]
  );
  const requiredApprovals = useMemo(
    () => Number(liveStatus?.required_approvals || 0),
    [liveStatus]
  );
  const progress = useMemo(
    () => progressPercent(approvals, requiredApprovals),
    [approvals, requiredApprovals]
  );
  const identityReused = Boolean(liveStatus?.existing_identity || liveStatus?.identity_reused);
  const eligibleReviewers = useMemo<ReviewerLine[]>(() => {
    const rows = Array.isArray(liveStatus?.eligible_reviewers)
      ? liveStatus.eligible_reviewers
      : [];
    return rows
      .map((row: any) => ({
        display: safeStr(row?.display || ""),
        gmfnId: safeStr(row?.gmfn_id || ""),
        role: "",
        roleLabel: reviewerRoleLabel(safeStr(row?.role || "user")),
      }))
      .filter((row: ReviewerLine) => row.display || row.gmfnId);
  }, [liveStatus]);

  const approvalTo = useMemo(() => {
    if (!requestId) return "";
    return mergeSearchIntoPath(
      `/join-approval/${encodeURIComponent(requestId)}`,
      location.search
    );
  }, [requestId, location.search]);
  const approvalCta = useMemo(
    () =>
      resolveCtaTarget("joinPending", {
        explicitTo: approvalTo || undefined,
        enabled: Boolean(approvalTo),
        disabledReason: "Approval status is not available until the request ID is known.",
        debugId: "join-pending.approval-status",
      }),
    [approvalTo]
  );
  const guideCta = useMemo(
    () =>
      resolveCtaTarget("welcome", {
        explicitTo: "/guide",
        debugId: "join-pending.guide",
      }),
    []
  );
  const welcomeCta = useMemo(
    () =>
      resolveCtaTarget("welcome", {
        debugId: "join-pending.welcome",
      }),
    []
  );

  const communityTo = useMemo(() => {
    const resultPath = safeStr(liveStatus?.result_path || "");
    const resultChannel = safeStr(liveStatus?.result_channel || "").toLowerCase();
    if (resultPath && resultChannel === "approved-existing-member") {
      return mergeSearchIntoPath(resultPath, location.search);
    }
    if (communityId) {
      return mergeSearchIntoPath(
        `/app/community/${encodeURIComponent(communityId)}`,
        location.search
      );
    }
    return mergeSearchIntoPath("/app/community", location.search);
  }, [communityId, liveStatus, location.search]);

  const activationTo = useMemo(() => {
    const activationRequired = liveStatus?.activation_required !== false;
    const existingApproved = Boolean(
      liveStatus?.existing_identity ||
        liveStatus?.identity_reused ||
        safeStr(liveStatus?.result_channel || "").toLowerCase() === "approved-existing-member"
    );
    if (!activationRequired || existingApproved) return "";

    const resultPath = safeStr(liveStatus?.result_path || "");
    const resultChannel = safeStr(liveStatus?.result_channel || "").toLowerCase();
    if (resultPath && resultChannel === "activation-ready") {
      return mergeSearchIntoPath(resultPath, location.search);
    }

    const activationPath = safeStr(liveStatus?.activation_path || "");
    if (activationPath) {
      return mergeSearchIntoPath(activationPath, location.search);
    }

    const activationLink = safeStr(liveStatus?.activation_link || "");
    if (activationLink && typeof window !== "undefined") {
      try {
        const url = new URL(activationLink, window.location.origin);
        return `${url.pathname}${url.search}${url.hash}`;
      } catch {
        // Fall through to the gmfn_id activation path fallback below.
      }
    }

    const gmfnId = safeStr(liveStatus?.gmfn_id || "");
    if (!gmfnId) return "";

    const params = new URLSearchParams();
    params.set("gmfn_id", gmfnId);
    if (requestId) params.set("request_id", requestId);
    return mergeSearchIntoPath(`/activate-membership?${params.toString()}`, location.search);
  }, [liveStatus, location.search, requestId]);

  const approvedHandoffTo = useMemo(() => {
    const nextStep = safeStr(liveStatus?.next_step || "").toLowerCase();
    if (nextStep === "open-community") return communityTo;
    if (nextStep === "activate-membership") return activationTo || approvalTo;

    const activationRequired = liveStatus?.activation_required !== false;
    return activationRequired ? activationTo || approvalTo : communityTo;
  }, [activationTo, approvalTo, communityTo, liveStatus]);

  useEffect(() => {
    if (!requestId || handoffStarted || !liveStatus) return;

    const lowerStatus = safeStr(liveStatus?.status).toLowerCase();
    if (lowerStatus === "approved") {
      if (!approvedHandoffTo) return;
      setHandoffStarted(true);
      navigate(approvedHandoffTo, {
        replace: true,
        state: {
          gmfn_id: safeStr(liveStatus?.gmfn_id || ""),
          request_id: requestId,
          community_name: communityName,
          status: lowerStatus,
        },
      });
      return;
    }

    if (lowerStatus === "rejected" && approvalTo) {
      const resultPath = safeStr(liveStatus?.result_path || "");
      setHandoffStarted(true);
      navigate(
        resultPath ? mergeSearchIntoPath(resultPath, location.search) : approvalTo,
        { replace: true }
      );
    }
  }, [
    approvalTo,
    approvedHandoffTo,
    communityName,
    handoffStarted,
    liveStatus,
    location.search,
    navigate,
    requestId,
  ]);

  const factRows = useMemo<FactRow[]>(
    () =>
      [
        { icon: "community" as IconName, label: "Community", value: communityName },
        {
          icon: "market" as IconName,
          label: "Market",
          value: marketplaceName || `${communityName} Marketplace`,
        },
        { icon: "details" as IconName, label: "Community ID", value: communityCode },
        { icon: "request" as IconName, label: "Request ID", value: requestId },
      ].filter((row) => safeStr(row.value)),
    [communityCode, communityName, marketplaceName, requestId]
  );

  return (
    <main style={shellStyle(isCompact)}>
      <div style={pageRail(isCompact)}>
        <header
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            paddingTop: isCompact ? 0 : 6,
          }}
        >
          <GsnMark isCompact={isCompact} />
          <div style={{ fontSize: isCompact ? 34 : 38, lineHeight: 1, fontWeight: 1000 }}>
            GSN
          </div>
        </header>

        <section
          style={{
            ...panelStyle(isCompact ? 20 : 28),
            display: "grid",
            gridTemplateColumns: isCompact ? "minmax(0, 1fr) 118px" : "minmax(0, 1.2fr) 240px",
            gap: isCompact ? 12 : 28,
            alignItems: "center",
            minHeight: isCompact ? 188 : undefined,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={sectionLabel()}>Join request</div>
            <h1
              style={{
                margin: "8px 0 0",
                color: "#FFFFFF",
                fontSize: isCompact ? 35 : 48,
                lineHeight: 1.02,
                fontWeight: 1000,
                letterSpacing: 0,
              }}
            >
              Pending Review
            </h1>
            <div style={{ marginTop: 12, ...mutedText(isCompact ? 16 : 18) }}>
              Your request has been sent to the community.
            </div>
            <div
              style={{
                marginTop: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                minHeight: 40,
                padding: isCompact ? "7px 15px" : "8px 18px",
                borderRadius: 999,
                color: "#FFD96D",
                background:
                  "linear-gradient(180deg, rgba(88,72,25,0.74) 0%, rgba(48,43,20,0.72) 100%)",
                border: "1px solid rgba(242,199,102,0.32)",
                fontWeight: 1000,
                fontSize: isCompact ? 17 : 20,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 999,
                  background: "#FFD24A",
                  boxShadow: "0 0 18px rgba(255,210,74,0.72)",
                }}
              />
              {statusLabel(statusText)}
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              minHeight: isCompact ? 128 : 184,
              display: "grid",
              placeItems: "center",
            }}
          >
            <ShieldVisual isCompact={isCompact} />
          </div>
        </section>

        <section style={panelStyle(isCompact ? 14 : 18)} aria-label="Request facts">
          <div style={{ display: "grid" }}>
            {factRows.map((row, index) => (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "44px minmax(0, 1fr) minmax(92px, auto)"
                    : "54px minmax(0, 1fr) minmax(0, 1.15fr)",
                  gap: isCompact ? "8px 12px" : 12,
                  alignItems: "center",
                  minHeight: isCompact ? 60 : 74,
                  padding: isCompact ? "6px 0" : 0,
                  borderBottom:
                    index === factRows.length - 1
                      ? "none"
                      : "1px solid rgba(123,161,204,0.14)",
                }}
              >
                <span style={iconBubble(isCompact ? 40 : 46)}>
                  <IconGlyph name={row.icon} size={isCompact ? 20 : 23} />
                </span>
                <span style={{ ...mutedText(isCompact ? 15 : 18), color: "#DCE7F4", fontWeight: 780 }}>
                  {row.label}
                </span>
                <span
                  style={{
                    color: "#FFFFFF",
                    fontSize: isCompact ? 14 : 18,
                    fontWeight: 1000,
                    textAlign: "right",
                    overflowWrap: "anywhere",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "0 0 10px",
              paddingLeft: 8,
            }}
          >
            <span style={{ color: "#79A9FF", fontSize: 20, fontWeight: 1000 }}>*</span>
            <div style={sectionLabel()}>What happens next</div>
          </div>

          <div
            style={{
              ...panelStyle(14),
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: isCompact ? 8 : 12,
            }}
          >
            {[
              {
                step: "1",
                icon: "community" as IconName,
                title: "Review",
                body: "Members review your request.",
              },
              {
                step: "2",
                icon: "decision" as IconName,
                title: "Decision",
                body: identityReused
                  ? "If approved, your existing GSN ID is reused."
                  : "If approved, your GSN ID is issued.",
              },
              {
                step: "3",
                icon: identityReused ? "community" as IconName : "lock" as IconName,
                title: identityReused ? "Enter" : "Activate",
                body: identityReused
                  ? "Open the community and continue."
                  : "Create password and continue.",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  position: "relative",
                  borderRadius: isCompact ? 18 : 20,
                  border: "1px solid rgba(123,161,204,0.16)",
                  background:
                    "linear-gradient(180deg, rgba(9,35,63,0.86) 0%, rgba(8,28,51,0.86) 100%)",
                  padding: isCompact ? "24px 8px 12px" : "24px 14px 16px",
                  minHeight: isCompact ? 132 : 132,
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -18,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(180deg, #4B8DFF 0%, #2563DB 100%)",
                    border: "1px solid rgba(190,220,255,0.55)",
                    boxShadow: "0 14px 26px rgba(37,99,235,0.30)",
                    fontWeight: 1000,
                    color: "#FFFFFF",
                  }}
                >
                  {item.step}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "48px minmax(0, 1fr)",
                    justifyItems: isCompact ? "center" : "start",
                    gap: isCompact ? 8 : 12,
                    alignItems: "center",
                    textAlign: isCompact ? "center" : "left",
                  }}
                >
                  <span style={iconBubble(isCompact ? 42 : 48)}>
                    <IconGlyph name={item.icon} size={isCompact ? 20 : 23} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#FFFFFF", fontSize: isCompact ? 15 : 20, fontWeight: 1000 }}>
                      {item.title}
                    </div>
                    <div style={{ marginTop: 5, ...mutedText(isCompact ? 11 : 14), lineHeight: isCompact ? 1.28 : 1.58 }}>
                      {item.body}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={panelStyle(isCompact ? 16 : 20)}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr) auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span style={iconBubble(40)}>
              <IconGlyph name="progress" size={20} />
            </span>
            <div>
              <div style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 1000 }}>
                Review reading
              </div>
              <div style={{ marginTop: 8, ...mutedText(24), color: "#FFFFFF" }}>
                <strong>
                  {approvals} / {requiredApprovals || 1}
                </strong>{" "}
                approvals
              </div>
            </div>
            <div style={{ color: "#C8D8EA", fontWeight: 900 }}>{progress}%</div>
          </div>

          <div
            aria-hidden="true"
            style={{
              marginTop: 12,
              height: 18,
              borderRadius: 999,
              overflow: "hidden",
              background: "rgba(123,161,204,0.20)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(47,121,255,0.95), rgba(242,199,102,0.95))",
              }}
            />
          </div>

          <div style={{ marginTop: 14, ...mutedText(15) }}>
            {progress > 0
              ? "Community action has started."
              : "Waiting for community action."}
          </div>

          {reviewDetailsOpen ? (
            <div
              id="review-details"
              style={{
                marginTop: 16,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Approvals", approvals],
                  ["Rejects", rejects],
                  ["Total votes", totalVotes],
                  ["Active reviewers", activeMembers],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(123,161,204,0.15)",
                      background: "rgba(255,255,255,0.055)",
                      padding: 13,
                    }}
                  >
                    <div style={sectionLabel()}>{label}</div>
                    <div style={{ marginTop: 6, color: "#FFFFFF", fontSize: 22, fontWeight: 1000 }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {eligibleReviewers.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {eligibleReviewers.map((reviewer: ReviewerLine, index: number) => (
                    <div
                      key={`${reviewer.gmfnId || reviewer.display}-${index}`}
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(123,161,204,0.15)",
                        background: "rgba(255,255,255,0.055)",
                        padding: 13,
                      }}
                    >
                      <div style={sectionLabel()}>Reviewer {index + 1}</div>
                      <div style={{ marginTop: 6, color: "#FFFFFF", fontWeight: 1000 }}>
                        {reviewer.display || "Visible reviewer"}
                      </div>
                      {reviewer.gmfnId ? (
                        <div style={{ marginTop: 4, ...mutedText(13) }}>{reviewer.gmfnId}</div>
                      ) : null}
                      {reviewer.roleLabel ? (
                        <div style={{ marginTop: 4, ...mutedText(13) }}>
                          Role: {reviewer.roleLabel}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ ...mutedText(14), color: "#DCE7F4" }}>
                  No activated reviewer line is visible in this community yet.
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section style={panelStyle(isCompact ? 14 : 18)}>
          <CardActionRow
            align="stretch"
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.04fr) minmax(0, 0.96fr)",
              gap: isCompact ? 10 : 12,
              minHeight: 0,
              maxWidth: 680,
              margin: "0 auto",
            }}
          >
            <StableCtaLink
              to={ctaPath(approvalCta)}
              kind="primary"
              disabled={!approvalCta.enabled}
              debugId={approvalCta.debugId}
              stableHeight={62}
              style={actionStyle("primary")}
            >
              {inlineButtonContent("eye", "Open approval status")}
            </StableCtaLink>
            <StableCtaLink
              to="#review-details"
              kind="secondary"
              onClick={(event) => {
                event.preventDefault();
                setReviewDetailsOpen((current) => !current);
              }}
              debugId="join-pending.review-details.toggle"
              stableHeight={62}
              style={actionStyle("secondary")}
            >
              {inlineButtonContent(
                "details",
                reviewDetailsOpen ? "Hide review details" : "View review details"
              )}
            </StableCtaLink>
          </CardActionRow>
        </section>

        <section>
          <div style={{ ...sectionLabel(), paddingLeft: 8 }}>Helpful links</div>
          <CardActionRow
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(3, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
              gap: isCompact ? 9 : 10,
              minHeight: 0,
            }}
          >
            <StableCtaLink
              to={ctaPath(guideCta)}
              kind="secondary"
              debugId={guideCta.debugId}
              stableHeight={isCompact ? 56 : 50}
              style={helpfulLinkStyle(isCompact)}
            >
              {inlineButtonContent("book", "Full GSN guide")}
            </StableCtaLink>
            <StableCtaLink
              to={ctaPath(guideCta)}
              kind="secondary"
              debugId="join-pending.focus-guide"
              stableHeight={isCompact ? 56 : 50}
              style={helpfulLinkStyle(isCompact)}
            >
              {inlineButtonContent("focus", "Focus Commitments")}
            </StableCtaLink>
            <StableCtaLink
              to={ctaPath(welcomeCta)}
              kind="secondary"
              debugId={welcomeCta.debugId}
              stableHeight={isCompact ? 56 : 50}
              style={helpfulLinkStyle(isCompact)}
            >
              {inlineButtonContent("welcome", "Welcome")}
            </StableCtaLink>
          </CardActionRow>
        </section>

        <section
          style={{
            ...panelStyle(16),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            textAlign: "center",
            color: "#C7D6E8",
            fontWeight: 800,
          }}
        >
          <span style={iconBubble(38)}>
            <IconGlyph name="lock" size={18} />
          </span>
          Entry is reviewed, not automatic.
        </section>
      </div>
    </main>
  );
}
