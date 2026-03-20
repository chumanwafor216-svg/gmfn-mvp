import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { activateApprovedMember } from "../lib/api";

function pageCard(): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 18,
    background: "#fff",
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    boxSizing: "border-box",
    fontSize: 14,
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
  };
}

export default function MemberActivationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state =
    (location.state as {
      gmfn_id?: string;
      request_id?: string;
    }) || {};

  const [form, setForm] = useState({
    gmfn_id: state.gmfn_id || "",
    request_id: state.request_id || "",
    password: "",
    confirm_password: "",
  });

  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.gmfn_id) {
      alert("GMFN ID is required");
      return;
    }

    if (!form.password || form.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirm_password) {
      alert("Passwords do not match");
      return;
    }

    try {
      setBusy(true);
      await activateApprovedMember(form);
      navigate("/app/dashboard");
    } catch (err: any) {
      alert(err?.message || "Activation failed");
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
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Complete Membership Activation</h2>

        <button type="button" onClick={goBack} style={actionBtn(false)}>
          ← Back
        </button>
      </div>

      <div style={pageCard()}>
        <p style={{ marginTop: 0 }}>
          Use your approved GMFN ID to complete onboarding.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>GMFN ID</label>
            <br />
            <input
              value={form.gmfn_id}
              onChange={(e) => setForm({ ...form, gmfn_id: e.target.value })}
              placeholder="Enter GMFN ID"
              style={inputStyle()}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Password</label>
            <br />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Create password"
              style={inputStyle()}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Confirm Password</label>
            <br />
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) =>
                setForm({ ...form, confirm_password: e.target.value })
              }
              placeholder="Confirm password"
              style={inputStyle()}
            />
          </div>

          <button type="submit" disabled={busy} style={actionBtn(true, busy)}>
            {busy ? "Activating..." : "Activate Membership"}
          </button>
        </form>
      </div>
    </div>
  );
}