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
  /type MarketplaceGlyphName =[\s\S]*?\| "rosca"[\s\S]*?case "rosca":[\s\S]*?<circle cx="12" cy="12" r="7\.2"[\s\S]*?<path d="M8\.7 12h6\.6"/,
  "ROSCA must use the stable savings-circle pictogram, not a generic cycle mark."
);

assertContains(
  /debugId="marketplace\.tile\.support"[\s\S]*?Support & ROSCA[\s\S]*?Support Requests[\s\S]*?ROSCA[\s\S]*?Loans[\s\S]*?debugId="marketplace\.support\.open-rosca"[\s\S]*?openMarketplaceSection\(event, "rosca", "marketplace-rosca"\)[\s\S]*?Open ROSCA/,
  "ROSCA must stay reachable through the grouped Support & ROSCA lane without returning as a separate busy front-door button."
);

assertContains(
  /gridTemplateColumns: isCompact[\s\S]*?\? "1fr"[\s\S]*?: "54px minmax\(0, 1fr\) auto"[\s\S]*?ROSCA savings circles[\s\S]*?Financial support requests[\s\S]*?ROSCA savings[\s\S]*?circles stay separate above and open their own desk/,
  "Marketplace Support gateway must keep the ROSCA handoff full-width on phone and visibly separate it from Financial Support requests."
);

assertContains(
  /id: "rosca"[\s\S]*?label: "Open ROSCA"[\s\S]*?to: "#marketplace-rosca"/,
  "ROSCA must remain available from the expanded More tools intent list and open the ROSCA section anchor."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?rosca: "marketplace-rosca"/,
  "ROSCA section anchor must remain marketplace-rosca."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"/,
  "Opening ROSCA must use the focused one-lane state, leaving unrelated lanes stepped back."
);

assertContains(
  /selectedRoscaMemberIds\.length < 2[\s\S]*?Choose at least two members for this ROSCA cycle[\s\S]*?createRoscaCycle\(\{[\s\S]*?member_user_ids: selectedRoscaMemberIds/,
  "Starting a ROSCA cycle must require explicit selected members and send member_user_ids to the backend."
);

const roscaSection = sectionBetween(
  /id="marketplace-rosca"/,
  /id="marketplace-owned-links"/
);

if (!roscaSection.text) {
  addFinding(-1, "ROSCA detail section must exist before owner links.");
} else {
  const actionIds = [
    ...roscaSection.text.matchAll(/debugId="(marketplace\.rosca\.[^"]+)"/g),
  ].map((match) => match[1]);
  const expectedActionIds = [
    "marketplace.rosca.toggle",
    "marketplace.rosca.activate-yearly",
    "marketplace.rosca.start-cycle",
    "marketplace.rosca.record-payout",
  ];

  if (actionIds.join("|") !== expectedActionIds.join("|")) {
    addFinding(
      roscaSection.start,
      "ROSCA detail section must expose only toggle, yearly activation, start cycle, and record payout in the audited order.",
      actionIds.join(", ") || "none"
    );
  }

  [
    /Member savings circle for this community only/,
    /What this savings circle does/,
    /GSN records the plan, contribution expectations, and payout completion/,
    /Step \{step\}/,
    /Activate yearly service[\s\S]*?Unlock this community's ROSCA desk/,
    /Choose members[\s\S]*?Select only the people in this cycle/,
    /Start cycle[\s\S]*?Set name, amount, currency, and days/,
    /Membership[\s\S]*?Choose 2\+/,
    /Alerts, contribution references, and payout order follow these[\s\S]*?selected cycle members/,
    /Latest members[\s\S]*?members in cycle/,
    /debugId="marketplace\.rosca\.activate-yearly"[\s\S]*?roscaYearlyActive \? "secondary" : "primary"[\s\S]*?Activate yearly service/,
    /debugId="marketplace\.rosca\.start-cycle"[\s\S]*?Activate the GBP 60 yearly ROSCA service before starting a cycle/,
    /debugId="marketplace\.rosca\.record-payout"[\s\S]*?No ROSCA round is ready for payout recording yet/,
  ].forEach((pattern) => {
    if (!pattern.test(roscaSection.text)) {
      addFinding(
        roscaSection.start,
        "ROSCA detail section is missing an expected guided savings-circle element.",
        pattern.toString()
      );
    }
  });

  if (/(Trust Passport|TrustSlip|CCI|Owner Shop|Support Requests|Trade Evidence|Money In \/ Money Out)/.test(roscaSection.text)) {
    addFinding(
      roscaSection.start,
      "ROSCA detail section must not expose other major lane responsibilities.",
      "ROSCA may reference contribution expectations, but must not expose trust, shop, support, trade, or money-route lane content."
    );
  }

}

if (findings.length > 0) {
  console.error("Marketplace ROSCA lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace ROSCA lane audit passed.");
