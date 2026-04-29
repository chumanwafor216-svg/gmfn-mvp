export type TrustDocumentActionGuideCard = {
  id: string;
  title: string;
  detail: string;
};

export type TrustDocumentActionGuideContent = {
  eyebrow: string;
  title: string;
  intro: string;
  cards: TrustDocumentActionGuideCard[];
  footer?: string;
};

export function buildIdentityActionGuide(): TrustDocumentActionGuideContent {
  return {
    eyebrow: "Use these actions well",
    title: "Identity gives you a stable anchor",
    intro:
      "Use the quick actions here to carry the stable identity facts forward before you move into trust proof or continuity repair.",
    cards: [
      {
        id: "gmfn-id",
        title: "Copy the stable identifier first",
        detail:
          "Use GMFN ID when someone needs the one identity reference that should stay steady across communities and trust changes.",
      },
      {
        id: "trustslip-code",
        title: "Use the TrustSlip code only when proof is needed",
        detail:
          "Copy the TrustSlip code when you are moving from identity into a portable trust check, not as a substitute for the full identity reading.",
      },
      {
        id: "snapshot",
        title: "Use the identity snapshot for context",
        detail:
          "Copy the identity snapshot when you want one short summary of identity, continuity, open trust, CCI, and the next clean step in one piece.",
      },
    ],
    footer:
      "When the question becomes why trust is changing or what public proof is safe to show, continue into Trust Passport or TrustSlip instead of staying here alone.",
  };
}

export function buildTrustPassportActionGuide(): TrustDocumentActionGuideContent {
  return {
    eyebrow: "Use these actions well",
    title: "Trust Passport is the fuller personal record",
    intro:
      "These actions help you refresh the reading, carry out a clean summary, or move from the personal trust story into the public verification side.",
    cards: [
      {
        id: "refresh",
        title: "Refresh before sharing when the reading may have changed",
        detail:
          "Use refresh when you want the latest trust posture, recent event mix, and repair path before you rely on the visible reading.",
      },
      {
        id: "snapshot",
        title: "Copy the trust snapshot for the fuller explanation",
        detail:
          "Use the trust snapshot when someone needs the short trust story with band, score, Open Trust, CCI, TrustSlip code, and the next clean step.",
      },
      {
        id: "verify",
        title: "Use TrustSlip Verify for the outward-facing proof",
        detail:
          "Open TrustSlip Verify when the question is current public validity, not the full personal why behind the reading.",
      },
    ],
    footer:
      "Print is best for carrying the current passport-style record; verification is best for a quick outside trust check.",
  };
}

export function buildTrustSlipActionGuide(): TrustDocumentActionGuideContent {
  return {
    eyebrow: "Use these actions well",
    title: "TrustSlip is the portable trust document",
    intro:
      "The action row here is for carrying outward-facing proof cleanly without confusing the portable summary with the fuller personal trust record.",
    cards: [
      {
        id: "code",
        title: "Copy the code when someone will verify it themselves",
        detail:
          "Use the TrustSlip code when the other side will run the public verification check directly from the code.",
      },
      {
        id: "verify-link",
        title: "Use the verify link when you need a direct public route",
        detail:
          "Copy the verify link when you want the other person to open the current public reading without retyping the code.",
      },
      {
        id: "snapshot",
        title: "Use the TrustSlip snapshot for a short portable summary",
        detail:
          "Copy the TrustSlip snapshot when you need one clean text summary of the holder, band, trust limit, CCI, expiry, and verify path.",
      },
    ],
    footer:
      "Print the document when the portable summary itself matters. Move back into Trust Passport when the person needs the fuller why, change path, or repair story.",
  };
}

export function buildTrustSlipVerifyActionGuide(): TrustDocumentActionGuideContent {
  return {
    eyebrow: "Use these actions well",
    title: "TrustSlip Verify confirms current public validity",
    intro:
      "These actions are for confirming and carrying the public reading cleanly without pretending this page replaces the fuller trust explanation.",
    cards: [
      {
        id: "verify",
        title: "Copy the verify link when the public check must be repeatable",
        detail:
          "Use the verify link when another person needs to reopen the same verification result directly from the public page.",
      },
      {
        id: "snapshot",
        title: "Use the verification snapshot for a quick confirmed summary",
        detail:
          "Copy the verification snapshot when you need a short record of visible band, visible score, validity, dates, and the current verify route.",
      },
      {
        id: "passport",
        title: "Return to Trust Passport for the fuller explanation",
        detail:
          "Go back to Trust Passport when the question moves from public validity into why the trust reading looks the way it does.",
      },
    ],
    footer:
      "Printing this page is useful for carrying the current public confirmation. It is not the substitute for the fuller personal trust story.",
  };
}
