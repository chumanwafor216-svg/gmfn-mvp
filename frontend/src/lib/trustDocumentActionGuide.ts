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
      "Use the quick actions here to carry the stable identity facts forward before you move into trust evidence or continuity repair.",
    cards: [
      {
        id: "gmfn-id",
        title: "Copy the stable identifier first",
        detail:
          "Use GSN ID when someone needs the one identity reference that should stay steady across communities and evidence changes.",
      },
      {
        id: "trustslip-code",
        title: "Use the TrustSlip code only when a public check is needed",
        detail:
          "Copy the TrustSlip code when you are moving from identity into a portable evidence check, not as a substitute for the full identity reading.",
      },
      {
        id: "snapshot",
        title: "Use the identity snapshot for context",
        detail:
          "Copy the identity snapshot when you want one short summary of identity, continuity, local evidence, wider consistency, and the next clean step in one piece.",
      },
    ],
    footer:
      "When the question becomes why the evidence reading is changing or what public record is safe to show, continue into Trust Passport or TrustSlip instead of staying here alone.",
  };
}

export function buildTrustPassportActionGuide(): TrustDocumentActionGuideContent {
  return {
    eyebrow: "Use these actions well",
    title: "Trust Passport is the fuller personal evidence record",
    intro:
      "These actions help you refresh the reading, carry out a clean summary, or move from the personal evidence record into the public verification side.",
    cards: [
      {
        id: "refresh",
        title: "Refresh before sharing when the reading may have changed",
        detail:
          "Use refresh when you want the latest evidence posture, recent event mix, and repair path before you rely on the visible reading.",
      },
      {
        id: "snapshot",
        title: "Copy the evidence snapshot for the fuller explanation",
        detail:
          "Use the evidence snapshot when someone needs the short evidence summary with evidence posture, local evidence, wider consistency, TrustSlip code, and the next clean step.",
      },
      {
        id: "verify",
        title: "Use TrustSlip Verify for the outward-facing check",
        detail:
          "Open TrustSlip Verify when the question is current public validity, not the full personal why behind the reading.",
      },
    ],
    footer:
      "Print is best for carrying the current passport-style record; verification is best for a quick outside evidence check.",
  };
}

export function buildTrustSlipActionGuide(): TrustDocumentActionGuideContent {
  return {
    eyebrow: "Use these actions well",
    title: "TrustSlip is the portable evidence document",
    intro:
      "The action row here is for carrying an outward-facing record cleanly without confusing the portable summary with the fuller personal evidence record.",
    cards: [
      {
        id: "code",
        title: "Copy the code when someone will verify it themselves",
        detail:
          "Use the TrustSlip code when the other side will run the public verification check directly from the code.",
      },
      {
        id: "verify-link",
        title: "Use the verify link when you need a direct public page",
        detail:
          "Copy the verify link when you want the other person to open the current public reading without retyping the code.",
      },
      {
        id: "snapshot",
        title: "Use the TrustSlip snapshot for a short portable summary",
        detail:
          "Copy the TrustSlip snapshot when you need one clean text summary of the holder, evidence posture, evidence boundary signal, wider consistency, expiry, and verify path.",
      },
    ],
    footer:
      "Print the document when the portable summary itself matters. Move back into Trust Passport when the person needs the fuller evidence, change path, or repair context.",
  };
}

export function buildTrustSlipVerifyActionGuide(): TrustDocumentActionGuideContent {
  return {
    eyebrow: "Use these actions well",
    title: "TrustSlip Verify checks current public validity",
    intro:
      "These actions are for checking and carrying the public reading cleanly without pretending this page replaces the fuller evidence explanation.",
    cards: [
      {
        id: "verify",
        title: "Copy the verify link when the public check must be repeatable",
        detail:
          "Use the verify link when another person needs to reopen the same verification result directly from the public page.",
      },
      {
        id: "snapshot",
        title: "Use the verification snapshot for a quick checked summary",
        detail:
          "Copy the verification snapshot when you need a short record of visible evidence posture, validity, dates, and the current verification link.",
      },
      {
        id: "passport",
        title: "Return to Trust Passport for the fuller explanation",
        detail:
          "Go back to Trust Passport when the question moves from public validity into why the evidence reading looks the way it does.",
      },
    ],
    footer:
      "Printing this page is useful for carrying the current public reading. It is not the substitute for the fuller personal evidence record.",
  };
}
