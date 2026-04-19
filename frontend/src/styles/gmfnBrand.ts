import React from "react";

export type BrandActionKind = "primary" | "secondary" | "soft";

export const gmfnBrand = {
  colors: {
    page: "#EEF4FA",
    pageSoft: "#F8FBFF",
    panel: "#FFFFFF",
    panelSoft: "#F8FBFF",
    panelRaised: "#FCFEFF",
    overlayPanel: "rgba(255,255,255,0.94)",
    ink: "#0B1F33",
    inkSoft: "#24415C",
    muted: "#5F7287",
    label: "#5D7389",
    line: "rgba(11,31,51,0.08)",
    lineStrong: "rgba(11,31,51,0.10)",
    accent: "#1D4ED8",
    accentStrong: "#0B63D1",
    accentSoft: "rgba(29,78,216,0.08)",
    accentBorder: "rgba(29,78,216,0.18)",
    darkText: "#F8FBFF",
    darkMuted: "#D7E3F1",
    disabled: "#CBD5E1",
    gold: "#D6AF47",
    goldSoft: "rgba(212,175,55,0.18)",
    goldInnerSoft: "rgba(212,175,55,0.14)",
  },
  gradients: {
    hero: "linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)",
    heroRaised: "linear-gradient(180deg, #163552 0%, #2A5B84 100%)",
    heroSidebar:
      "linear-gradient(180deg, #10243A 0%, #163552 52%, #26527C 100%)",
    pageWash:
      "radial-gradient(circle at top, rgba(47,103,196,0.14) 0%, rgba(16,36,58,0) 30%), linear-gradient(180deg, #F8FBFF 0%, #EEF4FA 100%)",
    glass:
      "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.06) 100%)",
  },
  shadows: {
    card: "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    hero: "0 22px 48px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.04)",
    glass: "0 12px 28px rgba(0,0,0,0.10)",
  },
} as const;

export function brandPageCard(
  bg: string = gmfnBrand.colors.panel
): React.CSSProperties {
  return {
    borderRadius: 24,
    border: `1px solid ${gmfnBrand.colors.line}`,
    background: bg,
    padding: 20,
    boxShadow: gmfnBrand.shadows.card,
    overflow: "hidden",
  };
}

export function brandSoftCard(
  bg: string = gmfnBrand.colors.panelSoft
): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${gmfnBrand.colors.line}`,
    background: bg,
    padding: 16,
  };
}

export function brandInnerCard(
  bg: string = gmfnBrand.colors.panel
): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${gmfnBrand.colors.line}`,
    background: bg,
    padding: 14,
  };
}

export function brandSectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: gmfnBrand.colors.label,
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

export function brandHelperText(): React.CSSProperties {
  return {
    color: gmfnBrand.colors.muted,
    fontSize: 14,
    lineHeight: 1.75,
  };
}

export function brandBadge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary
      ? gmfnBrand.colors.accentSoft
      : "rgba(100,116,139,0.10)",
    color: primary ? gmfnBrand.colors.accent : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

export function brandActionButton(
  kind: BrandActionKind = "secondary",
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
      background: disabled
        ? gmfnBrand.colors.disabled
        : gmfnBrand.colors.accent,
      color: gmfnBrand.colors.darkText,
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
      border: `1px solid ${gmfnBrand.colors.line}`,
      background: gmfnBrand.colors.panelSoft,
      color: disabled ? "#94A3B8" : gmfnBrand.colors.inkSoft,
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
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background: gmfnBrand.colors.panel,
    color: disabled ? "#94A3B8" : gmfnBrand.colors.ink,
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
  };
}
