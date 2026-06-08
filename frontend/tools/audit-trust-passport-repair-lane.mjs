/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  trust: "src/pages/TrustScorePage.tsx",
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
    text: text.replace(/\s+/g, " ").slice(0, 280),
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
  "trust",
  /const nextStep = useMemo\(\(\) =>[\s\S]*?Open Action Inbox[\s\S]*?\}, \[guidance, routes\.notifications\]\)/,
  "Repair lane must keep the existing next-step guidance source and Action Inbox fallback."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "repair" \? "block" : "none"[\s\S]*?Repair or Next Step[\s\S]*?\{nextStep\.title\}[\s\S]*?\{nextStep\.detail\}/,
  "Repair lane must open with next-step guidance gated to the repair lane."
);

assertOrderedSnippets(
  "trust",
  [
    "First thing to check",
    "passportVm.reasons.createsPressure[0]",
    "What not to do",
    "Do not guess the repair path from the score alone",
  ],
  "Repair lane must explain the pressure signal and warn against blind repair before the next-step action."
);

assertContains(
  "trust",
  /<PrimaryButton[\s\S]*?openTrustRoute\(nextStep\.ctaTo\)[\s\S]*?debugId="trust-score\.repair-next-step"[\s\S]*?\{nextStep\.ctaLabel\}/,
  "Repair lane next-step CTA must route through nextStep.ctaTo and keep a stable trust-score debug ID."
);

assertContains(
  "trust",
  /setNotice\(\{[\s\S]*?Opening the next safe trust step now\.[\s\S]*?\}\);[\s\S]*?openTrustRoute\(nextStep\.ctaTo\)/,
  "Repair next-step action must visibly respond before routing."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "repair"[\s\S]*?4\. Why this reading looks like this[\s\S]*?6\. Why did my trust change\?/,
  "Repair lane must keep pressure notes and recent trust movement visible for repair context."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "documents" \? "block" : "none"[\s\S]*?7\. Shareable trust tools/,
  "Repair lane must not absorb Documents / TrustSlip actions."
);

assertContains(
  "package",
  /"audit:trust-passport-repair-lane"/,
  "Trust Passport Repair lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Trust Passport Repair or Next Step lane work[\s\S]*?audit:trust-passport-repair-lane/,
  "Guided work protocol must require the Trust Passport Repair lane audit."
);

if (findings.length > 0) {
  console.error("Trust Passport Repair lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Trust Passport Repair lane audit passed.");
