export type TrustDocumentFamilyItem = {
  id: string;
  label: string;
  title: string;
  detail: string;
  to?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function buildTrustDocumentFamilyItems(
  isAppRoute: boolean
): TrustDocumentFamilyItem[] {
  return [
    {
      id: "identity",
      label: "Stable identity",
      title: "Identity & Integrity",
      detail:
        "This is the steady identity layer. It keeps the owner, continuity, local trust, wider consistency, and next clean repair path together.",
      to: isAppRoute ? "/app/identity" : undefined,
      disabled: !isAppRoute,
      disabledReason: !isAppRoute
        ? "Identity & Integrity opens inside the signed-in app flow."
        : undefined,
    },
    {
      id: "cci",
      label: "Cross-community reading",
      title: "Cross-community consistency",
      detail:
        "This is the narrower cross-community consistency read. It helps you see how visible trust behaviour looks outside one immediate community.",
      to: isAppRoute ? "/app/cci-reading" : undefined,
      disabled: !isAppRoute,
      disabledReason: !isAppRoute
        ? "Cross-community consistency opens inside the signed-in app flow."
        : undefined,
    },
    {
      id: "passport",
      label: "Personal trust story",
      title: "Trust Passport",
      detail:
        "Trust Passport is the fuller personal record. It explains what is helping, what needs care, what evidence supports the reading, and what repair comes next.",
      to: isAppRoute ? "/app/trust" : undefined,
      disabled: !isAppRoute,
      disabledReason: !isAppRoute
        ? "Trust Passport opens inside the signed-in app flow."
        : undefined,
    },
    {
      id: "trust-slip",
      label: "Portable record",
      title: "TrustSlip",
      detail:
        "TrustSlip is the portable trust document. It carries the outward-facing trust summary, code, expiry, and verification link in one shareable surface.",
      to: isAppRoute ? "/app/trust-slip" : undefined,
      disabled: !isAppRoute,
      disabledReason: !isAppRoute
        ? "TrustSlip opens inside the signed-in app flow."
        : undefined,
    },
    {
      id: "verify",
      label: "Public validity check",
      title: "TrustSlip Verify",
      detail:
        "TrustSlip Verify checks the current public reading and whether a supplied TrustSlip code still points to a visible current record right now.",
      to: isAppRoute ? "/app/trust-slip/verify" : undefined,
      disabled: !isAppRoute,
      disabledReason: !isAppRoute
        ? "TrustSlip Verify needs a live TrustSlip code or the signed-in app page."
        : undefined,
    },
  ];
}
