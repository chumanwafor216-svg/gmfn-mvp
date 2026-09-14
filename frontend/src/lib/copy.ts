// frontend/src/lib/copy.ts
import { safeCopy } from "./api";

export const copy = {
  appName: "GSN",
  labels: {
    guarantor: "Supporter",
    guarantors: "Supporters",
    exposureAdmin: "Safety & Risk (Admin)",
    lockManagement: "Protection Holds",
    evidencePack: "Evidence Pack (PDF)",
    trustSlip: "TrustSlip",
  },
  trust: {
    headline: "Your Trust Record",
    sub: "Trust evidence grows when governed records show completed responsibility.",
    rule: "Trust evidence improves only when governed records show completed responsibility.",
    progressHeadline: "Progress stage",
    progressSub:
      "This is just encouragement. It does not change your Trust Record. It helps you stay consistent.",
  },
  payment: {
    headline: "How to Pay Back",
    sub:
      "Use the bank details below. Add the reference exactly so your repayment can be matched.",
    disclaimer:
      "This is not an auto-debit. Payments are made manually via your bank.",
  },
  trustslip: {
    headline: "TrustSlip",
    sub:
      "A TrustSlip shows GSN evidence your community can currently review, based on completed records.",
    disclaimer:
      "This is not a bank guarantee, credit approval, payment instruction, or release authority. It is community evidence with an audit trail.",
  },
};
export async function copyText(text: string): Promise<void> {
  const t = String(text || "").trim();
  if (!t) return;

  safeCopy(t);
}
