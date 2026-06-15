/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const packageFile = "package.json";
const protocolFile = "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md";
const marketplaceSource = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const packageSource = readFileSync(join(frontendRoot, packageFile), "utf8");
const protocolSource = readFileSync(join(frontendRoot, protocolFile), "utf8");
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

const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
let emojiMatch;
while ((emojiMatch = emojiPattern.exec(marketplaceSource))) {
  addFinding(
    marketplaceFile,
    marketplaceSource,
    emojiMatch.index,
    "Marketplace page must not use emoji-style marks for core marketplace lanes.",
    emojiMatch[0]
  );
}

[
  "pool",
  "rosca",
  "trade",
  "support",
  "links",
  "spark",
  "trust",
  "demand",
].forEach((name) => {
  assertContains(
    marketplaceFile,
    marketplaceSource,
    new RegExp(`${name}: "[^"]+"`),
    `MarketplaceGlyph must map ${name} to a deterministic 3D GSN icon.`
  );
});

assertContains(
  marketplaceFile,
  marketplaceSource,
  /import \{ GsnLegacyIcon, type GsnIconName \} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*?MARKETPLACE_GLYPH_ICON_MAP[\s\S]*?satisfies Record<MarketplaceGlyphName, GsnIconName>[\s\S]*?function MarketplaceGlyph[\s\S]*?<GsnLegacyIcon/,
  "MarketplaceGlyph must render through the shared 3D GSN icon adapter."
);

assertContains(
  marketplaceFile,
  marketplaceSource,
  /const MARKETPLACE_GLYPH_ICON_MAP = \{[\s\S]*?bank: "financeInstitution"[\s\S]*?chart: "financeInstitution"[\s\S]*?ledger: "proof"[\s\S]*?payment: "repaymentSchedule"[\s\S]*?pool: "financeInstitution"[\s\S]*?rosca: "repaymentSchedule"[\s\S]*?shop: "marketplace"[\s\S]*?support: "repaymentSchedule"[\s\S]*?trade: "marketplace"[\s\S]*?verify: "proof"/,
  "Marketplace semantic icons must use the market stall, finance institution, repayment schedule, and proof meanings for front-page lanes."
);

assertContains(
  marketplaceFile,
  marketplaceSource,
  /function marketplaceOsRowIconStyle\(bg: string, isCompact = false\): React\.CSSProperties \{[\s\S]*?background:\s*"linear-gradient\(180deg, rgba\(255,255,255,0\.98\)[\s\S]*?border: "1px solid rgba\(13,95,168,0\.12\)"[\s\S]*?inset 4px 0 0 rgba\(214,170,69,0\.16\)/,
  "Marketplace row icons must use light embossed tiles by default, not heavy color shields."
);

[
  {
    id: "marketplace.tile.money",
    glyph: "pool",
    label: "Finance & Pool",
    tags: ["Money In", "Money Out", "Banking Rails"],
  },
  {
    id: "marketplace.tile.rosca",
    glyph: "rosca",
    label: "ROSCA",
    tags: ["Yearly Service", "Member Cycle", "Payout Record"],
  },
  {
    id: "marketplace.tile.members",
    glyph: "trade",
    label: "Trade & Shops",
    tags: ["Trusted Trade", "Demand Box", "Public Shops"],
  },
  {
    id: "marketplace.tile.support",
    glyph: "support",
    label: "Support & Loans",
    tags: ["Support Requests", "Loan Process"],
  },
  {
    id: "marketplace.row.records-links",
    glyph: "links",
    label: "Link Center",
    tags: ["Join", "Verify", "Create", "Shop Face"],
  },
  {
    id: "marketplace.extra-tools.toggle",
    glyph: "spark",
    label: "More / Community Tools",
    tags: ["Trust", "Identity", "TrustSlip", "Messages"],
  },
].forEach((card) => {
  const pattern = new RegExp(
    `debugId="${card.id.replace(/\./g, "\\.")}"[\\s\\S]*?` +
      `<MarketplaceGlyph name="${card.glyph}"[\\s\\S]*?` +
      `${card.label}[\\s\\S]*?` +
      card.tags.map((tag) => `${tag}[\\s\\S]*?`).join("")
  );
  assertContains(
    marketplaceFile,
    marketplaceSource,
    pattern,
    `Marketplace grouped front card must keep ${card.label} with audited pictogram and tags.`
  );
});

assertContains(
  marketplaceFile,
  marketplaceSource,
  /Local Marketplace Trust[\s\S]*?selected community's local trust signal[\s\S]*?fuller proof routes/,
  "Compact Trust pill expansion must remain a local Marketplace Trust summary."
);

assertContains(
  marketplaceFile,
  marketplaceSource,
  /id: "demand"[\s\S]*?intent: "demandBox"[\s\S]*?visible: false/,
  "Demand Box must remain searchable but hidden from the visible More button grid."
);

assertContains(
  marketplaceFile,
  marketplaceSource,
  /Post a local need or offer request for this marketplace[\s\S]*?debugId="marketplace\.members\.demand-box"[\s\S]*?openMarketplaceCta\(event, "demandBox"\)[\s\S]*?Demand Box/,
  "Demand Box must stay caged inside Trade & Shops as the marketplace-local demand launcher."
);

assertContains(
  marketplaceFile,
  marketplaceSource,
  /Focus your work[\s\S]*?Open one lane at a time\. Everything else steps back\./,
  "Marketplace front package must keep the one-lane focus guide."
);

[
  "audit:marketplace-money-pool-lane",
  "audit:marketplace-rosca-lane",
  "audit:marketplace-support-lane",
  "audit:marketplace-trusted-trade-lane",
  "audit:marketplace-records-links-lane",
  "audit:marketplace-more-tools-lane",
  "audit:marketplace-trust-pill",
  "audit:marketplace-demand-box-lane",
  "audit:marketplace-front-package",
].forEach((scriptName) => {
  assertContains(
    packageFile,
    packageSource,
    new RegExp(`"${scriptName}"`),
    `${scriptName} must stay registered as a package script.`
  );
});

assertContains(
  protocolFile,
  protocolSource,
  /Marketplace front package closeout[\s\S]*?audit:marketplace-front-package/,
  "Guided work protocol must require the Marketplace front package closeout audit before owner phone-check."
);

if (findings.length > 0) {
  console.error("Marketplace front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace front package audit passed.");
