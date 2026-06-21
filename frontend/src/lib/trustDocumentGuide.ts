import type { NextActionGuideItem } from "../components/NextActionGuide";

export function buildIdentityIntegrityGuideItems(): NextActionGuideItem[] {
  return [
    {
      id: "trust-passport",
      label: "Open Trust Passport",
      detail:
        "Use Trust Passport when you want the fuller why, repair path, public-record meaning, and current trust posture that sit beside this identity reading.",
      to: "/app/trust",
      keywords: ["trust", "passport", "repair", "evidence", "why"],
      tone: "primary",
    },
    {
      id: "cci",
      label: "Open consistency reading",
      detail:
        "Go here when you want the cross-community consistency reading by itself without staying inside the wider identity surface.",
      to: "/app/cci-reading",
      keywords: ["cci", "cross-community", "integrity", "reading"],
      tone: "secondary",
    },
    {
      id: "trust-slip",
      label: "Open TrustSlip",
      detail:
        "Open TrustSlip when you need the portable document, verify code, and outward-facing trust summary that can travel with you.",
      to: "/app/trust-slip",
      keywords: ["trustslip", "portable", "verify", "document", "code"],
      tone: "soft",
    },
  ];
}

export function buildCciGuideItems(): NextActionGuideItem[] {
  return [
    {
      id: "identity",
      label: "Open Identity & Integrity",
      detail:
        "Use the wider identity route when you want the fuller verification, continuity, and identity story around this consistency reading.",
      to: "/app/identity",
      keywords: ["identity", "integrity", "verification", "continuity", "cci"],
      tone: "primary",
    },
    {
      id: "trust-passport",
      label: "Open Trust Passport",
      detail:
        "Go to Trust Passport when you want the personal trust explanation, repair path, and public-record context around the same reading.",
      to: "/app/trust",
      keywords: ["trust", "passport", "repair", "evidence", "community"],
      tone: "secondary",
    },
    {
      id: "trust-slip",
      label: "Open TrustSlip",
      detail:
        "Use TrustSlip when you need the portable document, verify code, and public-facing trust summary that can travel with you.",
      to: "/app/trust-slip",
      keywords: ["trustslip", "portable", "verify", "document", "code"],
      tone: "soft",
    },
  ];
}

export function buildTrustSlipGuideItems(): NextActionGuideItem[] {
  return [
    {
      id: "trust-slip-verify",
      label: "Open TrustSlip Verify",
      detail:
        "Use the verify surface when you need to confirm the public code, visible trust reading, and current validity quickly.",
      to: "/app/trust-slip/verify",
      keywords: ["verify", "code", "public", "validity", "trustslip"],
      tone: "primary",
    },
    {
      id: "trust-passport",
      label: "Open Trust Passport",
      detail:
        "Return to Trust Passport when you want the fuller why, change path, repair path, and explainable trust journey.",
      to: "/app/trust",
      keywords: ["passport", "why", "repair", "journey", "trust"],
      tone: "secondary",
    },
    {
      id: "identity",
      label: "Open Identity & Integrity",
      detail:
        "Open Identity & Integrity when you want the wider verification and consistency context that sits behind the portable trust summary.",
      to: "/app/identity",
      keywords: ["identity", "integrity", "cci", "verification"],
      tone: "soft",
    },
  ];
}

export function buildTrustSlipVerifyGuideItems(
  isAppRoute: boolean
): NextActionGuideItem[] {
  const passportRoute = isAppRoute ? "/app/trust" : "/guide";
  const passportLabel = isAppRoute ? "Open Trust Passport" : "Open My GSN and I";
  const passportDetail = isAppRoute
    ? "Go to Trust Passport when you need the fuller trust explanation behind this public verification result."
    : "Go back to My GSN and I when you want the wider guided product path after checking this verification result.";

  return [
    {
      id: "trust-slip",
      label: "Open TrustSlip",
      detail:
        "Return to TrustSlip when you want the portable trust summary, document notes, and issue context that sit behind this verification page.",
      to: "/app/trust-slip",
      keywords: ["trustslip", "summary", "portable", "document", "verify"],
      tone: "primary",
      disabled: !isAppRoute,
      disabledReason: "TrustSlip opens inside the signed-in app flow.",
    },
    {
      id: "passport",
      label: passportLabel,
      detail: passportDetail,
      to: passportRoute,
      keywords: ["passport", "guide", "trust", "why", "next"],
      tone: "secondary",
    },
    {
      id: "identity",
      label: "Open Identity & Integrity",
      detail:
        "Use Identity & Integrity when you want the wider consistency, verification, and continuity reading behind the same trust story.",
      to: "/app/identity",
      keywords: ["identity", "integrity", "cci", "verification"],
      tone: "soft",
      disabled: !isAppRoute,
      disabledReason: "Identity & Integrity opens inside the signed-in app flow.",
    },
  ];
}
