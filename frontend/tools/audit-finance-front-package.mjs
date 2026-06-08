/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const financeFile = "src/pages/FinancePage.tsx";
const packageFile = "package.json";
const protocolFile = "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md";
const financeSource = readFileSync(join(frontendRoot, financeFile), "utf8");
const packageSource = readFileSync(join(frontendRoot, packageFile), "utf8");
const protocolSource = readFileSync(join(frontendRoot, protocolFile), "utf8");
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

function assertContains(file, source, pattern, message) {
  if (pattern.test(source)) return;
  addFinding(file, source, -1, message);
}

function assertIncludes(file, source, snippet, message) {
  if (source.includes(snippet)) return;
  addFinding(file, source, -1, message, snippet);
}

function assertNotContains(file, source, pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    addFinding(file, source, match.index, message, match[0]);
  }
}

assertContains(
  financeFile,
  financeSource,
  /function defaultCollapseState\(\): CollapseState \{[\s\S]*?overview: true,[\s\S]*?borrower: true,[\s\S]*?events: true,[\s\S]*?reconciliation: true/,
  "Finance deep sections must start collapsed so the page does not dump records on first load."
);

assertContains(
  financeFile,
  financeSource,
  /Finance overview[\s\S]*?Your community finances\. Clear\. Secure\. Together\.[\s\S]*?money coming in, money going out, payment checks, and support[\s\S]*?GSN ID:[\s\S]*?Community code:/,
  "Finance hero must keep a plain cumulative finance summary with member and community context."
);

assertContains(
  financeFile,
  financeSource,
  /Choose what you need now[\s\S]*?Open one finance lane at a time\.[\s\S]*?Marketplace money stays local there[\s\S]*?money story together across communities/,
  "Finance front tools must tell users to open one finance lane at a time and separate local Marketplace money from cumulative Finance."
);

[
  ["money-in", "card", "Money In", "Open guided pay-in."],
  ["reports", "chart", "Money Summary", "See your full money position."],
  ["bank-accounts", "bank", "Banking Rails", "Check rails before acting."],
  ["export-data", "ledger", "Records / Events", "See your money history."],
].forEach(([id, icon, label, detail]) => {
  [
    `id: "${id}"`,
    `icon: "${icon}" as FinanceGlyphName`,
    `label: "${label}"`,
    `detail: "${detail}"`,
  ].forEach((snippet) => {
    assertIncludes(
      financeFile,
      financeSource,
      snippet,
      `Finance front package must keep ${label} as one of the four main lane choices.`
    );
  });
});

assertContains(
  financeFile,
  financeSource,
  /debugId=\{`finance\.tool\.\$\{item\.id\}`\}/,
  "Finance front package must keep stable item-based debug ids for the four main lane buttons."
);

assertContains(
  financeFile,
  financeSource,
  /Other finance lanes[\s\S]*?Money Out[\s\S]*?Payout Details[\s\S]*?Signals \/ Readiness[\s\S]*?Trust Passport/,
  "Finance secondary lanes must remain grouped below the four main lane choices."
);

["wallet", "bank", "ledger", "shield"].forEach((glyphName) => {
  assertContains(
    financeFile,
    financeSource,
    new RegExp(`name === "${glyphName}"[\\s\\S]*?<path|name === "${glyphName}"[\\s\\S]*?<rect`),
    `Finance must keep deterministic route-local SVG glyphs for ${glyphName}.`
  );
});

assertContains(
  financeFile,
  financeSource,
  /stableHeight=\{isCompact \? 124 : 132\}[\s\S]*?financeToolButtonStyle\(isCompact\)[\s\S]*?stableHeight=\{isCompact \? 88 : 76\}[\s\S]*?financeMiniToolButtonStyle\(isCompact\)/,
  "Finance front and secondary tool buttons must keep fixed phone-safe geometry."
);

assertNotContains(
  financeFile,
  financeSource,
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
  "Finance page must not use emoji-style marks for finance lanes."
);

[
  "audit:finance-actions",
  "audit:finance-button-inventory",
  "audit:finance-front-package",
].forEach((scriptName) => {
  assertContains(
    packageFile,
    packageSource,
    new RegExp(`"${scriptName}"`),
    `${scriptName} must stay registered as a package script.`
  );
});

assertContains(
  protocolFile,
  protocolSource,
  /For Finance front package work[\s\S]*?audit:finance-front-package/,
  "Guided work protocol must require the Finance front package audit for Finance front-package changes."
);

if (findings.length > 0) {
  console.error("Finance front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance front package audit passed.");
