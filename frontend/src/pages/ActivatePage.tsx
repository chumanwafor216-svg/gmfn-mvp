import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { activateMembership } from "../lib/api";

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "#F8FBFF",
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

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
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

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
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

export default function ActivatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const presetGmfnId = useMemo(() => {
    return String(
      searchParams.get("gmfn_id") || searchParams.get("gmfnId") || ""
    )
      .trim()
      .toUpperCase();
  }, [searchParams]);

  const [gmfnId, setGmfnId] = useState(presetGmfnId);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setErr(null);
    setSuccess(null);

    try {
      const safeGmfnId = String(gmfnId || "").trim().toUpperCase();
      const safePassword = String(password || "");
      const safeConfirmPassword = String(confirmPassword || "");

      if (!safeGmfnId) {
        throw new Error("Enter your GMFN ID.");
      }

      if (!safePassword) {
        throw new Error("Enter your password.");
      }

      if (safePassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      if (safePassword !== safeConfirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const res = await activateMembership({
        gmfn_id: safeGmfnId,
        password: safePassword,
        confirm_password: safeConfirmPassword,
      });

      if (!res?.access_token) {
        throw new Error(res?.message || "Unable to activate account.");
      }

      localStorage.setItem("access_token", res.access_token);
      setSuccess("Activation successful. Entering workspace...");

      setTimeout(() => {
        navigate("/app/dashboard", { replace: true });
      }, 500);
    } catch (e: any) {
      setErr(String(e?.message || "Unable to activate account."));
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
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ ...card(), padding: 30 }}>
          <div
            style={{
              fontSize: 42,
              lineHeight: 1.08,
              fontWeight: 1000,
              color: "#0B1F33",
              maxWidth: 760,
            }}
          >
            Activate Your GMFN Access
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 18,
              lineHeight: 1.8,
              color: "#35516B",
              maxWidth: 940,
            }}
          >
            This step is only for applicants who have already been admitted by a
            community and have received a GMFN identity.
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "0.95fr 1.05fr",
            gap: 18,
          }}
        >
          <div style={card()}>
            <div style={labelText()}>ACTIVATION INFORMATION</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 22,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              What activation means
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#6B7A88",
                lineHeight: 1.8,
                fontSize: 15,
              }}
            >
              Your approval by the community and the issuance of your GMFN ID is
              what opens the way into the system. This page completes that
              process by allowing you to set your password and activate access.
            </div>

            <div style={{ marginTop: 18, ...softCard() }}>
              <div
                style={{
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 15,
                }}
              >
                Institutional identity
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.75,
                  fontSize: 14,
                }}
              >
                GMFN ID is not casual self-registration. It is the institutional
                identity issued after trust approval. That is why this page
                comes after admission, not before it.
              </div>
            </div>

            <div style={{ marginTop: 18, ...softCard() }}>
              <div
                style={{
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 15,
                }}
              >
                GMFN ID
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: gmfnId ? "#0B1F33" : "#64748B",
                  lineHeight: 1.7,
                  fontSize: 14,
                  wordBreak: "break-word",
                  fontWeight: 900,
                }}
              >
                {gmfnId || "Enter the GMFN ID issued to you after approval."}
              </div>
            </div>
          </div>

          <div style={card()}>
            <div style={labelText()}>ACTIVATION FORM</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 22,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Complete activation
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#6B7A88",
                lineHeight: 1.8,
                fontSize: 15,
              }}
            >
              Confirm your issued GMFN identity and create the password you will
              use to enter your workspace.
            </div>

            <div style={{ marginTop: 18, ...noticeStyle("info") }}>
              Use the GMFN ID that was issued after community approval.
            </div>

            {err ? (
              <div style={{ marginTop: 18, ...noticeStyle("error") }}>{err}</div>
            ) : null}

            {success ? (
              <div style={{ marginTop: 18, ...noticeStyle("success") }}>
                {success}
              </div>
            ) : null}

            <form onSubmit={onSubmit}>
              <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                <input
                  value={gmfnId}
                  onChange={(e) => setGmfnId(e.target.value.toUpperCase())}
                  placeholder="GMFN ID"
                  style={inputStyle()}
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  style={inputStyle()}
                />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  style={inputStyle()}
                />
              </div>

              <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                <button type="submit" disabled={busy} style={primaryBtn(busy)}>
                  {busy ? "Activating..." : "Activate Access"}
                </button>

                <Link to="/login" style={secondaryBtn()}>
                  I already activated — Sign in
                </Link>
              </div>
            </form>
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
          <Link to="/welcome" style={secondaryLink()}>
            Back to Welcome
          </Link>

          <Link to="/cover" style={secondaryLink()}>
            Back to Cover
          </Link>
        </div>
      </div>
    </div>
  );
}