import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { EntryGuideLauncher } from "../components/EntryControls";
import {
  activateMembership,
  setAccessToken,
  setSelectedClanId,
} from "../lib/api";

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 24%), radial-gradient(circle at top right, rgba(74,132,214,0.18) 0%, rgba(74,132,214,0) 30%), radial-gradient(circle at bottom left, rgba(39,91,156,0.20) 0%, rgba(39,91,156,0) 32%), linear-gradient(180deg, #07101C 0%, #0B1F33 36%, #173654 70%, #26527C 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "22px",
    boxSizing: "border-box",
  };
}

function whiteCard(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.34)",
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)",
    boxShadow:
      "0 22px 56px rgba(5,16,38,0.26), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 22,
    overflow: "hidden",
  };
}

function innerPanel(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(245,249,253,0.68) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 20px rgba(10,24,49,0.06)",
    padding: 18,
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
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    width: "min(100%, 60%)",
    padding: "14px 18px",
    borderRadius: 16,
    border: "none",
    background: disabled
      ? "linear-gradient(180deg, #D7DEE8 0%, #C8D2DF 100%)"
      : "linear-gradient(180deg, #F6D77D 0%, #F3D06A 52%, #D9A941 100%)",
    color: disabled ? "#6B7B8D" : "#10253B",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.82 : 1,
    textAlign: "center",
    boxShadow: disabled
      ? "0 10px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.52)"
      : "0 16px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.56)",
    textShadow: disabled ? "none" : "0 1px 0 rgba(255,255,255,0.36)",
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    borderRadius: 999,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(229,237,249,0.96) 100%)",
    color: "#123055",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(16,37,59,0.12)",
    fontSize: 14,
    textAlign: "center",
    boxShadow:
      "0 10px 24px rgba(10,24,49,0.14), inset 0 1px 0 rgba(255,255,255,0.78)",
    textShadow: "0 1px 0 rgba(255,255,255,0.52)",
    cursor: "pointer",
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
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#1D4ED8",
    padding: 16,
    lineHeight: 1.75,
    fontSize: 14,
  };
}

function labelText(gold = false): React.CSSProperties {
  return {
    fontSize: 12,
    color: gold ? "#F3D06A" : "#64748B",
    fontWeight: 1000,
    letterSpacing: gold ? 3.6 : 0.2,
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
    return String(state?.request_id || searchParams.get("request_id") || "").trim();
  }, [state, searchParams]);

  const [gmfnId, setGmfnId] = useState(initialGmfnId);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const innerRailWidth = "min(100%, 760px)";

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

      if (!safeGmfnId) throw new Error("Enter your GMFN ID.");
      if (!safePassword) throw new Error("Enter your password.");
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

      if (accessToken) setAccessToken(accessToken);
      if (Number.isFinite(clanId) && clanId > 0) setSelectedClanId(clanId);

      if (!accessToken) {
        throw new Error(
          res?.detail ||
            res?.message ||
            "Activation completed without an access token."
        );
      }

      setMsg("Activation successful. Entering workspace...");
      navigate("/app/dashboard", { replace: true });
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
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          display: "grid",
          gap: 18,
          position: "relative",
        }}
      >
        <div style={{ display: "grid", gap: 18, width: innerRailWidth, margin: "0 auto" }}>
            <div style={whiteCard()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: guideOpen ? 14 : 0,
                }}
              >
                <EntryGuideLauncher
                  label="About"
                  text="Activation Guide"
                  onClick={() => setGuideOpen((current) => !current)}
                />
              </div>

              {guideOpen ? (
                <div style={{ ...innerPanel(), marginBottom: 16 }}>
                  <div style={{ ...labelText(true), color: "#B88721", marginBottom: 10 }}>
                    Activation guide
                  </div>
                  <div style={{ marginBottom: 8, color: "#10253B", fontWeight: 1000, fontSize: 22 }}>
                    Approved member path
                  </div>
                  <div style={helperText()}>
                    Use this page only when your identity has already been approved and you are creating your first password for entry into the workspace.
                  </div>
                </div>
              ) : null}

              {err ? <div style={{ marginBottom: 16, ...noticeStyle("error") }}>{err}</div> : null}
              {msg ? <div style={{ marginBottom: 16, ...noticeStyle("success") }}>{msg}</div> : null}
              {!initialGmfnId && !msg ? (
                <div style={{ marginBottom: 16, ...noticeStyle("warning") }}>
                  If you have been approved but do not yet have your GMFN ID in hand, return to the approval path and check the latest status first.
                </div>
              ) : null}

              <form onSubmit={handleActivate}>
                <div style={innerPanel()}>
                  <div style={{ ...labelText(), marginBottom: 14 }}>Activation form</div>

                  <div style={{ marginBottom: 10, color: "#0B1F33", fontWeight: 1000, fontSize: 22 }}>
                    Finish your member activation
                  </div>

                  {(initialGmfnId || requestId) && (
                    <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {initialGmfnId ? (
                        <div style={{ ...secondaryBtn(), width: "auto", cursor: "default" }}>
                          GMFN ID detected
                        </div>
                      ) : null}
                      {requestId ? (
                        <div style={{ ...secondaryBtn(), width: "auto", cursor: "default" }}>
                          Request ID: {requestId}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div style={{ marginBottom: 16, ...helperText() }}>
                    Enter only the raw GMFN ID, for example: <strong>GMFN-U-A66CF7C0</strong>
                  </div>

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
                        placeholder="Confirm password"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        style={{ ...inputStyle(), marginTop: 8 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
                    <button type="submit" disabled={!canSubmit} style={primaryBtn(!canSubmit)}>
                      {busy ? "Activating..." : "Activate membership"}
                    </button>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                    <button type="button" onClick={clearForm} style={secondaryBtn()}>
                      Clear password fields
                    </button>
                  </div>
                </div>
              </form>
            </div>
        </div>
      </div>
    </div>
  );
}
