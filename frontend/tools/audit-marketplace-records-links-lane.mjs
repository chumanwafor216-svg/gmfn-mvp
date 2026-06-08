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
  /debugId="marketplace\.row\.records-links"[\s\S]*?aria-label="Open Records and Links for this marketplace"[\s\S]*?openMarketplaceSection\(event, "tools", "marketplace-owned-links"\)[\s\S]*?<MarketplaceGlyph name="links"[\s\S]*?Records & Links[\s\S]*?Join, verify, shop face, and paid repost links[\s\S]*?Join Link[\s\S]*?Verify[\s\S]*?Shop Face[\s\S]*?Paid Repost/,
  "Records & Links grouped card must open marketplace-owned links and not look like the member/trade lane."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?tools: "marketplace-owned-links"/,
  "Records & Links section anchor must remain marketplace-owned-links."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"/,
  "Opening Records & Links must use the focused one-lane state, leaving unrelated lanes stepped back."
);

const recordsLinksSection = sectionBetween(
  /id="marketplace-owned-links"/,
  /id="marketplace-members-shops"/
);

if (!recordsLinksSection.text) {
  addFinding(-1, "Records & Links detail section must exist before Trusted Trade.");
} else {
  const actionIds = [
    ...recordsLinksSection.text.matchAll(/debugId="(marketplace\.(?:links|public-shop|network-repost)\.[^"]+)"/g),
  ].map((match) => match[1]);
  const expectedActionIds = [
    "marketplace.links.toggle",
    "marketplace.links.join.copy",
    "marketplace.links.join.refresh",
    "marketplace.links.join.copy-message",
    "marketplace.links.join.email",
    "marketplace.links.join.whatsapp",
    "marketplace.links.community-desk.copy",
    "marketplace.links.community-desk.email",
    "marketplace.links.community-desk.open",
    "marketplace.public-shop.visible-link",
    "marketplace.public-shop.refresh",
    "marketplace.public-shop.copy",
    "marketplace.public-shop.email",
    "marketplace.public-shop.open",
    "marketplace.network-repost.selected-block.copy-link",
    "marketplace.network-repost.find-targets",
    "marketplace.network-repost.generate-payment-code",
    "marketplace.network-repost.refresh-credits",
    "marketplace.network-repost.place",
    "marketplace.network-repost.subscription",
    "marketplace.links.owner-shop-control",
  ];

  for (const debugId of expectedActionIds) {
    if (!actionIds.includes(debugId)) {
      addFinding(
        recordsLinksSection.start,
        "Records & Links detail section is missing an expected link/record action.",
        debugId
      );
    }
  }

  [
    /Records & Links/,
    /Keep join, marketplace, shop, and controlled outward[\s\S]*?links separated/,
    /What these links do/,
    /Choose the door[\s\S]*?Join is for entry\. Verify is for proof/,
    /Share the right face[\s\S]*?Shop face is the one storefront tied to the member/,
    /Place with care[\s\S]*?Paid repost only moves a selected public block/,
    /Outgoing links/,
    /Join this community/,
    /Verify community/,
    /Public shop face/,
    /Paid Repost/,
    /Owner controls/,
    /debugId=\{`marketplace\.network-repost\.target\.\$\{code \|\| index\}\.use`\}/,
    /debugId="marketplace\.links\.owner-shop-control"[\s\S]*?openMarketplaceCta\(event, "shop"\)/,
  ].forEach((pattern) => {
    if (!pattern.test(recordsLinksSection.text)) {
      addFinding(
        recordsLinksSection.start,
        "Records & Links detail section is missing an expected guided link element.",
        pattern.toString()
      );
    }
  });

  if (/(Member Ledger|People, shops|Trusted Trade|Support Requests|Money Pool|ROSCA|guarantor|Loan Readiness|Trust Passport|TrustSlip|CCI)/.test(recordsLinksSection.text)) {
    addFinding(
      recordsLinksSection.start,
      "Records & Links detail section must not expose other major lane responsibilities.",
      "Records & Links may open owner shop control, but it must not become member, support, money, ROSCA, or trust work."
    );
  }
}

if (findings.length > 0) {
  console.error("Marketplace Records & Links lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace Records & Links lane audit passed.");
