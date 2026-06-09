/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = "src/pages/PayoutDetailsPage.tsx";
const text = readFileSync(join(frontendRoot, file), "utf8");
const findings = [];

function assertContains(pattern, message) {
  if (!pattern.test(text)) {
    findings.push({
      message,
      text: "Expected payout-details protocol pattern was not found.",
    });
  }
}

function assertNotContains(pattern, message) {
  if (pattern.test(text)) {
    findings.push({
      message,
      text: "Forbidden payout-details protocol pattern was found.",
    });
  }
}

assertContains(
  /import \{ TrustPaperIcon, type TrustPaperIconName \} from "\.\.\/components\/TrustPaperMarks";/,
  "Payout Details must use app-native SVG pictograms instead of emoji or bare text-only controls."
);

assertContains(
  /type PayoutForm = \{[\s\S]*?sort_code: string;[\s\S]*?\};[\s\S]*?function normalizeSortCode[\s\S]*?function buildPayoutNote\(form: PayoutForm\)[\s\S]*?UK Sort code:[\s\S]*?function buildPayoutSummary\(form: PayoutForm\): string[\s\S]*?UK Sort Code:/,
  "Payout Details must keep UK sort code in state, note payload, and copied summary until a dedicated backend field exists."
);

assertContains(
  /sort_code: normalizeSortCode\(form\.sort_code\) \|\| undefined,[\s\S]*?bank_sort_code: normalizeSortCode\(form\.sort_code\) \|\| undefined,[\s\S]*?const saved = await updateWithdrawalDestination\(payload\);/,
  "Payout Details must send sort code as real API fields and use the server upsert path so existing destinations do not fall back to local-only saves."
);

assertContains(
  /server\?\.sort_code[\s\S]*?server\?\.bank_sort_code[\s\S]*?local\?\.sort_code[\s\S]*?extractSortCodeFromNote\(server\?\.note\)/,
  "Payout Details must read sort code from future server fields, local fallback, or the current note fallback."
);

assertContains(
  /debugId="payout-details\.save"[\s\S]*?debugId="payout-details\.copy-summary"[\s\S]*?debugId="payout-details\.clear-local"[\s\S]*?\{err \? <div style=\{\{ \.\.\.feedbackCard\(false\), marginTop: 14 \}\}>\{err\}<\/div> : null\}[\s\S]*?\{msg \? <div style=\{\{ \.\.\.feedbackCard\(true\), marginTop: 14 \}\}>\{msg\}<\/div> : null\}/,
  "Payout save/copy/clear responses must render directly under the action row where the action happened."
);

assertContains(
  /GSN records the destination\. It does not move money from this page\./,
  "Payout Details must keep one concise custody boundary statement."
);

assertNotContains(
  /import ExplainToggle|<ExplainToggle|Why this matters|GSN does not hold funds/,
  "Payout Details must not restore the wordy top explainer, repeated why-this-matters card, or repeated custody paragraph."
);

assertNotContains(
  /[\u{1F300}-\u{1FAFF}]/u,
  "Payout Details must not use emoji as primary app icons."
);

if (findings.length > 0) {
  console.error("Payout Details protocol audit failed:");
  for (const finding of findings) {
    console.error(`- ${file}: ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Payout Details protocol audit passed.");
