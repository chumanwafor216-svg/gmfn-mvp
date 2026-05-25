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
      return "radial-gradient(circle at 12% 8%, rgba(201,154,39,0.20) 0%, rgba(201,154,39,0) 26%), radial-gradient(circle at 86% 12%, rgba(38,96,171,0.15) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(247,250,253,0.995) 0%, rgba(230,238,247,0.982) 54%, rgba(210,222,237,0.975) 100%)";
    case "soft":
      return "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.17) 0%, rgba(201,154,39,0) 27%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.13) 0%, rgba(38,96,171,0) 29%), linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.982) 58%, rgba(221,231,242,0.972) 100%)";
    case "inner":
      return "radial-gradient(circle at 16% 12%, rgba(201,154,39,0.14) 0%, rgba(201,154,39,0) 29%), radial-gradient(circle at 84% 12%, rgba(38,96,171,0.11) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(243,247,252,0.985) 60%, rgba(229,237,246,0.972) 100%)";
    case "stat":
    default:
      return "radial-gradient(circle at 16% 10%, rgba(201,154,39,0.12) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 84% 14%, rgba(38,96,171,0.10) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(239,245,251,0.982) 100%)";
  }
}

function tintedGradient(
  variant: SurfaceVariant,
  topColor: string,
  baseColor: string,
  bottomColor: string
): string {
  const glowOpacity = variant === "page" ? 0.19 : variant === "soft" ? 0.17 : 0.14;
  return `radial-gradient(circle at 14% 10%, rgba(201,154,39,${glowOpacity}) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.12) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, ${topColor} 0%, ${baseColor} 56%, ${bottomColor} 100%)`;
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
    border: "1px solid rgba(20,52,83,0.24)",
    background: resolveInstitutionalBg(bg, "#F4F8FC", "page"),
    padding: 20,
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.12), 0 8px 18px rgba(7,20,36,0.045), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

export function institutionalSoftCard(bg = "#F8FBFF"): CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(20,52,83,0.20)",
    background: resolveInstitutionalBg(bg, "#F2F7FC", "soft"),
    padding: 16,
    boxShadow:
      "0 18px 38px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.84)",
    overflowAnchor: "none",
  };
}

export function institutionalInnerCard(bg = "#FFFFFF"): CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(20,52,83,0.18)",
    background: resolveInstitutionalBg(bg, "#FCF8EC", "inner"),
    padding: 14,
    boxShadow:
      "0 16px 30px rgba(7,20,36,0.06), inset 0 1px 0 rgba(255,255,255,0.82)",
    overflowAnchor: "none",
  };
}

export function institutionalStatTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(20,52,83,0.16)"
): CSSProperties {
  return {
    borderRadius: 16,
    border,
    background: resolveInstitutionalBg(bg, "#F6F9FC", "stat"),
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(7,20,36,0.055), inset 0 1px 0 rgba(255,255,255,0.80)",
    overflowAnchor: "none",
  };
}

export function institutionalBlueRailShell(
  isCompact = false,
  options?: {
    maxWidth?: number;
    padding?: string;
    gap?: number;
  }
): CSSProperties {
  return {
    maxWidth: options?.maxWidth ?? 1180,
    margin: "0 auto",
    padding: options?.padding ?? (isCompact ? "0 10px 40px" : "0 18px 44px"),
    display: "grid",
    gap: options?.gap ?? 16,
    borderRadius: isCompact ? 26 : 36,
    background:
      "radial-gradient(circle at 10% 4%, rgba(201,154,39,0.22) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 92% 6%, rgba(38,96,171,0.18) 0%, rgba(38,96,171,0) 32%), linear-gradient(90deg, #061321 0%, #12314D 4.6%, #D6E4F2 4.7%, #E8F0F8 11.5%, #EBF2F9 88.5%, #D6E4F2 95.3%, #12314D 95.4%, #061321 100%)",
    border: "1px solid rgba(16,45,74,0.24)",
    boxShadow:
      "0 34px 78px rgba(7,20,36,0.16), inset 18px 0 32px rgba(7,20,36,0.16), inset -18px 0 32px rgba(7,20,36,0.16), inset 0 1px 0 rgba(255,255,255,0.30)",
    overflowAnchor: "none",
  };
}
