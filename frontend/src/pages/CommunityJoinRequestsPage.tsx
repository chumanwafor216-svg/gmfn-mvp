import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  getCommunityJoinRequests,
  pilotApproveJoinRequest,
  safeCopy,
  selectClan,
  voteOnJoinRequest,
} from "../lib/api";
import { navigateToCta, resolveCtaTarget, type CtaTarget } from "../lib/ctaTargets";

type JoinRequestItem = {
  id: number;
  clan_id?: number;
  community_code?: string | null;
  clan_name?: string | null;
  marketplace_name?: string | null;
  applicant_user_id?: number | null;
  applicant_name?: string | null;
  applicant_nickname?: string | null;
  applicant_email?: string | null;
  applicant_gmfn_id?: string | null;
  invite_id?: number | null;
  invite_code?: string | null;
  invited_by_user_id?: number | null;
  invited_by_email?: string | null;
  invited_by_display?: string | null;
  status?: string;
  created_at?: string;
  decided_at?: string | null;
  approvals?: number;
  rejects?: number;
  total_votes?: number;
  active_member_count?: number;
  required_approvals?: number;
  threshold_ratio?: string;
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

type VoteResponse = {
  ok?: boolean;
  community_id?: number;
  community_code?: string | null;
  approved_now?: boolean;
  rejected_now?: boolean;
  pilot_override?: boolean;
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
    margin: "0 -20px -30px",
    padding: "0 20px 34px",
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

function reviewerBadge(canPilotApprove = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: canPilotApprove
      ? "linear-gradient(180deg, rgba(255,247,232,0.98) 0%, rgba(251,232,180,0.96) 100%)"
      : "linear-gradient(180deg, rgba(22,76,127,0.92) 0%, rgba(12,51,92,0.92) 100%)",
    border: canPilotApprove
      ? "1px solid rgba(201,161,54,0.28)"
      : "1px solid rgba(123,161,204,0.22)",
    color: canPilotApprove ? "#7C5A06" : "#F8FBFF",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "normal",
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
    fontSize: 14,
    fontWeight: 1000,
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

function decisionButtonStyle(kind: "approve" | "reject"): React.CSSProperties {
  const approve = kind === "approve";
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
      : "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
    color: approve ? "#FFFFFF" : "#0B1F33",
    border: approve ? "1px solid rgba(172,204,255,0.44)" : "1px solid rgba(11,31,51,0.12)",
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

function ctaPath(target: CtaTarget): string {
  return typeof target.to === "string" ? target.to : String(target.to);
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "Not available yet";
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

function copyText(text: string) {
  const safe = safeStr(text);
  if (!safe) return;

  safeCopy(safe);
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
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
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [reviewerRole, setReviewerRole] = useState<string>("user");
  const [reviewerCanPilotApprove, setReviewerCanPilotApprove] = useState(false);

  const clanNum = Number(clanId || 0);

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
        throw new Error("Invalid community ID.");
      }

      const data = await getCommunityJoinRequests(clanNum);
      const rows = Array.isArray(data) ? data : data?.items || [];
      setItems(rows);
      setReviewerRole(safeStr(data?.reviewer_role || "user", "user"));
      setReviewerCanPilotApprove(Boolean(data?.reviewer_can_pilot_approve));
    } catch (err: any) {
      setError(err?.message || "Failed to load join requests.");
      setItems([]);
      setReviewerRole("user");
      setReviewerCanPilotApprove(false);
    } finally {
      setLoading(false);
    }
  }, [clanNum]);

  useEffect(() => {
    if (!clanNum) {
      setError("Invalid community ID.");
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
      first?.clan_name || first?.marketplace_name || `Community ${clanNum}`
    );
  }, [items, clanNum]);

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
      total: items.length,
      pending,
      approved,
      rejected,
    };
  }, [items]);

  useEffect(() => {
    if (!items.length) {
      setActiveRequestId(null);
      return;
    }

    const stillVisible = items.some((item) => item.id === activeRequestId);
    if (stillVisible) return;

    const firstPending = items.find((item) => friendlyStatus(item.status) === "pending");
    setActiveRequestId(firstPending?.id || items[0]?.id || null);
  }, [activeRequestId, items]);

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

  async function handleVote(requestId: number, vote: "approve" | "reject") {
    try {
      setBusyId(requestId);
      setError("");
      setSuccess("");
      setActivationPack(null);

      await selectClan(clanNum).catch(() => null);

      const res = (await voteOnJoinRequest(requestId, vote)) as VoteResponse;

      if (vote === "approve" && res?.approved_now && res?.approval_result?.gmfn_id) {
        setSuccess(
          `Request approved successfully. GSN ID issued: ${res.approval_result.gmfn_id}`
        );
        setActivationPack(res.approval_result || null);
      } else if (vote === "approve") {
        setSuccess(
          "Approval recorded successfully. The request may still be waiting for the final approval threshold."
        );
      } else if (res?.rejected_now) {
        setSuccess(
          res?.rejection_result?.decision_message ||
            "Request rejected successfully. The applicant can now reopen the decision page."
        );
      } else {
        setSuccess("Rejection recorded successfully.");
      }

      await load();
    } catch (err: any) {
      setError(err?.message || "Vote failed.");
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

      await selectClan(clanNum).catch(() => null);

      const res = (await pilotApproveJoinRequest(requestId)) as VoteResponse;

      if (res?.approval_result?.gmfn_id) {
        setSuccess(
          `Admin approval completed successfully. GSN ID issued: ${res.approval_result.gmfn_id}`
        );
        setActivationPack(res.approval_result || null);
      } else {
        setSuccess("Admin approval completed.");
      }

      await load();
    } catch (err: any) {
      setError(err?.message || "Admin approval failed.");
    } finally {
      setBusyId(null);
    }
  }

  function goBack() {
    navigateToCta(navigate, location, communityHomeCta);
  }

  return (
    <div style={pageShell()}>
      <PageTopNav
        sectionLabel="Focused Task"
        title="Join Requests"
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
            <div style={sectionLabel()}>Community join requests</div>
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
              Review Join Requests
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                color: "#D7E3F1",
                fontSize: isCompact ? 17 : 21,
                lineHeight: 1.5,
              }}
            >
              Approve or reject new members for your current community.
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
              <div style={sectionLabel()}>Selected community</div>
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
                Community review is active.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <span style={reviewerBadge(false)}>
                  {iconText("review", "Step: Review")}
                </span>
                <span style={reviewerBadge(reviewerCanPilotApprove)}>
                  {iconText("person", <>Role: {safeStr(reviewerRole || "user")}</>)}
                </span>
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
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              minHeight: 0,
              width: "100%",
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
              style={navActionStyle("blue")}
            >
              {iconText("refresh", "Refresh")}
            </PrimaryButton>
          </CardActionRow>
        </section>

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
              : "repeat(4, minmax(0, 1fr))",
            gap: isCompact ? 10 : 14,
            width: "100%",
            minWidth: 0,
          }}
        >
          {[
            ["review", "Total", summary.total, "#0B1F33"],
            ["clock", "Pending", summary.pending, "#9A6A10"],
            ["approve", "Approved", summary.approved, "#2E9B62"],
            ["reject", "Rejected", summary.rejected, "#DC2626"],
          ].map(([icon, label, value, color]) => (
            <div key={String(label)} style={statTile(String(color))}>
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
            ...whitePanel(16),
            background:
              "linear-gradient(180deg, #FFF7DA 0%, #FFF2C6 100%)",
            border: "1px solid rgba(201,161,54,0.24)",
          }}
        >
          <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 17 }}>
            {iconText("shield", "Approval rule")}
          </div>
          <div
            style={{
              marginTop: 8,
              color: "#42556C",
              lineHeight: 1.55,
              fontSize: 14,
              fontWeight: 650,
              maxWidth: "100%",
              overflowWrap: "break-word",
            }}
          >
            Some communities need more than one approval. Check Active members and Required approvals on each request.
          </div>
        </section>

      {activationPack?.gmfn_id ? (
        <div
          style={{
            ...whitePanel(18),
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 18, color: "#0B1F33" }}>
            {iconText("approve", "Approval to activation package")}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 8,
              color: "#334155",
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            <div>
              <strong>GSN ID:</strong> {safeStr(activationPack.gmfn_id)}
            </div>
            <div>
              <strong>Community:</strong> {safeStr(activationPack.community_name || "Not available yet")}
            </div>
            <div>
              <strong>Community ID:</strong> {safeStr(activationPack.community_code || "Not available yet")}
            </div>
            <div>
              <strong>Invited by:</strong>{" "}
              {safeStr(
                activationPack.invited_by_display ||
                  activationPack.invited_by_email ||
                  "Not available yet"
              )}
            </div>
            <div>
              <strong>Activation link:</strong>{" "}
              <span style={{ wordBreak: "break-word" }}>
                {safeStr(activationPack.activation_link || "Not available yet")}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid rgba(11,31,51,0.08)",
            }}
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
              ACTIVATION MESSAGE
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
          </div>

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
              onClick={() => copyText(safeStr(activationPack.activation_message || ""))}
              debugId="community-join-requests.copy-activation-message"
              fullWidth
            >
              {iconText("copy", "Copy Activation Message")}
            </PrimaryButton>

            <SecondaryButton
              type="button"
              disabled={!safeStr(activationPack.activation_link || "")}
              onClick={() => copyText(safeStr(activationPack.activation_link || ""))}
              debugId="community-join-requests.copy-activation-link"
              fullWidth
            >
              {iconText("copy", "Copy Activation Link")}
            </SecondaryButton>

            {safeStr(activationPack.activation_link || "") ? (
              <StableCtaLink
                to={safeStr(activationPack.activation_link || "")}
                kind="secondary"
                target={isExternalUrl(safeStr(activationPack.activation_link || "")) ? "_blank" : undefined}
                rel={isExternalUrl(safeStr(activationPack.activation_link || "")) ? "noopener noreferrer" : undefined}
                debugId="community-join-requests.open-activation"
                fullWidth
              >
                {iconText("review", "Open Activation Page")}
              </StableCtaLink>
            ) : null}
          </CardActionRow>
        </div>
      ) : null}

      {loading ? (
        <div style={whitePanel(18)}>
          <strong>{iconText("clock", "Loading join requests...")}</strong>
        </div>
      ) : null}

      {!loading && !error && !items.length ? (
        <div style={whitePanel(18)}>
          <strong>{iconText("review", "No join requests are currently shown.")}</strong>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        {items.map((item) => {
          const status = friendlyStatus(item.status);
          const isPending = status === "pending";
          const isBusy = busyId === item.id;
          const applicantLabel = safeStr(
            item.applicant_name ||
              item.applicant_nickname ||
              item.applicant_email ||
              "Applicant"
          );
          const isActive = activeRequestId === item.id;
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
                      Request #{item.id}
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
                  {iconText("review", "Review")}
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
                    Request #{item.id}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45, color: "#334155", fontWeight: 700 }}>
                    <strong>{applicantLabel}</strong> invited by{" "}
                    <strong>
                      {safeStr(
                        item.invited_by_display ||
                          item.invited_by_email ||
                          "a community member"
                      )}
                    </strong>
                  </div>
                  <div style={{ marginTop: 2, fontSize: 13, color: "#334155", fontWeight: 700 }}>
                    Wants to join <strong>{safeStr(item.clan_name || "this community")}</strong>
                  </div>
                </div>
                <span style={statusPill(status)}>
                  <StatusMark status={status} />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
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
                    [
                      "Community",
                      safeStr(
                        item.marketplace_name ||
                          item.clan_name ||
                          "Not available yet"
                      ),
                    ],
                    ["Community ID", safeStr(item.community_code || "Awaiting issue")],
                    ["Invite", safeStr(item.invite_code || "Not available yet")],
                    ["Submitted", safeDateTime(item.created_at)],
                    ["Required", String(Number(item.required_approvals || 0))],
                    ["Approvals", String(Number(item.approvals || 0))],
                    ["Rejects", String(Number(item.rejects || 0))],
                    ["Active", String(Number(item.active_member_count || 0))],
                    ["Applicant", safeStr(item.applicant_gmfn_id || "Not issued yet")],
                  ].map(([label, value]) => (
                    <div key={`${item.id}-${label}`} style={requestFactTile()}>
                      <div style={requestFactLabel()}>{label}</div>
                      <div style={requestFactValue()}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {!isPending ? (
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
                  {iconText(status === "approved" ? "approve" : "reject", <>This request has already been {status}.</>)}
                </div>
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
                    {iconText("clock", "Waiting until approvals reach the community threshold.")}
                  </div>

                  {reviewerCanPilotApprove ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 12,
                        background: "#FFF7E8",
                        border: "1px solid rgba(201,161,54,0.24)",
                      }}
                    >
                      <div style={sectionLabel("#8A5A08")}>Admin review option</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#5B4631",
                          lineHeight: 1.75,
                          fontSize: 14,
                        }}
                      >
                        If the second reviewer cannot be reached, an admin can approve this request directly so the member journey can continue.
                      </div>
                    </div>
                  ) : null}

                  <CardActionRow
                    align="stretch"
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns: reviewerCanPilotApprove
                        ? isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))"
                        : isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                      minHeight: 0,
                      width: "100%",
                    }}
                  >
                    <PrimaryButton
                      type="button"
                      onClick={() => handleVote(item.id, "approve")}
                      disabled={isBusy}
                      busy={isBusy}
                      busyLabel="Working..."
                      stableHeight={58}
                      debugId="community-join-requests.approve"
                      style={decisionButtonStyle("approve")}
                      fullWidth
                    >
                      {iconText("approve", "Approve")}
                    </PrimaryButton>

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
                      {iconText("reject", "Reject")}
                    </SecondaryButton>

                    {reviewerCanPilotApprove ? (
                      <SecondaryButton
                        type="button"
                        onClick={() => handlePilotApprove(item.id)}
                        disabled={isBusy}
                        busy={isBusy}
                        busyLabel="Working..."
                        stableHeight={58}
                        debugId="community-join-requests.pilot-approve"
                        style={decisionButtonStyle("reject")}
                        fullWidth
                      >
                        {iconText("shield", "Approve now")}
                      </SecondaryButton>
                    ) : null}
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


