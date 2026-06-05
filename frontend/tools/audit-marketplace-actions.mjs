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

function assertNotContains(file, pattern, message) {
  const text = read(file);
  let match;

  while ((match = pattern.exec(text))) {
    findings.push({
      file,
      line: text.slice(0, match.index).split(/\r?\n/).length,
      message,
      text: text.slice(match.index, match.index + 180).replace(/\s+/g, " "),
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
  /return publicShopUrl\(publicShopOwnerId\);[\s\S]*?const link = ownerId \? publicShopUrl\(ownerId\) : "";/,
  "Marketplace owner share/copy/open actions must send outward visitors to the canonical public shop root; exact block links are handled by Shop Diaries item actions."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.public-shop\.visible-link"[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?debugId="marketplace\.public-shop\.open"/,
  "Marketplace public shop controls must keep stable debug ids in the visible-link, refresh, copy, email, and open order."
);

assertContains(
  "src/lib/api.ts",
  /export async function createSpotlightPaymentInstruction[\s\S]*?\/payment-instructions\/spotlight[\s\S]*?quantity_total[\s\S]*?visibility_scope/,
  "Network Spotlight placement must use a named frontend payment-instruction rail for paid Spotlight credits."
);

assertContains(
  "src/lib/api.ts",
  /export async function getMarketplaceShopSpotlightStatus[\s\S]*?\/marketplace\/shops\/[\s\S]*?\/spotlight-status/,
  "Network Spotlight placement must read shop paid-credit status from the backend instead of inferring it from a failed repost."
);

assertContains(
  "src/lib/api.ts",
  /export async function getMarketplaceRepostTargetSuggestions[\s\S]*?\/marketplace\/products\/[\s\S]*?\/repost-targets/,
  "Network Spotlight placement must use the backend target-suggestion route instead of guessing target community IDs in the page."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /createSpotlightPaymentInstruction\(\{[\s\S]*?quantity_total: requiredCredits[\s\S]*?visibility_scope: "marketplace_repost"/,
  "Marketplace Network Spotlight placement must generate a payment code with the exact required paid-credit quantity and marketplace_repost scope."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-paid-network-placement"[\s\S]*?availableMarketplaceRepostCredits[\s\S]*?paid credit[\s\S]*?debugId="marketplace\.network-repost\.generate-payment-code"[\s\S]*?debugId="marketplace\.network-repost\.refresh-credits"[\s\S]*?debugId="marketplace\.network-repost\.place"/,
  "Marketplace Network Spotlight placement must visibly show paid credits and keep generate, refresh, and place controls in stable order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /async function loadMarketplaceRepostTargetSuggestions[\s\S]*?getMarketplaceRepostTargetSuggestions\(productId/,
  "Marketplace Network Spotlight target suggestions must be loaded through the named backend API helper."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-paid-network-placement"[\s\S]*?debugId="marketplace\.network-repost\.find-targets"[\s\S]*?debugId=\{`marketplace\.network-repost\.target\.\$\{code \|\| index\}\.use`\}/,
  "Marketplace Network Spotlight placement must keep backend target suggestions and Use ID buttons inside the paid placement panel."
);

{
  const text = read("src/pages/MarketplacePage.tsx");
  const submitStart = text.indexOf("async function submitMarketplaceRepost()");
  const submitEnd = submitStart >= 0 ? text.indexOf("\n  useEffect", submitStart) : -1;
  const submitBody = submitStart >= 0 && submitEnd > submitStart
    ? text.slice(submitStart, submitEnd)
    : "";
  const creditGuardIndex = submitBody.indexOf("availableMarketplaceRepostCredits < durationDays");
  const repostCallIndex = submitBody.indexOf("createMarketplaceRepost");
  if (creditGuardIndex < 0 || repostCallIndex < 0 || creditGuardIndex > repostCallIndex) {
    findings.push({
      file: "src/pages/MarketplacePage.tsx",
      line: submitStart >= 0 ? text.slice(0, submitStart).split(/\r?\n/).length : 1,
      message:
        "Marketplace Network Spotlight placement must check available paid credits before createMarketplaceRepost.",
      text: "Expected availableMarketplaceRepostCredits guard before createMarketplaceRepost.",
    });
  }
}

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?debugId="marketplace\.links\.join\.refresh"[\s\S]*?debugId="marketplace\.links\.join\.copy-message"[\s\S]*?debugId="marketplace\.links\.join\.email"[\s\S]*?debugId="marketplace\.links\.join\.whatsapp"/,
  "Marketplace join-link controls must keep named, traceable actions in their stable order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?debugId="marketplace\.links\.community-desk\.copy"[\s\S]*?debugId="marketplace\.public-shop\.visible-link"/,
  "Marketplace-owned links must move from the selected-community join lane to community-desk and public-shop lanes without a hidden create-community lane between them."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /display: "none"|marketplace\.links\.create\.|publicCreateEntryLink|Start a new community/g,
  "Marketplace must not keep hidden create-community link-desk UI or source-only create-community actions."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /type MarketplaceGlyphName[\s\S]*?function MarketplaceGlyph[\s\S]*?name: MarketplaceGlyphName/,
  "Marketplace front action marks must use deterministic SVG glyphs instead of device emoji fonts."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /[\u{1F6CD}\u{1F465}\u{1F6E1}\u{1F4B3}\u{1F91D}\u{1F6D2}\u{1F4B7}\u{1F3E6}\u{1F49A}\u{1F4CB}\u{1F4E3}\u{1F5C2}\u{2728}\u{203A}\u{2303}]/gu,
  "Marketplace front action marks must not use emoji or text chevrons; use MarketplaceGlyph instead."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /radial-gradient/g,
  "Marketplace page polish must avoid decorative radial glow/orb backgrounds."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?marketplaceJoinLinkMissingMessage[\s\S]*?debugId="marketplace\.links\.community-desk\.copy"[\s\S]*?Community verification link is not ready yet\.[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?publicShopActionUnavailableMessage/,
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
  /publicShopShareUrl\(\{[\s\S]*?productId: product\.id,[\s\S]*?block: product\.slotNumber,/,
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
  /scrollElementToMarketplaceLanding[\s\S]*?traceMarketplaceLanding[\s\S]*?\[80, 180, 360, 720, 1200, 1800\]\.forEach[\s\S]*?function openMarketplaceSection[\s\S]*?setSectionsTouched\(\(prev\) => touchedMarketplaceSectionState\(prev, key\)\)[\s\S]*?id="marketplace-money-routes"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-owned-links"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-members-shops"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-loans-support"[\s\S]*?marketplaceSectionStyle\(\)/,
  "Marketplace front page section buttons must mark opened sections as touched and land through the shared phone-safe section helper."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function isPublicIdentityFallback[\s\S]*?lowered\.includes\("@"\)[\s\S]*?lowered\.endsWith\("\.local"\)[\s\S]*?\^\(\?:gmf\[MN\]\|gsn\)-[\s\S]*?digits\.length >= 7[\s\S]*?function firstPublicIdentity[\s\S]*?if \(!text \|\| isPublicIdentityFallback\(text\)\) continue;/,
  "Marketplace public member/shop labels must reject phone, email, internal .local, and generated GSN/GMFN identity fallbacks."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /const visibleShopName = firstPublicIdentity\(shop\?\.name\);[\s\S]*?const memberDisplayName = visibleShopName \|\| getMemberName\(member\);[\s\S]*?shopName: shop[\s\S]*?firstTruthy\(visibleShopName, "Public shop active"\)/,
  "Marketplace member rows must represent members by their real public shop name first and never by a phone/email fallback."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceActionStyle[\s\S]*?height: 56[\s\S]*?maxHeight: 56[\s\S]*?function marketplaceInlineActionsStyle[\s\S]*?gridAutoRows: "58px"[\s\S]*?function marketplaceOsTileStyle[\s\S]*?height: isCompact \? 116 : 178[\s\S]*?maxHeight: isCompact \? 116 : 178[\s\S]*?gridTemplateColumns: isCompact \? "46px minmax\(0, 1fr\)" : "1fr"[\s\S]*?2\.35em 1\.35em 1\.45em[\s\S]*?gridTemplateAreas[\s\S]*?icon title[\s\S]*?textAlign: isCompact \? "left" : "center"[\s\S]*?function marketplaceOsIconStyle[\s\S]*?gridArea: "icon"[\s\S]*?width: isCompact \? 46 : 62[\s\S]*?function marketplaceOsTileMetricStyle[\s\S]*?WebkitLineClamp: isCompact \? 1 : 2[\s\S]*?whiteSpace: "normal"[\s\S]*?function marketplaceOsTileHelperStyle[\s\S]*?WebkitLineClamp: isCompact \? 1 : 2[\s\S]*?function marketplaceOsRowStyle[\s\S]*?height: isCompact \? 116 : 96[\s\S]*?maxHeight: isCompact \? 116 : 96[\s\S]*?42px minmax\(0, 1fr\) 18px[\s\S]*?transform: "none"[\s\S]*?flexShrink: 0[\s\S]*?transition: "none"[\s\S]*?function marketplaceOsRowTextStackStyle[\s\S]*?overflow: "hidden"[\s\S]*?function marketplaceOsRowDetailStyle[\s\S]*?WebkitLineClamp: isCompact \? 3 : 2[\s\S]*?function marketplaceOsArrowStyle[\s\S]*?width: 18/,
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
