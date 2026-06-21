/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  finance: "src/pages/FinancePage.tsx",
  paymentRails: "src/pages/PaymentRailsPage.tsx",
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
  /paymentRails: routeTarget\("paymentRails", selectedClanId, "finance\.route\.payment-rails-target"\)/,
  "Finance must resolve Banking Rails through the shared paymentRails CTA intent with selected-community context."
);

assertContains(
  "finance",
  /id: "bank-accounts"[\s\S]*?label: "Banking Rails"[\s\S]*?detail: "Check rails before acting\."[\s\S]*?action: \(\) => openFinanceRoute\(routes\.paymentRails\)[\s\S]*?debugId=\{`finance\.tool\.\$\{item\.id\}`\}/,
  "Finance Banking Rails launcher must clearly open a rail-check route before money action."
);

assertContains(
  "paymentRails",
  /sectionLabel="Payment Rails"[\s\S]*?title="Payment Rails"[\s\S]*?subtitle="Read-only intelligence about inbound and outbound rails\. Money actions should still happen on the guided pages\."/,
  "Payment Rails page must remain read-only rail intelligence, not a money-action page."
);

assertContains(
  "paymentRails",
  /what="This screen gives you a read-only picture[\s\S]*?next="Read the current rail picture here, then return to the guided Money In or Money Out route/,
  "Payment Rails explanation must continue telling users to return to guided Money In or Money Out routes."
);

assertContains(
  "paymentRails",
  /Rail status is not payment approval, settlement confirmation, or evidence that money moved; action should still happen on the guided Money In and Money Out routes\./,
  "Payment Rails must separate visible rail status from payment approval, settlement confirmation, or money movement."
);

assertContains(
  "paymentRails",
  /Status-active: \{loading \? "\.\.\." : activeCount\}[\s\S]*?Inbound status-active[\s\S]*?Outbound status-active/,
  "Payment Rails active counters must read as status-active rail signals."
);

assertContains(
  "paymentRails",
  /debugId="payment-rails\.route\.money-in"[\s\S]*?debugId="payment-rails\.route\.money-out"[\s\S]*?debugId="payment-rails\.route\.readiness"[\s\S]*?debugId="payment-rails\.route\.workbench"/,
  "Payment Rails route buttons must keep traceable follow-on routes."
);

assertContains(
  "appRoutes",
  /PAYMENT_RAILS: "\/app\/payment-rails"/,
  "App route registry must keep Payment Rails mapped to the live Banking Rails route page."
);

assertContains(
  "actionTargets",
  /paymentRails: "PAYMENT_RAILS"/,
  "Shared CTA intent registry must keep Payment Rails as a first-class intent."
);

assertContains(
  "package",
  /"audit:finance-banking-rails-lane"/,
  "Finance Banking Rails lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Finance Banking Rails lane work[\s\S]*?audit:finance-banking-rails-lane/,
  "Guided work protocol must require the Banking Rails lane audit."
);

if (findings.length > 0) {
  console.error("Finance Banking Rails lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance Banking Rails lane audit passed.");
