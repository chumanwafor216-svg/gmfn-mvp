/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const loanFile = "src/pages/LoanSummaryPage.tsx";
const repaymentFile = "src/pages/RepaymentPage.tsx";
const loanSource = readFileSync(join(frontendRoot, loanFile), "utf8");
const repaymentSource = readFileSync(join(frontendRoot, repaymentFile), "utf8");
const findings = [];

function addFinding(file, message) {
  findings.push({ file, message });
}

function assertContains(file, source, pattern, message) {
  if (!pattern.test(source)) addFinding(file, message);
}

assertContains(
  loanFile,
  loanSource,
  /data-gsn-loan-summary-phone="simple"[\s\S]*?data-gsn-loan-summary-phone-front="simple"[\s\S]*?data-gsn-loan-summary-phone-facts="compact-four"[\s\S]*?State[\s\S]*?Remaining[\s\S]*?Support recorded[\s\S]*?Waiting/,
  "Loan Summary phone front must show one state-led card and four compact facts."
);

assertContains(
  loanFile,
  loanSource,
  /phonePrimaryIsSupporterReview[\s\S]*?Review supporters[\s\S]*?phonePrimaryIsWorkbench[\s\S]*?Continue support[\s\S]*?canRepay[\s\S]*?Continue repayment[\s\S]*?View record/,
  "Loan Summary phone primary action must follow the real support state."
);

assertContains(
  loanFile,
  loanSource,
  /GSN records support evidence\. It does not approve the whole[\s\S]*?request, move money, or promise repayment\./,
  "Loan Summary must keep the support, money-movement, and repayment boundary on the first phone surface."
);

assertContains(
  loanFile,
  loanSource,
  /debugId="loan-summary\.phone\.back"[\s\S]*?Back to summary[\s\S]*?data-gsn-loan-summary-phone-lane="supporters"[\s\S]*?data-gsn-loan-summary-phone-lane="record"[\s\S]*?data-gsn-loan-summary-phone-lane="tools"/,
  "Loan Summary phone details must replace the front door and expose an in-page return."
);

assertContains(
  loanFile,
  loanSource,
  /data-gsn-loan-summary-phone-lane="supporters"[\s\S]*?handleGuarantorDecision\(guarantor, "approved"\)[\s\S]*?handleGuarantorDecision\(guarantor, "declined"\)/,
  "Loan Summary phone supporter lane must preserve individual record/decline actions."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /data-gsn-repayment-phone="simple"[\s\S]*?data-gsn-repayment-phone-state=\{[\s\S]*?"awaiting-reconciliation"[\s\S]*?"payment-details"[\s\S]*?"choose-amount"[\s\S]*?data-gsn-repayment-phone-facts="compact-four"[\s\S]*?Outstanding[\s\S]*?Selected[\s\S]*?Paid already[\s\S]*?Due/,
  "Repayment phone must expose one state-driven process and four compact facts."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /debugId="repayment\.phone\.get-payment-details"[\s\S]*?Get payment details[\s\S]*?debugId="repayment\.phone\.toggle-part-payment"[\s\S]*?Pay a different amount[\s\S]*?Part payment/,
  "Repayment phone must default to full payment details while preserving an explicit part-payment path."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /data-gsn-repayment-phone-task="payment"[\s\S]*?Payment details[\s\S]*?Only tap[\s\S]*?I have paid[\s\S]*?after sending the money[\s\S]*?Copy reference[\s\S]*?handleConfirmPaymentMade\(\)/,
  "Repayment phone payment state must show exact details and keep declaration honest."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /Sent for checking[\s\S]*?must still match the money before repayment is confirmed[\s\S]*?data-gsn-repayment-phone-task="awaiting-reconciliation"[\s\S]*?support item is not closed[\s\S]*?supporter exposure is not released until reconciliation/,
  "Repayment completion state must remain a declaration awaiting reconciliation."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /PaymentProofSubmissionPanel[\s\S]*?debugIdPrefix="repayment-phone-proof"[\s\S]*?Payment still needs reconciliation/,
  "Repayment phone status detail must preserve proof upload without implying confirmation."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /GSN records the instruction and declaration\. It does not hold the[\s\S]*?money or confirm receipt before reconciliation\./,
  "Repayment first phone surface must preserve the non-custodial reconciliation boundary."
);

if (findings.length > 0) {
  console.error("Loan Summary / Repayment simple-phone audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Loan Summary / Repayment simple-phone audit passed.");
