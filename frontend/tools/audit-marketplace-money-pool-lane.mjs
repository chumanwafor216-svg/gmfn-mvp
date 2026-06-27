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
  /debugId="marketplace\.tile\.money"[\s\S]*?aria-label="Open Money In and this marketplace pool"[\s\S]*?openMarketplaceSection\(event, "money", "marketplace-money-routes"\)[\s\S]*?<MarketplaceGlyph name="pool"[\s\S]*?Money In \/ Pool[\s\S]*?Put money into this marketplace pool\.[\s\S]*?Money In[\s\S]*?Pool[\s\S]*?Pay-In Rail/,
  "Money In / Pool grouped card must stay the guided pay-in launcher and open only the money section."
);

assertContains(
  /const marketplaceMoneyOutTo = useMemo\([\s\S]*?resolveCtaTarget\("moneyOut"[\s\S]*?to=\{marketplaceMoneyOutTo\}[\s\S]*?debugId="marketplace\.tile\.withdrawal"[\s\S]*?Money Out \/ Withdrawal[\s\S]*?Withdraw your own available money\./,
  "Normal Money Out / Withdrawal must stay a separate Marketplace front-door action from Money In / Pool."
);

assertContains(
  /Focus your work[\s\S]*?Open one lane at a time\. Everything else steps back\./,
  "Marketplace front door must keep the non-action focus guide after the grouped lane cards."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?money: "marketplace-money-routes"/,
  "Money Pool section anchor must remain marketplace-money-routes."
);

assertContains(
  /function marketplaceMoneyPanelStyle\(isCompact: boolean\)[\s\S]*?gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "1fr"[\s\S]*?function marketplaceMoneyRouteCardStyle\(\s*isCompact: boolean,\s*wide = false[\s\S]*?minHeight: isCompact \? \(wide \? 84 : 112\) : 150[\s\S]*?gridColumn: isCompact && wide \? "1 \/ -1" : undefined[\s\S]*?wide[\s\S]*?\? "42px minmax\(0, 1fr\) auto"[\s\S]*?: "38px minmax\(0, 1fr\)"[\s\S]*?\? '"icon text status"'[\s\S]*?: '"icon status" "text text"'/,
  "Money Pool compact facts must use a two-column phone grid with one wide pool row and two compact readiness cards."
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
    "marketplace.money.pay-in-account",
    "marketplace.money.money-out-destination",
    "marketplace.money.pay-in-account-save",
    "marketplace.money.pay-in-account-close",
    "marketplace.money.money-in",
    "marketplace.money.money-out",
  ];

  if (actionIds.join("|") !== expectedActionIds.join("|")) {
    addFinding(
      moneySection.start,
      "Money Pool detail section must expose pool actions, one pay-in editor, and one Money Out route link in the audited order.",
      actionIds.join(", ") || "none"
    );
  }

  [
    /Money In \/ Pool/,
    /Pay into this marketplace pool and check the receiving rail\./,
    /marketplaceMoneyRouteCardStyle\(isCompact, true\)/,
    /Visible Pool[\s\S]*?Current pool view/,
    /Money In Rail[\s\S]*?Pay this account/,
    /Money Out[\s\S]*?Withdrawal and payout details/,
    /Money In Rail[\s\S]*?Receiving account for this marketplace[\s\S]*?debugId="marketplace\.money\.pay-in-account-save"/,
    /to=\{marketplaceMoneyOutTo\}[\s\S]*?debugId="marketplace\.money\.money-out-destination"[\s\S]*?Open Withdrawal/,
    /debugId="marketplace\.money\.money-in"[\s\S]*?openMarketplaceCta\(event, "moneyIn"\)[\s\S]*?<MarketplaceGlyph name="cash"/,
    /to=\{marketplaceMoneyOutTo\}[\s\S]*?debugId="marketplace\.money\.money-out"[\s\S]*?<MarketplaceGlyph name="card"/,
    /Money In Rail[\s\S]*?Pay this account[\s\S]*?debugId="marketplace\.money\.pay-in-account"[\s\S]*?(Set rail|Open rail|Close rail)/,
    /style=\{\{[\s\S]*?\.\.\.marketplaceInlineActionsStyle\(isCompact\)[\s\S]*?gridColumn: isCompact \? "1 \/ -1" : undefined/,
  ].forEach((pattern) => {
    if (!pattern.test(moneySection.text)) {
      addFinding(
        moneySection.start,
        "Money Pool detail section is missing an expected local money element.",
        pattern.toString()
      );
    }
  });

  [
    /debugId="marketplace\.money\.money-out-destination-save"/,
    /debugId="marketplace\.money\.money-out-destination-close"/,
    /My personal payout account/,
  ].forEach((pattern) => {
    if (pattern.test(moneySection.text)) {
      addFinding(
        moneySection.start,
        "Money Pool detail section must not contain the payout destination editor.",
        pattern.toString()
      );
    }
  });

  if (/(Trust Passport|TrustSlip|CCI|Owner Shop|ROSCA|Support Requests|Trade Evidence)/.test(moneySection.text)) {
    addFinding(
      moneySection.start,
      "Money Pool detail section must not expose other major lane responsibilities.",
      "Money Pool may link to Money In and Money Out routes, but must not expose trust, shop, ROSCA, support, or trade lane content."
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
