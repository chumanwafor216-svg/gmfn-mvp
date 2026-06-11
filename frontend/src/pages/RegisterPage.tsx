import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { PrimaryButton, StableCtaLink } from "../components/StableButton";

import Mark from "../assets/gmfn-mark.svg";
import Wordmark from "../assets/gmfn-wordmark.svg";

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

function registerIconText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 24
) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GsnLegacyIcon name={name} size={size} />
      <span>{label}</span>
    </span>
  );
}

function registerIconTile(name: GsnIconName, size = 54) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: `0 0 ${size}px`,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(232,240,249,0.82) 100%)",
        border: "1px solid rgba(11,31,51,0.10)",
        boxShadow:
          "0 16px 34px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.86)",
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(30, size - 14)} />
    </span>
  );
}

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

export default function RegisterPage() {
  const nav = useNavigate();
  const location = useLocation();

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
          background:
            "radial-gradient(circle at 14% 18%, rgba(214,175,71,0.15) 0%, rgba(214,175,71,0.00) 28%), radial-gradient(circle at 86% 4%, rgba(70,112,158,0.13) 0%, rgba(70,112,158,0.00) 28%), linear-gradient(180deg, #F8FBFF 0%, #EEF5FC 100%)",
          borderBottom: "1px solid rgba(11,31,51,0.06)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 38px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <img src={Mark} alt="GSN mark" style={{ width: 36, height: 36 }} />
            <img src={Wordmark} alt="GSN wordmark" style={{ height: 30, width: "auto" }} />
          </div>

          <div style={sectionLabel()}>
            {registerIconText("join-person-plus", "Founder registration", 22)}
          </div>

          <div
            style={{
              marginTop: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {registerIconTile("community", 62)}
            <h1
              style={{
                margin: 0,
                fontSize: 54,
                lineHeight: 1.08,
                color: "#0B1F33",
                fontWeight: 1000,
                maxWidth: 860,
                letterSpacing: 0,
              }}
            >
              Founder registration should follow the public create entry, not replace it.
            </h1>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 21,
              lineHeight: 1.76,
              color: "#48627C",
              maxWidth: 980,
            }}
          >
            This founder registration handoff should confirm the community details already
            entered and route you onward without becoming a second create form.
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
            <div style={sectionLabel()}>
              {registerIconText("document", "Create entry summary", 22)}
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 28,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              {hasCreateEntry
                ? "Your public create entry is captured."
                : "No create entry details detected yet."}
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#5F768D",
                lineHeight: 1.85,
                fontSize: 15,
              }}
            >
              Review the community details below, then continue through the secure access route
              that already exists in this build.
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <div style={softCard()}>
                <div style={{ ...sectionLabel(), color: "#64748B", letterSpacing: 0.4 }}>
                  {registerIconText("community", "Community name", 22)}
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
                  {registerIconText("document", "Short description", 22)}
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
                  {registerIconText("id", "Founder email", 22)}
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
            <div style={sectionLabel()}>
              {registerIconText("navigation", "Next step", 22)}
            </div>

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
              In this build, founder continuation should move through the secure access route
              that already exists, rather than duplicating a second public registration workflow
              here.
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              <PrimaryButton
                onClick={continueToLogin}
                debugId="register.continue-login"
                style={button(true)}
              >
                {registerIconText("lock", "Continue to Sign In")}
              </PrimaryButton>

              <StableCtaLink
                to="/activate-membership"
                debugId="register.activate-membership"
                style={button(false)}
              >
                {registerIconText("join-person-plus", "Activate Approved Membership")}
              </StableCtaLink>

              <StableCtaLink
                to="/create"
                debugId="register.create-entry"
                style={button(false)}
              >
                {registerIconText("community", "Back to Create Entry")}
              </StableCtaLink>

              <StableCtaLink
                to="/welcome"
                debugId="register.welcome"
                style={button(false)}
              >
                {registerIconText("home", "Back to Welcome")}
              </StableCtaLink>
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
              {registerIconText(
                "shield",
                "This remains a clean handoff page. Community creation belongs to public create entry, and private community control belongs after proper access.",
                24
              )}
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
              {registerIconText("community", "Public create entry first", 22)}
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              Founder details should begin in the public create page, not be scattered across
              multiple public pages.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
              {registerIconText("lock", "Secure access next", 22)}
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              After public create entry, secure sign-in and activation routes take over before
              private community management appears.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
              {registerIconText("check", "No duplicate public workflow", 22)}
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              This should confirm and route, not ask for the same community details all over
              again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
