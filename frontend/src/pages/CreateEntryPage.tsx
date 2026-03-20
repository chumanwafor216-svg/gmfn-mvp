import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
  };
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    border: "none",
    cursor: "pointer",
    fontSize: 15,
  };
}

export default function CreateEntryPage() {
  const nav = useNavigate();

  const [clanName, setClanName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clanName.trim()) return;
    if (!email.trim()) return;

    // TEMP FLOW (next step: connect backend)
    nav("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5FAFE",
        padding: "34px 22px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={card()}>
          <div style={{ fontSize: 28, fontWeight: 1000, color: "#0B1F33" }}>
            Create a Community
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#64748B",
              lineHeight: 1.7,
            }}
          >
            You are creating a new trust network. You will become the founding
            member and administrator of this community.
          </div>

          <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <input
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                placeholder="Community name"
                style={input()}
              />

              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Community description (optional)"
                style={input()}
              />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                style={input()}
              />
            </div>

            <div style={{ marginTop: 18 }}>
              <button type="submit" style={primaryBtn()}>
                Create Community
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
            <Link to="/welcome">Back</Link>
            <Link to="/login">Already have access?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}