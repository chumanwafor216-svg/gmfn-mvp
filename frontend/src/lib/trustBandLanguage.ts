export type TrustBandLanguage = {
  band: string;
  title: string;
  plainMeaning: string;
  implication: string;
  nextStep: string;
  tone: "strong" | "good" | "care" | "danger";
};

export type TrustEvidenceStatus = "strong" | "mixed" | "limited";

export type TrustEvidenceLanguage = {
  status: TrustEvidenceStatus;
  label: string;
  plainMeaning: string;
  implication: string;
  tone: "strong" | "care";
};

export type ContextualEvidencePosture = {
  label: string;
  shortLabel: string;
  plainMeaning: string;
  boundary: string;
  tone: "strong" | "good" | "care";
};

export const TRUST_BAND_LANGUAGE: TrustBandLanguage[] = [
  {
    band: "A",
    title: "Strong visible evidence",
    plainMeaning:
      "The record has strong visible evidence from community behaviour, follow-through, and recorded trust signals.",
    implication:
      "Normal low-to-medium risk support, trade, or referral decisions may be considered, while still checking the current details and expiry.",
    nextStep: "Proceed carefully and match the size of the decision to the evidence shown.",
    tone: "strong",
  },
  {
    band: "B",
    title: "Good visible evidence",
    plainMeaning:
      "The record has useful evidence, but you should still check what kind of events created it.",
    implication:
      "A small or moderate decision may be reasonable. For bigger money, goods, work, or responsibility, ask for the fuller Trust Passport.",
    nextStep: "Proceed with care; ask for more evidence if the risk is meaningful.",
    tone: "good",
  },
  {
    band: "C",
    title: "Mixed evidence; verify before larger decisions",
    plainMeaning:
      "There is some trust evidence, but it may not be deep, recent, or consistent enough for a confident decision.",
    implication:
      "Keep the decision small, ask what changed, and look for contribution, repayment, commitment, or sponsor evidence.",
    nextStep: "Ask for more context before taking a risk.",
    tone: "care",
  },
  {
    band: "D",
    title: "Evidence needs strengthening; reduce exposure",
    plainMeaning:
      "The visible record has gaps, pressure, or follow-through signals that need more evidence. This is not a character judgement; it means the record is not strong enough yet.",
    implication:
      "Do not depend heavily on this record for credit, goods, work, or serious support. Reduce the amount, ask for repair evidence, or request community confirmation.",
    nextStep: "Ask what needs care and wait for stronger evidence before a serious decision.",
    tone: "care",
  },
  {
    band: "E",
    title: "Insufficient evidence for serious reliance",
    plainMeaning:
      "There is not enough reliable visible evidence, or the record has warning signs that need attention.",
    implication:
      "Do not use this TrustSlip or Trust Passport alone for a meaningful risk. Ask for direct verification, recent payments, completed commitments, or admin/community confirmation.",
    nextStep: "Do not rely on this alone. Require stronger evidence first.",
    tone: "danger",
  },
  {
    band: "F",
    title: "No usable evidence basis yet",
    plainMeaning:
      "The record is missing usable evidence or has a negative reading. You cannot make a careful trust decision from this alone.",
    implication:
      "Do not approve credit, release goods, accept responsibility, or make a serious referral from this record alone.",
    nextStep: "Ask the person to rebuild visible evidence before relying on the record.",
    tone: "danger",
  },
];

export const TRUST_BAND_SHORT_LABELS: Array<{
  band: "A" | "B" | "C" | "D" | "E";
  label: string;
}> = [
  { band: "A", label: "Strong evidence" },
  { band: "B", label: "Good evidence" },
  { band: "C", label: "Mixed evidence" },
  { band: "D", label: "Evidence building" },
  { band: "E", label: "Insufficient evidence" },
];

export const TRUST_EVIDENCE_LANGUAGE: Record<
  TrustEvidenceStatus,
  TrustEvidenceLanguage
> = {
  strong: {
    status: "strong",
    label: "Strong evidence",
    plainMeaning:
      "There is enough visible history to understand why the trust reading looks this way.",
    implication:
      "You can use the record as a useful trust signal, while still matching the decision to the risk.",
    tone: "strong",
  },
  mixed: {
    status: "mixed",
    label: "Mixed evidence",
    plainMeaning:
      "Some useful history is visible, but there are still gaps, pressure, or details that need checking.",
    implication:
      "Keep the decision careful. Ask for the fuller Trust Passport, recent events, or live community confirmation if the risk is meaningful.",
    tone: "care",
  },
  limited: {
    status: "limited",
    label: "Evidence still building",
    plainMeaning:
      "Only a small amount of usable trust history is visible so far. The record can still become stronger as more current evidence is added.",
    implication:
      "This does not mean bad behaviour. It means you should reduce the risk or ask for more evidence before relying on the record.",
    tone: "care",
  },
};

export const CONTEXTUAL_EVIDENCE_POSTURES: ContextualEvidencePosture[] = [
  {
    label: "Enduring record",
    shortLabel: "Enduring",
    plainMeaning:
      "A long-running pattern of confirmed community evidence is visible. Still check the current context, freshness, and limits before relying on it.",
    boundary:
      "This is a descriptive evidence posture, not a personal worth label, credit approval, guarantee, or automatic approval.",
    tone: "strong",
  },
  {
    label: "Established record",
    shortLabel: "Established",
    plainMeaning:
      "A steady pattern of confirmed participation and follow-through is visible in this context.",
    boundary:
      "Use the evidence beside the decision in front of you; it does not predict future behaviour or replace human judgement.",
    tone: "good",
  },
  {
    label: "Developing record",
    shortLabel: "Developing",
    plainMeaning:
      "A useful evidence pattern is forming, but bigger decisions still need recent events, provenance, or live community confirmation.",
    boundary:
      "This means the record is still maturing. It is not a character judgement.",
    tone: "care",
  },
  {
    label: "Emerging record",
    shortLabel: "Emerging",
    plainMeaning:
      "Some early evidence is visible, but the record is still thin, recent, or not yet proven across enough activity.",
    boundary:
      "Keep decisions small and ask for more current evidence before serious reliance.",
    tone: "care",
  },
  {
    label: "Insufficient confirmed evidence",
    shortLabel: "Insufficient",
    plainMeaning:
      "Not enough confirmed evidence is visible yet to support a serious decision from this record alone.",
    boundary:
      "A thin record is not the same as bad behaviour. Ask for context, current evidence, or direct community confirmation.",
    tone: "care",
  },
];

export function normalizeTrustBand(raw: unknown): string {
  const text = String(raw ?? "").trim().toUpperCase();
  const first = text.slice(0, 1);
  return /^[A-F]$/.test(first) ? first : "";
}

function normalizeEvidenceScore(raw: unknown): number | null {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function postureByIndex(index: number): ContextualEvidencePosture {
  return CONTEXTUAL_EVIDENCE_POSTURES[
    Math.max(0, Math.min(CONTEXTUAL_EVIDENCE_POSTURES.length - 1, index))
  ];
}

export function getContextualEvidencePosture(
  score: unknown,
  band?: unknown
): ContextualEvidencePosture {
  const numeric = normalizeEvidenceScore(score);
  if (numeric !== null) {
    if (numeric >= 80) return postureByIndex(0);
    if (numeric >= 60) return postureByIndex(1);
    if (numeric >= 40) return postureByIndex(2);
    if (numeric >= 20) return postureByIndex(3);
    return postureByIndex(4);
  }

  switch (normalizeTrustBand(band)) {
    case "A":
      return postureByIndex(0);
    case "B":
      return postureByIndex(1);
    case "C":
      return postureByIndex(2);
    case "D":
      return postureByIndex(3);
    case "E":
    case "F":
      return postureByIndex(4);
    default:
      return {
        label: "Evidence not shown",
        shortLabel: "Not shown",
        plainMeaning:
          "This public record does not show enough evidence posture detail yet.",
        boundary:
          "Do not make a serious decision from a missing reading. Ask for the current TrustSlip, Trust Passport, or community confirmation.",
        tone: "care",
      };
  }
}

export function normalizeTrustEvidenceStatus(raw: unknown): TrustEvidenceStatus {
  const text = String(raw ?? "").trim().toLowerCase();
  return text === "strong" || text === "mixed" || text === "limited"
    ? text
    : "limited";
}

export function getTrustBandShortLabel(raw: unknown): string {
  const band = normalizeTrustBand(raw);
  return TRUST_BAND_SHORT_LABELS.find((item) => item.band === band)?.label || "Not shown";
}

export function getTrustEvidenceLanguage(
  raw: unknown,
  options: { lowData?: boolean } = {}
): TrustEvidenceLanguage {
  if (options.lowData) {
    return {
      ...TRUST_EVIDENCE_LANGUAGE.limited,
      label: "Building history",
      plainMeaning:
        "This record is still building evidence. A thin record is not the same as bad trust.",
      implication:
        "Use this as an early identity and community signal only. Ask for recent events or live community confirmation before a serious decision.",
    };
  }
  return TRUST_EVIDENCE_LANGUAGE[normalizeTrustEvidenceStatus(raw)];
}

export function getTrustBandLanguage(raw: unknown): TrustBandLanguage {
  const band = normalizeTrustBand(raw);
  return (
    TRUST_BAND_LANGUAGE.find((item) => item.band === band) || {
      band: "Not shown",
      title: "No clear grade is available",
      plainMeaning:
        "GSN does not have a clear grade to explain on this screen yet.",
      implication:
        "Do not make a serious trust decision from the grade alone. Ask for the evidence behind the record.",
      nextStep: "Ask for the fuller Trust Passport or recent Trust Events.",
      tone: "care",
    }
  );
}
