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
  addFinding(-1, "More / Community Tools must still filter hidden intent items.");
}

const trustedTradeSection = sectionBetween(
  /id="marketplace-members-shops"/,
  /id="marketplace-loans-support"/
);

if (!trustedTradeSection.text) {
  addFinding(-1, "Trade & Shops section must exist before Support Requests.");
} else {
  [
    /<MarketplaceGlyph name="demand" size=\{24\} \/>/,
    /Demand Box[\s\S]*?Post a local need or offer request for this marketplace/,
    /debugId="marketplace\.members\.demand-box"/,
    /onClick=\{\(event\) => openMarketplaceCta\(event, "demandBox"\)\}/,
    /Demand Box/,
    /innerCard\("#FFFDF7"\)[\s\S]*?width: "100%"[\s\S]*?maxWidth: "100%"[\s\S]*?minWidth: 0[\s\S]*?display: isCompact \? "block" : "grid"[\s\S]*?overflow: "hidden"[\s\S]*?position: "relative"[\s\S]*?paddingRight: isCompact \? 62 : undefined[\s\S]*?position: "absolute"[\s\S]*?right: 16[\s\S]*?top: 18[\s\S]*?width: 46[\s\S]*?height: 46[\s\S]*?display: "block"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"/,
  ].forEach((pattern) => {
    if (!pattern.test(trustedTradeSection.text)) {
      addFinding(
        trustedTradeSection.start,
        "Demand Box must be caged as a marketplace-local Trade & Shops sub-route.",
        pattern.toString()
      );
    }
  });

  if (
    /debugId=\{`marketplace\.intent\.\$\{item\.id\}`\}[\s\S]*?Demand Box/.test(
      trustedTradeSection.text
    )
  ) {
    addFinding(
      trustedTradeSection.start,
      "Demand Box must not be rendered from the visible More intent grid inside Trade.",
      trustedTradeSection.text
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
