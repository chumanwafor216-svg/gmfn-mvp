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
      "radial-gradient(circle at 84% 8%, rgba(84,123,169,0.12) 0%, rgba(84,123,169,0) 28%), radial-gradient(circle at 18% 88%, rgba(58,92,134,0.14) 0%, rgba(58,92,134,0) 30%), linear-gradient(180deg, #06111C 0%, #0A1B2B 42%, #102A43 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "22px",
    boxSizing: "border-box",
  };
}

function whiteCard(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(214,226,239,0.34)",
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(231,238,247,0.96) 56%, rgba(212,223,237,0.92) 100%)",
    boxShadow:
      "0 28px 66px rgba(5,16,38,0.34), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 22,
    overflow: "hidden",
  };
}

function innerPanel(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(250,252,254,0.82) 0%, rgba(235,241,247,0.70) 100%)",
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
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "none",
    outlineOffset: 4,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    ...stableTapStyle(),
    width: "min(100%, 60%)",
    padding: "14px 18px",
    borderRadius: 16,
    border: disabled
      ? "1px solid rgba(161,179,199,0.48)"
      : "1px solid rgba(82,128,186,0.62)",
    background: disabled
      ? "linear-gradient(180deg, #D7DEE8 0%, #C8D2DF 100%)"
      : "linear-gradient(180deg, #2D6AA3 0%, #235784 52%, #173E63 100%)",
    color: disabled ? "#6B7B8D" : "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.82 : 1,
    textAlign: "center",
    boxShadow: disabled
      ? "0 10px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.52)"
      : "0 20px 36px rgba(1,13,32,0.28), inset 0 1px 0 rgba(196,222,247,0.34), inset 0 -8px 12px rgba(8,25,43,0.20)",
    textShadow: "none",
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    ...stableTapStyle(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    borderRadius: 999,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(229,237,249,0.98) 100%)",
    color: "#123055",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(16,37,59,0.12)",
    fontSize: 14,
    textAlign: "center",
    boxShadow:
      "0 14px 28px rgba(10,24,49,0.16), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -6px 10px rgba(120,142,170,0.10)",
    textShadow: "0 1px 0 rgba(255,255,255,0.52)",
    cursor: "pointer",
  };
}

function guardButtonPress(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onMouseDown: guardButtonPress,
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
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      {...buttonGuardProps()}
                      style={primaryBtn(!canSubmit)}
                    >
                      {busy ? "Activating..." : "Activate membership"}
                    </button>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={clearForm}
                      {...buttonGuardProps()}
                      style={secondaryBtn()}
                    >
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
