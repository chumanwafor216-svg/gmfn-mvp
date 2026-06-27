/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  trust: "src/pages/TrustScorePage.tsx",
  package: "package.json",
  protocol: "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md",
  specs: "../docs/SCREEN_SPECS.md",
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

function flexibleTextRegex(text) {
  return new RegExp(
    String(text)
      .split(/\s+/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+"),
    "i"
  );
}

[
  "Current Trust Standing",
  "Evidence Story",
  "Community Confirmation",
  "Finance Discipline",
  "Documents / TrustSlip",
  "Repair or Next Step",
].forEach((lane) => {
  assertContains(
    "protocol",
    flexibleTextRegex(lane),
    `Guided work protocol must keep the Trust Passport ${lane} lane named.`
  );
  assertContains(
    "specs",
    flexibleTextRegex(lane),
    `Trust Passport screen spec must keep the ${lane} lane named.`
  );
});

assertContains(
  "specs",
  /Current pre-redesign Trust Passport section mapping[\s\S]*?Current Trust Standing[\s\S]*?Evidence Story[\s\S]*?Community Confirmation[\s\S]*?Finance Discipline[\s\S]*?Documents \/ TrustSlip[\s\S]*?Repair or Next Step/,
  "Trust Passport screen spec must record the current section-to-lane map before visual lane replacement work."
);

assertContains(
  "trust",
  /type TrustPassportLaneKey =[\s\S]*?\| "standing"[\s\S]*?\| "evidence"[\s\S]*?\| "community"[\s\S]*?\| "finance"[\s\S]*?\| "documents"[\s\S]*?\| "repair"/,
  "Trust Passport page must keep the approved lane keys as a typed, auditable UI contract."
);

assertContains(
  "trust",
  /useState<TrustPassportLaneKey>\("standing"\)/,
  "Trust Passport page must default to Current Trust Standing so the first view is guided, not a content dump."
);

[
  ["standing", "Current Trust Standing"],
  ["evidence", "Evidence Story"],
  ["community", "Community Confirmation"],
  ["finance", "Finance Discipline"],
  ["documents", "Documents / TrustSlip"],
  ["repair", "Repair or Next Step"],
].forEach(([key, label]) => {
  assertContains(
    "trust",
    new RegExp(`key: "${key}"[\\s\\S]*?label: "${label}"`),
    `Trust Passport active lane selector must keep the ${label} lane visible and named.`
  );
});

assertContains(
  "trust",
  /setActiveTrustPassportLane\(lane\.key\)[\s\S]*?debugId=\{`trust-score\.lane\.\$\{lane\.key\}`\}/,
  "Trust Passport active lane selector must use stable trust-score lane debug IDs and route every click through one active lane state."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "standing" \? "grid" : "none"[\s\S]*?2\. Current trust verdict[\s\S]*?3\. What this reading says/,
  "Current Trust Standing must be the only default open work lane instead of exposing every trust section at once."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "evidence"[\s\S]*?activeTrustPassportLane === "repair"[\s\S]*?4\. Why this reading looks like this[\s\S]*?activeTrustPassportLane === "community"[\s\S]*?5\. Trust surfaces/,
  "Trust Passport secondary lanes must be shielded behind active-lane visibility gates."
);

assertOrderedSnippets(
  "trust",
  [
    "Identity Overview",
    "2. Current trust verdict",
    "3. What this reading says",
  ],
  "Current Trust Standing lane must map to identity, verdict, and plain trust-question sections before redesign."
);

assertOrderedSnippets(
  "trust",
  [
    "4. Why this reading looks like this",
    "What helps trust",
    "What creates pressure",
    "6. Why did my trust change?",
    "Latest explanation",
    "Recent trust events",
    "8. Evidence & institutional context",
  ],
  "Evidence Story lane must map to trust reasons, latest explanation, recent events, and evidence context before redesign."
);

assertOrderedSnippets(
  "trust",
  [
    "communityVerifyPath",
    "debugId=\"trust-score.open-public-community-record\"",
    "Open public community record",
  ],
  "Community Confirmation lane must keep the public community record action and its readiness explanation."
);

assertContains(
  "trust",
  /"Finance discipline": "financeInstitution"/,
  "Finance Discipline lane must keep a finance-discipline trust-question mapping."
);

assertContains(
  "trust",
  /key: "evidence"[\s\S]*?icon: "evidence"[\s\S]*?key: "finance"[\s\S]*?icon: "financeInstitution"[\s\S]*?key: "documents"[\s\S]*?icon: "evidence"/,
  "Trust Passport lanes must use certificate/evidence and finance-institution 3D meanings for evidence, finance, and document lanes."
);

assertOrderedSnippets(
  "trust",
  [
    "const institutionalRows = [",
    "\"Trust limit signal\"",
    "\"Available support capacity\"",
    "\"Current support commitments\"",
    "\"Overexposure ratio\"",
    "\"Risk level\"",
  ],
  "Finance Discipline lane must keep finance-discipline question mapping and institutional capacity/risk context."
);

assertContains(
  "trust",
  /7\. Shareable trust tools[\s\S]*?debugId="trust-score\.open-trust-slip"[\s\S]*?Open TrustSlip[\s\S]*?debugId="trust-score\.verify"[\s\S]*?TrustSlip: \{trustSlipStatus \|\| "Pending"\}/,
  "Documents / TrustSlip lane must keep TrustSlip status, open, verify, and document readiness controls."
);

assertOrderedSnippets(
  "trust",
  [
    "const nextStep = useMemo(() =>",
    "Keep your next trust step clean.",
    "Open Action Inbox",
    "function scrollToPressureNotes()",
    "debugId=\"trust-score.review-care\"",
    "Review pressure notes",
  ],
  "Repair or Next Step lane must keep next-step guidance and the pressure-note review action."
);

assertContains(
  "package",
  /"audit:trust-passport-lane-map"/,
  "Trust Passport lane map audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Trust Passport lane map work[\s\S]*?audit:trust-passport-lane-map/,
  "Guided work protocol must require the Trust Passport lane map audit."
);

if (findings.length > 0) {
  console.error("Trust Passport lane map audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Trust Passport lane map audit passed.");
