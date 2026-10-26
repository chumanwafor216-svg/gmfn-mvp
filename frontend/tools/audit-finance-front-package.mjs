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
  /data-gsn-finance-phone-front=\{isCompact \? "simple" : undefined\}[\s\S]*?financeFileReading\.title[\s\S]*?Your community money, clearly recorded\.[\s\S]*?financeFileReading\.detail[\s\S]*?GSN records finance activity; it is not a bank, lender, wallet, or payment processor\.[\s\S]*?data-gsn-finance-primary-facts=\{isCompact \? "compact-four" : undefined\}[\s\S]*?Available now[\s\S]*?Waiting in[\s\S]*?Waiting out[\s\S]*?Communities/,
  "Finance hero must keep a plain cumulative finance summary with phone-safe compact copy and full desktop context."
);

assertContains(
  financeFile,
  financeSource,
  /Choose what you need now[\s\S]*?Open one finance lane at a time\. Keep the current money task focused\./,
  "Finance front tools must tell users to open one finance lane at a time and keep the current money task focused."
);

[
  ["money-in", "card", "Money in", "Record money coming in."],
  ["reports", "chart", "Money Summary", "See your full money position."],
  ["bank-accounts", "bank", "Payment setup", "Check where money can move."],
  ["export-data", "ledger", "Money history", "See recent money records."],
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
      `Finance must keep ${label} in the defined lane catalogue while phone shows only the recommended first action.`
    );
  });
});

assertContains(
  financeFile,
  financeSource,
  /debugId=\{`finance\.tool\.\$\{item\.id\}`\}/,
  "Finance must keep stable item-based debug ids for its mapped front-lane controls."
);

assertContains(
  financeFile,
  financeSource,
  /gridTemplateColumns: isCompact[\s\S]*?\? "1fr"[\s\S]*?\.filter\(\(item\) => !isCompact \|\| item\.id === "reports"\)[\s\S]*?financeToolButtonStyle\(isCompact, isCompact && item\.id === "reports"\)[\s\S]*?Review money/,
  "Finance phone front package must show only the recommended Review money action before secondary tasks."
);

assertContains(
  financeFile,
  financeSource,
  /Other money tasks[\s\S]*?Money in[\s\S]*?Money history[\s\S]*?Payment status[\s\S]*?Support money[\s\S]*?Payment setup[\s\S]*?Money out[\s\S]*?Payout account[\s\S]*?Support readiness[\s\S]*?Service credits[\s\S]*?Trust Passport/,
  "Finance secondary tasks must remain grouped inside the plain-language task chooser."
);

assertContains(
  financeFile,
  financeSource,
  /data-gsn-finance-task-chooser=\{otherFinanceLanesOpen \? "open" : "collapsed"\}[\s\S]*?debugId="finance\.more-lanes\.toggle"[\s\S]*?Hide tasks[\s\S]*?Choose another task[\s\S]*?\{showOtherFinanceLanes \? \(/,
  "Finance secondary lanes must be tucked behind the Choose another task disclosure on phone."
);

assertContains(
  financeFile,
  financeSource,
  /<section style=\{\{ \.\.\.pageCard\("#FFFFFF"\), display: isCompact \? "none" : undefined \}\}>[\s\S]*?Money at a glance[\s\S]*?Money in[\s\S]*?Money out[\s\S]*?Net movement[\s\S]*?Recent Finance Events[\s\S]*?What your money activity suggests/,
  "Finance may keep its richer snapshot on desktop, but it must stay off the default phone front door."
);
assertContains(
  financeFile,
  financeSource,
  /const activeFinanceDetailLane[\s\S]*?closeFinanceDetailLane[\s\S]*?revealFinanceSection\("finance-task-chooser"\)[\s\S]*?display: isCompact && activeFinanceDetailLane \? "none" : undefined[\s\S]*?Back to tasks/,
  "Finance phone tasks must replace the front door one at a time and provide a direct return to the task chooser."
);

assertContains(
  financeFile,
  financeSource,
  /label: "Service credits"[\s\S]*?finance-pipeline-credits[\s\S]*?GSN service credits[\s\S]*?Credits fund usage\. They are not loans\./,
  "Finance front package must include the Pipeline Credits planning lane without implying lending or wallet behaviour."
);

assertNotContains(
  financeFile,
  financeSource,
  /<FinanceSectionLabel icon="down">Visible Cash Flow<\/FinanceSectionLabel>/g,
  "Finance cash-flow preview must stay inside the compact snapshot, not return as a standalone first-screen block."
);

["wallet", "bank", "ledger", "shield"].forEach((glyphName) => {
  assertContains(
    financeFile,
    financeSource,
    new RegExp(`${glyphName}: "[^"]+"`),
    `Finance must map ${glyphName} to a deterministic 3D GSN icon.`
  );
});

assertContains(
  financeFile,
  financeSource,
  /import \{ GsnLegacyIcon, type GsnIconName \} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*?FINANCE_GLYPH_ICON_MAP[\s\S]*?satisfies Record<FinanceGlyphName, GsnIconName>[\s\S]*?function FinanceGlyph[\s\S]*?<GsnLegacyIcon/,
  "FinanceGlyph must render through the shared 3D GSN icon adapter."
);

assertContains(
  financeFile,
  financeSource,
  /const FINANCE_GLYPH_ICON_MAP = \{[\s\S]*?bank: "financeInstitution"[\s\S]*?card: "financeInstitution"[\s\S]*?down: "financeInstitution"[\s\S]*?out: "wallet"[\s\S]*?wallet: "financeInstitution"/,
  "Finance primary money icons must use institutional finance imagery, while wallet imagery stays reserved for payout or money-out contexts."
);

assertContains(
  financeFile,
  financeSource,
  /<FinanceGlyph name="bank" size=\{isCompact \? 52 : 66\} \/>/,
  "Finance hero must use the institutional bank-building 3D icon instead of a plain text badge."
);

assertContains(
  financeFile,
  financeSource,
  /stableHeight=\{isCompact \? 48 : 132\}[\s\S]*?financeToolButtonStyle\(isCompact, isCompact && item\.id === "reports"\)[\s\S]*?stableHeight=\{isCompact \? 52 : 76\}[\s\S]*?financeMiniToolButtonStyle\(isCompact\)/,
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
