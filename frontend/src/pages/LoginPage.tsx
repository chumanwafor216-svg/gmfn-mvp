import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import { getAccessToken, getMe, loginAndStore } from "../lib/api";

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at top, rgba(47,103,196,0.16) 0%, rgba(16,37,59,0.00) 32%), linear-gradient(180deg, #0C1F33 0%, #143454 62%, #183F66 100%)",
    padding: "24px 18px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 820,
    padding: 30,
    borderRadius: 24,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 18,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    outline: "none",
    fontSize: 14,
    color: "#0B1F33",
    background: "#FFFFFF",
    boxSizing: "border-box",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    border: "none",
    background: disabled ? "#93B7E3" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.82 : 1,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: "#FFFFFF",
    color: "#0B1F33",
    fontWeight: 1000,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 15,
  };
}

function secondaryLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
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

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "#EAF2FF" : "#F8FAFC",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(11,31,51,0.08)",
    color: primary ? "#0B63D1" : "#475569",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
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

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const routeState =
    (location.state as {
      from?: { pathname?: string; search?: string };
      create_entry?: {
        clan_name?: string;
        clan_description?: string;
        email?: string;
      };
    }) || {};

  const founderContext = routeState.create_entry || {};
  const founderEmail = safeStr(founderContext.email || "");
  const founderCommunityName = safeStr(founderContext.clan_name || "");
  const forceLogin = searchParams.get("force") === "1";

  const redirectTarget = useMemo(() => {
    if (routeState.from?.pathname && routeState.from.pathname !== "/login") {
      return `${routeState.from.pathname}${routeState.from.search || ""}`;
    }
    return "/app/dashboard";
  }, [routeState]);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [email, setEmail] = useState(founderEmail || "admin@test.com");
  const [password, setPassword] = useState("pass1234");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
      document.title = "GMFN | Sign In";
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) return;
        if (forceLogin) return;

        const me = await getMe();
        if (me?.id) {
          nav(redirectTarget, { replace: true });
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

    try {
      const u = safeStr(email);
      const p = String(password || "");

      if (!u) throw new Error("Enter your email.");
      if (!p) throw new Error("Enter your password.");

      await loginAndStore(u, p);

      setMsg("Sign-in successful. Opening your workspace...");
      setTimeout(() => {
        nav(redirectTarget, { replace: true });
      }, 500);
    } catch (e: any) {
      setErr(
        String(
          e?.message ||
            "Unable to sign in. Confirm that your account is already active."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  function clearBrowserSession() {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("gmfn_selected_clan_id");
      setMsg("Old session cleared from this browser.");
      setErr(null);
    } catch {
      setMsg("Browser session cleared.");
      setErr(null);
    }
  }

  return (
    <div style={pageShell()}>
      <div style={{ width: "100%", maxWidth: 820, display: "grid", gap: 18 }}>
        <div
          style={{
            ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
            maxWidth: "100%",
          }}
        >
          <div style={labelText()}>Sign in</div>

          <div
            style={{
              marginTop: 10,
              fontSize: isCompact ? 30 : 36,
              fontWeight: 1000,
              color: "#F8FBFF",
              lineHeight: 1.08,
              maxWidth: 760,
            }}
          >
            Sign in to continue
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#D7E3F1",
              lineHeight: 1.8,
              fontSize: 15,
              maxWidth: 820,
            }}
          >
            Enter your email and password to open your workspace.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(true)}>Existing member</span>
            {founderCommunityName ? (
              <span style={badge(false)}>Community: {founderCommunityName}</span>
            ) : null}
            {founderEmail ? (
              <span style={badge(false)}>Email: {founderEmail}</span>
            ) : null}
          </div>
        </div>

        {founderEmail || founderCommunityName ? (
          <div style={{ ...softCard("#FFFFFF"), maxWidth: "100%" }}>
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

        {forceLogin && getAccessToken() ? (
          <div style={{ ...noticeStyle("warning"), maxWidth: "100%" }}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>
              You already have a saved session on this device
            </div>
            <div>
              Sign in below to continue, or clear the old session first.
            </div>
          </div>
        ) : null}

        <div style={{ ...pageCard(), maxWidth: "100%" }}>
          <div style={{ ...noticeStyle("warning"), marginBottom: 16 }}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>
              Already approved but not yet activated?
            </div>
            <div>
              Use <strong>Activate Membership</strong> first.
            </div>
          </div>

          <div style={{ ...noticeStyle("info"), marginBottom: 16 }}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>
              Test details for this environment
            </div>
            <div>
              Email: <strong>admin@test.com</strong>
            </div>
            <div>
              Password: <strong>pass1234</strong>
            </div>
          </div>

          {err ? (
            <div style={{ marginBottom: 16, ...noticeStyle("error") }}>{err}</div>
          ) : null}

          {msg ? (
            <div style={{ marginBottom: 16, ...noticeStyle("success") }}>{msg}</div>
          ) : null}

          <form onSubmit={onSubmit}>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              }}
            >
              <div>
                <div style={labelText()}>Email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="username"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div>
                <div style={labelText()}>Password</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              <button type="submit" disabled={busy} style={primaryBtn(busy)}>
                {busy ? "Signing in..." : "Sign in"}
              </button>

              <button
                type="button"
                onClick={clearBrowserSession}
                style={secondaryBtn()}
              >
                Clear Old Session
              </button>
            </div>
          </form>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <OriginLink to="/activate-membership" style={secondaryLink()}>
              Activate Membership
            </OriginLink>

            <OriginLink to="/welcome" style={secondaryLink()}>
              Welcome
            </OriginLink>
          </div>
        </div>
      </div>
    </div>
  );
}
