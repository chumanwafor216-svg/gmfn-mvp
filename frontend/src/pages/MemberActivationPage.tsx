import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { EntryBackLink } from "../components/EntryControls";
import OriginLink from "../components/OriginLink";
import { activateApprovedMember, observeIdentityRisk } from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

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

function darkGuidePanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)",
    border: "1px solid rgba(16,37,59,0.16)",
    boxShadow:
      "0 18px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 18,
    position: "relative",
    overflow: "hidden",
  };
}

function topRailCard(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)",
    border: "1px solid rgba(16,37,59,0.16)",
    boxShadow:
      "0 18px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 18,
    position: "relative",
    overflow: "hidden",
  };
}

function guideButtonShell(): React.CSSProperties {
  return {
    display: "grid",
    justifyItems: "center",
    gap: 8,
  };
}

function guideAboutBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    minWidth: 36,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(243,208,106,0.32)",
    background:
      "linear-gradient(180deg, rgba(249,219,130,0.88) 0%, rgba(243,208,106,0.76) 58%, rgba(231,184,77,0.70) 100%)",
    boxShadow:
      "0 14px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -6px 10px rgba(125,85,10,0.10)",
    fontSize: 10.5,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: 0.8,
    color: "#10253B",
    textAlign: "center",
    textTransform: "uppercase",
    cursor: "pointer",
    textShadow: "0 1px 0 rgba(255,255,255,0.32)",
    transform: "translateY(0)",
  };
}

function guideMainBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 999,
    padding: "12px 20px",
    border: "1px solid rgba(243,208,106,0.32)",
    background:
      "linear-gradient(180deg, #F9DB82 0%, #F3D06A 52%, #E7B84D 100%)",
    boxShadow:
      "0 18px 30px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -8px 14px rgba(125,85,10,0.12)",
    whiteSpace: "nowrap",
    color: "#10253B",
    fontSize: 14.5,
    fontWeight: 900,
    textAlign: "center",
    cursor: "pointer",
    textShadow: "0 1px 0 rgba(255,255,255,0.34)",
    transform: "translateY(0)",
  };
}

function inputStyle(readOnly = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.18)",
    outline: "none",
    fontSize: 14,
    background: readOnly
      ? "linear-gradient(180deg, rgba(244,247,251,0.98) 0%, rgba(236,241,247,0.96) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
    color: readOnly ? "#475569" : "#0B1F33",
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
      : "0 18px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -8px 14px rgba(125,85,10,0.12)",
    textShadow: disabled ? "none" : "0 1px 0 rgba(255,255,255,0.36)",
    transform: "translateY(0)",
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
      "0 14px 24px rgba(10,24,49,0.16), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -6px 10px rgba(120,142,170,0.10)",
    textShadow: "0 1px 0 rgba(255,255,255,0.52)",
    cursor: "pointer",
    transform: "translateY(0)",
  };
}

function noticeStyle(kind: "success" | "error" | "warning"): React.CSSProperties {
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
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    color: "#92400E",
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

export default function MemberActivationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activated, setActivated] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const requestReady = useMemo(() => {
    return {
      gmfn_id: safeStr(form.gmfn_id).toUpperCase(),
      request_id: safeStr(form.request_id),
      password: form.password,
      confirm_password: form.confirm_password,
    };
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!requestReady.gmfn_id && !requestReady.request_id) {
      setError("GMFN ID or request ID is required.");
      return;
    }

    if (!requestReady.password || requestReady.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (requestReady.password !== requestReady.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setBusy(true);

      await activateApprovedMember({
        gmfn_id: requestReady.gmfn_id || null,
        request_id: requestReady.request_id || null,
        password: requestReady.password,
        confirm_password: requestReady.confirm_password,
      });

      await observeIdentityRisk().catch(() => null);

      setActivated(true);
      setSuccess(
        "Membership activated successfully. Your starter trust, onboarding proofs, and identity observation are now available for review."
      );
    } catch (err: any) {
      setError(err?.message || "Activation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={pageShell()}>
      <div style={{ width: "100%", maxWidth: 760, display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gap: 18, width: "min(100%, 760px)", margin: "0 auto" }}>
          <div style={whiteCard()}>
            <div style={{ ...topRailCard(), marginBottom: 16 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 28%), radial-gradient(circle at bottom, rgba(123,181,255,0.10) 0%, rgba(123,181,255,0) 30%)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: "56px 1fr auto",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <EntryBackLink to="/welcome" />
                </div>

                <div
                  style={{
                    textAlign: "center",
                    fontSize: 16,
                    color: "#F3D06A",
                    fontWeight: 1000,
                    letterSpacing: 4.2,
                    textTransform: "uppercase",
                    textShadow:
                      "0 1px 0 rgba(255,255,255,0.16), 0 10px 24px rgba(0,0,0,0.18)",
                  }}
                >
                  GSN
                </div>
                <div style={guideButtonShell()}>
                  <button
                    type="button"
                    onClick={() => setGuideOpen((current) => !current)}
                    style={guideAboutBtn()}
                  >
                    About
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuideOpen((current) => !current)}
                    style={guideMainBtn()}
                  >
                    Activation Guide
                  </button>
                </div>
              </div>
            </div>

            {guideOpen ? (
              <div style={{ ...innerPanel(), marginBottom: 16 }}>
                <div style={{ ...labelText(true), color: "#B88721", marginBottom: 10 }}>
                  Activation guide
                </div>
                <div
                  style={{
                    marginBottom: 8,
                    color: "#10253B",
                    fontWeight: 1000,
                    fontSize: 22,
                  }}
                >
                  Approved member path
                </div>
                <div style={helperText()}>
                  Use this page only when your identity has already been approved and you are creating your first password for entry into the workspace.
                </div>
              </div>
            ) : null}

            {error ? (
              <div style={{ marginBottom: 16, ...noticeStyle("error") }}>{error}</div>
            ) : null}

            {success ? (
              <div style={{ marginBottom: 16, ...noticeStyle("success") }}>{success}</div>
            ) : null}

            {!initialGmfnId && !initialRequestId && !success ? (
              <div style={{ marginBottom: 16, ...noticeStyle("warning") }}>
                If you have been approved but do not yet have your GMFN ID or request ID in hand, return to the approval path and check the latest status first.
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <div style={innerPanel()}>
                <div style={{ ...labelText(), marginBottom: 14 }}>Activation form</div>

                <div
                  style={{
                    marginBottom: 10,
                    color: "#0B1F33",
                    fontWeight: 1000,
                    fontSize: 22,
                  }}
                >
                  Finish your member activation
                </div>

                {(initialGmfnId || initialRequestId) && (
                  <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {initialGmfnId ? (
                      <div style={{ ...secondaryBtn(), width: "auto", cursor: "default" }}>
                        GMFN ID detected
                      </div>
                    ) : null}
                    {initialRequestId ? (
                      <div style={{ ...secondaryBtn(), width: "auto", cursor: "default" }}>
                        Request ID: {initialRequestId}
                      </div>
                    ) : null}
                  </div>
                )}

                <div style={{ marginBottom: 16, ...helperText() }}>
                  Enter the approved GMFN ID or the request ID tied to your membership, then create your password.
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={labelText()}>GMFN ID</div>
                    <input
                      value={form.gmfn_id}
                      onChange={(e) => setForm({ ...form, gmfn_id: e.target.value })}
                      placeholder="Enter GMFN ID"
                      style={{ ...inputStyle(false), marginTop: 8 }}
                    />
                  </div>

                  <div>
                    <div style={labelText()}>Request ID</div>
                    <input
                      value={form.request_id}
                      onChange={(e) => setForm({ ...form, request_id: e.target.value })}
                      placeholder="Enter request ID if available"
                      style={{ ...inputStyle(Boolean(initialRequestId)), marginTop: 8 }}
                      readOnly={Boolean(initialRequestId)}
                    />
                  </div>

                  <div>
                    <div style={labelText()}>Password</div>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Create password"
                      style={{ ...inputStyle(false), marginTop: 8 }}
                    />
                  </div>

                  <div>
                    <div style={labelText()}>Confirm password</div>
                    <input
                      type="password"
                      value={form.confirm_password}
                      onChange={(e) =>
                        setForm({ ...form, confirm_password: e.target.value })
                      }
                      placeholder="Confirm password"
                      style={{ ...inputStyle(false), marginTop: 8 }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
                  <button
                    type="submit"
                    disabled={busy || activated}
                    style={primaryBtn(busy || activated)}
                  >
                    {busy ? "Activating..." : "Activate Membership"}
                  </button>
                </div>
              </div>
            </form>

            {activated ? (
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <OriginLink to="/app/notifications" style={secondaryBtn()}>
                  Review Notifications
                </OriginLink>
                <OriginLink to="/app/trust" style={secondaryBtn()}>
                  Review Trust
                </OriginLink>
                <OriginLink to="/app/build-first-circle" style={secondaryBtn()}>
                  Continue
                </OriginLink>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
