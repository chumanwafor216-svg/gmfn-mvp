import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

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

type NormalizedPageTopNavLink = PageTopNavLink & {
  to: string;
  external: boolean;
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
    maxWidth: 840,
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
    minHeight: 38,
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

function blockTitle(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.32,
    textTransform: "uppercase",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function isExternalTarget(to: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(to);
}

function normalizeTarget(to: string, pathname: string): string {
  const raw = safeStr(to);
  if (!raw) return "";

  if (
    raw.startsWith("/") ||
    raw.startsWith("#") ||
    raw.startsWith("?") ||
    raw.startsWith(".") ||
    isExternalTarget(raw)
  ) {
    return raw;
  }

  const match = raw.match(/^([^?#]*)(.*)$/);
  const rawPath = safeStr(match?.[1] || "");
  const suffix = String(match?.[2] || "");

  if (!rawPath) return raw;

  if (rawPath === "app" || rawPath.startsWith("app/")) {
    return `/${rawPath}${suffix}`;
  }

  const inApp =
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/app?");

  return inApp ? `/app/${rawPath}${suffix}` : `/${rawPath}${suffix}`;
}

function pruneLinks(
  items: PageTopNavLink[] | undefined,
  pathname: string
): NormalizedPageTopNavLink[] {
  const seen = new Set<string>();

  return (items || [])
    .map((item: PageTopNavLink) => {
      const label = safeStr(item?.label);
      const to = normalizeTarget(item?.to, pathname);
      const external = isExternalTarget(to);

      return {
        label,
        to,
        disabled: !!item?.disabled,
        external,
      };
    })
    .filter((item: NormalizedPageTopNavLink) => {
      const key = `${item.label}::${item.to}`;

      if (!item.label || !item.to) return false;
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function renderNavItem(
  item: NormalizedPageTopNavLink,
  style: React.CSSProperties,
  key: string
) {
  if (item.external) {
    return (
      <a
        key={key}
        href={item.to}
        style={style}
        target="_blank"
        rel="noreferrer"
        aria-disabled={item.disabled ? "true" : undefined}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      key={key}
      to={item.to}
      style={style}
      aria-disabled={item.disabled ? "true" : undefined}
    >
      {item.label}
    </Link>
  );
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
  const location = useLocation();

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

  const resolvedHomeCandidate = safeStr(homeTo) || safeStr(dashboardTo);
  const resolvedHomeTo = normalizeTarget(
    resolvedHomeCandidate,
    location.pathname
  );
  const resolvedHomeLabel = safeStr(homeTo)
    ? safeStr(homeLabel) || "Dashboard"
    : safeStr(dashboardLabel) || "Dashboard";

  const resolvedBackTo = normalizeTarget(safeStr(backTo), location.pathname);

  const visibleNextLinks = useMemo(
    () => pruneLinks(nextLinks, location.pathname),
    [nextLinks, location.pathname]
  );

  const visibleUtilityLinks = useMemo(
    () => pruneLinks(utilityLinks, location.pathname),
    [utilityLinks, location.pathname]
  );

  const hasRightArea =
    visibleNextLinks.length > 0 || visibleUtilityLinks.length > 0;

  const resolvedHomeLink: NormalizedPageTopNavLink | null = resolvedHomeTo
    ? {
        label: resolvedHomeLabel,
        to: resolvedHomeTo,
        external: isExternalTarget(resolvedHomeTo),
      }
    : null;

  const resolvedBackLink: NormalizedPageTopNavLink | null = resolvedBackTo
    ? {
        label: `← ${safeStr(backLabel) || "Back"}`,
        to: resolvedBackTo,
        external: isExternalTarget(resolvedBackTo),
      }
    : null;

  return (
    <section style={shellCard()}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : hasRightArea
            ? "minmax(0, 1.15fr) minmax(280px, 0.85fr)"
            : "1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div>
          {sectionLabel ? <div style={sectionStyle()}>{sectionLabel}</div> : null}

          <div style={titleStyle(isCompact)}>{title}</div>

          {subtitle ? <div style={subtitleStyle()}>{subtitle}</div> : null}

          {resolvedBackLink || resolvedHomeLink ? (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {resolvedBackLink
                ? renderNavItem(
                    resolvedBackLink,
                    actionBtn("secondary"),
                    `back-${resolvedBackLink.label}-${resolvedBackLink.to}`
                  )
                : null}

              {resolvedHomeLink
                ? renderNavItem(
                    resolvedHomeLink,
                    actionBtn("primary"),
                    `home-${resolvedHomeLink.label}-${resolvedHomeLink.to}`
                  )
                : null}
            </div>
          ) : null}
        </div>

        {hasRightArea ? (
          <div
            style={{
              display: "grid",
              gap: 14,
              alignSelf: isCompact ? "start" : "center",
            }}
          >
            {visibleNextLinks.length > 0 ? (
              <div>
                <div style={blockTitle()}>Where next</div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: isCompact ? "flex-start" : "flex-end",
                  }}
                >
                  {visibleNextLinks.map((item: NormalizedPageTopNavLink) =>
                    renderNavItem(
                      item,
                      chip(!!item.disabled),
                      `next-${item.label}-${item.to}`
                    )
                  )}
                </div>
              </div>
            ) : null}

            {visibleUtilityLinks.length > 0 ? (
              <div>
                <div style={blockTitle()}>Related</div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: isCompact ? "flex-start" : "flex-end",
                  }}
                >
                  {visibleUtilityLinks.map((item: NormalizedPageTopNavLink) =>
                    renderNavItem(
                      item,
                      chip(!!item.disabled),
                      `utility-${item.label}-${item.to}`
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}