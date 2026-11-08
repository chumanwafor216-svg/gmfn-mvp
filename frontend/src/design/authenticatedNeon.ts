import type React from "react";

export type AuthenticatedStaticNeonTone =
  | "cyanViolet"
  | "cyanGold"
  | "goldViolet";

export const AUTHENTICATED_STATIC_NEON_STAGE =
  "radial-gradient(circle at 4% 18%, rgba(31,220,255,0.13) 0%, rgba(31,220,255,0) 28%), radial-gradient(circle at 96% 34%, rgba(220,72,255,0.12) 0%, rgba(220,72,255,0) 30%), radial-gradient(circle at 50% 8%, rgba(242,207,119,0.08) 0%, rgba(242,207,119,0) 24%), linear-gradient(180deg, #061A2E 0%, #031426 52%, #051B31 100%)";

const STATIC_NEON_TONES: Record<
  AuthenticatedStaticNeonTone,
  { border: string; left: string; right: string; halo: string }
> = {
  cyanViolet: {
    border: "rgba(91,226,255,0.52)",
    left: "rgba(31,220,255,0.16)",
    right: "rgba(220,72,255,0.14)",
    halo: "rgba(123,97,255,0.08)",
  },
  cyanGold: {
    border: "rgba(91,226,255,0.46)",
    left: "rgba(31,220,255,0.15)",
    right: "rgba(242,207,119,0.14)",
    halo: "rgba(242,207,119,0.07)",
  },
  goldViolet: {
    border: "rgba(242,207,119,0.46)",
    left: "rgba(242,207,119,0.14)",
    right: "rgba(220,72,255,0.13)",
    halo: "rgba(220,72,255,0.07)",
  },
};

const VIVID_STATIC_NEON_TONES: typeof STATIC_NEON_TONES = {
  cyanViolet: {
    border: "rgba(91,226,255,0.82)",
    left: "rgba(31,220,255,0.34)",
    right: "rgba(220,72,255,0.28)",
    halo: "rgba(123,97,255,0.18)",
  },
  cyanGold: {
    border: "rgba(91,226,255,0.74)",
    left: "rgba(31,220,255,0.30)",
    right: "rgba(242,207,119,0.24)",
    halo: "rgba(242,207,119,0.15)",
  },
  goldViolet: {
    border: "rgba(242,207,119,0.72)",
    left: "rgba(242,207,119,0.26)",
    right: "rgba(220,72,255,0.26)",
    halo: "rgba(220,72,255,0.15)",
  },
};

const STATIC_NEON_ACTION_TONES = {
  cyanViolet: {
    quiet: {
      border: "rgba(52,211,255,0.52)",
      shadow:
        "0 0 9px rgba(31,203,255,0.24), 0 0 16px rgba(117,73,255,0.12), inset 0 1px 0 rgba(255,255,255,0.90)",
    },
    strong: {
      border: "rgba(85,232,255,0.94)",
      shadow:
        "0 0 11px rgba(0,224,255,0.82), 0 0 20px rgba(221,43,255,0.58), inset 0 1px 0 rgba(255,255,255,0.22)",
    },
  },
  cyanGold: {
    quiet: {
      border: "rgba(91,226,255,0.50)",
      shadow:
        "0 0 9px rgba(31,203,255,0.20), 0 0 16px rgba(242,207,119,0.12), inset 0 1px 0 rgba(255,255,255,0.90)",
    },
    strong: {
      border: "rgba(242,207,119,0.82)",
      shadow:
        "0 0 12px rgba(31,220,255,0.48), 0 0 22px rgba(242,207,119,0.34), inset 0 1px 0 rgba(255,255,255,0.24)",
    },
  },
} as const;

export function authenticatedStaticNeonFrame(
  tone: AuthenticatedStaticNeonTone,
  strength: "soft" | "standard" | "vivid" = "standard"
): React.CSSProperties {
  const palette =
    strength === "vivid" ? VIVID_STATIC_NEON_TONES[tone] : STATIC_NEON_TONES[tone];
  const sideBlur = strength === "soft" ? 14 : strength === "vivid" ? 26 : 20;
  const sideSpread = strength === "soft" ? 3 : strength === "vivid" ? 7 : 5;
  const haloBlur = strength === "soft" ? 16 : strength === "vivid" ? 34 : 24;

  return {
    border: `1px solid ${palette.border}`,
    outline: `1px solid ${palette.halo}`,
    outlineOffset: 1,
    boxShadow: `-${sideSpread}px 0 ${sideBlur}px ${palette.left}, ${sideSpread}px 0 ${sideBlur}px ${palette.right}, 0 16px 34px rgba(2,16,38,0.16), 0 0 ${haloBlur}px ${palette.halo}, inset 0 1px 0 rgba(255,255,255,0.88)`,
  };
}

export function authenticatedStaticNeonAction(
  tone: "cyanViolet" | "cyanGold" = "cyanViolet",
  strength: "quiet" | "strong" = "quiet"
): React.CSSProperties {
  const palette = STATIC_NEON_ACTION_TONES[tone][strength];

  return {
    border: `1px solid ${palette.border}`,
    boxShadow: palette.shadow,
  };
}
