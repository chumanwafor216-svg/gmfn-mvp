import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import {
  activateMembership,
  setAccessToken,
  setSelectedClanId,
} from "../lib/api";

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(47,103,196,0.14) 0%, rgba(16,37,59,0.00) 34%), linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 55%, #FFFFFF 100%)",
    padding: "34px 22px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: disabled ? "#A9C4EE" : "#1D4ED8",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 1000,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.82 : 1,
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

function noticeStyle(kind: "success" | "error" | "info" | "warning"): React.CSSProperties {
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

  if (kind === "warning") {
    return {
      borderRadius: 16,
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      color: "#92400E",
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
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "#EAF2FF" : "#F8FAFC",
    border: primary
      ? "1px solid rgba(29,78,216,0.16)"
      : "1px solid rgba(11,31,51,0.08)",
    color: primary ? "#1D4ED8" : "#475569",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
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
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const state = (location.state as { gmfn_id?: string; request_id?: string | number } | null) || null;

  const initialGmfnId = useMemo(() => {
    return cleanGmfnId(
      String(
        state?.gmfn_id ||
          searchParams.get("gmfn_id") ||
          searchParams.get("id") ||
          ""
      )
    );
  }, [state, searchParams]);

  const requestId = useMemo(() => {
    return String(
      state?.request_id ||
        searchParams.get("request_id") ||
        ""
    ).trim();
  }, [state, searchParams]);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [gmfnId, setGmfnId] = useState(initialGmfnId);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
      document.title = "GSN | Activate Membership";
    }
  }, []);

  useEffect(() => {
    setGmfnId(initialGmfnId);
  }, [initialGmfnId]);

  const canSubmit = Boolean(
    cleanGmfnId(gmfnId) &&
      password &&
      confirm &&
      password === confirm &&
      password.length >= 6 &&
      !busy
  );

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

      const accessToken = String(
        res?.access_token || res?.token || res?.data?.access_token || ""
      ).trim();

      const clanId = Number(
        res?.clan_id ?? res?.data?.clan_id ?? res?.community_id ?? 0
      );

      if (accessToken) {
        setAccessToken(accessToken);
      }

      if (Number.isFinite(clanId) && clanId > 0) {
        setSelectedClanId(clanId);
      }

      if (accessToken) {
        setMsg("Activation successful. Entering workspace...");
        setTimeout(() => {
          navigate("/app/dashboard", { replace: true });
        }, 600);
      } else {
        throw new Error(
          res?.detail ||
            res?.message ||
            "Activation completed without an access token."
        );
      }
    } catch (e: any) {
      setErr(String(e?.message || "Activation error"));
    } finally {
      setBusy(false);
    }
  }

  function clearForm() {
    setPassword("");
    setConfirm("");
    setErr(null);
    setMsg(null);
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
        <div
          style={pageCard(
            "linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)"
          )}
        >
          <div style={labelText()}>Approved member route</div>

          <div
            style={{
              marginTop: 10,
              fontSize: isCompact ? 30 : 36,
              lineHeight: 1.08,
              fontWeight: 1000,
              color: "#F8FBFF",
              maxWidth: 760,
            }}
          >
            Activate membership and enter the workspace.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#D7E3F1",
              lineHeight: 1.75,
              fontSize: 15,
              maxWidth: 840,
            }}
          >
            Use the GMFN ID issued after community approval to create your
            password and enter the workspace properly.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(true)}>Activation route</span>
            {initialGmfnId ? <span style={badge(false)}>GMFN ID detected</span> : null}
            {requestId ? <span style={badge(false)}>Request ID: {requestId}</span> : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1.02fr 0.98fr",
            gap: 18,
          }}
        >
          <div style={pageCard()}>
            <div style={labelText()}>Activation form</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 24,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              Finish your member activation
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              Enter only the raw GMFN ID, for example: <strong>GMFN-U-A66CF7C0</strong>
            </div>

            {initialGmfnId ? (
              <div style={{ marginTop: 16, ...noticeStyle("info") }}>
                Your GMFN ID was carried into this page automatically. Confirm it,
                set your password, and continue.
              </div>
            ) : (
              <div style={{ marginTop: 16, ...noticeStyle("warning") }}>
                If you have been approved but do not yet have your GMFN ID in hand,
                return to the approval page and check the latest status first.
              </div>
            )}

            {err ? (
              <div style={{ marginTop: 16, ...noticeStyle("error") }}>{err}</div>
            ) : null}

            {msg ? (
              <div style={{ marginTop: 16, ...noticeStyle("success") }}>{msg}</div>
            ) : null}

            <form onSubmit={handleActivate} style={{ marginTop: 18 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={labelText()}>GMFN ID</div>
                  <input
                    placeholder="GMFN-U-XXXXXXXX"
                    value={gmfnId}
                    onChange={(e) => setGmfnId(cleanGmfnId(e.target.value))}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={labelText()}>Password</div>
                  <input
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={labelText()}>Confirm password</div>
                  <input
                    placeholder="Confirm Password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                <button type="submit" disabled={!canSubmit} style={primaryBtn(!canSubmit)}>
                  {busy ? "Activating..." : "Activate & Enter"}
                </button>

                <button
                  type="button"
                  onClick={clearForm}
                  style={secondaryBtn()}
                >
                  Clear password fields
                </button>
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={pageCard()}>
              <div style={labelText()}>What happens next</div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div style={softCard()}>
                  <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                    1. Password binding
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    Your approved GSN identity becomes linked to your password.
                  </div>
                </div>

                <div style={softCard()}>
                  <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                    2. Active access
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    The system opens your authenticated member route properly.
                  </div>
                </div>

                <div style={softCard()}>
                  <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                    3. Workspace entry
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    After activation, you enter the dashboard and continue from the authenticated flow.
                  </div>
                </div>
              </div>
            </div>

            <div style={pageCard()}>
              <div style={labelText()}>Support links</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                After activation, GSN can also help turn savings, repayment,
                and business intentions into steadier follow-through inside the
                member workspace.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <OriginLink to="/guide" style={secondaryLink()}>
                  Open My GSN and I
                </OriginLink>

                <OriginLink to="/app/dashboard#focus-commitments" style={secondaryLink()}>
                  Open Commitment Builder
                </OriginLink>

                <OriginLink to="/login" style={secondaryLink()}>
                  Go to Login
                </OriginLink>

                <OriginLink to="/welcome" style={secondaryLink()}>
                  Back to Welcome
                </OriginLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



