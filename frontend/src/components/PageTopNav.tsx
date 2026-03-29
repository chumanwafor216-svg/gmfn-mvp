import React, { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

type NavLinkItem = {
  label: string;
  to: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  sectionLabel?: string;
  backTo?: string;

  // backwards-compatible with earlier usage
  dashboardTo?: string;

  // preferred generic naming going forward
  homeTo?: string;
  homeLabel?: string;

  nextLinks?: NavLinkItem[];
  utilityLinks?: NavLinkItem[];
};

function shell(): React.CSSProperties {
  return {
    marginBottom: 18,
    padding: 18,
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
  };
}

function topRow(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };
}

function leftActions(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  };
}

function rightRail(): React.CSSProperties {
  return {
    display: "grid",
    gap: 8,
    justifyItems: "end",
    maxWidth: "100%",
  };
}

function linkCluster(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  };
}

function primaryAction(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "none",
    background: "#0B63D1",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function secondaryAction(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function chip(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#3E556C",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 13,
    whiteSpace: "nowrap",
  };
}

function metaLabel(): React.CSSProperties {
  return {
    fontSize: 11,
    color: "#6A7B8C",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function contentArea(): React.CSSProperties {
  return {
    marginTop: 18,
    display: "grid",
    gap: 8,
  };
}

function titleStyle(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "clamp(1.55rem, 2.7vw, 2.05rem)",
    lineHeight: 1.1,
    color: "#0B1F33",
    fontWeight: 900,
  };
}

function subtitleStyle(): React.CSSProperties {
  return {
    margin: "2px 0 0",
    maxWidth: 900,
    color: "#5D7389",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function normalizeLinks(
  items: NavLinkItem[] | undefined,
  pathname: string,
  excludedPaths: string[],
  maxCount: number = 3
): NavLinkItem[] {
  const excluded = new Set(
    excludedPaths.map((item) => String(item || "").trim()).filter(Boolean)
  );
  const seen = new Set<string>();
  const out: NavLinkItem[] = [];

  for (const item of items || []) {
    const label = String(item?.label || "").trim();
    const to = String(item?.to || "").trim();

    if (!label || !to) continue;
    if (to === pathname) continue;
    if (excluded.has(to)) continue;
    if (seen.has(to)) continue;

    seen.add(to);
    out.push({ label, to });

    if (out.length >= maxCount) {
      break;
    }
  }

  return out;
}

export default function PageTopNav({
  title,
  subtitle,
  sectionLabel,
  backTo,
  dashboardTo = "/app/dashboard",
  homeTo,
  homeLabel,
  nextLinks,
  utilityLinks,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const resolvedHomeTo = homeTo || dashboardTo || "/app/dashboard";
  const resolvedHomeLabel =
    homeLabel || (resolvedHomeTo.startsWith("/app/") ? "Dashboard" : "Home");

  const excludedPaths = useMemo(() => {
    return [resolvedHomeTo, backTo || ""];
  }, [resolvedHomeTo, backTo]);

  const resolvedNextLinks = useMemo(
    () => normalizeLinks(nextLinks, location.pathname, excludedPaths, 3),
    [nextLinks, location.pathname, excludedPaths]
  );

  const resolvedUtilityLinks = useMemo(
    () => normalizeLinks(utilityLinks, location.pathname, excludedPaths, 3),
    [utilityLinks, location.pathname, excludedPaths]
  );

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(backTo || resolvedHomeTo, { replace: true });
  }

  return (
    <div style={shell()}>
      <div style={topRow()}>
        <div style={leftActions()}>
          <button type="button" onClick={goBack} style={secondaryAction()}>
            ← Back
          </button>

          <Link to={resolvedHomeTo} style={primaryAction()}>
            {resolvedHomeLabel}
          </Link>
        </div>

        {resolvedNextLinks.length > 0 || resolvedUtilityLinks.length > 0 ? (
          <div style={rightRail()}>
            {resolvedNextLinks.length > 0 ? (
              <div style={linkCluster()}>
                <span style={metaLabel()}>Where next</span>
                {resolvedNextLinks.map((item) => (
                  <Link key={item.to} to={item.to} style={chip()}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}

            {resolvedUtilityLinks.length > 0 ? (
              <div style={linkCluster()}>
                <span style={metaLabel()}>Related</span>
                {resolvedUtilityLinks.map((item) => (
                  <Link key={item.to} to={item.to} style={chip()}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {sectionLabel || title || subtitle ? (
        <div style={contentArea()}>
          {sectionLabel ? <div style={metaLabel()}>{sectionLabel}</div> : null}

          {title ? <h1 style={titleStyle()}>{title}</h1> : null}

          {subtitle ? <p style={subtitleStyle()}>{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}