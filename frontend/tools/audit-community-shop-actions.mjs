/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
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
    const preview = text.slice(match.index, match.index + 1100);
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

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /freeSpotlight:\s*routeTarget\(\s*"freeSpotlight"[\s\S]*?case "spotlight-free":[\s\S]*?if \(nextStep === "open-free-publisher"\) \{[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.freeSpotlight[\s\S]*?id: "free-spotlight"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.freeSpotlight[\s\S]*?debugId="community-home\.spotlight-status\.open-free"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.freeSpotlight/,
  "Community Home Free Spotlight actions must keep guarded routing to the canonical Shop Control spotlight publisher."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /joinRequests:\s*routeTarget\(\s*"communityJoinRequests"[\s\S]*?debugId="community-home\.empty\.create-community"[\s\S]*?openCommunityRoute\(event, "\/create"\)/,
  "Community Home owner and empty-state routes must avoid the retired /app/clans alias."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /id: "owner-actions"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.joinRequests[\s\S]*?id: "shop-control"[\s\S]*?openCommunityShopControl\(event\)[\s\S]*?id: "vault-control"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.vaultControl[\s\S]*?id: "free-spotlight"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.freeSpotlight[\s\S]*?id: "spotlight-subscription"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.subscriptionSpotlight[\s\S]*?id: "paid-repost"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.paidRepost[\s\S]*?id: "trusted-circle"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.buildFirstCircle[\s\S]*?id: "spotlight-status"[\s\S]*?openCommunityHomeSection\([\s\S]*?debugId=\{`community-home\.tool\.\$\{item\.id\}`\}/,
  "Community Home compact owner/tool rows must remain traceable and route to the deeper owner surfaces."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /const PAID_REPOST_HASH = "marketplace-paid-network-placement";[\s\S]*?paidRepost:\s*routeTarget\(\s*"marketplace"[\s\S]*?PAID_REPOST_HASH[\s\S]*?case "spotlight-repost":[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.paidRepost/,
  "Community Home Paid Repost must route through the paid placement rail while remaining a spotlight-family handle."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /debugId=\{`community-home\.next-action\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`community-home\.spotlight-guided\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`community-home\.tool\.\$\{item\.id\}`\}/,
  "Community Home dynamic action groups must use item-based debug IDs."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /debugId=\{`community-home\.communities\.\$\{clan\.id \?\? clan\.clan_id \?\? clan\.name \?\? "unknown"\}\.open-marketplace`\}/,
  "Community Home community rows must keep a traceable Open Marketplace button."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /rememberPublishRecovery\([\s\S]*?routes\.freeSpotlight,[\s\S]*?"shop-control\.spotlight\.preview\.publish"[\s\S]*?\);/,
  "Shop Control spotlight publish must keep recovery anchored to the free spotlight publisher route."
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
  /debugId="community-shop-control\.shortcut\.spotlight"[\s\S]*?debugId="community-shop-control\.shortcut\.paid-spotlight"[\s\S]*?debugId="community-shop-control\.shortcut\.paid-repost"/,
  "Community Shop Control shortcut buttons must keep separate Free Spotlight, Paid Spotlight, and Paid Repost debug IDs."
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
  /debugId="shop-gallery\.share-shop"[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle"[\s\S]*?debugId="shop-gallery\.owner-contact\.choose"[\s\S]*?debugId="shop-gallery\.open-spotlight-preview"[\s\S]*?debugId="shop-gallery\.spotlight\.whatsapp"[\s\S]*?debugId="shop-gallery\.ask-vault-access"[\s\S]*?debugId="shop-gallery\.copy-vault-shop-link"/,
  "Public Shop visitor actions must keep traceable Share, Verify, WhatsApp, Explore, Spotlight WhatsApp, Vault request, and Vault copy controls."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /sourceShopWhatsApp[\s\S]*?source_shop_whatsapp_number[\s\S]*?buildWhatsAppChatUrl[\s\S]*?function contactSpotlightOwnerByWhatsApp\(\)[\s\S]*?debugId="shop-gallery\.spotlight\.whatsapp"/,
  "Public Shop live Spotlight must attach WhatsApp contact to the rotating source shop, not only the current page shop."
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
