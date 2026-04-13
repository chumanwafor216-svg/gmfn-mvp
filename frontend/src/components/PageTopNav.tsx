import React from "react";
import OriginLink from "./OriginLink";

type NavItem = {
  label: string;
  to: string;
  disabled?: boolean;
};

type PageTopNavProps = {
  sectionLabel: string;
  title: string;
  subtitle?: string;
  homeTo?: string;
  homeLabel?: string;
  backTo?: string;
  backLabel?: string;
  nextLinks?: NavItem[];
  utilityLinks?: NavItem[];
};

function wrapCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function topLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function renderNavRow(
  items: NavItem[] | undefined,
  kind: "primary" | "secondary" | "soft"
) {
  if (!items || items.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      {items.map((item, index) =>
        item.disabled ? (
          <span key={`${item.label}-${index}`} style={actionBtn(kind, true)}>
            {item.label}
          </span>
        ) : (
          <OriginLink
            key={`${item.label}-${index}`}
            to={item.to}
            style={actionBtn(kind, false)}
          >
            {item.label}
          </OriginLink>
        )
      )}
    </div>
  );
}

export default function PageTopNav(props: PageTopNavProps) {
  const {
    sectionLabel,
    title,
    subtitle,
    homeTo,
    homeLabel,
    backTo,
    backLabel,
    nextLinks,
    utilityLinks,
  } = props;

  const topLinks: NavItem[] = [
    homeTo && homeLabel ? { label: homeLabel, to: homeTo } : null,
    backTo && backLabel ? { label: backLabel, to: backTo } : null,
  ].filter(Boolean) as NavItem[];

  return (
    <section
      style={wrapCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
    >
      <div style={topLabel()}>{sectionLabel}</div>

      <div
        style={{
          marginTop: 10,
          color: "#0B1F33",
          fontSize: 34,
          fontWeight: 900,
          lineHeight: 1.08,
          maxWidth: 920,
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div style={{ marginTop: 12, ...helperText(), maxWidth: 980 }}>
          {subtitle}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 10,
        }}
      >
        {renderNavRow(topLinks, "secondary")}
        {renderNavRow(nextLinks, "primary")}
        {renderNavRow(utilityLinks, "soft")}
      </div>
    </section>
  );
}