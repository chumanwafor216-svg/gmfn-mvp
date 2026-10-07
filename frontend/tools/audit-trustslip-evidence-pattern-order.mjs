/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  pattern: "src/lib/trustSlipEvidencePatterns.ts",
  stack: "src/components/TrustSlipEvidencePatternStack.tsx",
  publicPaper: "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  package: "package.json",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(frontendRoot, file), "utf8")])
);

const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const source = sourceByKey[key];
  findings.push({
    file: files[key],
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 320),
  });
}

function assertContains(key, pattern, message) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, pattern.toString());
}

function assertOrder(key, orderedPatterns, message) {
  const source = sourceByKey[key];
  let cursor = -1;
  const seen = [];

  for (const item of orderedPatterns) {
    const scoped = source.slice(cursor + 1);
    const match = scoped.match(item.pattern);
    if (!match || match.index === undefined) {
      addFinding(key, cursor, message, `Missing after ${seen.join(" -> ") || "start"}: ${item.label}`);
      return;
    }
    cursor = cursor + 1 + match.index;
    seen.push(item.label);
  }
}

assertOrder(
  "pattern",
  [
    { label: "routine", pattern: /key: "routine"/ },
    { label: "enterprise effort", pattern: /key: "enterprise-effort"/ },
    { label: "follow-through", pattern: /key: "follow-through"/ },
    { label: "community response", pattern: /key: "community-response"/ },
    { label: "discipline", pattern: /key: "discipline"/ },
    { label: "consistency", pattern: /key: "consistency"/ },
  ],
  "TrustSlip behaviour pattern order must keep business effort and follow-through visible before lower-priority compact cards."
);

assertContains(
  "stack",
  /const visibleItems = items\.slice\(0, compact \? 4 : 6\);/,
  "Compact TrustSlip evidence pattern must still show exactly four cards, so the source order remains a real mobile contract."
);

assertContains(
  "pattern",
  /This is effort evidence, not proof of success\./,
  "Enterprise effort wording must keep the no-success-proof boundary."
);

assertContains(
  "pattern",
  /The receiver still decides; this is not a guarantee, approval, credit decision, legal identity, or prediction of future behaviour\./,
  "TrustSlip pattern boundary must keep the receiver-decision and no-guarantee language."
);

assertContains(
  "publicPaper",
  /<TrustSlipEvidencePatternStack[\s\S]*?title="Behaviour evidence pattern"[\s\S]*?reading=\{trustSlipPattern\.reading\}[\s\S]*?items=\{trustSlipPattern\.items\}/,
  "Public TrustSlip paper must keep rendering the shared behaviour evidence pattern stack."
);

assertContains(
  "package",
  /"audit:trustslip-evidence-pattern-order": "node tools\/audit-trustslip-evidence-pattern-order\.mjs"/,
  "package.json must expose the TrustSlip evidence pattern order audit."
);

if (findings.length) {
  console.error("TrustSlip evidence pattern order audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
    console.error(`  ${finding.text}`);
  }
  process.exit(1);
}

console.log("TrustSlip evidence pattern order audit passed.");
