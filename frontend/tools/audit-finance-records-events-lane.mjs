/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  finance: "src/pages/FinancePage.tsx",
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

function assertOrderedSnippets(key, snippets, message) {
  const source = sourceByFile[key];
  let cursor = -1;
  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    if (index === -1) {
      addFinding(files[key], source, Math.max(cursor, 0), message, snippet);
      return;
    }
    cursor = index;
  }
}

assertContains(
  "finance",
  /id: "export-data"[\s\S]*?label: "Records \/ Events"[\s\S]*?detail: "Read money records\."[\s\S]*?openFinanceDetailLane\("events", "finance-events"\)[\s\S]*?debugId=\{`finance\.tool\.\$\{item\.id\}`\}/,
  "Records / Events front card must clearly open only the finance-events detail lane."
);

assertContains(
  "finance",
  /debugId="finance\.events\.view-all"[\s\S]*?openFinanceDetailLane\("events", "finance-events"\)|openFinanceDetailLane\("events", "finance-events"\);[\s\S]*?debugId="finance\.events\.view-all"/,
  "Recent Finance Events View all action must open the same records/events lane helper."
);

assertContains(
  "finance",
  /id="finance-events"[\s\S]*?Recent money history[\s\S]*?These are the latest money movements we can show you\.[\s\S]*?debugId="finance\.toggle-events"[\s\S]*?collapsed\.events \? "Show history" : "Hide history"/,
  "Finance events detail lane must keep the clear heading, helper copy, and traceable collapse control."
);

assertContains(
  "finance",
  /id="finance-events"[\s\S]*?!collapsed\.events \? \([\s\S]*?poolEvents\.length === 0[\s\S]*?No recent money movement is showing yet\.[\s\S]*?isCompact \? \([\s\S]*?<FinanceMobileRecord[\s\S]*?<table style=\{financeTable\(\)\}>/,
  "Finance events detail lane must keep its empty state, phone cards, and desktop table."
);

assertOrderedSnippets(
  "finance",
  [
    "<FinanceMobileRecord",
    "title={",
    "\"Finance confirmed\"",
    "rows={[",
    "\"Amount\"",
    "\"Reference\"",
    "\"Note\"",
    "\"Created\"",
    "\"Status\"",
  ],
  "Finance events mobile records must keep the core money-event fields."
);

assertContains(
  "package",
  /"audit:finance-records-events-lane"/,
  "Finance Records / Events lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Finance Records \/ Events lane work[\s\S]*?audit:finance-records-events-lane/,
  "Guided work protocol must require the Records / Events lane audit."
);

if (findings.length > 0) {
  console.error("Finance Records / Events lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance Records / Events lane audit passed.");
