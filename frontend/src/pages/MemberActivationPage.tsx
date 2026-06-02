import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  CardActionRow,
  PrimaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import {
  activateApprovedMember,
  activateMembership,
  getSelectedClanId,
  observeIdentityRisk,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

type ActivationNoticeTone = "success" | "error" | "warning" | "info";

type ActivationNotice = {
  tone: ActivationNoticeTone;
  title: string;
  message: string;
  actionLabel?: string;
  actionPath?: string;
};

function structuredErrorDetail(err: any): Record<string, any> | null {
  const raw = safeStr(err?.message || err);
  if (!raw.startsWith("{") || !raw.endsWith("}")) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function loginPathFromDetail(detail: Record<string, any> | null): string {
  const rawPath = safeStr(detail?.login_path);
  if (rawPath.startsWith("/")) return rawPath;
  return "/login?force=1";
}

function friendlyActivationError(err: any): {
  notice: ActivationNotice;
  routePath?: string;
  routeDelayMs?: number;
} {
  const detail = structuredErrorDetail(err);
  const code = safeStr(detail?.code).toLowerCase();
  const nextAction = safeStr(detail?.next_action).toLowerCase();
  const rawMessage = safeStr(detail?.message || err?.message || err);

  if (
    code === "account_already_activated" ||
    nextAction === "login" ||
    rawMessage.toLowerCase().includes("already activated")
  ) {
    const routePath = loginPathFromDetail(detail);
    return {
      notice: {
        tone: "info",
        title: "This GSN ID is already active",
        message:
          "Your membership is already activated. Sign in with the password for this account. If you do not remember it, use account recovery from the sign-in page.",
        actionLabel: "Open sign in",
        actionPath: routePath,
      },
      routePath,
      routeDelayMs: 1500,
    };
  }

  if (code === "account_activation_pending" || nextAction === "activate_membership") {
    return {
      notice: {
        tone: "warning",
        title: "Activation is still pending",
        message:
          "This membership is not ready for password setup yet. Return to approval status and use the latest GSN ID or request ID shown there.",
      },
    };
  }

  return {
    notice: {
      tone: "error",
      title: "Activation could not finish",
      message:
        rawMessage && !rawMessage.startsWith("{")
          ? rawMessage
          : "Check that the GSN ID or request ID belongs to the approved membership, then try again.",
    },
  };
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 16% 7%, rgba(63,133,229,0.24) 0%, rgba(63,133,229,0) 20%), radial-gradient(circle at 92% 58%, rgba(41,103,178,0.28) 0%, rgba(41,103,178,0) 30%), radial-gradient(circle at 45% 98%, rgba(214,170,69,0.12) 0%, rgba(214,170,69,0) 22%), linear-gradient(180deg, #020912 0%, #061827 42%, #08233A 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "clamp(18px, 4vw, 38px)",
    boxSizing: "border-box",
  };
}

function screenWrap(isCompact = false): React.CSSProperties {
  return {
    width: isCompact ? "min(100%, 376px)" : "min(100%, 860px)",
    maxWidth: isCompact ? 376 : 860,
    minWidth: 0,
    display: "grid",
    gap: 20,
    margin: "0 auto",
    boxSizing: "border-box",
  };
}

function topRailCard(isCompact = false): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: isCompact ? "54px minmax(0, 1fr)" : "64px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: isCompact ? "12px 14px" : 18,
    minHeight: isCompact ? 116 : 124,
    borderRadius: 28,
    padding: isCompact ? "12px 14px" : "16px clamp(16px, 4vw, 28px)",
    boxSizing: "border-box",
    border: "1px solid rgba(214,170,69,0.42)",
    background:
      "linear-gradient(180deg, rgba(8,27,47,0.96) 0%, rgba(6,22,39,0.98) 100%)",
    boxShadow:
      "0 26px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(214,170,69,0.18)",
  };
}

function activationCard(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 30,
    border: "1px solid rgba(123,161,204,0.36)",
    background:
      "linear-gradient(180deg, rgba(8,31,55,0.96) 0%, rgba(5,23,41,0.985) 58%, rgba(6,20,36,0.99) 100%)",
    boxShadow:
      "0 32px 76px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)",
    padding: "clamp(26px, 5vw, 56px)",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

function crestStyle(size = 78): React.CSSProperties {
  return {
    width: size,
    height: size,
    display: "inline-grid",
    placeItems: "center",
    borderRadius: "45% 45% 52% 52%",
    border: "2px solid rgba(242,199,102,0.82)",
    background:
      "radial-gradient(circle at 50% 30%, rgba(242,199,102,0.20) 0%, rgba(242,199,102,0) 34%), linear-gradient(180deg, rgba(9,39,68,0.98) 0%, rgba(4,18,34,0.98) 100%)",
    color: "#F4D37C",
    fontFamily: "Georgia, serif",
    fontSize: Math.max(16, Math.round(size * 0.32)),
    fontWeight: 900,
    letterSpacing: 0.5,
    boxShadow:
      "0 0 0 6px rgba(214,170,69,0.10), 0 16px 28px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.20)",
    textShadow: "0 2px 10px rgba(214,170,69,0.30)",
  };
}

function brandLockup(isCompact = false): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: isCompact ? "flex-start" : "center",
    minWidth: 0,
    gap: isCompact ? 12 : 22,
  };
}

function railActionStyle(kind: "about" | "guide", isCompact = false): React.CSSProperties {
  const about = kind === "about";
  return {
    minHeight: isCompact ? 40 : 44,
    height: isCompact ? 40 : 44,
    maxHeight: isCompact ? 40 : 44,
    minWidth: 0,
    width: isCompact ? "100%" : undefined,
    borderRadius: 999,
    padding: isCompact ? "0 10px" : about ? "0 22px" : "0 24px",
    border: about
      ? "1px solid rgba(242,199,102,0.78)"
      : "1px solid rgba(123,161,204,0.20)",
    background: about
      ? "linear-gradient(180deg, rgba(18,45,76,0.96) 0%, rgba(8,27,47,0.96) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.035) 100%)",
    color: about ? "#F4D37C" : "#DDEAFF",
    fontWeight: 1000,
    fontSize: isCompact ? 10.5 : 13,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    boxShadow: about
      ? "0 12px 22px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.08)"
      : "inset 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function labelText(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "#F2C766",
    fontWeight: 1000,
    fontSize: 20,
    lineHeight: 1.1,
  };
}

function eyebrow(): React.CSSProperties {
  return {
    color: "#F2C766",
    fontSize: 18,
    fontWeight: 1000,
    letterSpacing: 8,
    textTransform: "uppercase",
  };
}

function inputShell(): React.CSSProperties {
  return {
    position: "relative",
    display: "grid",
    alignItems: "center",
  };
}

function inputStyle(readOnly = false, hasTrailing = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 74,
    padding: hasTrailing ? "18px 68px 18px 28px" : "18px 68px 18px 28px",
    borderRadius: 22,
    border: "1px solid rgba(156,180,207,0.44)",
    outline: "none",
    fontSize: 24,
    lineHeight: 1.2,
    background:
      "linear-gradient(180deg, rgba(5,25,45,0.92) 0%, rgba(4,19,35,0.95) 100%)",
    color: readOnly ? "#E1EBF7" : "#F8FBFF",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 22px rgba(0,0,0,0.18)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function labelIconStyle(tone: "id" | "number" | "lock" | "check"): React.CSSProperties {
  const circle = tone === "check";
  return {
    width: 32,
    height: 32,
    display: "inline-grid",
    placeItems: "center",
    borderRadius: circle ? 999 : 8,
    background:
      "linear-gradient(180deg, #F8D978 0%, #D6AA45 100%)",
    color: "#08233A",
    fontSize: tone === "lock" ? 18 : 12,
    fontWeight: 1000,
    lineHeight: 1,
    boxShadow:
      "0 10px 18px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.34)",
  };
}

function fieldCheckStyle(): React.CSSProperties {
  return {
    position: "absolute",
    right: 26,
    top: "50%",
    transform: "translateY(-50%)",
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    border: "2px solid rgba(94,197,124,0.85)",
    color: "#7EE092",
    fontSize: 10.5,
    fontWeight: 1000,
    letterSpacing: 0.2,
    pointerEvents: "none",
    boxShadow: "0 0 16px rgba(94,197,124,0.24)",
  };
}

function passwordToggleStyle(): React.CSSProperties {
  return {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    minWidth: 42,
    width: 42,
    minHeight: 42,
    height: 42,
    maxHeight: 42,
    borderRadius: 999,
    border: "1px solid rgba(242,199,102,0.20)",
    background: "rgba(4,19,35,0.28)",
    color: "#F2C766",
    fontWeight: 1000,
    fontSize: 10.5,
    letterSpacing: 0.2,
    boxShadow: "none",
  };
}

function chipRail(isCompact = false): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: isCompact ? 12 : 18,
    padding: isCompact ? 14 : 22,
    margin: "26px 0 30px",
    borderRadius: 22,
    boxSizing: "border-box",
    border: "1px solid rgba(123,161,204,0.14)",
    background: "rgba(4,19,35,0.26)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  };
}

function chipStyle(tone: "green" | "blue", isCompact = false): React.CSSProperties {
  return {
    minHeight: isCompact ? 52 : 58,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: isCompact ? "10px 14px" : "12px 20px",
    borderRadius: isCompact ? 17 : 20,
    border:
      tone === "green"
        ? "1px solid rgba(35,164,122,0.38)"
        : "1px solid rgba(80,139,231,0.38)",
    background:
      tone === "green"
        ? "linear-gradient(180deg, rgba(14,79,78,0.84) 0%, rgba(8,64,67,0.80) 100%)"
        : "linear-gradient(180deg, rgba(20,83,162,0.82) 0%, rgba(12,61,128,0.82) 100%)",
    color: "#F8FBFF",
    fontSize: isCompact ? 17 : 20,
    fontWeight: 1000,
    boxShadow:
      "0 16px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
  };
}

function infoPanel(): React.CSSProperties {
  return {
    display: "grid",
    gap: 0,
    marginTop: 24,
    borderRadius: 24,
    border: "1px solid rgba(123,161,204,0.24)",
    background: "rgba(7,28,50,0.78)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 32px rgba(0,0,0,0.18)",
    overflow: "hidden",
    boxSizing: "border-box",
  };
}

function infoRowStyle(last = false): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "52px minmax(0, 1fr) 58px",
    alignItems: "center",
    gap: 14,
    minHeight: 82,
    padding: "16px 22px",
    borderBottom: last ? "none" : "1px solid rgba(123,161,204,0.18)",
  };
}

function infoIconStyle(tone: "info" | "shield"): React.CSSProperties {
  return {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    background:
      tone === "info"
        ? "linear-gradient(180deg, #1E73DD 0%, #0E53B6 100%)"
        : "linear-gradient(180deg, #1A62C0 0%, #0D4696 100%)",
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: 1000,
    boxShadow:
      "0 14px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.16)",
  };
}

function ghostIconStyle(): React.CSSProperties {
  return {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    color: "rgba(180,204,235,0.36)",
    fontSize: 24,
    fontWeight: 1000,
  };
}

function primaryActionStyle(isCompact = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: isCompact ? 62 : 68,
    height: isCompact ? 62 : 68,
    maxHeight: isCompact ? 62 : 68,
    borderRadius: 20,
    border: "1px solid rgba(172,204,255,0.58)",
    background:
      "linear-gradient(180deg, #2F86FF 0%, #1761E6 48%, #0E43BE 100%)",
    color: "#FFFFFF",
    fontSize: isCompact ? 22 : 26,
    fontWeight: 1000,
    boxShadow:
      "0 18px 34px rgba(22,95,230,0.30), inset 0 1px 0 rgba(255,255,255,0.24)",
    textShadow: "0 2px 14px rgba(0,0,0,0.28)",
  };
}

function noticeToastStyle(
  kind: ActivationNoticeTone,
  isCompact = false
): React.CSSProperties {
  const success = kind === "success";
  const error = kind === "error";
  const warning = kind === "warning";
  return {
    position: "fixed",
    zIndex: 40,
    top: "max(14px, env(safe-area-inset-top))",
    left: "50%",
    transform: "translateX(-50%)",
    width: isCompact ? "min(calc(100% - 24px), 376px)" : "min(calc(100% - 32px), 460px)",
    borderRadius: 18,
    background: success
      ? "rgba(18,102,77,0.84)"
      : error
        ? "rgba(117,30,48,0.86)"
        : warning
          ? "rgba(106,78,18,0.90)"
          : "rgba(8,38,69,0.94)",
    border: success
      ? "1px solid rgba(167,243,208,0.42)"
      : error
        ? "1px solid rgba(254,202,202,0.38)"
        : warning
          ? "1px solid rgba(253,230,138,0.42)"
          : "1px solid rgba(147,197,253,0.42)",
    color: "#F8FBFF",
    padding: isCompact ? "14px 16px" : "16px 18px",
    lineHeight: 1.5,
    fontSize: 14,
    boxSizing: "border-box",
    boxShadow:
      "0 20px 46px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
  };
}

function identityGuideStyle(): React.CSSProperties {
  return {
    display: "grid",
    gap: 10,
    margin: "4px 0 26px",
    padding: "16px 18px",
    borderRadius: 20,
    border: "1px solid rgba(242,199,102,0.18)",
    background: "rgba(7,28,50,0.62)",
    color: "#C8D8EA",
    lineHeight: 1.55,
    fontSize: 15,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function fieldHintStyle(): React.CSSProperties {
  return {
    color: "#AFC3DA",
    fontSize: 14,
    lineHeight: 1.45,
  };
}

function guidePanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(242,199,102,0.22)",
    background:
      "linear-gradient(180deg, rgba(9,39,68,0.88) 0%, rgba(6,24,39,0.92) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 20,
    marginBottom: 18,
  };
}

export default function MemberActivationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isCompact =
    typeof window !== "undefined" ? window.innerWidth <= 560 : false;
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "member-activation.route.dashboard"),
      buildFirstCircle: routeTarget(
        "buildFirstCircle",
        selectedClanId,
        "member-activation.route.build-first-circle"
      ),
      trust: routeTarget("trust", selectedClanId, "member-activation.route.trust"),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "member-activation.route.notifications"
      ),
    }),
    [selectedClanId]
  );

  const state =
    (location.state as {
      gmfn_id?: string;
      request_id?: string;
    }) || {};

  const initialGmfnId = safeStr(state.gmfn_id || searchParams.get("gmfn_id") || "");
  const initialRequestId = safeStr(
    state.request_id || searchParams.get("request_id") || ""
  );

  const [form, setForm] = useState({
    gmfn_id: initialGmfnId,
    request_id: initialRequestId,
    password: "",
    confirm_password: "",
  });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ActivationNotice | null>(null);
  const [, setSuccess] = useState("");
  const [activated, setActivated] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);
  const routeTimerRef = useRef<number | null>(null);

  const requestReady = useMemo(() => {
    return {
      gmfn_id: safeStr(form.gmfn_id).toUpperCase(),
      request_id: safeStr(form.request_id),
      password: form.password,
      confirm_password: form.confirm_password,
    };
  }, [form]);

  const hasGsnId = Boolean(requestReady.gmfn_id);
  const hasRequestId = Boolean(requestReady.request_id);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current != null) window.clearTimeout(noticeTimerRef.current);
      if (routeTimerRef.current != null) window.clearTimeout(routeTimerRef.current);
    };
  }, []);

  function clearScheduledActions() {
    if (typeof window === "undefined") return;
    if (noticeTimerRef.current != null) window.clearTimeout(noticeTimerRef.current);
    if (routeTimerRef.current != null) window.clearTimeout(routeTimerRef.current);
    noticeTimerRef.current = null;
    routeTimerRef.current = null;
  }

  function showNotice(
    nextNotice: ActivationNotice,
    options?: { dismissMs?: number; routePath?: string; routeDelayMs?: number }
  ) {
    clearScheduledActions();
    setNotice(nextNotice);

    if (typeof window === "undefined") return;

    if (options?.dismissMs) {
      noticeTimerRef.current = window.setTimeout(() => {
        setNotice(null);
        noticeTimerRef.current = null;
      }, options.dismissMs);
    }

    if (options?.routePath) {
      routeTimerRef.current = window.setTimeout(() => {
        navigate(options.routePath as string, {
          replace: true,
          state: {
            gmfn_id: requestReady.gmfn_id,
            request_id: requestReady.request_id,
            from: "member-activation",
          },
        });
      }, options.routeDelayMs ?? 1200);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    clearScheduledActions();
    setNotice(null);
    setSuccess("");

    if (!requestReady.gmfn_id && !requestReady.request_id) {
      showNotice(
        {
          tone: "warning",
          title: "Add one approved number",
          message:
            "Enter either the GSN ID shown after approval or the request ID from approval status. You do not need both if one of them is already filled in.",
        },
        { dismissMs: 4200 }
      );
      return;
    }

    if (!requestReady.password || requestReady.password.length < 6) {
      showNotice(
        {
          tone: "warning",
          title: "Create a stronger password",
          message: "Use at least 6 characters, then confirm the same password below.",
        },
        { dismissMs: 4200 }
      );
      return;
    }

    if (requestReady.password !== requestReady.confirm_password) {
      showNotice(
        {
          tone: "warning",
          title: "Passwords do not match",
          message: "Re-enter the same password in both password fields.",
        },
        { dismissMs: 4200 }
      );
      return;
    }

    try {
      setBusy(true);

      if (requestReady.gmfn_id) {
        await activateMembership({
          gmfn_id: requestReady.gmfn_id,
          password: requestReady.password,
          confirm_password: requestReady.confirm_password,
        });
      } else {
        await activateApprovedMember({
          gmfn_id: null,
          request_id: requestReady.request_id || null,
          password: requestReady.password,
          confirm_password: requestReady.confirm_password,
        });
      }

      await observeIdentityRisk().catch(() => null);

      setActivated(true);
      setSuccess(
        "Membership activated successfully. Build your First Circle next so your community growth starts with real trusted people."
      );
      showNotice(
        {
          tone: "success",
          title: "Activation complete",
          message:
            "Membership activated successfully. Build your First Circle next so your community growth starts with real trusted people.",
        }
      );
      if (typeof window !== "undefined") {
        routeTimerRef.current = window.setTimeout(() => {
          navigate(routes.buildFirstCircle, { replace: true });
        }, 1200);
      }
    } catch (err: any) {
      const outcome = friendlyActivationError(err);
      showNotice(outcome.notice, {
        dismissMs: outcome.routePath ? undefined : 5200,
        routePath: outcome.routePath,
        routeDelayMs: outcome.routeDelayMs,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={pageShell()}>
      {notice ? (
        <div
          style={noticeToastStyle(notice.tone, isCompact)}
          role={notice.tone === "error" || notice.tone === "warning" ? "alert" : "status"}
          aria-live={notice.tone === "error" || notice.tone === "warning" ? "assertive" : "polite"}
        >
          <div style={{ fontWeight: 1000, fontSize: 15, marginBottom: 4 }}>
            {notice.title}
          </div>
          <div>{notice.message}</div>
          {notice.actionPath ? (
            <StableCtaLink
              to={notice.actionPath}
              kind="secondary"
              stableHeight={40}
              debugId="member-activation.notice-action"
              style={{
                marginTop: 12,
                minHeight: 40,
                height: 40,
                borderRadius: 999,
                background: "rgba(255,255,255,0.94)",
                color: "#08233A",
                fontWeight: 1000,
              }}
            >
              {notice.actionLabel || "Open next step"}
            </StableCtaLink>
          ) : null}
        </div>
      ) : null}
      <div style={screenWrap(isCompact)}>
        <div style={topRailCard(isCompact)}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(circle at 32% 100%, rgba(242,199,102,0.18) 0%, rgba(242,199,102,0) 25%), radial-gradient(circle at 78% 0%, rgba(67,129,218,0.14) 0%, rgba(67,129,218,0) 32%)",
            }}
          />
          <StableCtaLink
            to="/welcome"
            kind="secondary"
            stableHeight={isCompact ? 52 : 58}
            minWidth={isCompact ? 52 : 58}
            debugId="member-activation.back"
            aria-label="Back to welcome"
            style={{
              position: "relative",
              zIndex: 1,
              width: isCompact ? 52 : 58,
              height: isCompact ? 52 : 58,
              maxHeight: isCompact ? 52 : 58,
              padding: 0,
              borderRadius: 999,
              border: "1px solid rgba(242,199,102,0.32)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
              color: "#F8FBFF",
              fontSize: isCompact ? 28 : 34,
              fontWeight: 500,
              boxShadow:
                "0 16px 28px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            {"<"}
          </StableCtaLink>

          <div style={{ ...brandLockup(isCompact), position: "relative", zIndex: 1 }}>
            <div style={crestStyle(isCompact ? 58 : 78)}>GSN</div>
            <div style={{ display: "grid", justifyItems: "start", minWidth: 0 }}>
              <div
                style={{
                  color: "#F4D37C",
                  fontFamily: "Georgia, serif",
                  fontSize: isCompact ? 38 : "clamp(38px, 8vw, 64px)",
                  fontWeight: 900,
                  letterSpacing: isCompact ? 8 : 13,
                  lineHeight: 0.96,
                  textShadow:
                    "0 2px 0 rgba(255,255,255,0.14), 0 16px 34px rgba(214,170,69,0.24)",
                }}
              >
                GSN
              </div>
              <div
                style={{
                  color: "#E1B85B",
                  fontSize: isCompact ? 9 : 10,
                  fontWeight: 1000,
                  letterSpacing: isCompact ? 1.2 : 1.8,
                  marginTop: 8,
                  textTransform: "uppercase",
                }}
              >
                Global Support Network
              </div>
            </div>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: isCompact ? "grid" : "flex",
              gridTemplateColumns: isCompact ? "1fr" : undefined,
              gap: isCompact ? 8 : 12,
              justifyContent: isCompact ? "stretch" : "flex-end",
              flexWrap: isCompact ? undefined : "wrap",
              gridColumn: isCompact ? "1 / -1" : undefined,
              minWidth: 0,
            }}
          >
            <SubtleButton
              type="button"
              onClick={() => setGuideOpen((current) => !current)}
              stableHeight={isCompact ? 40 : 44}
              debugId="member-activation.about"
              style={railActionStyle("about", isCompact)}
            >
              About
            </SubtleButton>
            <PrimaryButton
              type="button"
              onClick={() => setGuideOpen((current) => !current)}
              stableHeight={isCompact ? 40 : 44}
              debugId="member-activation.guide"
              style={railActionStyle("guide", isCompact)}
            >
              Activation Guide
            </PrimaryButton>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={activationCard()}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(circle at 4% 5%, rgba(77,152,255,0.18) 0%, rgba(77,152,255,0) 26%), radial-gradient(circle at 84% 78%, rgba(123,161,204,0.10) 0%, rgba(123,161,204,0) 24%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -56,
              bottom: 70,
              width: 220,
              height: 220,
              borderRadius: 999,
              border: "1px solid rgba(123,161,204,0.07)",
              color: "rgba(123,161,204,0.07)",
              display: "grid",
              placeItems: "center",
              fontSize: 54,
              fontFamily: "Georgia, serif",
              fontWeight: 900,
              pointerEvents: "none",
            }}
          >
            GSN
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            {guideOpen ? (
              <div style={guidePanel()}>
                <div style={{ ...eyebrow(), fontSize: 13, letterSpacing: 4, marginBottom: 8 }}>
                  Activation guide
                </div>
                <div style={{ color: "#FFFFFF", fontSize: 21, fontWeight: 1000 }}>
                  Approved member path
                </div>
                <div style={{ color: "#C8D8EA", lineHeight: 1.65, marginTop: 8 }}>
                  Use this page only when your community approval is ready. Confirm the approved GSN ID and request ID, then create your secure password.
                </div>
              </div>
            ) : null}

            <div style={{ ...eyebrow(), marginBottom: 18 }}>Member Activation</div>
            <h1
              style={{
                margin: 0,
                color: "#FFFFFF",
                fontSize: "clamp(42px, 8vw, 66px)",
                lineHeight: 1.04,
                fontWeight: 1000,
                letterSpacing: 0,
                textShadow:
                  "0 2px 0 rgba(255,255,255,0.08), 0 16px 36px rgba(0,0,0,0.34)",
              }}
            >
              Finish your activation
            </h1>
            <p
              style={{
                margin: "24px 0 0",
                color: "#C8D8EA",
                fontSize: isCompact ? 20 : "clamp(21px, 4vw, 29px)",
                lineHeight: 1.55,
                maxWidth: 720,
                fontWeight: 520,
              }}
            >
              Your community approval is ready. Confirm your details and create a secure password to open your GSN account.
            </p>

            {(initialGmfnId || initialRequestId) && (
              <div style={chipRail(isCompact)}>
                {initialGmfnId ? (
                  <div style={chipStyle("green", isCompact)}>
                    <span style={{ ...labelIconStyle("id"), width: 36, height: 28 }}>ID</span>
                    <span>GSN ID detected</span>
                  </div>
                ) : null}
                {initialRequestId ? (
                  <div style={chipStyle("blue", isCompact)}>
                    <span style={{ ...labelIconStyle("number"), width: 32, height: 36 }}>
                      123
                    </span>
                    <span>Request ID: {initialRequestId}</span>
                  </div>
                ) : null}
              </div>
            )}

            <div style={identityGuideStyle()}>
              <div>
                <strong style={{ color: "#F4D37C" }}>GSN ID</strong> is your permanent member identity. Use it when approval has already issued one.
              </div>
              <div>
                <strong style={{ color: "#F4D37C" }}>Request ID</strong> is only the approval record number. Use it if this page does not already have your GSN ID.
              </div>
            </div>

            <div style={{ display: "grid", gap: 24 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelText()} htmlFor="member-activation-gsn-id">
                  <span style={labelIconStyle("id")}>ID</span>
                  GSN ID
                </label>
                <div style={inputShell()}>
                  <input
                    id="member-activation-gsn-id"
                    value={form.gmfn_id}
                    onChange={(e) => setForm({ ...form, gmfn_id: e.target.value })}
                    placeholder="Enter GSN ID"
                    autoComplete="username"
                    style={inputStyle(false)}
                  />
                  {hasGsnId ? <span style={fieldCheckStyle()}>OK</span> : null}
                </div>
                <div style={fieldHintStyle()}>
                  Keep this as the approved GSN ID. If your account is already active, this page will move you to sign in.
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelText()} htmlFor="member-activation-request-id">
                  <span style={labelIconStyle("number")}>123</span>
                  Request ID
                </label>
                <div style={inputShell()}>
                  <input
                    id="member-activation-request-id"
                    value={form.request_id}
                    onChange={(e) => setForm({ ...form, request_id: e.target.value })}
                    placeholder="Enter request ID if available"
                    inputMode="numeric"
                    style={inputStyle(Boolean(initialRequestId))}
                    readOnly={Boolean(initialRequestId)}
                  />
                  {hasRequestId ? <span style={fieldCheckStyle()}>OK</span> : null}
                </div>
                <div style={fieldHintStyle()}>
                  This can stay blank when the GSN ID is already filled. It is mainly for finding the approval before a GSN ID is issued.
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelText()} htmlFor="member-activation-password">
                  <span style={labelIconStyle("lock")}>L</span>
                  Password
                </label>
                <div style={inputShell()}>
                  <input
                    id="member-activation-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Create password"
                    autoComplete="new-password"
                    style={inputStyle(false, true)}
                  />
                  <SubtleButton
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    stableHeight={42}
                    minWidth={42}
                    debugId="member-activation.password.toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={passwordToggleStyle()}
                  >
                    {showPassword ? "Hide" : "View"}
                  </SubtleButton>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelText()} htmlFor="member-activation-confirm-password">
                  <span style={labelIconStyle("check")}>OK</span>
                  Confirm password
                </label>
                <div style={inputShell()}>
                  <input
                    id="member-activation-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirm_password}
                    onChange={(e) =>
                      setForm({ ...form, confirm_password: e.target.value })
                    }
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    style={inputStyle(false, true)}
                  />
                  <SubtleButton
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    stableHeight={42}
                    minWidth={42}
                    debugId="member-activation.confirm-password.toggle"
                    aria-label={
                      showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                    }
                    style={passwordToggleStyle()}
                  >
                    {showConfirmPassword ? "Hide" : "View"}
                  </SubtleButton>
                </div>
              </div>
            </div>

            <div style={infoPanel()}>
              <div style={infoRowStyle()}>
                <span style={infoIconStyle("info")}>i</span>
                <span style={{ color: "#DCE7F4", fontSize: 21, lineHeight: 1.35 }}>
                  Use the GSN ID when it is present. Use the request ID only when the GSN ID is not yet available.
                </span>
                <span style={ghostIconStyle()}>ID</span>
              </div>
              <div style={infoRowStyle(true)}>
                <span style={infoIconStyle("shield")}>S</span>
                <span style={{ color: "#B8C8DC", fontSize: 21, lineHeight: 1.35 }}>
                  Your password protects your account.
                </span>
                <span style={ghostIconStyle()}>OK</span>
              </div>
            </div>

            <div style={{ marginTop: 30 }}>
              <PrimaryButton
                type="submit"
                disabled={busy || activated}
                busy={busy}
                busyLabel="Finishing activation..."
                stableHeight={isCompact ? 62 : 68}
                fullWidth
                debugId="member-activation.finish"
                style={primaryActionStyle(isCompact)}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: isCompact ? 30 : 34,
                    height: isCompact ? 30 : 34,
                    borderRadius: 999,
                    color: "#FFFFFF",
                    background: "rgba(255,255,255,0.14)",
                    fontSize: isCompact ? 10 : 11,
                    fontWeight: 1000,
                    marginRight: 6,
                  }}
                >
                  GO
                </span>
                Finish activation
              </PrimaryButton>
            </div>
          </div>
        </form>

        {activated ? (
          <CardActionRow style={{ marginTop: 2 }} align="center">
            <StableCtaLink
              to={routes.buildFirstCircle}
              kind="primary"
              debugId="member-activation.build-first-circle"
            >
              Build first circle
            </StableCtaLink>
            <StableCtaLink
              to={routes.trust}
              kind="secondary"
              debugId="member-activation.trust"
            >
              Open Trust Passport
            </StableCtaLink>
            <StableCtaLink
              to={routes.notifications}
              kind="secondary"
              debugId="member-activation.notifications"
            >
              Open Action Inbox
            </StableCtaLink>
          </CardActionRow>
        ) : null}
      </div>
    </div>
  );
}
