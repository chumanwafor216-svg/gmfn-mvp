/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const loanFile = "src/pages/LoanSummaryPage.tsx";
const repaymentFile = "src/pages/RepaymentPage.tsx";
const statusLanguageFile = "src/lib/paymentStatusLanguage.ts";
const loanSource = readFileSync(join(frontendRoot, loanFile), "utf8");
const repaymentSource = readFileSync(join(frontendRoot, repaymentFile), "utf8");
const statusLanguageSource = readFileSync(
  join(frontendRoot, statusLanguageFile),
  "utf8"
);
const findings = [];

function addFinding(file, message) {
  findings.push({ file, message });
}

function assertContains(file, source, pattern, message) {
  if (!pattern.test(source)) addFinding(file, message);
}

assertContains(
  statusLanguageFile,
  statusLanguageSource,
  /supportRecordStatusLabel[\s\S]*?Waiting for supporters[\s\S]*?More support needed[\s\S]*?Support recorded[\s\S]*?Money sent[\s\S]*?Repayment active[\s\S]*?Repaid[\s\S]*?Needs review/,
  "Shared status language must translate support states into member readings."
);

assertContains(
  loanFile,
  loanSource,
  /data-gsn-loan-summary-phone="simple"[\s\S]*?data-gsn-loan-summary-phone-front="simple"[\s\S]*?Support record #[\s\S]*?data-gsn-loan-summary-phone-facts="compact-four"[\s\S]*?\["State", supportRecordStatusLabel\(summary\.status\)\][\s\S]*?Remaining[\s\S]*?Support recorded[\s\S]*?Waiting/,
  "Loan Summary phone front must show one state-led card and four compact facts."
);

assertContains(
  loanFile,
  loanSource,
  /function nextStepText\(status: string\)[\s\S]*?Review the people asked to support this request\.[\s\S]*?More support is needed\. Continue the request\.[\s\S]*?Support is recorded\. Check the money and repayment details\.[\s\S]*?Continue repayment\.[\s\S]*?Review the record to see what needs attention\./,
  "Loan Summary must translate each backend state into one short next step."
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
  loanFile,
  loanSource,
  /Support record[\s\S]*?More support tasks[\s\S]*?Copy record link[\s\S]*?Payment record[\s\S]*?Continue support[\s\S]*?Find supporters[\s\S]*?Check readiness[\s\S]*?Money breakdown[\s\S]*?Money record[\s\S]*?Make repayment[\s\S]*?All support requests/,
  "Loan Summary phone disclosures and onward routes must use direct task language."
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
  /Sent for checking[\s\S]*?must still match it to the money received[\s\S]*?data-gsn-repayment-phone-task="awaiting-reconciliation"[\s\S]*?support remains open[\s\S]*?supporters remain responsible until finance confirms the payment/,
  "Repayment completion state must remain a report awaiting finance confirmation."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /PaymentProofSubmissionPanel[\s\S]*?debugIdPrefix="repayment-phone-proof"[\s\S]*?The payment is not confirmed yet/,
  "Repayment phone status detail must preserve proof upload without implying confirmation."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /GSN records the payment details and what you report\. It does not[\s\S]*?hold the money or mark it received until finance checks it\./,
  "Repayment first phone surface must preserve the non-custodial confirmation boundary."
);

assertContains(
  statusLanguageFile,
  statusLanguageSource,
  /paymentRecordStatusLabel[\s\S]*?Waiting for payment[\s\S]*?Sent for checking[\s\S]*?Waiting to be matched[\s\S]*?Payment needs checking[\s\S]*?Payment confirmed/,
  "Shared status language must translate payment states into member readings."
);

assertContains(
  repaymentFile,
  repaymentSource,
  /Get the payment details\.[\s\S]*?Send the selected amount\.[\s\S]*?Payment is being checked\.[\s\S]*?paymentRecordStatusLabel\(/,
  "Repayment must give one direct next step and must not expose raw payment status codes."
);

if (findings.length > 0) {
  console.error("Loan Summary / Repayment simple-phone audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Loan Summary / Repayment simple-phone audit passed.");
