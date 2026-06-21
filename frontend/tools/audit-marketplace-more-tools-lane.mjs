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

const intentItemsBlock =
  source.match(/const MARKETPLACE_INTENT_ITEMS: MarketplaceIntentItem\[\] = \[[\s\S]*?\n\];/)?.[0] ||
  "";

if (!intentItemsBlock) {
  addFinding(-1, "Marketplace intent item map must exist.");
}

const visibleIds = [
  ...intentItemsBlock.matchAll(/\{\s*id: "([^"]+)"[\s\S]*?\n {2}\}/g),
]
  .filter((match) => !/visible: false/.test(match[0]))
  .map((match) => match[1]);

const expectedVisibleIds = [
  "trust",
  "identity",
  "trustslip",
  "community",
  "messages",
];

if (visibleIds.join("|") !== expectedVisibleIds.join("|")) {
  addFinding(
    source.indexOf(intentItemsBlock),
    "More / Community Tools must expose only secondary helper buttons; major lanes stay searchable but hidden from the expanded button grid.",
    `visible=${visibleIds.join(", ") || "none"}`
  );
}

[
  "money-in",
  "money-out",
  "finance",
  "rosca",
  "support",
  "shop",
  "invite",
  "demand",
].forEach((id) => {
  const itemPattern = new RegExp(`id: "${id}"[\\s\\S]*?visible: false`);
  if (!itemPattern.test(intentItemsBlock)) {
    addFinding(
      source.indexOf(intentItemsBlock),
      "More / Community Tools must hide major/front-card routes from its visible button grid while keeping search matching intact.",
      id
    );
  }
});

assertContains(
  /debugId="marketplace\.extra-tools\.toggle"[\s\S]*?More \/ Community Tools[\s\S]*?Trust, ID, evidence, messages, and route help[\s\S]*?Trust[\s\S]*?Identity[\s\S]*?TrustSlip[\s\S]*?Messages/,
  "More / Community Tools front card must name secondary helpers, not invite, money, ROSCA, support, shop, or vague More."
);

assertContains(
  /Use this helper when the job is not one of the main cards\.[\s\S]*?Search still understands money, ROSCA, support, shop, invite,[\s\S]*?demand, and records\.[\s\S]*?placeholder="Try: trust, identity, evidence, messages\.\.\."/,
  "Expanded More helper must explain that search can still find main lanes without exposing them as equal buttons."
);

assertContains(
  /marketplaceIntentItems[\s\S]*?\.filter\(\(item\) => item\.visible !== false\)[\s\S]*?debugId=\{`marketplace\.intent\.\$\{item\.id\}`\}/,
  "Expanded More helper must filter hidden major lane items before rendering stable intent buttons."
);

assertContains(
  /function findMarketplaceIntent\(value: string\): MarketplaceIntentItem \| null \{[\s\S]*?MARKETPLACE_INTENT_ITEMS\.find\(\(item\) =>[\s\S]*?item\.keywords\.some/,
  "More helper search must still use the full intent map so hidden major lanes remain searchable."
);

if (findings.length > 0) {
  console.error("Marketplace More / Community Tools lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace More / Community Tools lane audit passed.");
