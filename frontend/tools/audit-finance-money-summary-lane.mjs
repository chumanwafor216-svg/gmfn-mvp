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

function assertContains(file, source, pattern, message, text) {
  if (pattern.test(source)) return;
  addFinding(file, source, -1, message, text);
}

assertContains(
  financeFile,
  financeSource,
  /function openFinanceDetailLane\(key: keyof CollapseState, targetId: string\) \{[\s\S]*?setCollapsed\(\{[\s\S]*?\.\.\.defaultCollapseState\(\),[\s\S]*?\[key\]: false,[\s\S]*?\}\);[\s\S]*?revealFinanceSection\(targetId\);[\s\S]*?\}/,
  "Finance detail lanes must use a helper that closes other detail sections before opening the selected lane."
);

assertContains(
  financeFile,
  financeSource,
  /id: "reports"[\s\S]*?label: "Money Summary"[\s\S]*?detail: "See your full money position\."[\s\S]*?openFinanceDetailLane\("overview", "finance-summary"\)/,
  "Money Summary front card must open only the finance-summary detail lane."
);

assertContains(
  financeFile,
  financeSource,
  /id: "export-data"[\s\S]*?label: "Records \/ Events"[\s\S]*?openFinanceDetailLane\("events", "finance-events"\)/,
  "Records / Events front card must also use the one-lane detail helper."
);

assertContains(
  financeFile,
  financeSource,
  /<SubtleButton[\s\S]*?openFinanceDetailLane\("events", "finance-events"\);[\s\S]*?debugId="finance\.events\.view-all"[\s\S]*?>[\s\S]*?View all[\s\S]*?<\/SubtleButton>/,
  "Recent Finance Events View all action must not leave other Finance detail lanes open."
);

assertContains(
  financeFile,
  financeSource,
  /id="finance-summary"[\s\S]*?<FinanceSectionLabel icon="chart">Money Summary<\/FinanceSectionLabel>[\s\S]*?Read your money position first\.[\s\S]*?selected[\s\S]*?community view[\s\S]*?wider Finance story/,
  "Money Summary detail section must explain that it is the selected community view inside the wider Finance story."
);

assertContains(
  financeFile,
  financeSource,
  /id="finance-summary"[\s\S]*?collapsed\.overview \? "Show details" : "Hide details"[\s\S]*?!collapsed\.overview \? \([\s\S]*?isCompact \? \([\s\S]*?financePositionRows\.map\(\(\[label, value, meaning\]\)[\s\S]*?<FinanceMobileRecord[\s\S]*?<table style=\{financeTable\(\)\}>/,
  "Money Summary must keep the audited collapsed state, phone card layout, and desktop table layout."
);

assertContains(
  packageFile,
  packageSource,
  /"audit:finance-money-summary-lane"/,
  "Finance Money Summary lane audit must stay registered in package scripts."
);

assertContains(
  protocolFile,
  protocolSource,
  /For Finance Money Summary lane work[\s\S]*?audit:finance-money-summary-lane/,
  "Guided work protocol must require the Money Summary lane audit for this lane."
);

if (findings.length > 0) {
  console.error("Finance Money Summary lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance Money Summary lane audit passed.");
