// src/lib/appearance.ts
export type WatermarkPreset = "green" | "black" | "pink" | "custom";

const KEY_PRESET = "gmfn_wm_preset";
const KEY_CUSTOM = "gmfn_wm_custom_hex";

function clampHex(s: string): string | null {
  const t = (s || "").trim();
  const m = t.match(/^#?[0-9a-fA-F]{6}$/);
  if (!m) return null;
  return t.startsWith("#") ? t : `#${t}`;
}

export function getWatermarkPreset(): WatermarkPreset {
  const v = (localStorage.getItem(KEY_PRESET) || "").toLowerCase();
  if (v === "green" || v === "black" || v === "pink" || v === "custom") return v;
  return "green";
}

export function getWatermarkCustomHex(): string {
  return clampHex(localStorage.getItem(KEY_CUSTOM) || "") || "#111827";
}

export function setWatermarkPreset(preset: WatermarkPreset) {
  localStorage.setItem(KEY_PRESET, preset);
}

export function setWatermarkCustomHex(hex: string) {
  const v = clampHex(hex);
  if (v) localStorage.setItem(KEY_CUSTOM, v);
}

export function resolveWatermarkHex(): string {
  const preset = getWatermarkPreset();
  if (preset === "green") return "#16a34a"; // strong but we apply faint opacity in CSS
  if (preset === "black") return "#111827";
  if (preset === "pink") return "#db2777";
  return getWatermarkCustomHex();
}

/**
 * Apply CSS variables globally.
 * Only watermark tint is user-controlled.
 */
export function applyAppearanceToDocument() {
  const hex = resolveWatermarkHex();
  document.documentElement.style.setProperty("--gmfn-wm-tint", hex);
}