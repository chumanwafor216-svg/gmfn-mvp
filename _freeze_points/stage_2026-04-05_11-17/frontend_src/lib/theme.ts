// src/lib/theme.ts
// GMFN theme helpers (only watermark/emboss tint is user-adjustable)

export type GMFNTintPreset = "green" | "black" | "pink" | "custom";

export type GMFNThemeState = {
  preset: GMFNTintPreset;
  tint: string; // hex like #22c55e
};

const KEY_PRESET = "gmfn_theme_preset";
const KEY_TINT = "gmfn_theme_tint";

const PRESETS: Record<Exclude<GMFNTintPreset, "custom">, string> = {
  green: "#22c55e",
  black: "#111827",
  pink: "#ec4899",
};

export function clampHex(input: string): string {
  const s = (input || "").trim();
  if (!s) return PRESETS.green;

  // accept "22c55e" or "#22c55e"
  const t = s.startsWith("#") ? s : `#${s}`;
  const ok = /^#[0-9a-fA-F]{6}$/.test(t);
  return ok ? t.toLowerCase() : PRESETS.green;
}

export function getPresetTint(preset: GMFNTintPreset, customTint: string): string {
  if (preset === "custom") return clampHex(customTint);
  return PRESETS[preset];
}

export function loadTheme(): GMFNThemeState {
  const presetRaw = (localStorage.getItem(KEY_PRESET) || "green").toLowerCase();
  const preset: GMFNTintPreset =
    presetRaw === "black" || presetRaw === "pink" || presetRaw === "custom" ? (presetRaw as GMFNTintPreset) : "green";

  const storedTint = localStorage.getItem(KEY_TINT) || PRESETS.green;
  const tint = clampHex(storedTint);

  return { preset, tint };
}

export function saveTheme(next: GMFNThemeState) {
  localStorage.setItem(KEY_PRESET, next.preset);
  localStorage.setItem(KEY_TINT, clampHex(next.tint));
}

export function applyThemeToDocument(theme: GMFNThemeState) {
  const tint = getPresetTint(theme.preset, theme.tint);

  // ONLY variable users can influence (watermark + emboss tint)
  document.documentElement.style.setProperty("--gmfn-tint", tint);

  // We also keep a computed faint tint (still derived from the same one input).
  // Not user-editable separately.
  document.documentElement.style.setProperty("--gmfn-tint-soft", tint);
}

export function setThemePreset(preset: GMFNTintPreset) {
  const cur = loadTheme();
  const next: GMFNThemeState = { ...cur, preset };
  if (preset !== "custom") next.tint = PRESETS[preset];
  saveTheme(next);
  applyThemeToDocument(next);
}

export function setThemeCustomTint(hex: string) {
  const cur = loadTheme();
  const next: GMFNThemeState = { preset: "custom", tint: clampHex(hex) };
  saveTheme(next);
  applyThemeToDocument(next);
}

export function initThemeOnce() {
  // call on app start
  const t = loadTheme();
  applyThemeToDocument(t);
}