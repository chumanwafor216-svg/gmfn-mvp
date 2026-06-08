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

assertContains(
  /type MarketplaceGlyphName =[\s\S]*?\| "pool"[\s\S]*?case "pool":[\s\S]*?<rect x="4" y="5" width="16" height="14" rx="2\.8"[\s\S]*?<circle cx="8" cy="14" r="1\.7"[\s\S]*?<path d="M12 13h4\.5"/,
  "Money Pool must use the stable pool ledger pictogram, not the generic card mark."
);

assertContains(
  /debugId="marketplace\.tile\.money"[\s\S]*?aria-label="Open Money In, Money Out, dues and contributions"[\s\S]*?openMarketplaceSection\(event, "money", "marketplace-money-routes"\)[\s\S]*?<MarketplaceGlyph name="pool"[\s\S]*?Money Pool[\s\S]*?Start here: dues and money routes/,
  "Money Pool top tile must stay the first guided money launcher and open only the money section."
);

assertContains(
  /Start with Money Pool[\s\S]*?Check this community's pool first,[\s\S]*?Money[\s\S]*?Out, or Finance from that lane/,
  "Marketplace front door must keep a non-action guide telling users to start with Money Pool."
);

assertContains(
  /debugId="marketplace\.row\.money"[\s\S]*?aria-label="Open Money In and Money Out for this marketplace"[\s\S]*?openMarketplaceSection\(event, "money", "marketplace-money-routes"\)[\s\S]*?Money In \/ Money Out/,
  "Money Pool operating row must open the same money section and not route to Finance, Trust, or another lane."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?money: "marketplace-money-routes"/,
  "Money Pool section anchor must remain marketplace-money-routes."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"/,
  "Opening Money Pool must use the focused one-lane state, leaving unrelated lanes stepped back."
);

const moneySection = sectionBetween(
  /id="marketplace-money-routes"/,
  /id="marketplace-rosca"/
);

if (!moneySection.text) {
  addFinding(-1, "Money Pool detail section must exist before ROSCA.");
} else {
  const actionIds = [
    ...moneySection.text.matchAll(/debugId="(marketplace\.money\.[^"]+)"/g),
  ].map((match) => match[1]);
  const expectedActionIds = [
    "marketplace.money.toggle",
    "marketplace.money.money-in",
    "marketplace.money.money-out",
    "marketplace.money.finance",
  ];

  if (actionIds.join("|") !== expectedActionIds.join("|")) {
    addFinding(
      moneySection.start,
      "Money Pool detail section must expose only toggle, Money In, Money Out, and Finance in the audited order.",
      actionIds.join(", ") || "none"
    );
  }

  [
    /Money Pool/,
    /This community's pool, money in, and money out\./,
    /Visible Pool[\s\S]*?Current pool view/,
    /Community Account[\s\S]*?Money In route/,
    /Personal Payout[\s\S]*?Money Out route/,
    /debugId="marketplace\.money\.money-in"[\s\S]*?openMarketplaceCta\(event, "moneyIn"\)/,
    /debugId="marketplace\.money\.money-out"[\s\S]*?openMarketplaceCta\(event, "moneyOut"\)/,
    /debugId="marketplace\.money\.finance"[\s\S]*?openMarketplaceCta\(event, "finance"\)/,
  ].forEach((pattern) => {
    if (!pattern.test(moneySection.text)) {
      addFinding(
        moneySection.start,
        "Money Pool detail section is missing an expected local money element.",
        pattern.toString()
      );
    }
  });

  if (/(Trust Passport|TrustSlip|CCI|Owner Shop|ROSCA|Support Requests|Trusted Trade)/.test(moneySection.text)) {
    addFinding(
      moneySection.start,
      "Money Pool detail section must not expose other major lane responsibilities.",
      "Money Pool may link to Finance, but must not expose trust, shop, ROSCA, support, or trade lane content."
    );
  }
}

if (findings.length > 0) {
  console.error("Marketplace Money Pool lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace Money Pool lane audit passed.");
