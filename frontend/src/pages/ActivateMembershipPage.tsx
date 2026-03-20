import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { activateMembership, setAccessToken } from "../lib/api";

function card(): React.CSSProperties {
  return {
    maxWidth: 640,
    margin: "0 auto",
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: disabled ? "#93B7E3" : "#0B63D1",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 1000,
    border: "none",
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

function cleanGmfnId(value: string): string {
  return String(value || "")
    .replace(/^GMFN ID:\s*/i, "")
    .trim()
    .toUpperCase();
}

export default function ActivateMembershipPage() {
  const navigate = useNavigate();

  const [gmfnId, setGmfnId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleActivate(e?: React.FormEvent) {
    if (e) e.preventDefault();

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const safeGmfnId = cleanGmfnId(gmfnId);
      const safePassword = String(password || "");
      const safeConfirm = String(confirm || "");

      if (!safeGmfnId) {
        throw new Error("Enter your GMFN ID.");
      }

      if (!safePassword) {
        throw new Error("Enter your password.");
      }

      if (safePassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      if (safePassword !== safeConfirm) {
        throw new Error("Passwords do not match.");
      }

      const res = await activateMembership({
        gmfn_id: safeGmfnId,
        password: safePassword,
        confirm_password: safeConfirm,
      });

      if (res?.access_token) {
        setAccessToken(res.access_token);
        setMsg("Activation successful. Entering workspace...");
        setTimeout(() => {
          navigate("/app/dashboard", { replace: true });
        }, 600);
      } else {
        throw new Error(res?.detail || res?.message || "Activation failed.");
      }
    } catch (e: any) {
      setErr(String(e?.message || "Activation error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5FAFE",
        padding: "34px 22px",
        boxSizing: "border-box",
      }}
    >
      <div style={card()}>
        <div
          style={{
            fontSize: 32,
            lineHeight: 1.1,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Activate Membership
        </div>

        <div
          style={{
            marginTop: 12,
            color: "#5F768D",
            lineHeight: 1.75,
            fontSize: 15,
          }}
        >
          Use the GMFN ID issued after community approval to create your password
          and enter the workspace.
        </div>

        <div style={{ marginTop: 18, ...noticeStyle("info") }}>
          Enter only the raw GMFN ID, for example: <strong>GMFN-U-A66CF7C0</strong>
        </div>

        {err ? (
          <div style={{ marginTop: 16, ...noticeStyle("error") }}>{err}</div>
        ) : null}

        {msg ? (
          <div style={{ marginTop: 16, ...noticeStyle("success") }}>{msg}</div>
        ) : null}

        <form onSubmit={handleActivate} style={{ marginTop: 18 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <input
              placeholder="GMFN-U-XXXXXXXX"
              value={gmfnId}
              onChange={(e) => setGmfnId(cleanGmfnId(e.target.value))}
              style={inputStyle()}
            />

            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle()}
            />

            <input
              placeholder="Confirm Password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={inputStyle()}
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>
              {busy ? "Activating..." : "Activate & Enter"}
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
          <Link to="/login" style={secondaryLink()}>
            Go to Login
          </Link>

          <Link to="/welcome" style={secondaryLink()}>
            Back to Welcome
          </Link>
        </div>
      </div>
    </div>
  );
}