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
  /activeTrustPassportLane === "evidence" \? "block" : "none"[\s\S]*?Evidence Story[\s\S]*?What changed, and why it matters/,
  "Evidence Story lane must open with a plain-language story lead gated to the evidence lane."
);

assertOrderedSnippets(
  "trust",
  [
    "This lane explains the visible signals behind the trust reading",
    "What GSN sees now",
    "{latestExplanation}",
    "Strongest support",
    "passportVm.reasons.helpsTrust[0]",
    "Needs care",
    "passportVm.reasons.createsPressure[0]",
  ],
  "Evidence Story lead must show current explanation, strongest support, and care signal before deeper records."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "evidence"[\s\S]*?4\. Why this reading looks like this[\s\S]*?6\. Why did my trust change\?[\s\S]*?8\. Evidence & institutional context/,
  "Evidence Story lane must keep the support/pressure reasons, latest movement, recent events, and evidence context in the same lane."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "community" \? "block" : "none"[\s\S]*?5\. Trust surfaces/,
  "Evidence Story lane must not absorb Community Confirmation trust-surface responsibilities."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "documents" \? "block" : "none"[\s\S]*?7\. Shareable trust tools/,
  "Evidence Story lane must not absorb Documents / TrustSlip action responsibilities."
);

assertContains(
  "package",
  /"audit:trust-passport-evidence-story-lane"/,
  "Trust Passport Evidence Story lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Trust Passport Evidence Story lane work[\s\S]*?audit:trust-passport-evidence-story-lane/,
  "Guided work protocol must require the Trust Passport Evidence Story lane audit."
);

if (findings.length > 0) {
  console.error("Trust Passport Evidence Story lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Trust Passport Evidence Story lane audit passed.");
