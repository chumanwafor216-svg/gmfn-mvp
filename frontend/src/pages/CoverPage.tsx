import React from "react";
import { useNavigate } from "react-router-dom";
import gmfnMark from "../assets/gmfn-mark.svg";

export default function CoverPage() {
  const navigate = useNavigate();

  const goNext = () => navigate("/welcome");

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at center, #0d3b8b 0%, #08255e 60%, #05173d 100%)",
        color: "#ffffff",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 720,
          width: "100%",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <img
            src={gmfnMark}
            alt="GSN"
            style={{
              width: 140,
              height: "auto",
              filter: "drop-shadow(0 8px 25px rgba(0,0,0,0.35))",
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          GSN
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#f5d36b",
            marginBottom: 10,
          }}
        >
          Global Support Network
        </div>

        <div
          style={{
            fontSize: 16,
            opacity: 0.9,
            marginBottom: 36,
          }}
        >
          Trust Infrastructure Protocol
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 18,
            marginBottom: 40,
            opacity: 0.95,
            lineHeight: 1.5,
          }}
        >
          Trusted cooperation for communities.
        </div>

        {/* Continue Button */}
        <button
          onClick={goNext}
          style={{
            padding: "14px 36px",
            borderRadius: 30,
            border: "none",
            fontSize: 16,
            fontWeight: 700,
            background: "#f5d36b",
            color: "#0a2147",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.97)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Tap to continue
        </button>
      </div>
    </div>
  );
}