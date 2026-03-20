export type GmfnThemeName =
  | "deep_blue"
  | "soft_light"
  | "dark"
  | "royal_purple"
  | "rose_pink";

type ThemeVars = {
  shellBg: string;
  sidebarBg: string;
  sidebarStroke: string;
  sidebarText: string;
  sidebarMuted: string;
  cardBg: string;
  cardBorder: string;
  pageBg: string;
  primaryBtn: string;
  primaryBtnText: string;
  accent: string;
};

export const GMFN_THEMES: Record<GmfnThemeName, ThemeVars> = {
  deep_blue: {
    shellBg: "#F4F8FC",
    sidebarBg: "#0B1F33",
    sidebarStroke: "rgba(255,255,255,0.08)",
    sidebarText: "#D9E5F1",
    sidebarMuted: "#9DB4CC",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(11,31,51,0.08)",
    pageBg: "#F4F8FC",
    primaryBtn: "#0B63D1",
    primaryBtnText: "#FFFFFF",
    accent: "#D6AF47",
  },
  soft_light: {
    shellBg: "#F8FAFC",
    sidebarBg: "#334155",
    sidebarStroke: "rgba(255,255,255,0.10)",
    sidebarText: "#E2E8F0",
    sidebarMuted: "#CBD5E1",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(51,65,85,0.10)",
    pageBg: "#F8FAFC",
    primaryBtn: "#2563EB",
    primaryBtnText: "#FFFFFF",
    accent: "#F59E0B",
  },
  dark: {
    shellBg: "#020617",
    sidebarBg: "#0F172A",
    sidebarStroke: "rgba(255,255,255,0.08)",
    sidebarText: "#E2E8F0",
    sidebarMuted: "#94A3B8",
    cardBg: "#111827",
    cardBorder: "rgba(255,255,255,0.08)",
    pageBg: "#020617",
    primaryBtn: "#3B82F6",
    primaryBtnText: "#FFFFFF",
    accent: "#FBBF24",
  },
  royal_purple: {
    shellBg: "#F6F5FF",
    sidebarBg: "#2D1B69",
    sidebarStroke: "rgba(255,255,255,0.08)",
    sidebarText: "#E9E7FF",
    sidebarMuted: "#C4B5FD",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(45,27,105,0.10)",
    pageBg: "#F6F5FF",
    primaryBtn: "#6B46C1",
    primaryBtnText: "#FFFFFF",
    accent: "#D6BCFA",
  },
  rose_pink: {
    shellBg: "#FFF7FB",
    sidebarBg: "#7A2546",
    sidebarStroke: "rgba(255,255,255,0.08)",
    sidebarText: "#FCE7F3",
    sidebarMuted: "#F9A8D4",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(122,37,70,0.10)",
    pageBg: "#FFF7FB",
    primaryBtn: "#E64980",
    primaryBtnText: "#FFFFFF",
    accent: "#F9A8D4",
  },
};

export function getSavedTheme(): GmfnThemeName {
  const raw = (localStorage.getItem("gmfn_theme") || "deep_blue") as GmfnThemeName;
  return GMFN_THEMES[raw] ? raw : "deep_blue";
}

export function getThemeVars(theme: GmfnThemeName): ThemeVars {
  return GMFN_THEMES[theme] || GMFN_THEMES.deep_blue;
}