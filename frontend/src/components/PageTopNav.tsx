import React, { useEffect, useState } from "react";
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

function wrapCard(bg = "#FFFFFF", compact = false): React.CSSProperties {
  return {
    borderRadius: compact ? 18 : 24,
    border: "1px solid rgba(148,163,184,0.16)",
    background: bg,
    padding: compact ? 14 : 20,
    boxShadow: compact
      ? "0 10px 24px rgba(2,6,23,0.18)"
      : "0 18px 40px rgba(2,6,23,0.28), 0 4px 12px rgba(2,6,23,0.18)",
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

function helperText(compact = false): React.CSSProperties {
  return {
    color: "#C7D4E5",
    fontSize: compact ? 13 : 14,
    lineHeight: compact ? 1.55 : 1.75,
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false,
  compact = false
): React.CSSProperties {
  const compactAction: React.CSSProperties = compact
    ? {
        flex: "0 0 auto",
        minHeight: kind === "soft" ? 42 : 44,
        minWidth: kind === "soft" ? 84 : 96,
        padding: kind === "soft" ? "9px 12px" : "10px 13px",
        borderRadius: 999,
        fontSize: kind === "soft" ? 12 : 12.5,
        whiteSpace: "nowrap",
        touchAction: "manipulation",
      }
    : {
        touchAction: "manipulation",
      };

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
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      pointerEvents: "auto",
      position: "relative",
      zIndex: 2,
      isolation: "isolate",
      transform: "translateZ(0)",
      outlineOffset: 4,
      ...compactAction,
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
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      pointerEvents: "auto",
      position: "relative",
      zIndex: 2,
      isolation: "isolate",
      transform: "translateZ(0)",
      outlineOffset: 4,
      ...compactAction,
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
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    transform: "translateZ(0)",
    outlineOffset: 4,
    ...compactAction,
  };
}

function renderNavRow(
  items: NavItem[] | undefined,
  kind: "primary" | "secondary" | "soft",
  compact = false
) {
  if (!items || items.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: compact ? 8 : 10,
        flexWrap: compact ? "nowrap" : "wrap",
        overflowX: compact ? "auto" : undefined,
        paddingBottom: compact ? 2 : undefined,
        WebkitOverflowScrolling: compact ? "touch" : undefined,
      }}
    >
      {items.map((item, index) =>
        item.disabled ? (
          <span key={`${item.label}-${index}`} style={actionBtn(kind, true, compact)}>
            {item.label}
          </span>
        ) : (
          <OriginLink
            key={`${item.label}-${index}`}
            to={item.to}
            style={actionBtn(kind, false, compact)}
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
  const [isPhone, setIsPhone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 560;
  });
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsPhone(window.innerWidth <= 560);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)",
        isPhone
      )}
    >
      <div style={topLabel()}>{sectionLabel}</div>

      <div
        style={{
          marginTop: 10,
          color: "#F8FBFF",
          fontSize: isPhone ? 24 : 34,
          fontWeight: 900,
          lineHeight: isPhone ? 1.12 : 1.08,
          maxWidth: 920,
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div style={{ marginTop: isPhone ? 8 : 12, ...helperText(isPhone), maxWidth: 980 }}>
          {subtitle}
        </div>
      ) : null}

      <div
        style={{
          marginTop: isPhone ? 12 : 18,
          display: "grid",
          gap: isPhone ? 8 : 10,
        }}
      >
        {renderNavRow(topLinks, "secondary", isPhone)}
        {renderNavRow(nextLinks, "primary", isPhone)}
        {renderNavRow(utilityLinks, "soft", isPhone)}
      </div>
    </section>
  );
}
