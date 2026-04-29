// src/ui/styles.ts
import type React from "react";

export function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(9,27,46,0.14)",
    borderRadius: 18,
    padding: 16,
    background:
      "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(242,247,252,0.985) 100%)",
    boxShadow:
      "0 16px 34px rgba(7,20,36,0.07), inset 0 1px 0 rgba(255,255,255,0.84)",
  };
}

export function softCardStyle(): React.CSSProperties {
  return {
    ...cardStyle(),
    background:
      "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.09) 0%, rgba(201,154,39,0) 28%), linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)",
    boxShadow:
      "0 14px 30px rgba(7,20,36,0.055), inset 0 1px 0 rgba(255,255,255,0.84)",
  };
}

export function btnStyle(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(9,27,46,0.14)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(242,247,252,0.99) 100%)",
    color: "#091B2E",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 14px 28px rgba(7,20,36,0.055), inset 0 1px 0 rgba(255,255,255,0.86)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

export function btnPrimaryStyle(): React.CSSProperties {
  return {
    ...btnStyle(),
    background: "linear-gradient(180deg, #0C4FA8 0%, #0A63C8 100%)",
    border: "1px solid rgba(8,48,110,0.34)",
    color: "#F8FBFF",
    boxShadow:
      "0 18px 32px rgba(8,37,74,0.16), inset 0 1px 0 rgba(255,255,255,0.20)",
  };
}

export function pillStyle(kind: "blue" | "green" | "gray" | "red" | "gold"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(9,27,46,0.10)",
    background: "rgba(243,247,252,0.96)",
    color: "#344759",
    whiteSpace: "nowrap",
  };
  if (kind === "green") return { ...base, color: "#0E5C4E", background: "#EEF8F3", borderColor: "#BDDCCD" };
  if (kind === "blue") return { ...base, color: "#0C4FA8", background: "#EEF4FB", borderColor: "rgba(12,79,168,0.18)" };
  if (kind === "red") return { ...base, color: "#8E1F27", background: "#FBF0F0", borderColor: "#E9C8C8" };
  if (kind === "gold") return { ...base, color: "#8A6515", background: "#FCF7E8", borderColor: "#E6D094" };
  return base;
}
