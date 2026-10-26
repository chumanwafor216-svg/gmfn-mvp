/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const financeFile = "src/pages/FinancePage.tsx";
const protocolFile = "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md";
const specsFile = "../docs/SCREEN_SPECS.md";
const financeSource = readFileSync(join(frontendRoot, financeFile), "utf8");
const protocolSource = readFileSync(join(frontendRoot, protocolFile), "utf8");
const specsSource = readFileSync(join(frontendRoot, specsFile), "utf8");
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

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flexibleTextRegex(text) {
  return new RegExp(
    String(text)
      .split(/\s+/)
      .map(escapeRegex)
      .join("\\s+")
  );
}

function assertOrderedSnippets(file, source, snippets, message) {
  let cursor = -1;
  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    if (index === -1) {
      addFinding(file, source, Math.max(cursor, 0), message, snippet);
      return;
    }
    cursor = index;
  }
}

[
  ["Money Summary", "Money Summary"],
  ["Money In", "Money in"],
  ["Money Out", "Money out"],
  ["Banking Rails", "Payment setup"],
  ["Records / Events", "Money history"],
  ["Signals / Readiness", "Support readiness"],
  ["Pipeline Credits", "Service credits"],
].forEach(([lane, memberLabel]) => {
  assertContains(
    specsFile,
    specsSource,
    flexibleTextRegex(lane),
    `Finance screen spec must keep the ${lane} lane named.`
  );
  assertContains(
    protocolFile,
    protocolSource,
    flexibleTextRegex(lane),
    `Guided work protocol must keep the ${lane} lane named.`
  );
  assertContains(
    financeFile,
    financeSource,
    new RegExp(`label: "${escapeRegex(memberLabel)}"`),
    `FinancePage must expose the canonical ${lane} lane with the plain member label ${memberLabel}.`
  );
});

[
  ["money-in", "Money in", "routes.moneyIn"],
  ["reports", "Money Summary", "finance-summary"],
  ["bank-accounts", "Payment setup", "routes.paymentRails"],
  ["export-data", "Money history", "finance-events"],
].forEach(([id, label, target]) => {
  assertOrderedSnippets(
    financeFile,
    financeSource,
    [`id: "${id}"`, `label: "${label}"`, target, "debugId={`finance.tool.${item.id}`}"],
    `${label} must stay in the four-card front lane group with its audited target and stable debug id.`
  );
});

[
  ["Money out", "routes.moneyOut"],
  ["Support readiness", "routes.loanReadiness"],
  ["Service credits", "finance-pipeline-credits"],
].forEach(([label, target]) => {
  assertContains(
    financeFile,
    financeSource,
    new RegExp(
      `Other money tasks[\\s\\S]*?label: "${escapeRegex(label)}"[\\s\\S]*?${escapeRegex(target)}`
    ),
    `${label} must stay visible inside the grouped secondary Finance lane area.`
  );
});

[
  "View Reports",
  "View Ledger",
  "Loan Readiness",
  "More finance tools",
  "Banking Rails",
  "Records / Events",
  "Signals / Readiness",
].forEach((oldLabel) => {
  const index = financeSource.indexOf(`label: "${oldLabel}"`);
  if (index === -1 && oldLabel !== "More finance tools") return;
  const textIndex = oldLabel === "More finance tools" ? financeSource.indexOf(oldLabel) : index;
  if (textIndex >= 0) {
    addFinding(
      financeFile,
      financeSource,
      textIndex,
      "Finance lane labels must use the approved guided-work lane language.",
      oldLabel
    );
  }
});

if (findings.length > 0) {
  console.error("Finance lane map audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance lane map audit passed.");
