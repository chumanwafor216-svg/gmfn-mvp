import React from "react";
import { Link, useNavigate } from "react-router-dom";

function btn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
  };
}

type Props = {
  title?: string;
  subtitle?: string;
  dashboardTo?: string;
};

export default function PageTopNav({
  title,
  subtitle,
  dashboardTo = "/dashboard",
}: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => navigate(-1)} style={btn(false)}>
          ← Back
        </button>

        <Link to={dashboardTo} style={btn(true)}>
          Dashboard
        </Link>
      </div>

      {title ? (
        <div style={{ marginTop: 16, fontSize: 32, fontWeight: 1000, color: "#0B1F33" }}>
          {title}
        </div>
      ) : null}

      {subtitle ? (
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}