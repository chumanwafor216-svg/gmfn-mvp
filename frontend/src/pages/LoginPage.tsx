import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { EntryBackLink } from "../components/EntryControls";
import GSNBrandMonument from "../components/GSNBrandMonument";
import { PrimaryButton, SecondaryButton, SubtleButton } from "../components/StableButton";
import { getAccessToken, getMe, loginAndStore } from "../lib/api";
import {
  peekPublishRecoveryTarget,
  publishRecoveryTarget,
} from "../lib/publishRecovery";

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
  };
}

function heroCard(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 760,
    borderRadius: 36,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(220,231,243,0.18)",
    boxShadow:
      "0 36px 84px rgba(0,8,18,0.36), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 22,
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
    padding: "17px 18px",
    borderRadius: 999,
    border: disabled
      ? "1px solid rgba(161,179,199,0.48)"
      : "1px solid rgba(255,255,255,0.78)",
    background: disabled
      ? "linear-gradient(180deg, #D7DEE8 0%, #C8D2DF 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F2F6FB 58%, #DEE8F3 100%)",
    color: disabled ? "#6B7B8D" : "#10253B",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 16,
    opacity: disabled ? 0.82 : 1,
    textAlign: "center",
    boxShadow: disabled
      ? "0 10px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.52)"
      : "0 20px 36px rgba(1,13,32,0.30), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -8px 12px rgba(120,142,170,0.10)",
    textShadow: "none",
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 999,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)",
    color: "#F3D06A",
    fontWeight: 1000,
    border: "1px solid rgba(243,208,106,0.26)",
    cursor: "pointer",
    fontSize: 15,
    textAlign: "center",
    boxShadow:
      "0 14px 28px rgba(0,8,18,0.18), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -6px 10px rgba(6,18,35,0.12)",
  };
}

function supportBtn(): React.CSSProperties {
  return {
    ...secondaryBtn(),
    width: "min(100%, 380px)",
    minHeight: 48,
    borderRadius: 16,
    padding: "10px 16px",
    fontSize: 14,
    boxShadow:
      "0 10px 22px rgba(0,8,18,0.16), inset 0 1px 0 rgba(255,255,255,0.12)",
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

  const [email, setEmail] = useState(founderEmail || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [activationPath, setActivationPath] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
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

      await loginAndStore(u, p);

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
                ? "44px minmax(0, 1fr) auto"
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

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SubtleButton
                type="button"
                onClick={() => setGuideOpen((current) => !current)}
                minWidth={isCompact ? "auto" : 132}
                stableHeight={40}
                debugId="login.open-help"
                style={{
                  ...secondaryBtn(),
                  width: "auto",
                  minHeight: 40,
                  padding: isCompact ? "9px 14px" : "10px 18px",
                  borderRadius: 999,
                  color: "#F8FBFF",
                  fontSize: isCompact ? 11 : 12,
                  letterSpacing: isCompact ? 0.45 : 0.2,
                  textTransform: isCompact ? "uppercase" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {isCompact ? "Sign In Guide" : "About Sign In"}
              </SubtleButton>
            </div>
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
                  stableHeight={44}
                  debugId="login.guide.collapse"
                  style={{
                    ...secondaryBtn(),
                    width: "auto",
                    borderRadius: 14,
                    border: "1px solid rgba(16,37,59,0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
                    color: "#123055",
                    boxShadow: "0 10px 24px rgba(10,24,49,0.14)",
                  }}
                >
                  Collapse
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
                    If your account is not yet active, use Activate Membership first instead of forcing sign-in through the wrong route.
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
            <div style={{ marginBottom: 16, display: "grid", gap: 10 }}>
              <div style={noticeStyle("error")}>{err}</div>
              {activationPath ? (
                <SecondaryButton
                  onClick={openActivationRoute}
                  minWidth={220}
                  stableHeight={50}
                  debugId="login.error.activate-membership"
                  style={supportBtn()}
                >
                  Activate membership
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
                    ...labelText(),
                    color: "rgba(248,251,255,0.92)",
                    letterSpacing: 0.2,
                  }}
                >
                  Phone number or email
                </div>
                <div
                  style={{
                    marginTop: 9,
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
                    ID
                  </span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your phone number or email"
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
                    ...labelText(),
                    color: "rgba(248,251,255,0.92)",
                    letterSpacing: 0.2,
                  }}
                >
                  Password
                </div>
                <div
                  style={{
                    marginTop: 9,
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
                    PW
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                marginTop: 20,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <PrimaryButton
                type="submit"
                busy={busy}
                busyLabel="Signing in..."
                fullWidth
                stableHeight={58}
                debugId="login.submit"
                style={primaryBtn(busy)}
              >
                Sign in to GSN
              </PrimaryButton>
            </div>

            <div style={{ marginTop: 14 }}>
              <SecondaryButton
                onClick={openActivationRoute}
                disabled={busy}
                stableHeight={50}
                debugId="login.activate-approved"
                style={supportBtn()}
              >
                Already approved? Activate membership
              </SecondaryButton>
            </div>
            </div>
          </form>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "52px minmax(0, 1fr)" : "64px minmax(0, 1fr)",
              gap: 16,
              alignItems: "center",
              borderRadius: 24,
              border: "1px solid rgba(220,231,243,0.16)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.035) 100%)",
              boxShadow:
                "0 20px 36px rgba(0,8,18,0.18), inset 0 1px 0 rgba(255,255,255,0.09)",
              padding: isCompact ? "15px 16px" : "18px 20px",
            }}
          >
            <div
              style={{
                width: isCompact ? 50 : 58,
                height: isCompact ? 50 : 58,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(8,25,43,0.58)",
                border: "1px solid rgba(243,208,106,0.28)",
                color: "#F3D06A",
                fontSize: isCompact ? 12 : 13,
                fontWeight: 1000,
                letterSpacing: 0.6,
              }}
              aria-hidden="true"
            >
              SEC
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  fontSize: isCompact ? 17 : 19,
                  fontWeight: 1000,
                  lineHeight: 1.22,
                  color: "#F8FBFF",
                }}
              >
                Your identity and community data stay protected.
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "rgba(226,232,240,0.70)",
                  lineHeight: 1.45,
                }}
              >
                Secure sign-in / Trusted access
              </div>
            </div>
          </div>

          <SecondaryButton
            onClick={openCreateRoute}
            disabled={busy}
            stableHeight={50}
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
            Start a new community
          </SecondaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
