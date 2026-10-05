/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const marketplaceBoardFile = "src/pages/marketplace/MarketplaceBoardSection.tsx";
const marketplaceDemandFile = "src/pages/marketplace/MarketplaceDemandSection.tsx";
const marketplacePageSource = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const marketplaceBoardSource = readFileSync(join(frontendRoot, marketplaceBoardFile), "utf8");
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

function assertContains(file, source, pattern, message) {
  if (pattern.test(source)) return;
  addFinding(file, source, -1, message);
}

function assertNotContains(file, source, pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    addFinding(file, source, match.index, message, match[0]);
  }
}

const demandComponentPath = join(frontendRoot, marketplaceDemandFile);
if (existsSync(demandComponentPath)) {
  addFinding(
    marketplaceDemandFile,
    marketplacePageSource,
    0,
    "Marketplace must not keep a duplicate DemandBox lane component after DemandBox became the canonical request lifecycle owner.",
    marketplaceDemandFile
  );
}

const intentItemsBlock =
  marketplacePageSource.match(/const MARKETPLACE_INTENT_ITEMS: MarketplaceIntentItem\[\] = \[[\s\S]*?\n\];/)?.[0] ||
  "";

assertContains(
  marketplaceFile,
  marketplacePageSource,
  /id: "demand"[\s\S]*?intent: "demandBox"[\s\S]*?visible: false/,
  "DemandBox must remain searchable from More but hidden from the visible More button grid."
);

assertContains(
  marketplaceFile,
  marketplacePageSource,
  /debugId="marketplace\.job\.ask-for-something"[\s\S]*?aria-label="Ask for something through DemandBox"[\s\S]*?onClick=\{\(event\) => openMarketplaceCta\(event, "demandBox"\)\}[\s\S]*?Ask for something[\s\S]*?DemandBox[\s\S]*?Request lifecycle/,
  "Marketplace Ask for something must route directly to canonical DemandBox with selected-community CTA context."
);

assertContains(
  marketplaceFile,
  marketplacePageSource,
  /currentHash !== "marketplace-demand-box"[\s\S]*?clearCurrentMarketplaceHashEntry\(\)[\s\S]*?resolveCtaTarget\("demandBox", \{[\s\S]*?communityId: activeCommunityId[\s\S]*?debugId: "marketplace\.route\.demandBox\.deep-link"/,
  "Legacy Marketplace demand hash links must hand off to canonical DemandBox while preserving selected-community context."
);

assertContains(
  marketplaceFile,
  marketplacePageSource,
  /function clearCurrentMarketplaceHashEntry\(\)[\s\S]*?window\.history\.replaceState[\s\S]*?`\$\{window\.location\.pathname\}\$\{window\.location\.search\}`/,
  "Marketplace demand deep-link handoff must rewrite the hash entry first so browser Back can return naturally to Marketplace."
);

assertContains(
  marketplaceFile,
  marketplacePageSource,
  /text\.includes\("demand"\)[\s\S]*?return makeCtaAction\([\s\S]*?"demandBox"[\s\S]*?"Open DemandBox"/,
  "Marketplace Wisdom demand/request actions must route to DemandBox instead of reopening a local Demand lane."
);

assertNotContains(
  marketplaceFile,
  marketplacePageSource,
  /MarketplaceDemandSection|<MarketplaceDemandSection\b|sectionsOpen\.demand|onToggleDemand|marketplace\.demand\.|openMarketplaceSection\([^\n]*"demand"|demand: "marketplace-demand-box"|demand: false/g,
  "Marketplace must not keep local Demand lane render/state/action ownership."
);

assertContains(
  marketplaceBoardFile,
  marketplaceBoardSource,
  /DemandBox signals[\s\S]*?read-only\s+[\s\S]*?pointers[\s\S]*?responding, contact, terms, and closure stay[\s\S]*?inside[\s\S]*?DemandBox[\s\S]*?Respond in DemandBox/,
  "Marketplace Board may keep DemandBox signals only as read-only contextual pointers into DemandBox."
);

if (!/id: "demand"/.test(intentItemsBlock)) {
  addFinding(
    marketplaceFile,
    marketplacePageSource,
    marketplacePageSource.indexOf(intentItemsBlock),
    "Marketplace intent manifest must still include the hidden DemandBox intent for search/More handoff.",
    intentItemsBlock
  );
}

if (findings.length > 0) {
  console.error("Marketplace DemandBox ownership audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace DemandBox ownership audit passed.");
