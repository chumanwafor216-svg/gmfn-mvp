import React from "react";
import { useLocation } from "react-router-dom";
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
    border: "1px solid rgba(148,163,184,0.16)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 18px 40px rgba(2,6,23,0.28), 0 4px 12px rgba(2,6,23,0.18)",
    overflow: "hidden",
  };
}

function topLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#93A9C4",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#C7D4E5",
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
      background: disabled ? "#475569" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
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
      border: "1px solid rgba(148,163,184,0.18)",
      background: "rgba(15,23,42,0.36)",
      color: disabled ? "#64748B" : "#D8E2EF",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
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
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.42)",
    color: disabled ? "#64748B" : "#E5EEF8",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
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
  const location = useLocation();
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

  const originPath =
    typeof location.state === "object" && location.state
      ? String(
          (location.state as any).originPath || (location.state as any).from || ""
        ).trim()
      : "";

  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const resolvedBackTo =
    originPath && originPath !== currentPath ? originPath : backTo || "";

  const topLinks: NavItem[] = [
    homeTo && homeLabel ? { label: homeLabel, to: homeTo } : null,
    resolvedBackTo && backLabel ? { label: backLabel, to: resolvedBackTo } : null,
  ]
    .filter(Boolean)
    .filter((item, index, items) => {
      const candidate = item as NavItem;
      return (
        items.findIndex(
          (entry) => (entry as NavItem).to === candidate.to
        ) === index
      );
    }) as NavItem[];

  return (
    <section
      style={wrapCard(
        "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
      )}
    >
      <div style={topLabel()}>{sectionLabel}</div>

      <div
        style={{
          marginTop: 10,
          color: "#F8FBFF",
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
