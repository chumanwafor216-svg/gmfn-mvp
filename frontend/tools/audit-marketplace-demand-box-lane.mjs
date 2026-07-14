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

function sectionBetween(startPattern, endPattern) {
  const start = source.search(startPattern);
  if (start === -1) return { text: "", start: -1 };
  const rest = source.slice(start);
  const end = rest.search(endPattern);
  return {
    text: end === -1 ? rest : rest.slice(0, end),
    start,
  };
}

const intentItemsBlock =
  source.match(/const MARKETPLACE_INTENT_ITEMS: MarketplaceIntentItem\[\] = \[[\s\S]*?\n\];/)?.[0] ||
  "";

const iconMapBlock =
  source.match(/const MARKETPLACE_GLYPH_ICON_MAP = \{[\s\S]*?\n\} satisfies Record<MarketplaceGlyphName, GsnIconName>;/)?.[0] ||
  "";

if (!/id: "demand"[\s\S]*?intent: "demandBox"[\s\S]*?visible: false/.test(intentItemsBlock)) {
  addFinding(
    source.indexOf(intentItemsBlock),
    "Demand Box must stay searchable from More but hidden from the visible More button grid.",
    intentItemsBlock
  );
}

if (!/demand: "marketplace"/.test(iconMapBlock)) {
  addFinding(
    source.indexOf(iconMapBlock),
    "Demand Box must use a trade/request icon, not the Spotlight megaphone.",
    iconMapBlock
  );
}

const moreVisibleBlock =
  source.match(
    /marketplaceIntentItems[\s\S]*?\.filter\(\(item\) => item\.visible !== false\)[\s\S]*?debugId=\{`marketplace\.intent\.\$\{item\.id\}`\}/
  )?.[0] || "";

if (!moreVisibleBlock) {
  addFinding(-1, "Marketplace Tools helper must still filter hidden intent items.");
}

const trustedTradeSection = sectionBetween(
  /id="marketplace-members-shops"/,
  /id="marketplace-demand-box"/
);

if (!trustedTradeSection.text) {
  addFinding(-1, "Trade & Shops section must exist before Demand Box.");
} else if (/Demand Box|marketplace\.members\.demand-box|Post a local need or offer request for this marketplace/.test(trustedTradeSection.text)) {
  addFinding(
    trustedTradeSection.start,
    "Demand Box must not be embedded inside the Trade & Shops lane.",
    trustedTradeSection.text
  );
}

const demandSection = sectionBetween(
  /id="marketplace-demand-box"/,
  /id="marketplace-loans-support"/
);

if (!demandSection.text) {
  addFinding(-1, "Demand Box section must exist before Support.");
} else {
  [
    /id: "demand"[\s\S]*?intent: "demandBox"[\s\S]*?visible: false/,
    /demand: "marketplace"/,
    /id="marketplace-demand-box"/,
    /<MarketplaceGlyph name="demand" size=\{26\} \/>/,
    /Demand Box[\s\S]*?Local needs and offers, separate from ROSCA savings and Support[\s\S]*?requests[\s\S]*?Standalone lane/,
    /Local needs and offers[\s\S]*?what is needed, wanted,[\s\S]*?available, or being sourced/,
    /debugId="marketplace\.demand\.toggle"/,
    /debugId="marketplace\.demand\.open"[\s\S]*?openMarketplaceCta\(event, "demandBox"\)[\s\S]*?Open Demand Box/,
  ].forEach((pattern) => {
    if (!pattern.test(source) && !pattern.test(demandSection.text)) {
      addFinding(
        demandSection.start,
        "Demand Box must be a separate marketplace-local lane with a direct route action.",
        pattern.toString()
      );
    }
  });

  if (/debugId="marketplace\.tile\.demand"/.test(source)) {
    addFinding(
      source.search(/debugId="marketplace\.tile\.demand"/),
      "Demand Box must remain an inner lane, not return as a front tile.",
      "Demand is searchable from More and opens through marketplace.demand.open."
    );
  }
}

if (findings.length > 0) {
  console.error("Marketplace Demand Box lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace Demand Box lane audit passed.");
