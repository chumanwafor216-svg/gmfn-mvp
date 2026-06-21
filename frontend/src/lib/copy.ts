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
    headline: "Your Trust Score",
    sub: "Trust grows when you finish what you started — full repayment builds real confidence.",
    rule: "Trust only increases when a loan is fully repaid.",
    progressHeadline: "Progress (not a score)",
    progressSub:
      "This is just encouragement. It does not change your Trust Score. It helps you stay consistent.",
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
      "A TrustSlip shows how much trust your community can currently extend to you — based on completed repayments.",
    disclaimer:
      "This is not a bank guarantee. It is community-backed trust with an audit trail.",
  },
};
export async function copyText(text: string): Promise<void> {
  const t = String(text || "").trim();
  if (!t) return;

  safeCopy(t);
}
