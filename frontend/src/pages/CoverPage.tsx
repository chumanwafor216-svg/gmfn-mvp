import React from "react";
import { Link, useNavigate } from "react-router-dom";
import gmfnMark from "../assets/gmfn-mark.svg";

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at center, #0d3b8b 0%, #08255e 60%, #05173d 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  };
}

function heroCard(): React.CSSProperties {
  return {
    textAlign: "center",
    maxWidth: 820,
    width: "100%",
    borderRadius: 28,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.20)",
    padding: "34px 28px",
    backdropFilter: "blur(8px)",
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 28px",
    borderRadius: 30,
    border: "none",
    fontSize: 16,
    fontWeight: 800,
    background: "#F5D36B",
    color: "#0A2147",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
  };
}

function secondaryLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 18px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

export default function CoverPage() {
  const navigate = useNavigate();

  function goNext() {
    navigate("/welcome");
  }

  return (
    <div style={pageShell()}>
      <div style={heroCard()}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <img
            src={gmfnMark}
            alt="GMFN / GSN"
            style={{
              width: 148,
              height: "auto",
              filter: "drop-shadow(0 8px 25px rgba(0,0,0,0.35))",
            }}
          />
        </div>

        <div style={sectionLabel()}>Trust infrastructure protocol</div>

        <div
          style={{
            marginTop: 10,
            fontSize: 44,
            fontWeight: 1000,
            letterSpacing: 0.6,
            lineHeight: 1.05,
          }}
        >
          GMFN / GSN
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 22,
            fontWeight: 700,
            color: "#F5D36B",
          }}
        >
          Global Support Network
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 18,
            lineHeight: 1.7,
            opacity: 0.95,
            maxWidth: 700,
            marginInline: "auto",
          }}
        >
          GMFN makes existing trust visible, structured, portable, and usable
          across communities.
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 15,
            lineHeight: 1.8,
            color: "rgba(255,255,255,0.78)",
            maxWidth: 700,
            marginInline: "auto",
          }}
        >
          Start here, then continue into the correct public path: join an
          existing community, create a new one, sign in, or activate an
          approved membership.
        </div>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={goNext} style={primaryBtn()}>
            Continue
          </button>

          <a
            href="/GSN_FINAL_WHITE.pdf"
            target="_blank"
            rel="noreferrer"
            style={secondaryLink()}
          >
            Understand GSN first
          </a>

          <Link to="/login" style={secondaryLink()}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}