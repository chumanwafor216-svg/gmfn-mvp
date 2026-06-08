/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  finance: "src/pages/FinancePage.tsx",
  appRoutes: "src/lib/appRoutes.ts",
  actionTargets: "src/lib/actionTargetRoutes.ts",
  moneyInPage: "src/pages/PaymentInstructionsPage.tsx",
  moneyOutPage: "src/pages/WithdrawalInstructionsPage.tsx",
  package: "package.json",
  protocol: "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md",
};

const sourceByFile = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);
const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(file, source, index, message, text = "Expected pattern was not found.") {
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByFile[key];
  if (pattern.test(source)) return;
  addFinding(files[key], source, -1, message, text);
}

assertContains(
  "finance",
  /moneyIn: routeTarget\("moneyIn", selectedClanId, "finance\.route\.money-in-target"\)[\s\S]*?moneyOut: routeTarget\("moneyOut", selectedClanId, "finance\.route\.money-out-target"\)/,
  "Finance must resolve Money In and Money Out through shared CTA intents with selected-community context."
);

assertContains(
  "finance",
  /id: "money-in"[\s\S]*?label: "Money In"[\s\S]*?detail: "Open guided pay-in\."[\s\S]*?action: \(\) => openFinanceRoute\(routes\.moneyIn\)[\s\S]*?debugId=\{`finance\.tool\.\$\{item\.id\}`\}/,
  "Finance Money In launcher must clearly open the guided pay-in route and keep its stable tool debug id."
);

assertContains(
  "finance",
  /Other finance lanes[\s\S]*?label: "Money Out"[\s\S]*?detail: "Open guided payout"[\s\S]*?action: \(\) => openFinanceRoute\(routes\.moneyOut\)[\s\S]*?debugId=\{`finance\.mini-tool\.\$\{tool\.label\.toLowerCase\(\)\.replace/,
  "Finance Money Out launcher must clearly open the guided payout route and keep its stable mini-tool debug id."
);

assertContains(
  "appRoutes",
  /MONEY_IN: "\/app\/payment\/pool"[\s\S]*?MONEY_OUT: "\/app\/withdrawal-instructions"/,
  "App route registry must keep Money In and Money Out mapped to the live route pages."
);

assertContains(
  "actionTargets",
  /moneyIn: "MONEY_IN"[\s\S]*?moneyOut: "MONEY_OUT"/,
  "Shared CTA intent registry must keep Money In and Money Out as first-class intents."
);

assertContains(
  "moneyInPage",
  /sectionLabel="Money In"[\s\S]*?title="Payment Instructions"[\s\S]*?debugId="money-in\.generate-instruction"[\s\S]*?debugId="money-in\.route\.money-out"/,
  "Money In route page must remain a guided payment-instruction page with a traceable route to Money Out after completion."
);

assertContains(
  "moneyOutPage",
  /sectionLabel="Money Out"[\s\S]*?title="Guided Withdrawal"[\s\S]*?debugId="money-out\.continue-direct"[\s\S]*?debugId="money-out\.route\.finance"/,
  "Money Out route page must remain a guided withdrawal page with a traceable route back to Finance."
);

assertContains(
  "package",
  /"audit:finance-money-movement-lanes"/,
  "Finance Money In / Money Out lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Finance Money In \/ Money Out lane work[\s\S]*?audit:finance-money-movement-lanes/,
  "Guided work protocol must require the Money In / Money Out lane audit for this pair."
);

if (findings.length > 0) {
  console.error("Finance Money In / Money Out lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance Money In / Money Out lane audit passed.");
