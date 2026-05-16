import type React from "react";

export type BrandActionKind = "primary" | "secondary" | "soft";

export const gmfnBrand = {
  colors: {
    page: "#E8F0F8",
    pageSoft: "#F4F8FC",
    panel: "#FFFFFF",
    panelSoft: "#F4F8FC",
    panelRaised: "#FAFCFF",
    overlayPanel: "rgba(255,255,255,0.965)",
    ink: "#091B2E",
    inkSoft: "#1D3853",
    muted: "#4F647A",
    label: "#506A82",
    line: "rgba(9,27,46,0.12)",
    lineStrong: "rgba(9,27,46,0.16)",
    accent: "#0C4FA8",
    accentStrong: "#0B63D1",
    accentSoft: "rgba(12,79,168,0.11)",
    accentBorder: "rgba(12,79,168,0.24)",
    darkText: "#F8FBFF",
    darkMuted: "#D0DEEC",
    disabled: "#BFCBDC",
    gold: "#C99A27",
    goldSoft: "rgba(201,154,39,0.22)",
    goldInnerSoft: "rgba(201,154,39,0.16)",
  },
  gradients: {
    hero:
      "linear-gradient(180deg, #071424 0%, #0D2640 34%, #173A5C 72%, #25537E 100%)",
    heroRaised:
      "linear-gradient(180deg, #102744 0%, #1D466B 58%, #2A5D88 100%)",
    heroSidebar:
      "linear-gradient(180deg, #071424 0%, #0D2640 34%, #173A5C 72%, #25537E 100%)",
    pageWash:
      "radial-gradient(circle at 10% 0%, rgba(201,154,39,0.18) 0%, rgba(201,154,39,0) 26%), radial-gradient(circle at 84% 4%, rgba(38,96,171,0.16) 0%, rgba(38,96,171,0) 30%), linear-gradient(180deg, #F6FAFD 0%, #EAF1F8 54%, #DEE8F2 100%)",
    glass:
      "linear-gradient(180deg, rgba(255,255,255,0.19) 0%, rgba(255,255,255,0.08) 100%)",
  },
  shadows: {
    card:
      "0 22px 52px rgba(7,20,36,0.09), 0 4px 12px rgba(7,20,36,0.04), inset 0 1px 0 rgba(255,255,255,0.82)",
    hero:
      "0 28px 58px rgba(2,12,27,0.28), inset 0 1px 0 rgba(255,255,255,0.05)",
    glass: "0 16px 34px rgba(0,0,0,0.14)",
  },
} as const;

export function brandPageCard(
  bg: string = gmfnBrand.colors.panel
): React.CSSProperties {
  return {
    borderRadius: 24,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background:
      bg === gmfnBrand.colors.panel
        ? "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(244,248,252,0.985) 100%)"
        : bg,
    padding: 20,
    boxShadow: gmfnBrand.shadows.card,
    overflow: "hidden",
    overflowAnchor: "none",
    contain: "layout paint",
  };
}

export function brandSoftCard(
  bg: string = gmfnBrand.colors.panelSoft
): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background:
      bg === gmfnBrand.colors.panelSoft
        ? "linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 16px 36px rgba(7,20,36,0.065), inset 0 1px 0 rgba(255,255,255,0.86)",
    overflowAnchor: "none",
    contain: "layout paint",
  };
}

export function brandInnerCard(
  bg: string = gmfnBrand.colors.panel
): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${gmfnBrand.colors.line}`,
    background:
      bg === gmfnBrand.colors.panel
        ? "linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(242,247,252,0.986) 100%)"
        : bg,
    padding: 14,
    boxShadow:
      "0 12px 28px rgba(7,20,36,0.05), inset 0 1px 0 rgba(255,255,255,0.82)",
    overflowAnchor: "none",
    contain: "layout paint",
  };
}

export function brandSectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: gmfnBrand.colors.label,
    fontWeight: 900,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

export function brandHelperText(): React.CSSProperties {
  return {
    color: gmfnBrand.colors.muted,
    fontSize: 14,
    lineHeight: 1.72,
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
      : "rgba(9,27,46,0.08)",
    color: primary ? gmfnBrand.colors.accent : "#42556A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    border: `1px solid ${primary ? gmfnBrand.colors.accentBorder : "rgba(9,27,46,0.10)"}`,
  };
}

export function brandStableTapTarget(): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    backfaceVisibility: "visible",
    transform: "none",
    overflowAnchor: "none",
    contain: "layout paint",
    transition: "none",
    outlineOffset: 4,
  };
}

export function stopActionTap(event?: React.SyntheticEvent) {
  event?.stopPropagation();
}

export function actionTapGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onPointerUp" | "onMouseDown"
> {
  return {
    onPointerDown: stopActionTap,
    onPointerUp: stopActionTap,
    onMouseDown: stopActionTap,
  };
}

export function brandActionButton(
  kind: BrandActionKind = "secondary",
  disabled = false
): React.CSSProperties {
  const stableButtonText: React.CSSProperties = {
    minWidth: 0,
    maxWidth: "100%",
    alignContent: "center",
    overflowWrap: "anywhere",
    lineHeight: 1.18,
    transition: "none",
  };

  if (kind === "primary") {
    return {
      ...brandStableTapTarget(),
      ...stableButtonText,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 54,
      padding: "12px 16px",
      borderRadius: 14,
      border: disabled ? "1px solid rgba(159,173,190,0.34)" : "1px solid rgba(8,48,110,0.36)",
      background: disabled
        ? gmfnBrand.colors.disabled
        : "linear-gradient(180deg, #0C4FA8 0%, #0A63C8 100%)",
      color: gmfnBrand.colors.darkText,
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow:
        disabled
          ? "none"
          : "0 16px 30px rgba(8,37,74,0.16), inset 0 1px 0 rgba(255,255,255,0.20)",
    };
  }

  if (kind === "soft") {
    return {
      ...brandStableTapTarget(),
      ...stableButtonText,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      padding: "10px 13px",
      borderRadius: 12,
      border: `1px solid ${gmfnBrand.colors.lineStrong}`,
      background:
        "linear-gradient(180deg, rgba(248,251,255,0.998) 0%, rgba(236,243,250,0.99) 100%)",
      color: disabled ? "#94A3B8" : gmfnBrand.colors.inkSoft,
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow:
        "0 12px 24px rgba(7,20,36,0.055), inset 0 1px 0 rgba(255,255,255,0.84)",
    };
  }

  return {
    ...brandStableTapTarget(),
    ...stableButtonText,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    padding: "12px 16px",
    borderRadius: 14,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(243,247,252,0.99) 100%)",
    color: disabled ? "#94A3B8" : gmfnBrand.colors.ink,
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
    boxShadow:
      "0 14px 28px rgba(7,20,36,0.06), inset 0 1px 0 rgba(255,255,255,0.86)",
  };
}
