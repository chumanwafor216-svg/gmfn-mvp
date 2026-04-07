import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Mark from "../assets/gmfn-mark.svg";
import Wordmark from "../assets/gmfn-wordmark.svg";

function topPattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F7FAFD"/>
    <g fill="none" stroke="#C5D7EB" stroke-opacity="0.52" stroke-width="2">
      <path d="M80 160 C180 90, 280 90, 380 160 S580 230, 690 150" />
      <path d="M920 160 C1020 90, 1120 90, 1220 160 S1420 230, 1520 150" />
    </g>
    <g fill="#D6AF47" fill-opacity="0.95">
      <path d="M80 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M180 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M280 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M380 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M510 205 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M650 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>

      <path d="M920 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1020 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1120 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1220 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1350 205 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1490 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
    </g>
  </svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 24,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 18,
  };
}

function button(primary?: boolean): React.CSSProperties {
  return {
    padding: "15px 24px",
    borderRadius: 16,
    border: primary ? "none" : "1px solid #D7E3F0",
    background: primary ? "#0B1F33" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 16,
    cursor: "pointer",
    minWidth: 220,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5B7693",
    fontWeight: 1000,
    letterSpacing: 1,
    textTransform: "uppercase",
  };
}

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

export default function RegisterPage() {
  const nav = useNavigate();
  const location = useLocation();
  const pattern = topPattern();

  const state =
    (location.state as {
      create_entry?: {
        clan_name?: string;
        clan_description?: string;
        email?: string;
      };
    }) || {};

  const createEntry = state.create_entry || {};

  const communityName = safeStr(createEntry.clan_name);
  const communityDescription = safeStr(createEntry.clan_description);
  const founderEmail = safeStr(createEntry.email);
  const hasCreateEntry = !!communityName || !!communityDescription || !!founderEmail;

  function continueToLogin() {
    nav("/login", {
      state: {
        create_entry: createEntry,
      },
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FBFE" }}>
      <div
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderBottom: "1px solid rgba(11,31,51,0.06)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 38px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <img src={Mark} alt="GSN mark" style={{ width: 36, height: 36 }} />
            <img src={Wordmark} alt="GSN wordmark" style={{ height: 30, width: "auto" }} />
          </div>

          <div style={sectionLabel()}>Founder registration</div>

          <h1
            style={{
              marginTop: 12,
              marginBottom: 16,
              fontSize: 54,
              lineHeight: 1.08,
              color: "#0B1F33",
              fontWeight: 1000,
              maxWidth: 860,
              letterSpacing: -1,
            }}
          >
            Founder registration should follow the public create entry, not replace it.
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 21,
              lineHeight: 1.76,
              color: "#48627C",
              maxWidth: 980,
            }}
          >
            This page is the founder registration handoff. It should confirm the
            community details already entered and route you onward without becoming a
            second create form.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div style={pageCard()}>
            <div style={sectionLabel()}>Create entry summary</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 28,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              {hasCreateEntry ? "Your public create entry is captured." : "No create entry details detected yet."}
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#5F768D",
                lineHeight: 1.85,
                fontSize: 15,
              }}
            >
              Review the community details below, then continue through the secure
              access route that already exists in this build.
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <div style={softCard()}>
                <div style={{ ...sectionLabel(), color: "#64748B", letterSpacing: 0.4 }}>
                  Community name
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                  }}
                >
                  {communityName || "Not yet provided"}
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ ...sectionLabel(), color: "#64748B", letterSpacing: 0.4 }}>
                  Short description
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F768D",
                    lineHeight: 1.8,
                    fontSize: 14,
                  }}
                >
                  {communityDescription || "No short description was passed from create entry."}
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ ...sectionLabel(), color: "#64748B", letterSpacing: 0.4 }}>
                  Founder email
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                  }}
                >
                  {founderEmail || "Not yet provided"}
                </div>
              </div>
            </div>
          </div>

          <div style={pageCard()}>
            <div style={sectionLabel()}>Next step</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 24,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Continue through secure access routing
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F768D",
                lineHeight: 1.85,
              }}
            >
              In this build, founder continuation should move through the secure
              access route that already exists, rather than duplicating a second
              public registration workflow here.
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              <button onClick={continueToLogin} style={button(true)}>
                Continue to Sign In
              </button>

              <Link to="/activate-membership" style={button(false)}>
                Activate Approved Membership
              </Link>

              <Link to="/create" style={button(false)}>
                Back to Create Entry
              </Link>

              <Link to="/welcome" style={button(false)}>
                Back to Welcome
              </Link>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 16,
                background: "#FFFDF5",
                border: "1px solid rgba(214,175,71,0.25)",
                color: "#5F768D",
                lineHeight: 1.8,
                fontSize: 14,
              }}
            >
              This page should remain a clean handoff page. Community creation belongs
              to public create entry, and private community control belongs after
              proper access.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            ...pageCard(),
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
              Public create entry first
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              Founder details should begin in the public create page, not be scattered
              across multiple public surfaces.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
              Secure access next
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              After public create entry, secure sign-in and activation routes take over
              before private community management appears.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
              No duplicate public workflow
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              This page should confirm and route, not ask for the same community details
              all over again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}