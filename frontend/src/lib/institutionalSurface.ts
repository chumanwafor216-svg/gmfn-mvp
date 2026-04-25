import type { CSSProperties } from "react";

type SurfaceVariant = "page" | "soft" | "inner" | "stat";

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function isGradient(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("linear-gradient(") ||
    normalized.includes("radial-gradient(") ||
    normalized.includes("conic-gradient(")
  );
}

function defaultGradient(variant: SurfaceVariant): string {
  switch (variant) {
    case "page":
      return "radial-gradient(circle at 14% 10%, rgba(243,208,106,0.18) 0%, rgba(243,208,106,0) 26%), radial-gradient(circle at 88% 14%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0) 30%), linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(231,240,251,0.97) 54%, rgba(210,223,239,0.97) 100%)";
    case "soft":
      return "radial-gradient(circle at 16% 10%, rgba(243,208,106,0.16) 0%, rgba(243,208,106,0) 28%), radial-gradient(circle at 86% 16%, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0) 30%), linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(235,244,252,0.97) 58%, rgba(219,231,244,0.96) 100%)";
    case "inner":
      return "radial-gradient(circle at 18% 12%, rgba(243,208,106,0.14) 0%, rgba(243,208,106,0) 30%), radial-gradient(circle at 86% 14%, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0) 30%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(243,248,253,0.975) 60%, rgba(227,237,247,0.96) 100%)";
    case "stat":
    default:
      return "radial-gradient(circle at 18% 12%, rgba(243,208,106,0.12) 0%, rgba(243,208,106,0) 30%), radial-gradient(circle at 84% 16%, rgba(255,255,255,0.54) 0%, rgba(255,255,255,0) 30%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(239,246,252,0.97) 100%)";
  }
}

function tintedGradient(
  variant: SurfaceVariant,
  topColor: string,
  baseColor: string,
  bottomColor: string
): string {
  const glowOpacity = variant === "page" ? 0.18 : variant === "soft" ? 0.16 : 0.13;
  return `radial-gradient(circle at 14% 10%, rgba(243,208,106,${glowOpacity}) 0%, rgba(243,208,106,0) 28%), radial-gradient(circle at 88% 14%, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0) 30%), linear-gradient(180deg, ${topColor} 0%, ${baseColor} 56%, ${bottomColor} 100%)`;
}

export function resolveInstitutionalBg(
  bg: string,
  tint: string,
  variant: SurfaceVariant = "page"
): string {
  const raw = safeStr(bg);
  if (!raw) return defaultGradient(variant);
  if (isGradient(raw)) return raw;

  const normalized = raw.toUpperCase();

  if (normalized === "#FFFFFF") {
    return defaultGradient(variant);
  }

  if (normalized === "#F8FBFF" || normalized === "#FCFEFF") {
    return tintedGradient(
      variant,
      tint || "#F5FAFF",
      "#F8FBFF",
      variant === "page" ? "#E4EEF8" : "#E9F1F9"
    );
  }

  if (normalized === "#FFFDF7" || normalized === "#FFFBEF") {
    return tintedGradient(variant, "#FFFDF7", "#FFF7DD", "#F3E6BE");
  }

  if (normalized === "#F0FDF4" || normalized === "#F3FBF5") {
    return tintedGradient(variant, "#F8FFF9", "#EEF9F1", "#DAECE1");
  }

  if (normalized === "#FEF2F2" || normalized === "#FFF5F5") {
    return tintedGradient(variant, "#FFF9F9", "#FEF0F0", "#F3DFDF");
  }

  return raw;
}

export function institutionalPageCard(bg = "#FFFFFF"): CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(37,78,119,0.20)",
    background: resolveInstitutionalBg(bg, "#F4F8FC", "page"),
    padding: 20,
    boxShadow:
      "0 26px 56px rgba(10,24,49,0.10), 0 6px 14px rgba(10,24,49,0.04), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -12px 26px rgba(21,63,98,0.05)",
    overflow: "hidden",
  };
}

export function institutionalSoftCard(bg = "#F8FBFF"): CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(37,78,119,0.18)",
    background: resolveInstitutionalBg(bg, "#F2F7FC", "soft"),
    padding: 16,
    boxShadow:
      "0 16px 36px rgba(10,24,49,0.068), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

export function institutionalInnerCard(bg = "#FFFFFF"): CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(37,78,119,0.16)",
    background: resolveInstitutionalBg(bg, "#FCF8EC", "inner"),
    padding: 14,
    boxShadow:
      "0 14px 30px rgba(10,24,49,0.055), inset 0 1px 0 rgba(255,255,255,0.80)",
  };
}

export function institutionalStatTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(37,78,119,0.12)"
): CSSProperties {
  return {
    borderRadius: 16,
    border,
    background: resolveInstitutionalBg(bg, "#F6F9FC", "stat"),
    padding: 14,
    boxShadow:
      "0 12px 26px rgba(10,24,49,0.05), inset 0 1px 0 rgba(255,255,255,0.78)",
  };
}
