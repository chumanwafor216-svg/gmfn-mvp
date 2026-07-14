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
  const match = source.match(pattern);
  if (!match) return;
  addFinding(match.index || 0, message, match[0]);
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
  /type MarketplaceDepartmentTone[\s\S]*?\| "trade"[\s\S]*?\| "members"[\s\S]*?\| "demand"[\s\S]*?\| "support"[\s\S]*?\| "rosca"/,
  "Marketplace department tones must cover the major marketplace arms."
);

assertContains(
  /function marketplaceDepartmentShellStyle\([\s\S]*?MarketplaceDepartmentTone[\s\S]*?trade:[\s\S]*?members:[\s\S]*?demand:[\s\S]*?support:[\s\S]*?rosca:/,
  "Marketplace must keep one shared shell helper for department separation."
);

assertContains(
  /function marketplaceDepartmentHeaderStyle\([\s\S]*?borderBottom: "1px solid rgba\(16,37,59,0\.08\)"/,
  "Marketplace department headers must keep a visual divider between module title and body."
);

const expectedModules = [
  {
    id: "marketplace.trade.evidence-module",
    tone: "trade",
    label: "Trade Evidence Record",
  },
  {
    id: "marketplace.members.visible-members-module",
    tone: "members",
    label: "Visible members",
  },
  {
    id: "marketplace.demand.module",
    tone: "demand",
    label: "Local needs and offers",
  },
  {
    id: "marketplace.support.financial-support-module",
    tone: "support",
    label: "Loan Support requests",
  },
];

for (const module of expectedModules) {
  assertContains(
    new RegExp(
      module.id.replace(/\./g, "\\.") +
        `[\\s\\S]*?marketplaceDepartmentShellStyle\\("${module.tone}", isCompact\\)[\\s\\S]*?` +
        module.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    ),
    `${module.label} must live inside the shared ${module.tone} department shell.`
  );
}

assertContains(
  /marketplace\.support\.path-chooser[\s\S]*?marketplaceDepartmentShellStyle\("support", isCompact\)[\s\S]*?Loan Support[\s\S]*?debugId="marketplace\.support\.open-loan-support"[\s\S]*?Open Loan Support/,
  "Support must open first as a path chooser with Loan Support as its own focused support department."
);

assertContains(
  /marketplace\.support\.path-chooser[\s\S]*?marketplaceDepartmentShellStyle\("rosca", isCompact\)[\s\S]*?ROSCA[\s\S]*?debugId="marketplace\.support\.open-rosca"[\s\S]*?Open ROSCA/,
  "Support must offer ROSCA as a separate ROSCA department path instead of embedding it in loan support."
);

assertNotContains(
  /marketplace\.support\.rosca-module|Separate ROSCA desk/,
  "ROSCA must not be sandwiched inside the Support page as an embedded support module."
);

const supportSelectedModule = sectionBetween(
  /marketplace\.support\.selected-module/,
  /marketplace\.support\.financial-support-module/
);

if (!supportSelectedModule.text) {
  addFinding(-1, "Support selected-marketplace module must exist.");
} else {
  const fullRowChipCount = (
    supportSelectedModule.text.match(
      /flexBasis: isCompact \? "100%" : "auto"[\s\S]*?overflowWrap: "anywhere"/g
    ) || []
  ).length;

  if (fullRowChipCount < 2) {
    addFinding(
      supportSelectedModule.start,
      "Support selected-marketplace chips must wrap safely on phone instead of crowding into neighboring chips.",
      "Expected marketplace name and GSN ID chips to use phone full-row wrapping."
    );
  }
}

const tradeToMembersSection = sectionBetween(
  /id="marketplace-trade-evidence"/,
  /id="marketplace-members-shops"/
);

if (!tradeToMembersSection.text) {
  addFinding(-1, "Trade Evidence section must exist before Members & Shops.");
} else {
  const tradeIndex = tradeToMembersSection.text.indexOf(
    "marketplace.trade.evidence-module"
  );
  if (tradeIndex === -1) {
    addFinding(
      tradeToMembersSection.start,
      "Trade Evidence must appear as its own module before the Members & Shops section.",
      "Expected marketplace.trade.evidence-module before id=\"marketplace-members-shops\"."
    );
  }
}

const membersToDemandSection = sectionBetween(
  /id="marketplace-members-shops"/,
  /id="marketplace-demand-box"/
);

if (!membersToDemandSection.text) {
  addFinding(-1, "Members & Shops section must exist before Demand Box.");
} else if (!membersToDemandSection.text.includes("marketplace.members.visible-members-module")) {
  addFinding(
    membersToDemandSection.start,
    "Visible Members must stay inside the Members & Shops section before Demand Box.",
    "Expected marketplace.members.visible-members-module before id=\"marketplace-demand-box\"."
  );
}

assertNotContains(
  /marketplace\.members\.demand-box|Post a local need or offer request for this marketplace/,
  "Demand Box must not be embedded inside Trade Evidence or Visible Members."
);

assertContains(
  /textAreaStyle\(\): React\.CSSProperties \{[\s\S]*?fontFamily: "inherit"[\s\S]*?overflowY: "hidden"[\s\S]*?whiteSpace: "pre-wrap"/,
  "Marketplace textareas must use human app styling instead of code-like scroll boxes."
);

if (findings.length > 0) {
  console.error("Marketplace department boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace department boundary audit passed.");
