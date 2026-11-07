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

export function authenticatedStaticNeonFrame(
  tone: AuthenticatedStaticNeonTone,
  strength: "soft" | "standard" = "standard"
): React.CSSProperties {
  const palette = STATIC_NEON_TONES[tone];
  const sideBlur = strength === "soft" ? 14 : 20;
  const sideSpread = strength === "soft" ? 3 : 5;
  const haloBlur = strength === "soft" ? 16 : 24;

  return {
    border: `1px solid ${palette.border}`,
    outline: `1px solid ${palette.halo}`,
    outlineOffset: 1,
    boxShadow: `-${sideSpread}px 0 ${sideBlur}px ${palette.left}, ${sideSpread}px 0 ${sideBlur}px ${palette.right}, 0 16px 34px rgba(2,16,38,0.16), 0 0 ${haloBlur}px ${palette.halo}, inset 0 1px 0 rgba(255,255,255,0.88)`,
  };
}
