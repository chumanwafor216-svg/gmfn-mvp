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
    id: "marketplace.members.trade-evidence-module",
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
    label: "Financial support requests",
  },
  {
    id: "marketplace.support.rosca-module",
    tone: "rosca",
    label: "Separate ROSCA desk",
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

const tradeMembersSection = sectionBetween(
  /id="marketplace-members-shops"/,
  /id="marketplace-demand-box"/
);

if (!tradeMembersSection.text) {
  addFinding(-1, "Trade and members section must exist before Demand Box.");
} else {
  const tradeIndex = tradeMembersSection.text.indexOf(
    "marketplace.members.trade-evidence-module"
  );
  const membersIndex = tradeMembersSection.text.indexOf(
    "marketplace.members.visible-members-module"
  );
  if (tradeIndex === -1 || membersIndex === -1 || tradeIndex >= membersIndex) {
    addFinding(
      tradeMembersSection.start,
      "Trade Evidence must appear as its own module before the Visible Members module.",
      "Expected trade module followed by visible members module."
    );
  }

  assertNotContains(
    /marketplace\.members\.demand-box|Post a local need or offer request for this marketplace/,
    "Demand Box must not be embedded inside Trade Evidence or Visible Members."
  );
}

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
