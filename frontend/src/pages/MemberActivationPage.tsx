import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { activateApprovedMember } from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 20,
    background: bg,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function inputStyle(readOnly = false): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    boxSizing: "border-box",
    fontSize: 14,
    background: readOnly ? "#F8FAFC" : "#FFFFFF",
    color: readOnly ? "#475569" : "#0B1F33",
    outline: "none",
  };
}

function actionBtn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.75 : 1,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
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

      setSuccess("Membership activated successfully.");
      navigate("/app/build-first-circle", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Activation failed.");
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/welcome");
  }

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Complete Membership Activation"
        title="Complete Membership Activation"
        subtitle="Finish your approved entry by confirming your identity reference and creating your password."
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Activation</div>

        <div
          style={{
            marginTop: 8,
            fontSize: 28,
            fontWeight: 1000,
            color: "#F8FBFF",
            lineHeight: 1.15,
          }}
        >
          Complete your approved membership
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#D7E3F1",
            lineHeight: 1.8,
          }}
        >
          Use your approved GMFN ID or request ID to finish activation and move into
          your personal pages.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={goBack} style={actionBtn(false)}>
            ? Back
          </button>

          <OriginLink to="/welcome" style={actionBtn(false)}>
            Welcome
          </OriginLink>
        </div>
      </div>

      {error ? (
        <div
          style={{
            ...pageCard("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            ...pageCard("#ECFDF5"),
            marginTop: 18,
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {success}
        </div>
      ) : null}

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                GMFN ID
              </div>
              <input
                value={form.gmfn_id}
                onChange={(e) => setForm({ ...form, gmfn_id: e.target.value })}
                placeholder="Enter GMFN ID"
                style={inputStyle(false)}
              />
            </div>

            <div>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                Request ID
              </div>
              <input
                value={form.request_id}
                onChange={(e) => setForm({ ...form, request_id: e.target.value })}
                placeholder="Enter request ID if available"
                style={inputStyle(Boolean(initialRequestId))}
                readOnly={Boolean(initialRequestId)}
              />
            </div>

            <div>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                Password
              </div>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Create password"
                style={inputStyle(false)}
              />
            </div>

            <div>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                Confirm Password
              </div>
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) =>
                  setForm({ ...form, confirm_password: e.target.value })
                }
                placeholder="Confirm password"
                style={inputStyle(false)}
              />
            </div>

            <div
              style={{
                marginTop: 4,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={busy}
                style={actionBtn(true, busy)}
              >
                {busy ? "Activating..." : "Activate Membership"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}



