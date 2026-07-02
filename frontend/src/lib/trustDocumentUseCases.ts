import type { TrustDocumentFamilyItem } from "./trustDocumentFamilyMap";

export type TrustDocumentUseCaseItem = {
  id: string;
  question: string;
  title: string;
  detail: string;
  to?: string;
  disabled?: boolean;
  disabledReason?: string;
  active?: boolean;
};

export function buildTrustDocumentUseCaseItems(
  familyItems: TrustDocumentFamilyItem[],
  activeId?: string
): TrustDocumentUseCaseItem[] {
  const byId = new Map(familyItems.map((item) => [item.id, item]));

  return [
    {
      id: "cci",
      question: "How does trust behaviour read across visible communities without the full passport story?",
      title: "Use cross-community consistency for the narrower read",
      detail:
        "Use cross-community consistency when the question is the slimmer reading across communities and you do not yet need the full personal trust journey.",
      ...mapFamilyItem(byId.get("cci")),
      active: activeId === "cci",
    },
    {
      id: "identity",
      question: "Who is this person, and what holds steady across trust changes?",
      title: "Start with Identity & Integrity",
      detail:
        "Use the identity layer when the question is stable ownership, continuity, verification posture, or the narrower consistency context behind trust.",
      ...mapFamilyItem(byId.get("identity")),
      active: activeId === "identity",
    },
    {
      id: "passport",
      question: "Why does trust look this way, and what should be repaired next?",
      title: "Stay with Trust Passport",
      detail:
        "Use the fuller personal trust story when someone needs the why, the evidence behind the reading, and the next clean repair path.",
      ...mapFamilyItem(byId.get("passport")),
      active: activeId === "passport",
    },
    {
      id: "trust-slip",
      question: "What short record can I carry out without carrying the whole story?",
      title: "Carry TrustSlip",
      detail:
        "Use the portable record when the goal is to share a concise outward-facing reading with code, expiry, and a verification link.",
      ...mapFamilyItem(byId.get("trust-slip")),
      active: activeId === "trust-slip",
    },
    {
      id: "verify",
      question: "Does this public code still point to a valid current reading?",
      title: "Open TrustSlip Verify",
      detail:
        "Use public verification when the question is current validity right now, not the fuller private trust story behind it.",
      ...mapFamilyItem(byId.get("verify")),
      active: activeId === "verify",
    },
  ];
}

function mapFamilyItem(
  item: TrustDocumentFamilyItem | undefined
): Pick<TrustDocumentUseCaseItem, "to" | "disabled" | "disabledReason"> {
  return {
    to: item?.to,
    disabled: item?.disabled,
    disabledReason: item?.disabledReason,
  };
}
