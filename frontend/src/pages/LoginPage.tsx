import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAccessToken, getMe, loginAndStore } from "../lib/api";

function card(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 560,
    padding: 30,
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
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

export default function LoginPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("pass1234");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) return;
        const me = await getMe();
        if (me?.id) {
          nav("/app/dashboard", { replace: true });
        }
      } catch {
        // ignore stale token during test phase
      }
    })();
  }, [nav]);

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const u = String(email || "").trim();
      const p = String(password || "");

      if (!u) throw new Error("Enter your email.");
      if (!p) throw new Error("Enter your password.");

      await loginAndStore(u, p);

      setMsg("Sign-in successful. Opening workspace...");
      setTimeout(() => {
        nav("/app/dashboard", { replace: true });
      }, 500);
    } catch (e: any) {
      setErr(
        String(
          e?.message ||
            "Unable to sign in. Confirm the email or GMFN membership has been activated."
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
      setMsg("Old test session cleared from browser.");
      setErr(null);
    } catch {
      setMsg("Browser session cleared.");
      setErr(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#EEF5FB",
        padding: "24px 18px",
        boxSizing: "border-box",
      }}
    >
      <div style={card()}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 1000,
            color: "#0B1F33",
            lineHeight: 1.1,
          }}
        >
          GMFN Sign In
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#5F768D",
            lineHeight: 1.75,
            fontSize: 15,
          }}
        >
          Sign in with your approved email and password. If your community has
          already approved you and you have been issued a GMFN ID, activate your
          membership first before signing in.
        </div>

        <div style={{ marginTop: 18, ...noticeStyle("warning") }}>
          <div style={{ fontWeight: 1000, marginBottom: 8 }}>
            Approved members
          </div>
          <div>
            If you have already been approved through the join request process,
            use <strong>Activate Membership</strong> first. That step will bind
            your GMFN ID to your password and open your entry path into the
            workspace.
          </div>
        </div>

        <div style={{ marginTop: 16, ...noticeStyle("info") }}>
          <div style={{ fontWeight: 1000, marginBottom: 8 }}>
            Current test defaults
          </div>
          <div>
            Email: <strong>admin@test.com</strong>
          </div>
          <div>
            Password: <strong>pass1234</strong>
          </div>
        </div>

        {err ? (
          <div style={{ marginTop: 16, ...noticeStyle("error") }}>{err}</div>
        ) : null}

        {msg ? (
          <div style={{ marginTop: 16, ...noticeStyle("success") }}>{msg}</div>
        ) : null}

        <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="username"
              style={inputStyle()}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              style={inputStyle()}
            />
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>
              {busy ? "Signing in..." : "Enter Workspace"}
            </button>

            <button
              type="button"
              onClick={clearBrowserSession}
              style={{
                ...primaryBtn(false),
                background: "#FFFFFF",
                color: "#0B1F33",
                border: "1px solid rgba(11,31,51,0.10)",
              }}
            >
              Clear Old Test Session
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
          <Link to="/activate" style={secondaryLink()}>
            Activate Membership
          </Link>

          <Link to="/welcome" style={secondaryLink()}>
            Welcome
          </Link>

          <Link to="/cover" style={secondaryLink()}>
            Cover
          </Link>
        </div>
      </div>
    </div>
  );
}