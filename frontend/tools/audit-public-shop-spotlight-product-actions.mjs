/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(toolDir, "..", "..");
const shopGalleryPath = "frontend/src/pages/ShopGalleryPage.tsx";
const source = readFileSync(join(repoRoot, shopGalleryPath), "utf8");
const findings = [];

function requirePattern(pattern, message) {
  if (!pattern.test(source)) findings.push(message);
}

requirePattern(
  /const spotlightProductPreferenceAvailable = Boolean\(spotlightSourceProductId\);[\s\S]*?const spotlightAdvertPreferenceAvailable = Boolean\(spotlightCampaignId\);[\s\S]*?const spotlightEngagementAvailable = Boolean\([\s\S]*?spotlightProductPreferenceAvailable \|\| spotlightAdvertPreferenceAvailable/,
  "Spotlight engagement must support both exact marketplace products and standalone advert campaigns."
);
requirePattern(
  /\{spotlightEngagementAvailable \? \([\s\S]*?data-spotlight-product-actions="true"[\s\S]*?\) : null\}/,
  "The engagement rail must render for product and standalone commercial Spotlight content."
);
requirePattern(
  /async function toggleSpotlightProductSave\(\)[\s\S]*?unsaveMarketplaceProduct\([\s\S]*?saveMarketplaceProduct\(/,
  "Spotlight preference must reuse the canonical product save authority."
);
requirePattern(
  /async function toggleSpotlightProductSave\(\)[\s\S]*?unsaveSpotlightAdvert\([\s\S]*?saveSpotlightAdvert\(/,
  "Standalone adverts must use the private persistent campaign save authority."
);
requirePattern(
  /async function toggleSpotlightProductLike\(\)[\s\S]*?unlikeMarketplaceProduct\([\s\S]*?likeMarketplaceProduct\([\s\S]*?unlikeSpotlightAdvert\([\s\S]*?likeSpotlightAdvert\(/,
  "The private heart control must route to the correct product or advert authority."
);
requirePattern(
  /async function contactSpotlightProductSeller\(\)[\s\S]*?createMarketplaceProductEnquiry\([\s\S]*?product_id: productId[\s\S]*?shop_id: shopId/,
  "Optional Ask seller must retain the product-linked DemandBox enquiry path."
);
requirePattern(
  /createMarketplacePurchaseIntention[\s\S]*?function openSpotlightCommercialAction\(\)[\s\S]*?async function submitSpotlightPurchaseIntention\(\)[\s\S]*?origin_source: "spotlight"/,
  "The principal commercial action must create a source-attributed structured purchase intention."
);
requirePattern(
  /data-spotlight-primary-action="follow-shop"[\s\S]*?data-spotlight-primary-action=\{[\s\S]*?spotlightCommercialAction\.intentType/,
  "Visitor Follow and adaptive commercial actions must be principal Spotlight controls."
);
requirePattern(
  /data-spotlight-purchase-card="true"[\s\S]*?Quantity[\s\S]*?Collection[\s\S]*?Delivery[\s\S]*?Confirm purchase request/,
  "Spotlight must provide a compact structured purchase card without claiming payment."
);
requirePattern(
  /async function toggleSpotlightShopFollow\(\)[\s\S]*?followMarketplaceShop\([\s\S]*?unfollowMarketplaceShop\(/,
  "Spotlight follow must reuse the canonical Shop follow authority."
);
requirePattern(
  /function openSpotlightSimilarProducts\(\)[\s\S]*?"\/discover\?q="[\s\S]*?"&source=similar-products&product_id="/,
  "See similar products must use the existing public discovery route."
);
requirePattern(
  /function buildSpotlightProductShareTarget\(\)[\s\S]*?authorGmfnId[\s\S]*?spotlightSourceProductId[\s\S]*?sourceProductBlock/,
  "Sharing must preserve the exact source owner, product, and block when available."
);
requirePattern(
  /function savedProductState\([\s\S]*?hasOwnProperty\.call\(overrides, key\)[\s\S]*?async function toggleProductSave\(product: ShopProduct\)[\s\S]*?intendedSavedState[\s\S]*?typeof result\?\.saved === "boolean"[\s\S]*?Remove from saved products[\s\S]*?Save product privately/,
  "Private save must preserve explicit false state for unsave/re-save and recover safely from incomplete success payloads."
);
requirePattern(
  /spotlightOwnershipCheckRequired[\s\S]*?signedInOwnsSpotlightSourceShop[\s\S]*?signedInOwnsSpotlightAdvert[\s\S]*?spotlightSelfActionsBlocked[\s\S]*?\{!spotlightSelfActionsBlocked \? \([\s\S]*?data-spotlight-product-action="save"[\s\S]*?data-spotlight-product-action="like"[\s\S]*?shop-gallery\.spotlight-product\.share/,
  "Product owners and advert owners must not receive private self-engagement controls while visitor Share stays available."
);
requirePattern(
  /ariaLabel=\{`Share this \$\{spotlightPreferenceKind\}`\}[\s\S]*?debugId="shop-gallery\.spotlight-product\.share"[\s\S]*?public_shop_spotlight_\$\{spotlightPreferenceKind\}_share_/,
  "Visitor sharing must distinguish product and advert terminology while owner Paid Repost remains separate."
);
requirePattern(
  /debugId="shop-gallery\.spotlight\.owner-share"[\s\S]*?public_shop_spotlight_owner_share_[\s\S]*?debugId="shop-gallery\.spotlight\.owner-shortcut"/,
  "Advert owners must receive tracked ordinary Share and the existing management shortcut instead of self-purchase controls."
);
if (/shop-gallery\.spotlight\.contact-advertiser|Call advertiser/.test(source)) {
  findings.push("The redundant Spotlight Call advertiser primary action must remain removed.");
}
requirePattern(
  /sourceClanName/,
  "Spotlight product context may show only the supplied broad community location."
);
requirePattern(
  /\{ allowShopFallback: false \}/,
  "Product-linked analytics must not silently fall back to the host Shop."
);

if (findings.length > 0) {
  console.error("Public Shop Spotlight product action audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Public Shop Spotlight product action audit passed.");
