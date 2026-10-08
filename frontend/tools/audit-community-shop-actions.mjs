/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const shopControlFile = "src/pages/ShopControlPage.tsx";
const shopControlSpotlightWorkflowFile =
  "src/pages/shopControl/ShopControlSpotlightWorkflow.tsx";

function readRaw(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function readShopControlAuditSource() {
  const shopControlSource = readRaw(shopControlFile);
  const spotlightWorkflowSource = readRaw(shopControlSpotlightWorkflowFile);
  return shopControlSource.replace(
    /<ShopControlSpotlightWorkflow[\s\S]*?\/>/,
    spotlightWorkflowSource
  );
}

function read(relativePath) {
  if (relativePath === shopControlFile) {
    return readShopControlAuditSource();
  }
  return readRaw(relativePath);
}

const findings = [];

const communityShopFiles = [
  "src/pages/CommunityHomePage.tsx",
  "src/pages/ShopControlPage.tsx",
  "src/components/CommunityShopControlPanel.tsx",
  "src/pages/CreateEntryPage.tsx",
  "src/pages/SubscriptionSpotlightPage.tsx",
  "src/pages/VaultControlPage.tsx",
  "src/pages/ShopGalleryPage.tsx",
  "src/pages/ShopPage.tsx",
  "src/pages/ShopAssetsPage.tsx",
  "src/pages/ShopAccessPage.tsx",
];

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

  text.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

function assertStableActionsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern =
    /<(?:PrimaryButton|SecondaryButton|SubtleButton|DangerButton|StableButton|StableCtaLink|StableDisclosureSummary)\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 2400);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Community / Shop stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

communityShopFiles.forEach(assertStableActionsHaveDebugIds);

const signedInCommunityShopFiles = [
  "src/pages/CommunityHomePage.tsx",
  "src/pages/ShopControlPage.tsx",
  "src/components/CommunityShopControlPanel.tsx",
  "src/pages/SubscriptionSpotlightPage.tsx",
  "src/pages/VaultControlPage.tsx",
  "src/pages/ShopPage.tsx",
  "src/pages/ShopAssetsPage.tsx",
];

for (const file of signedInCommunityShopFiles) {
  assertNotContains(
    file,
    /to=["']\/cover["']|to=["']\/welcome["']/,
    "Community / Shop app actions must not send signed-in users directly to Cover or Welcome."
  );
}

assertNotContains(
  "src/pages/ShopAccessPage.tsx",
  /access token|Current route state|Vault route|Use this route|Leave this route|private-access open|Current page:/,
  "Public Vault access copy must speak to the visitor in plain access-link/page language, not token/route/debug language."
);

assertContains(
  "src/pages/ShopAccessPage.tsx",
  /This Vault link is missing its access code[\s\S]*?Checking this private link and opening the shared shop view[\s\S]*?label="Why this page opened"[\s\S]*?You are inside Vault access[\s\S]*?Private link accepted[\s\S]*?Your access is open[\s\S]*?Use this page only for the private offers/,
  "Public Vault access page must keep direct visitor-facing access-code/link/page wording."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /debugId="community-home\.goto\.shop-control"[\s\S]*?openCommunityShopControl\(event\)[\s\S]*?Manage shop[\s\S]*?Spotlight management live in Shop Control/,
  "Community Home must expose only the compact Manage shop handoff for shop and Spotlight owner work."
);

assertNotContains(
  "src/pages/CommunityHomePage.tsx",
  /freeSpotlight:|subscriptionSpotlight:|paidRepost:|vaultControl:|ownerShopHandle|community-home\.spotlight-guided|community-home\.spotlight-status|community-home\.lane/,
  "Community Home must not keep the retired specialist Spotlight/Vault launcher model."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /joinRequests:\s*routeTarget\(\s*"communityJoinRequests"[\s\S]*?createCommunity:\s*routeTarget\(\s*"clans"[\s\S]*?debugId="community-home\.empty\.create-community"[\s\S]*?openCommunityRoute\(event, routes\.createCommunity\)/,
  "Community Home owner and empty-state routes must send existing members to the authenticated create-community lane."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /debugId="community-home\.goto\.marketplace"[\s\S]*?void openSelectedMarketplace\(event\)[\s\S]*?debugId="community-home\.goto\.shop-control"[\s\S]*?debugId="community-home\.goto\.finance"[\s\S]*?debugId="community-home\.goto\.support"[\s\S]*?debugId="community-home\.goto\.trust"/,
  "Community Home must keep the compact Marketplace, Shop Control, Finance, Support, and Trust handoff rows."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /debugId=\{`community-home\.switch\.select\.\$\{clanId \|\| "unknown"\}`\}/,
  "Community Home community switcher rows must keep traceable selected-community controls."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /rememberPublishRecovery\([\s\S]*?routes\.freeSpotlight,[\s\S]*?"shop-control\.spotlight\.preview\.publish"[\s\S]*?\);/,
  "Shop Control spotlight publish must keep recovery anchored to the free spotlight publisher route."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /import \{[\s\S]*?createMarketplaceBroadcast[\s\S]*?\} from "\.\.\/lib\/api";[\s\S]*?async function handleCreateSpotlight\(\)[\s\S]*?const createRes = await createMarketplaceBroadcast\(\{[\s\S]*?priority_mode: spotlightPriorityMode[\s\S]*?visibility_scope: "direct_communities"/,
  "Shop Control Free Spotlight publish must use the shared API client so mobile browsers and Render use the same backend origin as media upload."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /function apiBase\(\)[\s\S]*new URL\(base\)[\s\S]*path\.toLowerCase\(\) === "\/api"[\s\S]*return url\.origin[\s\S]*GSN could not publish from this browser yet/,
  "Shop Control local API reads around Free Spotlight must normalize Render-style /api bases and show a concise publish recovery message."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function apiBase\(\)[\s\S]*new URL\(base\)[\s\S]*path\.toLowerCase\(\) === "\/api"[\s\S]*return url\.origin[\s\S]*GSN could not save from this browser yet/,
  "Shop Gallery Tools local API reads must normalize Render-style /api bases and use concise user-facing recovery copy."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const gmfnIdValue = useMemo\([\s\S]*?firstTruthy\(shop\?\.owner_gmfn_id, shop\?\.gmfn_id\)[\s\S]*?\[shop\][\s\S]*?const gmfnId = useMemo\(\(\) => firstTruthy\(gmfnIdValue, "Not issued yet"\)[\s\S]*?const shopLink = useMemo\(\(\) => buildShopLink\(gmfnIdValue\)/,
  "Shop Gallery Tools must split real GSN ID values from honest display fallback copy."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /buildProductDeepLink\([\s\S]*?gmfnIdValue,[\s\S]*?Number\(selectedPublicProduct\.id\)/,
  "Shop Gallery Tools copied product block links must use the real GSN ID value, not the visible fallback label."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /buildGsnPublicShopLinkMessage\(\{[\s\S]*?gsnId: gmfnIdValue,/,
  "Shop Gallery Tools copied public shop packages must use the real GSN ID value, not the visible fallback label."
);

assertNotContains(
  "src/pages/ShopAssetsPage.tsx",
  /GSN ID awaiting issue/,
  "Shop Gallery Tools must not reintroduce fake awaiting-issue GSN ID language."
);

assertNotContains(
  "src/pages/ShopAssetsPage.tsx",
  /gsnId: gmfnId,/,
  "Shop Gallery Tools must not copy display fallback text as the public package GSN ID."
);

assertNotContains(
  "src/pages/ShopControlPage.tsx",
  /apiJson<any>\("\/api\/marketplace\/broadcasts"/,
  "Shop Control Free Spotlight publish must not bypass the shared API client for the final broadcast POST."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /navigateWithOrigin\(navigate, routes\.subscriptionSpotlight, location[\s\S]*?debugId="shop-control\.spotlight\.paid-lane"[\s\S]*?debugId="shop-control\.subscription\.open"[\s\S]*?debugId="shop-control\.subscription\.publisher"/,
  "Shop Control paid spotlight actions must keep routing to the subscription spotlight lane."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /<StableCtaLink[\s\S]*?to=\{publicShopLink\}[\s\S]*?debugId="community-shop-control\.public-url"[\s\S]*?\{publicShopLink\}/,
  "Community Shop Control public URL must stay a stable link, not a raw anchor."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /GSN ID: \{safeStr\(shop\?\.gmfnId \|\| "Not issued yet"\)\}/,
  "Community Shop Control must show honest missing-GSN-ID copy instead of a fake Pending ID."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /OWNER_SHOP_HASHES[\s\S]*?PAID_REPOST_HASH[\s\S]*?ownerShopHandle[\s\S]*?debugId="community-shop-control\.shortcut\.spotlight"[\s\S]*?ownerShopHandle\("free-spotlight"\)\.label[\s\S]*?debugId="community-shop-control\.shortcut\.paid-spotlight"[\s\S]*?ownerShopHandle\("spotlight-subscription"\)\.label[\s\S]*?debugId="community-shop-control\.shortcut\.paid-repost"[\s\S]*?ownerShopHandle\("paid-repost"\)\.label[\s\S]*?debugId="community-shop-control\.shortcut\.community-package"[\s\S]*?ownerShopHandle\("community-package"\)\.label/,
  "Community Shop Control shortcut buttons must use shared owner-shop handles for Free Spotlight, Spotlight Subscription, Paid Repost, and Marketplace Capacity."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /onClick=\{\(event\) => \{[\s\S]*?if \(isInteractiveCardTarget\(event\.target\)\) return;[\s\S]*?if \(!isProductOpen\) \{[\s\S]*?setOpenProductId\(productOpenId\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?setOpenProductId\(null\);[\s\S]*?\}\}[\s\S]*?onDoubleClick=\{\(event\) => \{/,
  "Public Shop diary blocks must open on a single tap of the card body, with double-click left only as a fallback."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /function isInteractiveCardTarget\(target: EventTarget \| null\): boolean \{[\s\S]*?data-media-control='true'[\s\S]*?\}/,
  "Public Shop media controls must count as interactive card targets so sound/video taps do not close the diary block."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /debugId="shop-gallery\.share-shop"[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle"[\s\S]*?debugId="shop-gallery\.owner-contact\.choose"[\s\S]*?debugId="shop-gallery\.spotlight\.whatsapp-chat"[\s\S]*?debugId="shop-gallery\.ask-vault-access"[\s\S]*?debugId="shop-gallery\.copy-vault-request-link"/,
  "Public Shop visitor actions must keep traceable Share, Verify, WhatsApp, single Spotlight WhatsApp, Vault request, and Vault-request copy controls."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /sourceShopWhatsApp[\s\S]*?source_shop_whatsapp_number[\s\S]*?buildWhatsAppChatUrl[\s\S]*?function contactSpotlightOwnerByWhatsApp\(\)[\s\S]*?miniSpotlightView\.sourceShopWhatsApp[\s\S]*?debugId="shop-gallery\.spotlight\.whatsapp-chat"/,
  "Public Shop live Spotlight must attach WhatsApp contact to the rotating source shop, not only the current page shop."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /normalizeWhatsAppRecipient[\s\S]*?function contactSpotlightOwnerByWhatsApp\(\)[\s\S]*?spotlightContactMatchesCurrentShop[\s\S]*?trackMarketplaceAttention\("contact_tap", spotlightAttentionPayload, \{[\s\S]*?allowShopFallback/,
  "Public Shop live Spotlight contact taps must remain counted through guarded shop attribution when phone browsers open WhatsApp."
);

assertContains(
  "src/lib/api.ts",
  /type RequestOptions = \{[\s\S]*?keepalive\?: boolean;[\s\S]*?recordMarketplaceAttentionEvent[\s\S]*?keepalive: true/,
  "Marketplace attention events must use keepalive so phone and WhatsApp handoffs do not cancel the count request."
);


assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /className="public-shop-section public-shop-spotlight"[\s\S]*?border: isCompact \? "1px solid rgba\(214,170,69,0\.70\)" : "1px solid rgba\(255,255,255,0\.92\)"[\s\S]*?linear-gradient\(135deg, #FFFFFF 0%, #F7FBFF 48%, #EEF6FF 100%\)/,
  "Public Shop Spotlight must keep polished silver/gold brand framing instead of the old dark phone slab."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}[\s\S]*?className="public-shop-section public-shop-diary"[\s\S]*?Shop Diary[\s\S]*?public-shop-diary-featured/,
  "Public Shop Diary section must keep a dedicated activity-story anchor and premium framing."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /className="shop-diary-card"[\s\S]*?border: "1px solid rgba\(255,255,255,0\.92\)"[\s\S]*?0 0 0 4px rgba\(255,255,255,0\.42\)/,
  "Public Shop diary cards must keep white product-frame borders instead of heavy dark outlines."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /border: "2px solid rgba\(8,31,51,0\.62\)"|linear-gradient\(135deg, #FFF9E9 0%, #FFFFFF 58%, #EFF6FF 100%\)/,
  "Public Shop polish must not regress to heavy dark diary borders or cream/brown Spotlight framing."
);

if (findings.length > 0) {
  console.error("Community / Shop action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Community / Shop action audit passed.");
