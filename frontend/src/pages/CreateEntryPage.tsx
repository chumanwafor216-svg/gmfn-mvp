import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: "#F5FAFE",
    padding: "34px 22px",
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

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 900,
    color: "#0B1F33",
    marginBottom: 6,
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
    background: "#FFFFFF",
    color: "#0B1F33",
  };
}

function textArea(): React.CSSProperties {
  return {
    ...input(),
    minHeight: 110,
    resize: "vertical",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.8 : 1,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
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

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

export default function CreateEntryPage() {
  const nav = useNavigate();

  const [communityName, setCommunityName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  const canContinue = !!safeStr(communityName) && !!safeStr(email);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue) return;

    nav("/register", {
      state: {
        create_entry: {
          clan_name: safeStr(communityName),
          clan_description: safeStr(description),
          email: safeStr(email),
        },
      },
    });
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 18 }}>
        <div
          style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
        >
          <div style={sectionLabel()}>Create entry</div>

          <div
            style={{
              marginTop: 10,
              fontSize: 30,
              fontWeight: 1000,
              color: "#0B1F33",
              lineHeight: 1.15,
            }}
          >
            Start a new community
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#64748B",
              lineHeight: 1.8,
              maxWidth: 760,
            }}
          >
            This is the public create entry. Start with a community name, add a
            short description, then continue into founder registration and
            activation.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <a
              href="/GSN_FINAL_WHITE.pdf"
              target="_blank"
              rel="noreferrer"
              style={secondaryBtn()}
            >
              Understand GSN first
            </a>

            <Link to="/welcome" style={secondaryBtn()}>
              Back
            </Link>

            <Link to="/login" style={secondaryBtn()}>
              Already have access?
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={pageCard()}>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={fieldLabel()}>Community name</div>
                <input
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  placeholder="Enter community name"
                  style={input()}
                />
              </div>

              <div>
                <div style={fieldLabel()}>Short description</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this community represents"
                  style={textArea()}
                />
              </div>

              <div>
                <div style={fieldLabel()}>Your email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={input()}
                />
              </div>

              <div style={{ marginTop: 4 }}>
                <button type="submit" style={primaryBtn(!canContinue)} disabled={!canContinue}>
                  Continue to founder registration
                </button>
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div style={softCard()}>
              <div style={sectionLabel()}>What happens next</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#475569",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                1. Start with the community details.
                <br />
                2. Continue into registration.
                <br />
                3. Complete activation.
                <br />
                4. Move into your personal surfaces.
              </div>
            </div>

            <div style={softCard()}>
              <div style={sectionLabel()}>Why this page exists</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#475569",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                This page is only for public create entry. It should not become a
                full community management page or a private control center.
              </div>
            </div>

            <div style={softCard()}>
              <div style={sectionLabel()}>Guide note</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#475569",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                The main guide is My GMFN and I inside the member flow. The PDF
                above is only a public fallback here.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}