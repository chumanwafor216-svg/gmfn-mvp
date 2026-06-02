/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const source = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const findings = [];
const expectedStableActionCount = 49;

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  findings.push({
    file: marketplaceFile,
    line: 1,
    message,
    text: "Expected Marketplace button inventory pattern was not found.",
  });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

const actionPattern = /<Stable(?:Button|CtaLink)\b[\s\S]*?(?:\/>|<\/Stable(?:Button|CtaLink)>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  const debugMatch = block.match(/debugId=(?:"([^"]+)"|\{`([^`]+)`\}|\{([^}]+)\})/);
  actions.push({
    line: lineAt(match.index),
    debugId: debugMatch?.[1] || debugMatch?.[2] || debugMatch?.[3] || "",
    block,
  });
}

if (actions.length !== expectedStableActionCount) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: `Marketplace Stable action inventory changed from ${expectedStableActionCount} to ${actions.length}. Re-audit the new or removed action on phone before accepting this baseline.`,
    text: actions.map((action) => `${action.line}:${action.debugId || "missing-debugId"}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.debugId) {
    findings.push({
      file: marketplaceFile,
      line: action.line,
      message: "Every Marketplace stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/style=/.test(action.block)) {
    findings.push({
      file: marketplaceFile,
      line: action.line,
      message: "Every Marketplace stable action must declare route-local phone-safe geometry.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const expectedOrder = [
  "marketplace.empty.community-home",
  "marketplace.empty.dashboard",
  "marketplace.tile.money",
  "marketplace.tile.support",
  "marketplace.tile.members",
  "marketplace.tile.trust",
  "marketplace.row.money",
  "marketplace.row.payment-rails",
  "marketplace.row.loan-process",
  "marketplace.row.member-ledger",
  "marketplace.row.demand-box",
  "marketplace.row.records-links",
  "marketplace.extra-tools.toggle",
  "marketplace.intent.submit",
  "marketplace.money.toggle",
  "marketplace.money.money-in",
  "marketplace.money.money-out",
  "marketplace.money.finance",
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
  "marketplace.links.owner-shop-control",
  "marketplace.members.toggle",
  "marketplace.support.toggle",
  "marketplace.support.start-request",
  "marketplace.support.refresh-fit",
  "marketplace.support.cancel-draft",
  "marketplace.support.loan-readiness",
  "marketplace.support.loan-suggestions",
  "marketplace.support.loan-workbench",
  "marketplace.support.finance",
  "marketplace.support.full-loans",
  "marketplace.support.send-guarantor-requests",
];

let cursor = -1;
for (const debugId of expectedOrder) {
  const next = source.indexOf(`debugId="${debugId}"`, cursor + 1);
  if (next === -1) {
    findings.push({
      file: marketplaceFile,
      line: 1,
      message: "Marketplace front-to-inner action inventory is missing an expected action.",
      text: debugId,
    });
    continue;
  }
  if (next < cursor) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(next),
      message: "Marketplace front-to-inner action order changed. Re-audit phone flow before accepting this reorder.",
      text: debugId,
    });
  }
  cursor = next;
}

assertContains(
  /const MARKETPLACE_INTENT_ITEMS:[\s\S]*?id: "money-in"[\s\S]*?id: "money-out"[\s\S]*?id: "finance"[\s\S]*?id: "support"[\s\S]*?id: "shop"[\s\S]*?id: "invite"[\s\S]*?id: "trust"[\s\S]*?id: "identity"[\s\S]*?id: "trustslip"[\s\S]*?id: "demand"[\s\S]*?id: "community"[\s\S]*?id: "messages"/,
  "Marketplace intent guide must keep the full inner action manifest in stable order."
);

assertNotContains(
  /id: "(?:identity|trustslip)"[\s\S]{0,260}?visible: false/g,
  "Marketplace CCI and TrustSlip shortcuts must stay visible in the extra-tools panel."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?money: "marketplace-money-routes"[\s\S]*?tools: "marketplace-owned-links"[\s\S]*?members: "marketplace-members-shops"[\s\S]*?support: "marketplace-loans-support"/,
  "Marketplace section anchors must stay aligned to money, links, members, and support sections."
);

assertContains(
  /function marketplaceInlineActionsStyle[\s\S]*?gridAutoRows: "58px"[\s\S]*?function marketplaceInlineActionStyle[\s\S]*?height: 58[\s\S]*?minHeight: 58[\s\S]*?maxHeight: 58[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.open"[\s\S]*?stableHeight=\{58\}/,
  "Marketplace inline/link-desk buttons must keep one 58px row reserve so public-shop controls cannot jump between refresh/copy/email/open states."
);

assertNotContains(
  /display: "none"|marketplace\.links\.create\.|publicCreateEntryLink|Start a new community/g,
  "Marketplace button inventory must not include hidden create-community source-only actions."
);

assertContains(
  /type MarketplaceGlyphName[\s\S]*?function MarketplaceGlyph[\s\S]*?name: MarketplaceGlyphName/,
  "Marketplace front button inventory must keep deterministic SVG glyphs for phone-stable action marks."
);

assertNotContains(
  /[\u{1F6CD}\u{1F465}\u{1F6E1}\u{1F4B3}\u{1F91D}\u{1F6D2}\u{1F4B7}\u{1F3E6}\u{1F49A}\u{1F4CB}\u{1F4E3}\u{1F5C2}\u{2728}\u{203A}\u{2303}]/gu,
  "Marketplace front button inventory must not use emoji or text chevrons in action marks."
);

if (findings.length > 0) {
  console.error("Marketplace button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Marketplace button inventory audit passed: ${actions.length} stable source actions, with hidden create-community actions removed.`
);
