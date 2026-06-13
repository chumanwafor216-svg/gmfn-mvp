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
  /debugId="marketplace\.row\.records-links"[\s\S]*?aria-label="Open Records and Links for this marketplace"[\s\S]*?openMarketplaceSection\(event, "tools", "marketplace-owned-links"\)[\s\S]*?<MarketplaceGlyph name="links"[\s\S]*?Link Center[\s\S]*?Share, verify, shop, repost\.[\s\S]*?Join[\s\S]*?Verify[\s\S]*?Shop Face[\s\S]*?Paid Repost[\s\S]*?Packages/,
  "Link Center grouped card must open marketplace-owned links and not look like the member/trade lane."
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
    "marketplace.links.community-packages",
    "marketplace.links.package-spotlight",
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
    /Marketplace links/,
    /Link Center/,
    /Share, verify, shop, repost\./,
    /5 lanes/,
    /1 active/,
    /Fast links/,
    /\{isCompact \? "1\. Join" : "1\. Join Community"\}/,
    /\{isCompact \? "Community invite" : "Invite someone into this marketplace\."\}/,
    /Name[\s\S]*?Receiver name/,
    /Note \(optional\)[\s\S]*?Short note/,
    /\{isCompact \? "2\. Verify" : "2\. Verify Community"\}/,
    /Public record/,
    /\{isCompact \? "3\. Shop Face" : "3\. Public Shop Face"\}/,
    /Storefront link/,
    /Paid Repost/,
    /\{isCompact \? "4\. Repost" : "4\. Paid Repost"\}/,
    /Target, duration, credits/,
    /minHeight: isCompact \? 92 : 190/,
    /gridTemplateColumns: isCompact[\s\S]*?\? "72px minmax\(0, 1fr\)"/,
    /display: isCompact \? "none" : "flex"/,
    /gridTemplateColumns: isCompact[\s\S]*?\? "minmax\(0, 1fr\) minmax\(112px, 0\.48fr\)"/,
    /debugId="marketplace\.network-repost\.target-help\.summary"/,
    /debugId="marketplace\.network-repost\.credit-details\.summary"/,
    /\{\.\.\.marketplaceFieldTouchProps\("marketplace\.network-repost\.payment-actions"\)\}[\s\S]*?debugId="marketplace\.network-repost\.generate-payment-code"[\s\S]*?debugId="marketplace\.network-repost\.refresh-credits"[\s\S]*?debugId="marketplace\.network-repost\.place"[\s\S]*?debugId="marketplace\.network-repost\.credit-details\.summary"[\s\S]*?debugId="marketplace\.network-repost\.subscription"/,
    /5\. Community Packages/,
    /15 members included\. Extra members, shop blocks, ROSCA, and meetings live here\./,
    /debugId="marketplace\.links\.community-packages"[\s\S]*?OWNER_SHOP_HASHES\.communityPackage/,
    /debugId="marketplace\.links\.package-spotlight"/,
    /6\. Owner Controls/,
    /Manage your shop & settings/,
    /\{isCompact \? "Control" : "Open Control"\}/,
    /<MarketplaceGlyph name="join"/,
    /<MarketplaceGlyph name="verify"/,
    /<MarketplaceGlyph name="shop"/,
    /<MarketplaceGlyph name="repost"/,
    /<MarketplaceGlyph name="control"/,
    /debugId=\{`marketplace\.network-repost\.target\.\$\{code \|\| index\}\.use`\}/,
    /debugId="marketplace\.links\.owner-shop-control"[\s\S]*?openMarketplaceCta\(event, "shop"\)/,
    /personalizedInviteMaskedLabel/,
  ].forEach((pattern) => {
    if (!pattern.test(recordsLinksSection.text)) {
      addFinding(
        recordsLinksSection.start,
        "Link Center detail section is missing an expected guided link element.",
        pattern.toString()
      );
    }
  });

  if (/(Member Ledger|People, shops|Trusted Trade|Support Requests|Money Pool|guarantor|Loan Readiness|Trust Passport|TrustSlip|CCI|What these links do|Choose the door|Outgoing links)/.test(recordsLinksSection.text)) {
    addFinding(
      recordsLinksSection.start,
      "Link Center detail section must stay compact and must not expose other major lane responsibilities.",
      "Link Center may open owner shop control, but it must not become member, support, money, ROSCA, trust work, or a long explanatory manual."
    );
  }

  if (/joinLinkReserveTextStyle|>[\s\r\n]*\{inviteLink[\s\S]*?\? personalizedInviteLink/.test(recordsLinksSection.text)) {
    addFinding(
      recordsLinksSection.start,
      "Link Center phone surface must not expose raw join URLs or the old tall join-link reserve box.",
      "Use masked link summaries and action buttons instead."
    );
  }
}

assertContains(
  /function marketplaceLinkSummaryStyle\(isCompact: boolean\)[\s\S]*?overflowWrap: "break-word"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"[\s\S]*?function marketplaceLinkHeroStyle[\s\S]*?gridTemplateColumns: isCompact \? "58px minmax\(0, 1fr\)"[\s\S]*?minHeight: isCompact \? 82 : 126[\s\S]*?function marketplaceLinkRowHeaderStyle[\s\S]*?\? "44px minmax\(0, 1fr\)"[\s\S]*?function marketplaceLinkRowStatusStyle[\s\S]*?gridColumn: isCompact \? "2 \/ 3" : undefined[\s\S]*?function marketplaceInlineActionsStyle[\s\S]*?width: "100%"[\s\S]*?maxWidth: "100%"[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?gridAutoRows: isCompact \? "56px" : "58px"[\s\S]*?overflow: "hidden"/,
  "Link Center compact protocol must keep masked summaries, smaller phone hero geometry, two-column mobile headers, and readable 56px phone action groups."
);

assertContains(
  /debugId="marketplace\.public-shop\.visible-link"[\s\S]*?\{publicShopViewLink\}[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?\? "1fr"[\s\S]*?: "repeat\(4, minmax\(0, 1fr\)\)"/,
  "Link Center must show the full public shop domain while stacking Community Package cards as readable one-column records on phone."
);

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
