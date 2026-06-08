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
  /case "trade":[\s\S]*?<path d="M5 10h14l-1\.2-4\.5H6\.2z"[\s\S]*?<path d="M13\.8 16\.1 15\.4 17\.7 18\.5 14\.5"/,
  "Trusted Trade must use the stable checked-shop pictogram, not the generic shop mark."
);

assertContains(
  /debugId="marketplace\.tile\.members"[\s\S]*?aria-label="Open trusted trade, members and visible shops"[\s\S]*?openMarketplaceSection\(\s*event,\s*"members",\s*"marketplace-members-shops"\s*\)[\s\S]*?<MarketplaceGlyph name="trade"[\s\S]*?Trade & Shops[\s\S]*?Shops, offers, and visible trade[\s\S]*?Trusted Trade[\s\S]*?Demand Box[\s\S]*?Public Shops/,
  "Trade & Shops grouped card must stay a guided trade launcher and open only the members/shops section."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?members: "marketplace-members-shops"/,
  "Trusted Trade section anchor must remain marketplace-members-shops."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"/,
  "Opening Trusted Trade must use the focused one-lane state, leaving unrelated lanes stepped back."
);

const trustedTradeSection = sectionBetween(
  /id="marketplace-members-shops"/,
  /id="marketplace-loans-support"/
);

if (!trustedTradeSection.text) {
  addFinding(-1, "Trusted Trade detail section must exist before Support Requests.");
} else {
  [
    /Trusted Trade/,
    /See known members and visible shops inside this selected/,
    /What this trade lane does/,
    /community-bound/,
    /use Demand Box for needs/,
    /<MarketplaceGlyph name="demand" size=\{24\} \/>/,
    /Demand Box[\s\S]*?Post what this marketplace needs[\s\S]*?fuller Demand[\s\S]*?Box page carry the request/,
    /debugId="marketplace\.members\.demand-box"[\s\S]*?openMarketplaceCta\(event, "demandBox"\)[\s\S]*?Open Demand Box/,
    /Step \{step\}/,
    /Check the member[\s\S]*?Read the name and GSN ID first/,
    /Open the shop[\s\S]*?Visit only shops visible in this community/,
    /Keep it local[\s\S]*?Use other lanes for support, money, or trust work/,
    /Trade actions stay inside this community's visible[\s\S]*?member and shop list/,
    /debugId="marketplace\.members\.toggle"/,
    /debugId=\{`marketplace\.member\.\$\{row\.gmfnId[\s\S]{0,140}\}\.shop`\}/,
  ].forEach((pattern) => {
    if (!pattern.test(trustedTradeSection.text)) {
      addFinding(
        trustedTradeSection.start,
        "Trusted Trade detail section is missing an expected guided member/shop element.",
        pattern.toString()
      );
    }
  });

  if (/(choose-supporter|Choose supporter|toggleMemberAsSupporter|guarantor|Loan Readiness|Loan Suggestions|Loan Workbench|Money Pool|ROSCA|Trust Passport|TrustSlip|CCI|Owner Shop)/.test(trustedTradeSection.text)) {
    addFinding(
      trustedTradeSection.start,
      "Trusted Trade detail section must not expose other major lane responsibilities.",
      "Trusted Trade should stay member/shop focused; Support Requests owns guarantor selection."
    );
  }
}

if (findings.length > 0) {
  console.error("Marketplace Trusted Trade lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace Trusted Trade lane audit passed.");
