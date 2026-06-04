/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const financeFile = "src/pages/FinancePage.tsx";
const source = readFileSync(join(frontendRoot, financeFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function debugIdFrom(block) {
  return (
    block.match(/debugId="([^"]+)"/)?.[1] ||
    block.match(/debugId=\{`([^`]+)`\}/)?.[1] ||
    block.match(/debugId=\{([^}]+)\}/)?.[1] ||
    ""
  ).replace(/\s+/g, " ");
}

function assertContains(pattern, message, text = "Expected pattern was not found.") {
  if (pattern.test(source)) return;
  findings.push({ file: financeFile, line: 1, message, text });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: financeFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

const actionPattern =
  /<(PrimaryButton|SecondaryButton|SubtleButton|StableCtaLink)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  actions.push({
    tag: match[1],
    id: debugIdFrom(block),
    line: lineAt(match.index),
    block,
  });
}

const expectedSourceActions = 9;
const expectedRenderedActions = 15;

if (actions.length !== expectedSourceActions) {
  findings.push({
    file: financeFile,
    line: 1,
    message: `Finance stable source action inventory changed from ${expectedSourceActions} to ${actions.length}. Re-audit the new or removed action on phone before accepting this baseline.`,
    text: actions.map((action) => `${action.line}:${action.id || "missing-debugId"}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: financeFile,
      line: action.line,
      message: "Every Finance stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^finance\./.test(action.id) && !action.id.startsWith("`finance.")) {
    findings.push({
      file: financeFile,
      line: action.line,
      message: "Finance stable actions must stay in the finance debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const expectedOrder = [
  "finance.tool.${item.id}",
  "finance.mini-tool.${tool.label",
  "finance.events.view-all",
  "finance.view-signals",
  "finance.toggle-overview",
  "finance.toggle-reconciliation",
  "finance.toggle-borrower",
  "finance.open-loans",
  "finance.toggle-events",
];

let cursor = -1;
for (const debugId of expectedOrder) {
  const next = source.indexOf(debugId, cursor + 1);
  if (next === -1) {
    findings.push({
      file: financeFile,
      line: 1,
      message: "Finance front-to-inner action inventory is missing an expected action.",
      text: debugId,
    });
    continue;
  }

  if (next < cursor) {
    findings.push({
      file: financeFile,
      line: lineAt(next),
      message: "Finance front-to-inner action order changed. Re-audit phone flow before accepting this reorder.",
      text: debugId,
    });
  }

  cursor = next;
}

assertContains(
  /type FinanceGlyphName[\s\S]*?function FinanceGlyph\([\s\S]*?function FinanceSectionLabel\(/,
  "Finance page must use deterministic route-local SVG glyphs for phone-visible finance marks."
);

assertContains(
  /stableHeight=\{isCompact \? 124 : 132\}[\s\S]*?debugId=\{`finance\.tool\.\$\{item\.id\}`\}/,
  "Finance main tools must keep tightened fixed phone geometry."
);

assertContains(
  /stableHeight=\{isCompact \? 88 : 76\}[\s\S]*?debugId=\{`finance\.mini-tool\.\$\{tool\.label\.toLowerCase\(\)\.replace/,
  "Finance mini tools must keep tightened fixed phone geometry."
);

assertContains(
  /FinanceSectionLabel icon="down"[\s\S]*?Visible Cash Flow[\s\S]*?FinanceSectionLabel icon="history"[\s\S]*?Recent Finance Events[\s\S]*?FinanceSectionLabel icon="shield" color="#F2CF77"[\s\S]*?Finance Signals/,
  "Finance phone-visible section labels must use deterministic glyphs instead of emoji text."
);

assertContains(
  /function FinanceMobileRecord\([\s\S]*?gridTemplateColumns: "minmax\(92px, 0\.42fr\) minmax\(0, 1fr\)"/,
  "Finance phone evidence rows must use a compact mobile card primitive instead of forcing wide tables."
);

assertContains(
  /id="finance-summary"[\s\S]*?!collapsed\.overview \? \([\s\S]*?isCompact \? \([\s\S]*?financePositionRows\.map\(\(\[label, value, meaning\]\)[\s\S]*?<FinanceMobileRecord[\s\S]*?financePositionRows\.map\(\(\[label, value, meaning\]\)[\s\S]*?<tr key=\{label\}>/,
  "Finance summary must render mobile cards on phone while preserving the desktop table."
);

assertContains(
  /id="finance-reconciliation"[\s\S]*?activeExpectedPayments\.length === 0[\s\S]*?: isCompact \? \([\s\S]*?activeExpectedPayments\.slice\(0, 10\)\.map[\s\S]*?<FinanceMobileRecord[\s\S]*?Payment check[\s\S]*?<table style=\{financeTable\(\)\}>/,
  "Finance reconciliation must render payment cards on phone while preserving the desktop table."
);

assertContains(
  /id="finance-events"[\s\S]*?poolEvents\.length === 0[\s\S]*?: isCompact \? \([\s\S]*?poolEvents\.slice\(0, 12\)\.map[\s\S]*?<FinanceMobileRecord[\s\S]*?Confirmed[\s\S]*?<table style=\{financeTable\(\)\}>/,
  "Finance recent money history must render event cards on phone while preserving the desktop table."
);

assertContains(
  /const supportBackedRows: Array<\[string, string\]>[\s\S]*?const communityMoneyContextRows: Array<\[string, string\]>/,
  "Finance support/context evidence must use shared row definitions so mobile cards and desktop tables stay aligned."
);

assertContains(
  /Support you requested[\s\S]*?borrowerLoans\.length === 0[\s\S]*?: isCompact \? \([\s\S]*?borrowerLoans\.map\(\(row, index\)[\s\S]*?<FinanceMobileRecord[\s\S]*?Remaining[\s\S]*?<table style=\{financeTable\(\)\}>/,
  "Finance borrower support records must render mobile cards on phone while preserving the desktop table."
);

assertContains(
  /isCompact \? \([\s\S]*?<FinanceMobileRecord[\s\S]*?title="Support you backed"[\s\S]*?supportBackedRows[\s\S]*?<table style=\{\{ \.\.\.financeTable\(\), minWidth: 520 \}\}>[\s\S]*?supportBackedRows\.map/,
  "Finance backed-support summary must render a mobile card on phone while preserving the desktop table."
);

assertContains(
  /isCompact \? \([\s\S]*?<FinanceMobileRecord[\s\S]*?title="Community money context"[\s\S]*?communityMoneyContextRows[\s\S]*?<table style=\{\{ \.\.\.financeTable\(\), minWidth: 520 \}\}>[\s\S]*?communityMoneyContextRows\.map/,
  "Finance community money context must render a mobile card on phone while preserving the desktop table."
);

assertContains(
  /Earnings from backing others[\s\S]*?guarantorEarningsItems\.length === 0[\s\S]*?: isCompact \? \([\s\S]*?guarantorEarningsItems\.slice\(0, 10\)\.map[\s\S]*?<FinanceMobileRecord[\s\S]*?Potential share[\s\S]*?<table style=\{financeTable\(\)\}>/,
  "Finance backing-earnings records must render mobile cards on phone while preserving the desktop table."
);

assertNotContains(
  /[\u{1F300}-\u{1FAFF}]/gu,
  "Finance page must not use emoji marks that render inconsistently on phone browsers."
);

assertNotContains(
  /radial-gradient|overflowWrap: "anywhere"/g,
  "Finance page must not use radial glow surfaces or harsh anywhere wrapping on phone-critical surfaces."
);

assertNotContains(
  /<(button|a|summary)\b|role="button"|data-gmfn-action-root|data-cta-id/g,
  "Finance page must not bypass shared stable primitives with raw action roots."
);

if (findings.length > 0) {
  console.error("Finance button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Finance button inventory audit passed: ${actions.length} stable source actions, ${expectedRenderedActions} expected rendered action roots including mapped tool controls.`
);
