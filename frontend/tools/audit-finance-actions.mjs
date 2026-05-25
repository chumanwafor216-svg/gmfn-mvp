/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

const financeFiles = [
  "src/pages/FinancePage.tsx",
  "src/pages/PaymentRailsPage.tsx",
  "src/pages/PaymentInstructionsPage.tsx",
  "src/pages/WithdrawalInstructionsPage.tsx",
  "src/pages/RevenueAllocationPage.tsx",
  "src/pages/BankConsolePage.tsx",
  "src/pages/PayoutDetailsPage.tsx",
  "src/components/PaymentInstructionsPanel.tsx",
];

function assertContains(file, pattern, message) {
  const text = read(file);

  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);

  text.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

function assertStableActionsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern =
    /<(?:PrimaryButton|SecondaryButton|SubtleButton|DangerButton|StableButton|StableCtaLink|StableDisclosureSummary)\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 1100);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Finance stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

financeFiles.forEach(assertStableActionsHaveDebugIds);

for (const file of financeFiles) {
  assertNotContains(
    file,
    /to=["']\/cover["']|to=["']\/welcome["']/,
    "Finance actions must not send signed-in users directly to Cover or Welcome."
  );
}

assertContains(
  "src/pages/FinancePage.tsx",
  /debugId=\{`finance\.tool\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`finance\.mini-tool\.\$\{tool\.label\.toLowerCase\(\)\.replace\(/,
  "Finance main tool grids must keep item-based debug IDs."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /import \{ brandClampLines, brandSingleLine \} from "\.\.\/styles\/gmfnBrand";[\s\S]*?function financeToolButtonStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?height: isCompact \? 120 : 144,[\s\S]*?maxHeight: isCompact \? 120 : 144,[\s\S]*?overflow: "hidden",[\s\S]*?function financeMiniToolButtonStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?height: isCompact \? 82 : 76,[\s\S]*?maxHeight: isCompact \? 82 : 76,[\s\S]*?overflow: "hidden",[\s\S]*?brandClampLines\(2\)[\s\S]*?brandSingleLine\(\)/,
  "Finance tool and mini-tool cards must keep fixed phone-safe heights and clamped text so labels cannot stretch or overlap action surfaces."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /to=\{routes\.loans\}[\s\S]*?debugId="finance\.open-loans"/,
  "Finance Loans & Support action must stay routed to the Loans surface."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /debugId="money-in\.generate-instruction"[\s\S]*?debugId="money-in\.refresh-route"[\s\S]*?debugId="money-in\.copy-reference"[\s\S]*?debugId="money-in\.copy-instruction"[\s\S]*?debugId="money-in\.confirm-paid"/,
  "Money In core instruction actions must remain traceable."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /debugId="money-in\.route\.finance"[\s\S]*?debugId="money-in\.route\.money-out"[\s\S]*?debugId="money-in\.route\.payment-rails"[\s\S]*?debugId="money-in\.route\.payout-details"[\s\S]*?debugId="money-in\.route\.loans"/,
  "Money In next-route actions must keep their route-specific debug IDs."
);

assertContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /debugId="money-out\.continue-direct"[\s\S]*?debugId="money-out\.open-support"[\s\S]*?debugId="money-out\.copy-summary"[\s\S]*?debugId="money-out\.route\.finance"/,
  "Money Out core withdrawal and follow-on route actions must remain traceable."
);

assertContains(
  "src/pages/PaymentRailsPage.tsx",
  /debugId="payment-rails\.route\.money-in"[\s\S]*?debugId="payment-rails\.route\.money-out"[\s\S]*?debugId="payment-rails\.route\.readiness"[\s\S]*?debugId="payment-rails\.route\.workbench"/,
  "Payment Rails route actions must keep finance-route debug IDs."
);

assertContains(
  "src/pages/RevenueAllocationPage.tsx",
  /debugId="revenue-allocation\.route\.loan-summary"[\s\S]*?debugId="revenue-allocation\.route\.workbench"[\s\S]*?debugId="revenue-allocation\.route\.finance"[\s\S]*?debugId="revenue-allocation\.route\.loans"[\s\S]*?debugId="revenue-allocation\.route\.money-out"/,
  "Revenue Allocation route actions must keep finance-route debug IDs."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /debugId="bank-console\.next-step"[\s\S]*?debugId="bank-console\.refresh"[\s\S]*?debugId="bank-console\.ingest"[\s\S]*?debugId="bank-console\.reconcile"/,
  "Bank Console next-step and operational actions must remain traceable."
);

assertContains(
  "src/pages/PayoutDetailsPage.tsx",
  /debugId="payout-details\.save"[\s\S]*?debugId="payout-details\.copy-summary"[\s\S]*?debugId="payout-details\.clear-local"[\s\S]*?debugId="payout-details\.open-money-out"[\s\S]*?debugId="payout-details\.open-loans"/,
  "Payout Details save/copy/clear/follow-on actions must remain traceable."
);

assertContains(
  "src/components/PaymentInstructionsPanel.tsx",
  /debugId="payment-instructions-panel\.copy-reference"/,
  "Embedded payment instruction panel copy action must stay traceable."
);

if (findings.length > 0) {
  console.error("Finance action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance action audit passed.");
