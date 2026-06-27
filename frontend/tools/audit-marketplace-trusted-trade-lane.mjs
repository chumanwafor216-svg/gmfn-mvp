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

assertContains(
  /visibleTradeMemberRows = memberRows\.slice\(0, isCompact \? 3 : 5\)[\s\S]*?hiddenTradeMemberRows = memberRows\.slice\(visibleTradeMemberRows\.length\)[\s\S]*?visibleTradeShopCount = memberRows\.filter\(\(row\) => row\.shopTo\)\.length/,
  "Trusted Trade must cap the first visible member list and tuck the rest behind a compact disclosure."
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
    /Open the shop record for current evidence before[\s\S]*?trade, credit, goods, or money move/,
    /\{memberRows\.length\} visible member/,
    /\{visibleTradeShopCount\} public shop/,
    /Community-bound trade/,
    /<MarketplaceGlyph name="demand" size=\{24\} \/>/,
    /Demand Box[\s\S]*?Post a local need or offer request for this marketplace/,
    /debugId="marketplace\.members\.demand-box"[\s\S]*?openMarketplaceCta\(event, "demandBox"\)[\s\S]*?Demand Box/,
    /Protected Trade Record/,
    /creates evidence, not escrow/,
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.role"\)/,
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.counterpart"\)/,
    /debugId="marketplace\.protected-trade\.create"[\s\S]*?Start record/,
    /debugId="marketplace\.protected-trade\.refresh"[\s\S]*?Refresh records/,
    /Visible members/,
    /Full visible list shown/,
    /more tucked away/,
    /debugId="marketplace\.members\.more-visible\.summary"[\s\S]*?More visible members/,
    /Shop visible/,
    /No shop yet/,
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

  if (/What this trade lane does|Step \{step\}|Read the name and GSN ID first|Use other lanes for support, money, or trust work/.test(trustedTradeSection.text)) {
    addFinding(
      trustedTradeSection.start,
      "Trusted Trade detail section must not restore the old explainer and three-card instruction stack.",
      "The compact Trade lane should show status chips, Demand Box, visible members, and a tucked-away member disclosure."
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
