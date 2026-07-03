/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const source = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(index, message, text = "Expected pattern was not found.") {
  findings.push({
    file: marketplaceFile,
    line: index >= 0 ? lineAt(index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  addFinding(-1, message);
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    addFinding(match.index, message, match[0]);
  }
}

assertContains(
  /function marketplaceTrustLabel[\s\S]*?return band \|\| score \|\| "No trust value yet";/,
  "Marketplace trust fallback must be truthful when no local trust value is available."
);

assertContains(
  /const marketplaceStats = \[[\s\S]*?label: "Members"[\s\S]*?label: "Shops"[\s\S]*?label: "Trust"[\s\S]*?value: marketplaceTrustDisplay[\s\S]*?detail: marketplaceTrustEvidenceLabel[\s\S]*?glyph: "trust"[\s\S]*?label: "CCI"[\s\S]*?value: marketplaceCciDisplay[\s\S]*?glyph: "chart"/,
  "Marketplace hero stats must show local Trust and CCI instead of duplicating Support or Demand."
);

assertContains(
  /const marketplaceCciValue = firstTruthy\([\s\S]*?marketplaceTrust[\s\S]*?selectedCommunity[\s\S]*?\);[\s\S]*?const marketplaceCciDisplay = marketplaceCciValue[\s\S]*?: "Pending";/,
  "Marketplace CCI stat must read existing trust/community fields and fall back to Pending."
);

assertNotContains(
  /debugId="marketplace\.tile\.trust"|profileDetailsOpen|toggleProfileDetails|Local Marketplace Trust|Trust preparing/g,
  "Marketplace must not keep the removed Trust tile, expansion state, or preparing copy."
);

assertContains(
  /debugId="marketplace\.row\.records-links"[\s\S]*?Marketplace Tools[\s\S]*?Invite, verify, share, and open helper tools\./,
  "Fuller evidence and trust routes must remain under Marketplace Tools, not inside the front summary."
);

if (findings.length > 0) {
  console.error("Marketplace trust/CCI stat audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace trust/CCI stat audit passed.");
