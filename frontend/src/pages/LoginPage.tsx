import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { EntryBackLink } from "../components/EntryControls";
import GSNBrandMonument from "../components/GSNBrandMonument";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import GsnInstallPrompt from "../components/GsnInstallPrompt";
import { PrimaryButton, SecondaryButton, SubtleButton } from "../components/StableButton";
import {
  getAccessToken,
  getMe,
  getMeWithToken,
  loginAndStore,
  resetPasswordWithRecovery,
  startPasswordRecovery,
} from "../lib/api";
import {
  peekPublishRecoveryTarget,
  publishRecoveryTarget,
} from "../lib/publishRecovery";
import { structuredErrorDetail } from "../lib/structuredErrors";

function pageShell(compact = false): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 86% 6%, rgba(84,123,169,0.12) 0%, rgba(84,123,169,0.00) 28%), radial-gradient(circle at 18% 88%, rgba(58,92,134,0.12) 0%, rgba(58,92,134,0.00) 28%), linear-gradient(180deg, #06111C 0%, #0A1B2B 46%, #102A43 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: compact ? "16px 18px" : "22px",
    boxSizing: "border-box",
    overflowX: "hidden",
  };
}

function heroCard(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 36,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(220,231,243,0.18)",
    boxShadow:
      "0 36px 84px rgba(0,8,18,0.36), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 22,
    boxSizing: "border-box",
    maxWidth: "min(760px, 100%)",
    backdropFilter: "blur(10px)",
    position: "relative",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(232,239,247,0.96) 100%)"
        : bg,
    border: "1px solid rgba(17,37,58,0.11)",
    padding: 18,
    boxSizing: "border-box",
    maxWidth: "100%",
    boxShadow:
      "0 16px 32px rgba(8,18,34,0.08), inset 0 1px 0 rgba(255,255,255,0.76)",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.18)",
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

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    width: "100%",
    minHeight: 54,
    height: 54,
    maxHeight: 54,
    padding: "0 14px",
    borderRadius: 24,
    border: disabled
      ? "1px solid rgba(161,179,199,0.48)"
      : "1px solid rgba(255,255,255,0.78)",
    background: disabled
      ? "linear-gradient(180deg, #D7DEE8 0%, #C8D2DF 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F2F6FB 58%, #DEE8F3 100%)",
    color: disabled ? "#6B7B8D" : "#10253B",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14.5,
    opacity: disabled ? 0.82 : 1,
    textAlign: "center",
    boxShadow: disabled
      ? "0 8px 16px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.52)"
      : "0 12px 22px rgba(1,13,32,0.22), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -5px 9px rgba(120,142,170,0.09)",
    textShadow: "none",
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    width: "100%",
    minHeight: 46,
    height: 46,
    maxHeight: 46,
    padding: "0 15px",
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)",
    color: "#F3D06A",
    fontWeight: 1000,
    border: "1px solid rgba(243,208,106,0.26)",
    cursor: "pointer",
    fontSize: 14.5,
    lineHeight: 1.15,
    textAlign: "center",
    boxShadow:
      "0 10px 20px rgba(0,8,18,0.14), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -4px 8px rgba(6,18,35,0.10)",
  };
}

function supportBtn(): React.CSSProperties {
  return {
    ...secondaryBtn(),
    width: "100%",
    minHeight: 52,
    height: 52,
    maxHeight: 52,
    borderRadius: 15,
    padding: "7px 12px",
    fontSize: 13.5,
    lineHeight: 1.12,
    justifySelf: "stretch",
    boxShadow:
      "0 8px 18px rgba(0,8,18,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
  };
}

function compactActionRail(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    justifyItems: "stretch",
    alignItems: "stretch",
  };
}

function inputIconBadge(): React.CSSProperties {
  return {
    color: "#F3D06A",
    fontSize: 11,
    textAlign: "center",
    fontWeight: 1000,
    letterSpacing: 0.6,
  };
}

function loginIconText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 24
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
        width: "100%",
        lineHeight: 1.12,
        whiteSpace: "normal",
      }}
    >
      <GsnLegacyIcon
        name={name}
        size={size}
        decorative
        style={{ display: "inline-grid", flex: "0 0 auto" }}
      />
      <span
        style={{
          minWidth: 0,
          maxWidth: "100%",
          overflowWrap: "normal",
          textAlign: "center",
          whiteSpace: "normal",
          wordBreak: "normal",
        }}
      >
        {label}
      </span>
    </span>
  );
}

function loginIconOnly(name: GsnIconName, size = 24): React.ReactElement {
  return (
    <GsnLegacyIcon
      name={name}
      size={size}
      decorative
      style={{ display: "inline-grid", margin: "0 auto" }}
    />
  );
}

function noticeStyle(
  kind: "error" | "info" | "success" | "warning"
): React.CSSProperties {
  if (kind === "error") {
    return {
      borderRadius: 16,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      padding: 16,
      lineHeight: 1.7,
      fontSize: 14,
    };
  }

  if (kind === "success") {
    return {
      borderRadius: 16,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      padding: 16,
      lineHeight: 1.7,
      fontSize: 14,
    };
  }

  if (kind === "warning") {
    return {
      borderRadius: 16,
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      color: "#92400E",
      padding: 16,
      lineHeight: 1.7,
      fontSize: 14,
    };
  }

  return {
    borderRadius: 16,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.08)",
    color: "#35516B",
    padding: 16,
    lineHeight: 1.7,
    fontSize: 14,
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

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function isNetworkSessionError(error: unknown): boolean {
  const message = safeStr((error as any)?.message || error).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network error") ||
    message.includes("server did not finish") ||
    message.includes("check your connection")
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function getMeWithTokenRetry(token: string): Promise<any> {
  try {
    return await getMeWithToken(token);
  } catch (error) {
    if (!isNetworkSessionError(error)) throw error;
    await wait(650);
    return getMeWithToken(token, { fresh: true });
  }
}

function signInSessionError(error: unknown, tokenStored: boolean): string {
  const status = Number((error as any)?.status);
  const message = safeStr((error as any)?.message || error);
  const lowerMessage = message.toLowerCase();

  if (!tokenStored) {
    return (
      "Sign-in accepted, but this browser did not keep you signed in. " +
      "Return to Welcome, open Sign in again, and try once more. If the same message returns, pause and report this sign-in recovery message."
    );
  }

  if (status === 401 || status === 403) {
    return (
      "Sign-in accepted, but the live system did not recognize your signed-in session when opening your member record. " +
      "Return to Welcome, open Sign in again, and try once more. If it repeats, use Activate Membership to confirm this account is active before signing in."
    );
  }

  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes("network error") ||
    lowerMessage.includes("server did not finish") ||
    lowerMessage.includes("check your connection")
  ) {
    return (
      "Sign-in accepted, but the browser could not reach the member record check. " +
      "Check the connection, return to Welcome, and open Sign in again. If it repeats on the live site, pause and report this sign-in recovery message."
    );
  }

  return (
    "Sign-in accepted, but the live system could not open your member session. " +
    "Return to Welcome, open Sign in again, and try once more. If the same message returns, pause and report this sign-in recovery message."
  );
}

function joinRedirectFromLoginSearch(searchParams: URLSearchParams): string {
  const inviteCode =
    safeStr(searchParams.get("invite_code")) ||
    safeStr(searchParams.get("invite")) ||
    safeStr(searchParams.get("join_code")) ||
    safeStr(searchParams.get("code"));

  if (!inviteCode) return "";

  const next = new URLSearchParams(searchParams);
  next.delete("force");
  next.delete("session");
  next.set("invite_code", inviteCode);

  const finalQuery = next.toString();
  return finalQuery ? `/join?${finalQuery}` : "/join";
}

function safeAppReturnTarget(value: unknown): string {
  const target = safeStr(value);
  if (target === "/app" || target.startsWith("/app/")) return target;
  return "";
}

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const routeState = useMemo(
    () =>
      ((location.state as {
        from?: { pathname?: string; search?: string; hash?: string };
        create_entry?: {
          clan_name?: string;
          clan_description?: string;
          email?: string;
        };
      }) || {}),
    [location.state]
  );

  const founderContext = routeState.create_entry || {};
  const founderEmail = safeStr(founderContext.email || "");
  const inviteGsnId =
    safeStr(searchParams.get("gsn_id")) ||
    safeStr(searchParams.get("gmfn_id"));
  const founderCommunityName = safeStr(founderContext.clan_name || "");
  const forceLogin = searchParams.get("force") === "1";

  const redirectTarget = useMemo(() => {
    const inviteTarget = joinRedirectFromLoginSearch(searchParams);
    if (inviteTarget) return inviteTarget;
    const publishTarget = peekPublishRecoveryTarget();
    if (publishTarget) return publishTarget;
    const nextTarget = safeAppReturnTarget(searchParams.get("next"));
    if (nextTarget) return nextTarget;
    if (routeState.from?.pathname && routeState.from.pathname !== "/login") {
      return `${routeState.from.pathname}${routeState.from.search || ""}${
        routeState.from.hash || ""
      }`;
    }
    return "/app/dashboard";
  }, [routeState, searchParams]);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [email, setEmail] = useState(founderEmail || inviteGsnId || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [activationPath, setActivationPath] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<"claim" | "answers">("claim");
  const [recoveryGsnId, setRecoveryGsnId] = useState(inviteGsnId || "");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryPrompts, setRecoveryPrompts] = useState<string[]>([]);
  const [recoveryAnswers, setRecoveryAnswers] = useState(["", "", ""]);
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const innerRailWidth = "min(100%, 760px)";

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Sign In";
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) return;
        if (forceLogin) return;

        const me = await getMe();
        if (me?.id) {
          nav(publishRecoveryTarget() || redirectTarget, { replace: true });
        }
      } catch {
        // ignore stale token during test phase
      }
    })();
  }, [nav, redirectTarget, forceLogin]);

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    setBusy(true);
    setErr(null);
    setMsg(null);
    setActivationPath(null);

    try {
      const u = safeStr(email);
      const p = String(password || "");

      if (!u) throw new Error("Enter your email.");
      if (!p) throw new Error("Enter your password.");

      const loginResult = await loginAndStore(u, p);
      const token = safeStr(loginResult?.access_token);
      const tokenStored = Boolean(safeStr(getAccessToken()));
      let sessionError: unknown = null;
      const me = token
        ? await getMeWithTokenRetry(token).catch((error) => {
            sessionError = error;
            return null;
          })
        : null;

      if (!tokenStored) {
        throw new Error(signInSessionError(null, false));
      }

      if (!me?.id) {
        if (isNetworkSessionError(sessionError)) {
          setMsg("Sign-in accepted. Opening your workspace...");
          setTimeout(() => {
            nav(publishRecoveryTarget() || redirectTarget, { replace: true });
          }, 500);
          return;
        }

        throw new Error(signInSessionError(sessionError, tokenStored));
      }

      setMsg("Sign-in successful. Opening your workspace...");
      setTimeout(() => {
        nav(publishRecoveryTarget() || redirectTarget, { replace: true });
      }, 500);
    } catch (e: any) {
      const raw = String(
        e?.message ||
          "Unable to sign in. Confirm that your account is already active."
      );
      const detail = structuredErrorDetail(e);

      if (
        detail?.code === "account_activation_pending" ||
        detail?.next_action === "activate_membership"
      ) {
        const nextPath = safeStr(detail?.activation_path) || "/activate-membership";
        setActivationPath(nextPath);
        setErr(
          safeStr(detail?.message) ||
            "This identity exists, but membership activation is not finished yet. Activate membership first, then sign in."
        );
        return;
      }

      if (
        raw.toLowerCase().includes("invalid credentials") ||
        raw.toLowerCase().includes("not yet activated")
      ) {
        setErr(
          "Those details did not match an active account. If this is your first time on the live system, use Activate Membership or start through Create Community first."
        );
      } else {
        setErr(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  function openCreateRoute() {
    nav("/create");
  }

  function openActivationRoute() {
    nav(activationPath || "/activate-membership");
  }

  function openRecoveryLane() {
    setRecoveryOpen((current) => !current);
    setRecoveryError(null);
    setRecoveryMessage(null);
    if (!recoveryGsnId && safeStr(email).toUpperCase().includes("-U-")) {
      setRecoveryGsnId(safeStr(email).toUpperCase());
    }
  }

  async function beginPasswordRecovery() {
    setRecoveryBusy(true);
    setRecoveryError(null);
    setRecoveryMessage(null);
    setErr(null);
    setMsg(null);

    try {
      const gsnId = safeStr(recoveryGsnId).toUpperCase();
      const phone = safeStr(recoveryPhone);
      if (!gsnId) throw new Error("Enter the GSN ID for this account.");
      if (!phone) throw new Error("Enter the phone number recorded on this account.");

      const out = await startPasswordRecovery({
        gmfn_id: gsnId,
        phone_e164: phone,
      });
      const prompts = Array.isArray(out?.prompts) ? out.prompts.slice(0, 3) : [];
      if (prompts.length !== 3) {
        throw new Error(
          "Private recovery questions are not ready for this account. Ask the community owner or GSN support to review it."
        );
      }

      setRecoveryPrompts(prompts);
      setRecoveryAnswers(["", "", ""]);
      setRecoveryStep("answers");
      setRecoveryMessage(
        `Account found${out?.phone_mask ? ` for phone ending ${out.phone_mask}` : ""}. Answer the private recovery questions to set a new password.`
      );
    } catch (error: any) {
      const detail = structuredErrorDetail(error);
      setRecoveryError(
        safeStr(detail?.message || error?.message || error) ||
          "Password recovery could not start for those details."
      );
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function completePasswordRecovery() {
    setRecoveryBusy(true);
    setRecoveryError(null);
    setRecoveryMessage(null);
    setErr(null);
    setMsg(null);

    try {
      const answers = recoveryAnswers.map((item) => safeStr(item));
      if (answers.some((item) => !item)) {
        throw new Error("Answer all three private recovery questions.");
      }
      if (!recoveryNewPassword || recoveryNewPassword.length < 6) {
        throw new Error("Choose a new password with at least 6 characters.");
      }
      if (recoveryNewPassword !== recoveryConfirmPassword) {
        throw new Error("The new password and confirmation must match.");
      }

      const out = await resetPasswordWithRecovery({
        gmfn_id: safeStr(recoveryGsnId).toUpperCase(),
        phone_e164: safeStr(recoveryPhone),
        answers,
        new_password: recoveryNewPassword,
        confirm_password: recoveryConfirmPassword,
      });

      const token = safeStr(out?.access_token);
      let sessionError: unknown = null;
      const me = token
        ? await getMeWithTokenRetry(token).catch((error) => {
            sessionError = error;
            return null;
          })
        : null;

      if (!me?.id && !isNetworkSessionError(sessionError)) {
        throw new Error(signInSessionError(sessionError, Boolean(token)));
      }

      setRecoveryMessage("Password reset. Opening your workspace...");
      setTimeout(() => {
        nav(publishRecoveryTarget() || redirectTarget, { replace: true });
      }, 500);
    } catch (error: any) {
      const detail = structuredErrorDetail(error);
      setRecoveryError(
        safeStr(detail?.message || error?.message || error) ||
          "Password recovery could not finish."
      );
    } finally {
      setRecoveryBusy(false);
    }
  }

  return (
    <div style={pageShell(isCompact)}>
      <div
        style={{
          ...heroCard(),
          display: "grid",
          gap: isCompact ? 13 : 18,
          borderRadius: isCompact ? 30 : 36,
          padding: isCompact ? 18 : 22,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at top, rgba(201,154,39,0.07) 0%, rgba(201,154,39,0) 26%), radial-gradient(circle at bottom, rgba(110,145,186,0.08) 0%, rgba(110,145,186,0) 30%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: innerRailWidth,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: isCompact
                ? "44px minmax(0, 1fr) minmax(58px, auto)"
                : "56px 1fr auto",
              alignItems: "center",
              gap: isCompact ? 8 : 12,
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <EntryBackLink to="/welcome" />
            </div>

            <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
              <div
                style={{
                  fontSize: 14,
                  color: "#F3D06A",
                  fontWeight: 900,
                  letterSpacing: 3.8,
                  textTransform: "uppercase",
                }}
              >
                GSN
              </div>
            </div>

            {isCompact ? <div aria-hidden="true" /> : (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <SubtleButton
                  type="button"
                  onClick={() => setGuideOpen((current) => !current)}
                  minWidth={132}
                  stableHeight={52}
                  debugId="login.open-help"
                  style={{
                    ...secondaryBtn(),
                    width: "auto",
                    minHeight: 38,
                    height: 38,
                    maxHeight: 38,
                    padding: "0 16px",
                    borderRadius: 999,
                    color: "#F8FBFF",
                    fontSize: 12,
                    letterSpacing: 0.2,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loginIconText("document", "About Sign In", 22)}
                </SubtleButton>
              </div>
            )}
          </div>

          <div
            style={{
              width: innerRailWidth,
              margin: isCompact ? "10px auto 0" : "18px auto 0",
              fontSize: isCompact ? 34 : 44,
              fontWeight: 1000,
              color: "#F8FBFF",
              lineHeight: isCompact ? 1.08 : 1.1,
              textAlign: "center",
            }}
          >
            Welcome back
          </div>

          <div
            style={{
              width: innerRailWidth,
              margin: "8px auto 0",
              color: "rgba(226,232,240,0.78)",
              fontSize: isCompact ? 14 : 16,
              fontWeight: 750,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            Sign in to continue where you left off.
          </div>

          {guideOpen ? (
            <div
              style={{
                marginTop: 16,
                width: innerRailWidth,
                marginLeft: "auto",
                marginRight: "auto",
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.42)",
                background:
                  "linear-gradient(180deg, rgba(244,248,252,0.99) 0%, rgba(228,235,243,0.98) 34%, rgba(210,221,233,0.95) 68%, rgba(191,205,220,0.92) 100%)",
                boxShadow:
                  "0 26px 62px rgba(5,16,38,0.30), inset 0 1px 0 rgba(255,255,255,0.84), inset 0 -18px 30px rgba(92,114,138,0.10)",
                padding: 24,
                color: "#17324D",
                lineHeight: 1.8,
                position: "relative",
                overflow: "hidden",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(circle at top, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 24%), radial-gradient(circle at bottom right, rgba(84,123,169,0.10) 0%, rgba(84,123,169,0) 30%)",
                }}
              />
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  justifyItems: "center",
                  textAlign: "center",
                  marginBottom: 14,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    ...labelText(),
                    color: "#B18A3C",
                    letterSpacing: 3.4,
                    textShadow: "0 1px 0 rgba(255,255,255,0.76)",
                  }}
                >
                  Sign in guide
                </div>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 30,
                    fontWeight: 1000,
                    lineHeight: 1.06,
                    letterSpacing: 0.2,
                    textShadow:
                      "0 1px 0 rgba(255,255,255,0.92), 0 10px 24px rgba(10,24,49,0.12)",
                  }}
                >
                  Existing member path
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 10,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <SecondaryButton
                  onClick={() => setGuideOpen(false)}
                  minWidth="auto"
                  stableHeight={52}
                  debugId="login.guide.collapse"
                  style={{
                    ...secondaryBtn(),
                    width: "auto",
                    minHeight: 42,
                    height: 42,
                    maxHeight: 42,
                    borderRadius: 14,
                    border: "1px solid rgba(16,37,59,0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
                    color: "#123055",
                    boxShadow: "0 10px 24px rgba(10,24,49,0.14)",
                  }}
                >
                  {loginIconText("lock", "Collapse", 22)}
                </SecondaryButton>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: 4,
                    paddingBottom: 6,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 30,
                      padding: "12px 18px",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.56) 0%, rgba(223,231,239,0.22) 100%)",
                      border: "1px solid rgba(255,255,255,0.48)",
                      boxShadow:
                        "0 18px 36px rgba(10,24,49,0.12), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -10px 18px rgba(123,149,181,0.08)",
                      minWidth: 184,
                      minHeight: 42,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#24415C",
                      fontWeight: 900,
                      fontSize: 12,
                      letterSpacing: 2.2,
                      textTransform: "uppercase",
                      textShadow: "0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    Existing member
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(16,37,59,0.10)",
                      background:
                        "linear-gradient(180deg, rgba(250,252,254,0.82) 0%, rgba(235,241,247,0.70) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 20px rgba(10,24,49,0.06)",
                      padding: "13px 14px",
                    }}
                  >
                    <strong style={{ color: "#10253B" }}>1. Reopen your workspace.</strong>{" "}
                    Use this path only if your account already exists and has already completed activation.
                  </div>
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(16,37,59,0.10)",
                      background:
                        "linear-gradient(180deg, rgba(250,252,254,0.82) 0%, rgba(235,241,247,0.70) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 20px rgba(10,24,49,0.06)",
                      padding: "13px 14px",
                    }}
                  >
                    <strong style={{ color: "#10253B" }}>2. Confirm your details.</strong>{" "}
                    Sign in with the right email and password so the app can reopen the correct member record and community context.
                  </div>
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(16,37,59,0.10)",
                      background:
                        "linear-gradient(180deg, rgba(250,252,254,0.82) 0%, rgba(235,241,247,0.70) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 20px rgba(10,24,49,0.06)",
                      padding: "13px 14px",
                    }}
                  >
                    <strong style={{ color: "#10253B" }}>3. Use activation first if needed.</strong>{" "}
                    If your account is not yet active, use Activate Membership first instead of forcing sign-in through the wrong page.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
            marginTop: isCompact ? -2 : 2,
            marginBottom: isCompact ? -2 : 0,
          }}
          aria-hidden="true"
        >
          <div
            style={{
              borderRadius: 999,
              padding: 8,
              background:
                "radial-gradient(circle, rgba(243,208,106,0.18) 0%, rgba(243,208,106,0.00) 66%)",
              boxShadow: "0 18px 34px rgba(0,8,18,0.22)",
            }}
          >
            <GSNBrandMonument
              width={isCompact ? 64 : 78}
              height={isCompact ? 104 : 128}
            />
          </div>
        </div>

        {founderEmail || founderCommunityName ? (
          <div
            style={{
              ...softCard("#FFFFFF"),
              maxWidth: "100%",
              position: "relative",
              zIndex: 1,
              borderRadius: 22,
              background:
                "linear-gradient(180deg, rgba(248,251,253,0.99) 0%, rgba(233,239,245,0.98) 62%, rgba(216,226,238,0.96) 100%)",
            }}
          >
            <div style={labelText()}>Saved details</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 20,
              }}
            >
              Details carried forward
            </div>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gap: 6,
                ...helperText(),
              }}
            >
              {founderCommunityName ? (
                <div>
                  <strong style={{ color: "#0B1F33" }}>Community:</strong>{" "}
                  {founderCommunityName}
                </div>
              ) : null}

              {founderEmail ? (
                <div>
                  <strong style={{ color: "#0B1F33" }}>Email:</strong>{" "}
                  {founderEmail}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 18,
              width: innerRailWidth,
              margin: "0 auto",
            }}
          >
          {err ? (
            <div style={{ marginBottom: 16, ...compactActionRail() }}>
              <div style={noticeStyle("error")}>{err}</div>
              {activationPath ? (
                <SecondaryButton
                  onClick={openActivationRoute}
                  minWidth={220}
                  stableHeight={52}
                  debugId="login.error.activate-membership"
                  style={supportBtn()}
                >
                  {loginIconText("join-person-plus", "Activate membership", 24)}
                </SecondaryButton>
              ) : null}
            </div>
          ) : null}

          {msg ? (
            <div style={{ marginBottom: 16, ...noticeStyle("success") }}>{msg}</div>
          ) : null}

          <form onSubmit={onSubmit}>
            <div
              style={{
                borderRadius: 26,
                border: "1px solid rgba(243,208,106,0.24)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)",
                boxShadow:
                  "0 24px 46px rgba(0,8,18,0.26), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -12px 24px rgba(6,18,35,0.12)",
                padding: isCompact ? 18 : 22,
                overflow: "hidden",
              }}
            >
            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "1fr",
              }}
            >
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px minmax(0, 1fr)",
                    alignItems: "center",
                    borderRadius: 18,
                    border: "1px solid rgba(220,231,243,0.32)",
                    background:
                      "linear-gradient(180deg, rgba(8,26,47,0.82) 0%, rgba(7,22,38,0.82) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.09), 0 12px 22px rgba(0,8,18,0.14)",
                    paddingLeft: 4,
                  }}
                >
                  <span
                    style={inputIconBadge()}
                    aria-hidden="true"
                  >
                    {loginIconOnly("id", 24)}
                  </span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label="Phone number, email, or GSN ID"
                    placeholder="Enter phone, email, or GSN ID"
                    autoComplete="username"
                    style={{
                      ...inputStyle(),
                      border: "none",
                      boxShadow: "none",
                      background: "transparent",
                      color: "#F8FBFF",
                      minHeight: 52,
                    }}
                  />
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px minmax(0, 1fr)",
                    alignItems: "center",
                    borderRadius: 18,
                    border: "1px solid rgba(220,231,243,0.32)",
                    background:
                      "linear-gradient(180deg, rgba(8,26,47,0.82) 0%, rgba(7,22,38,0.82) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.09), 0 12px 22px rgba(0,8,18,0.14)",
                    paddingLeft: 4,
                  }}
                >
                  <span
                    style={inputIconBadge()}
                    aria-hidden="true"
                  >
                    {loginIconOnly("lock", 24)}
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{
                      ...inputStyle(),
                      border: "none",
                      boxShadow: "none",
                      background: "transparent",
                      color: "#F8FBFF",
                      minHeight: 52,
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                minHeight: 36,
              }}
            >
              <SecondaryButton
                type="button"
                onClick={openRecoveryLane}
                disabled={busy || recoveryBusy}
                stableHeight={36}
                debugId="login.password-recovery.open"
                style={{
                  ...secondaryBtn(),
                  width: "auto",
                  minWidth: 0,
                  minHeight: 36,
                  height: 36,
                  maxHeight: 36,
                  padding: "0 4px",
                  border: "none",
                  borderRadius: 10,
                  background: "transparent",
                  boxShadow: "none",
                  color: "#F3D06A",
                  fontSize: 13.5,
                  fontWeight: 900,
                  textAlign: "right",
                }}
              >
                Forgot password?
              </SecondaryButton>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <PrimaryButton
                type="submit"
                busy={busy}
                busyLabel="Signing in..."
                fullWidth
                stableHeight={54}
                debugId="login.submit"
                style={primaryBtn(busy)}
              >
                {loginIconText("lock", "Sign in to GSN", 24)}
              </PrimaryButton>
            </div>

            <div style={{ marginTop: 12 }}>
              <SecondaryButton
                onClick={openActivationRoute}
                disabled={busy}
                stableHeight={52}
                debugId="login.activate-approved"
                style={supportBtn()}
              >
                {loginIconText("join-person-plus", "Activate membership", 24)}
              </SecondaryButton>
            </div>

            {recoveryOpen ? (
              <div
                style={{
                  ...softCard("#F8FBFF"),
                  marginTop: 14,
                  display: "grid",
                  gap: 12,
                  color: "#0B1F33",
                }}
              >
                <div style={{ display: "grid", gap: 5 }}>
                  <div style={{ fontSize: 18, fontWeight: 1000 }}>
                    Recover your password
                  </div>
                  <div style={{ color: "#526579", fontSize: 13.5, lineHeight: 1.55 }}>
                    Use your GSN ID, the phone number recorded on the account, and
                    your private recovery answers. If those are not ready, an owner
                    or GSN support must review the account.
                  </div>
                </div>

                {recoveryError ? (
                  <div style={noticeStyle("error")}>{recoveryError}</div>
                ) : null}
                {recoveryMessage ? (
                  <div style={noticeStyle("success")}>{recoveryMessage}</div>
                ) : null}

                {recoveryStep === "claim" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <input
                      value={recoveryGsnId}
                      onChange={(event) => setRecoveryGsnId(event.target.value)}
                      aria-label="GSN ID for password recovery"
                      placeholder="GSN ID, for example GSN-U-B7AC7BC0"
                      autoComplete="username"
                      style={inputStyle()}
                    />
                    <input
                      value={recoveryPhone}
                      onChange={(event) => setRecoveryPhone(event.target.value)}
                      aria-label="Phone number for password recovery"
                      placeholder="Phone number on the account"
                      autoComplete="tel"
                      inputMode="tel"
                      style={inputStyle()}
                    />
                    <PrimaryButton
                      type="button"
                      busy={recoveryBusy}
                      busyLabel="Checking..."
                      stableHeight={52}
                      debugId="login.password-recovery.start"
                      style={primaryBtn(recoveryBusy)}
                      onClick={beginPasswordRecovery}
                    >
                      {loginIconText("id", "Open recovery questions", 22)}
                    </PrimaryButton>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recoveryPrompts.map((prompt, index) => (
                      <input
                        key={`recovery-answer-${index}`}
                        value={recoveryAnswers[index] || ""}
                        onChange={(event) =>
                          setRecoveryAnswers((current) => {
                            const next = [...current];
                            next[index] = event.target.value;
                            return next;
                          })
                        }
                        aria-label={`Recovery answer ${index + 1}`}
                        placeholder={prompt || `Recovery answer ${index + 1}`}
                        autoComplete="off"
                        style={inputStyle()}
                      />
                    ))}
                    <input
                      type="password"
                      value={recoveryNewPassword}
                      onChange={(event) => setRecoveryNewPassword(event.target.value)}
                      aria-label="New password"
                      placeholder="New password"
                      autoComplete="new-password"
                      style={inputStyle()}
                    />
                    <input
                      type="password"
                      value={recoveryConfirmPassword}
                      onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
                      aria-label="Confirm new password"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      style={inputStyle()}
                    />
                    <PrimaryButton
                      type="button"
                      busy={recoveryBusy}
                      busyLabel="Resetting..."
                      stableHeight={52}
                      debugId="login.password-recovery.reset"
                      style={primaryBtn(recoveryBusy)}
                      onClick={completePasswordRecovery}
                    >
                      {loginIconText("lock", "Reset password", 22)}
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      disabled={recoveryBusy}
                      stableHeight={50}
                      debugId="login.password-recovery.back"
                      style={supportBtn()}
                      onClick={() => {
                        setRecoveryStep("claim");
                        setRecoveryPrompts([]);
                        setRecoveryAnswers(["", "", ""]);
                        setRecoveryMessage(null);
                        setRecoveryError(null);
                      }}
                    >
                      {loginIconText("navigation", "Use different details", 22)}
                    </SecondaryButton>
                  </div>
                )}
              </div>
            ) : null}
            </div>
          </form>

          <GsnInstallPrompt
            tone="dark"
            compact={isCompact}
            surface="login"
          />

          <SecondaryButton
            onClick={openCreateRoute}
            disabled={busy}
            stableHeight={52}
            debugId="login.start-community"
            style={{
              ...supportBtn(),
              color: "#F8FBFF",
              border: "1px solid rgba(220,231,243,0.28)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)",
              justifySelf: "center",
            }}
          >
            {loginIconText("community", "Start a new community", 24)}
          </SecondaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
