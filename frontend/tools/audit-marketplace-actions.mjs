/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

function assertContains(file, pattern, message) {
  const text = read(file);

  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertStableActionsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern = /<Stable(?:Button|CtaLink)\b[\s\S]*?>/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const tag = match[0];
    if (!/debugId=/.test(tag)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Marketplace-domain stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: tag.replace(/\s+/g, " ").slice(0, 180),
      });
    }
  }
}

[
  "src/pages/MarketplacePage.tsx",
  "src/pages/MarketplaceWorkspacePage.tsx",
  "src/pages/ShopGalleryPage.tsx",
].forEach(assertStableActionsHaveDebugIds);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /return publicShopDiariesUrl\(publicShopOwnerId\);[\s\S]*?const link = ownerId \? publicShopDiariesUrl\(ownerId\) : "";/,
  "Marketplace owner share/copy/open actions must send outward visitors to Shop Diaries, not only the upper shop face."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.public-shop\.visible-link"[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?debugId="marketplace\.public-shop\.open"/,
  "Marketplace public shop controls must keep stable debug ids in the visible-link, refresh, copy, email, and open order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?debugId="marketplace\.links\.join\.refresh"[\s\S]*?debugId="marketplace\.links\.join\.copy-message"[\s\S]*?debugId="marketplace\.links\.join\.email"[\s\S]*?debugId="marketplace\.links\.join\.whatsapp"/,
  "Marketplace join-link controls must keep named, traceable actions in their stable order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.create\.copy"[\s\S]*?debugId="marketplace\.links\.create\.copy-message"[\s\S]*?debugId="marketplace\.links\.create\.email"[\s\S]*?debugId="marketplace\.links\.create\.open"[\s\S]*?debugId="marketplace\.links\.create\.whatsapp"/,
  "Marketplace create-link controls must keep named, traceable actions in their stable order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /Starting a brand-new community belongs to the wider GSN start door[\s\S]*?<div style=\{\{ \.\.\.innerCard\("#FFFFFF"\), display: "none" \}\} aria-hidden="true">[\s\S]*?<div style=\{sectionLabel\(\)\}>Start a new community<\/div>/,
  "Marketplace-owned links must not visibly expose the create-community start door inside the selected-community link desk."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?Join invite link is not ready yet\.[\s\S]*?debugId="marketplace\.links\.community-desk\.copy"[\s\S]*?Community access desk link is not ready yet\.[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?publicShopActionUnavailableMessage/,
  "Marketplace not-ready link actions must remain tappable explainers instead of dead disabled controls."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.support\.start-request"[\s\S]*?debugId="marketplace\.support\.refresh-fit"[\s\S]*?debugId="marketplace\.support\.cancel-draft"[\s\S]*?debugId="marketplace\.support\.loan-readiness"[\s\S]*?debugId="marketplace\.support\.loan-suggestions"[\s\S]*?debugId="marketplace\.support\.loan-workbench"[\s\S]*?debugId="marketplace\.support\.finance"[\s\S]*?debugId="marketplace\.support\.full-loans"/,
  "Marketplace support and loan actions must stay explicitly traceable so they cannot silently fall into unrelated routes."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}[\s\S]*?Shop Diaries[\s\S]*?visibleProducts\.map/,
  "Public Shop Gallery must anchor the 12-block Shop Diaries shelf for shared shop links."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /publicShopBlockUrl\(\{[\s\S]*?productId: product\.id,[\s\S]*?block: product\.slotNumber,/,
  "Public Shop Gallery product sharing must keep product/block links inside Shop Diaries."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const shouldRevealProduct = id !== PUBLIC_SHOP_DIARIES_ANCHOR;[\s\S]*?revealGalleryTarget\(id\);/,
  "Public Shop Gallery hash handling must distinguish whole Shop Diaries links from exact product/block links."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /function shopLinkForRecord\(shop: any\): string \{[\s\S]*?publicShopRootUrl\(direct\)[\s\S]*?return gmfnId \? publicShopUrl\(gmfnId\) : "";/,
  "Marketplace Workspace internal shop browsing must continue to use confirmed public shop roots, not unconfirmed app routes."
);

assertContains(
  "src/lib/marketplaceActionStability.ts",
  /MARKETPLACE_LANDING_TRACE_KEY[\s\S]*?marketplaceLandingOffsetPx[\s\S]*?visualViewport[\s\S]*?scrollElementToMarketplaceLanding[\s\S]*?window\.scrollTo[\s\S]*?marketplaceSectionStyle/,
  "Marketplace front/workspace pages must share one phone-safe landing helper instead of route-local scroll guesses."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /scrollElementToMarketplaceLanding[\s\S]*?traceMarketplaceLanding[\s\S]*?\[80, 180, 360, 720, 1200, 1800\]\.forEach[\s\S]*?setSectionsTouched\(\(prev\) => \(\{ \.\.\.prev, \[key\]: true \}\)\)[\s\S]*?id="marketplace-money-routes"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-owned-links"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-members-shops"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-loans-support"[\s\S]*?marketplaceSectionStyle\(\)/,
  "Marketplace front page section buttons must mark opened sections as touched and land through the shared phone-safe section helper."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceActionStyle[\s\S]*?height: 56[\s\S]*?maxHeight: 56[\s\S]*?function marketplaceInlineActionsStyle[\s\S]*?gridAutoRows: "58px"[\s\S]*?function marketplaceOsTileStyle[\s\S]*?height: isCompact \? 218 : 178[\s\S]*?maxHeight: isCompact \? 218 : 178[\s\S]*?54px 2\.45em 2\.35em 2\.8em[\s\S]*?function marketplaceOsTileMetricStyle[\s\S]*?WebkitLineClamp: 2[\s\S]*?whiteSpace: "normal"[\s\S]*?function marketplaceOsRowStyle[\s\S]*?height: isCompact \? 116 : 96[\s\S]*?maxHeight: isCompact \? 116 : 96[\s\S]*?42px minmax\(0, 1fr\) 18px[\s\S]*?transform: "none"[\s\S]*?flexShrink: 0[\s\S]*?transition: "none"[\s\S]*?function marketplaceOsRowTextStackStyle[\s\S]*?overflow: "hidden"[\s\S]*?function marketplaceOsRowDetailStyle[\s\S]*?WebkitLineClamp: isCompact \? 3 : 2[\s\S]*?function marketplaceOsArrowStyle[\s\S]*?width: 18/,
  "Marketplace front-page tiles and operating-lane rows must keep fixed phone-safe action geometry with enough reserve so text cannot escape button boxes."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /scrollElementToMarketplaceLanding[\s\S]*?traceMarketplaceLanding[\s\S]*?\[80, 180, 360, 720, 1200\]\.forEach[\s\S]*?id="marketplace-workspace-alerts"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-workspace-members"[\s\S]*?marketplaceSectionStyle\(\)/,
  "Marketplace Workspace inner buttons must use shared phone-safe section landing instead of raw scrollIntoView."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /getAccessToken[\s\S]*?function workspaceCtaPath\(target: CtaTarget\): string[\s\S]*?path\.startsWith\("\/app\/"\)[\s\S]*?next\.set\("session", "expired"\)[\s\S]*?next\.set\("next", path\)[\s\S]*?function workspaceActionRowStyle[\s\S]*?gridAutoRows: "58px"[\s\S]*?function workspaceActionStyle[\s\S]*?height: 58[\s\S]*?workspaceCtaPath\(communityHomeCta\)[\s\S]*?workspaceCtaPath\(marketplaceCta\)[\s\S]*?workspaceActionStyle\(\)[\s\S]*?workspaceCtaPath\(item\.target\)[\s\S]*?workspaceCtaPath\(joinRequestsCta\)/,
  "Public Marketplace Workspace CTAs must send unsigned users through login recovery instead of dumping them directly into private app routes."
);

if (findings.length > 0) {
  console.error("Marketplace action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace action audit passed.");
