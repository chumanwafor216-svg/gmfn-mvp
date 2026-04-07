import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type PageTopNavLink = {
  label: string;
  to: string;
  disabled?: boolean;
};

type PageTopNavProps = {
  sectionLabel?: string;
  title: string;
  subtitle?: string;

  homeTo?: string;
  homeLabel?: string;

  dashboardTo?: string;
  dashboardLabel?: string;

  backTo?: string;
  backLabel?: string;

  nextLinks?: PageTopNavLink[];
  utilityLinks?: PageTopNavLink[];
};

function shellCard(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
    padding: 18,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
  };
}

function sectionStyle(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function titleStyle(compact: boolean): React.CSSProperties {
  return {
    marginTop: 8,
    color: "#0B1F33",
    fontSize: compact ? 28 : 34,
    fontWeight: 900,
    lineHeight: 1.1,
  };
}

function subtitleStyle(): React.CSSProperties {
  return {
    marginTop: 10,
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.8,
    maxWidth: 920,
  };
}

function actionBtn(
  kind: "primary" | "secondary" = "secondary",
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
      pointerEvents: disabled ? "none" : "auto",
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
    pointerEvents: disabled ? "none" : "auto",
  };
}

function chip(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#24415C",
    fontWeight: 800,
    fontSize: 13,
    textDecoration: "none",
    whiteSpace: "nowrap",
    pointerEvents: disabled ? "none" : "auto",
    opacity: disabled ? 0.72 : 1,
  };
}

function inlineBlockTitle(): React.CSSProperties {
  return {
    fontSize: 11,
    color: "#64748B",
    fontWeight: 900,
    letterSpacing: 0.28,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function pruneLinks(items?: PageTopNavLink[]): PageTopNavLink[] {
  const seen = new Set<string>();

  return (items || []).filter((item) => {
    const label = safeStr(item?.label);
    const to = safeStr(item?.to);
    const key = `${label}::${to}`;

    if (!label || !to) return false;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export default function PageTopNav({
  sectionLabel,
  title,
  subtitle,
  homeTo,
  homeLabel = "Dashboard",
  dashboardTo,
  dashboardLabel = "Dashboard",
  backTo,
  backLabel = "Back",
  nextLinks,
  utilityLinks,
}: PageTopNavProps) {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resolvedHomeTo = safeStr(homeTo) || safeStr(dashboardTo);
  const resolvedHomeLabel = safeStr(homeTo) ? homeLabel : dashboardLabel;

  const visibleNextLinks = useMemo(() => pruneLinks(nextLinks), [nextLinks]);
  const visibleUtilityLinks = useMemo(
    () => pruneLinks(utilityLinks),
    [utilityLinks]
  );

  const hasTopActions = Boolean(resolvedHomeTo || backTo);
  const hasInlineLinks =
    visibleNextLinks.length > 0 || visibleUtilityLinks.length > 0;

  return (
    <section style={shellCard()}>
      {sectionLabel ? <div style={sectionStyle()}>{sectionLabel}</div> : null}

      <div style={titleStyle(isCompact)}>{title}</div>

      {subtitle ? <div style={subtitleStyle()}>{subtitle}</div> : null}

      {hasTopActions ? (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {backTo ? (
            <Link to={backTo} style={actionBtn("secondary")}>
              ← {backLabel}
            </Link>
          ) : null}

          {resolvedHomeTo ? (
            <Link to={resolvedHomeTo} style={actionBtn("primary")}>
              {resolvedHomeLabel}
            </Link>
          ) : null}
        </div>
      ) : null}

      {hasInlineLinks ? (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gap: 10,
          }}
        >
          {visibleNextLinks.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={inlineBlockTitle()}>Where next</span>

              {visibleNextLinks.map((item) => (
                <Link
                  key={`next-${item.label}-${item.to}`}
                  to={item.to}
                  style={chip(!!item.disabled)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}

          {visibleUtilityLinks.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={inlineBlockTitle()}>Related</span>

              {visibleUtilityLinks.map((item) => (
                <Link
                  key={`utility-${item.label}-${item.to}`}
                  to={item.to}
                  style={chip(!!item.disabled)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}