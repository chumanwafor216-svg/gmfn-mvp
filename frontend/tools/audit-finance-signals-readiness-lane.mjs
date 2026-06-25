/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  finance: "src/pages/FinancePage.tsx",
  loanReadiness: "src/pages/LoanReadinessPage.tsx",
  appRoutes: "src/lib/appRoutes.ts",
  actionTargets: "src/lib/actionTargetRoutes.ts",
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
  /loanReadiness: routeTarget\("loanReadiness", selectedClanId, "finance\.route\.loan-readiness-target"\)/,
  "Finance must resolve Signals / Readiness through the shared loanReadiness CTA intent with selected-community context."
);

assertContains(
  "finance",
  /Other finance lanes[\s\S]*?label: "Signals \/ Readiness"[\s\S]*?detail: "Read support readiness\."[\s\S]*?action: \(\) => openFinanceRoute\(routes\.loanReadiness\)[\s\S]*?debugId=\{`finance\.mini-tool\.\$\{tool\.label\.toLowerCase\(\)\.replace/,
  "Finance Signals / Readiness launcher must clearly open the support-readiness reading route and keep its stable mini-tool debug id."
);

assertContains(
  "loanReadiness",
  /sectionLabel="Loan Readiness"[\s\S]*?title="Support Readiness"[\s\S]*?subtitle="Use this stage to see whether the next support move is clean enough to continue/,
  "Loan Readiness route page must remain the Support Readiness reading opened by Finance."
);

assertContains(
  "loanReadiness",
  /what="This page is one step inside Loans & Support\.[\s\S]*?why="Finance records the wider money story\.[\s\S]*?next="Support Readiness is decision support only; it does not approve a loan, approve a guarantor, or authorize release of goods, credit, or money\./,
  "Loan Readiness explanation must keep the distinction between Finance's wider money story and readiness's support-path decision."
);

assertContains(
  "loanReadiness",
  /debugId="loan-readiness\.toggle-overview"[\s\S]*?debugId="loan-readiness\.toggle-reading"[\s\S]*?debugId="loan-readiness\.toggle-blockers"[\s\S]*?debugId="loan-readiness\.toggle-routes"/,
  "Loan Readiness must keep traceable readiness reading controls."
);

assertContains(
  "loanReadiness",
  /debugId="loan-readiness\.route\.suggestions"[\s\S]*?debugId="loan-readiness\.route\.workbench"[\s\S]*?debugId="loan-readiness\.route\.money-out"/,
  "Loan Readiness must keep traceable follow-on route buttons."
);

assertContains(
  "appRoutes",
  /LOAN_READINESS: "\/app\/loan-readiness"/,
  "App route registry must keep Loan Readiness mapped to the live support-readiness route page."
);

assertContains(
  "actionTargets",
  /loanReadiness: "LOAN_READINESS"/,
  "Shared CTA intent registry must keep Loan Readiness as a first-class intent."
);

assertContains(
  "package",
  /"audit:finance-signals-readiness-lane"/,
  "Finance Signals / Readiness lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Finance Signals \/ Readiness lane work[\s\S]*?audit:finance-signals-readiness-lane/,
  "Guided work protocol must require the Signals / Readiness lane audit."
);

if (findings.length > 0) {
  console.error("Finance Signals / Readiness lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance Signals / Readiness lane audit passed.");
