/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(toolDir, "..", "..");
const shopGalleryPath = "frontend/src/pages/ShopGalleryPage.tsx";
const source = readFileSync(join(repoRoot, shopGalleryPath), "utf8");
const shopControlSource = readFileSync(
  join(repoRoot, "frontend/src/pages/ShopControlPage.tsx"),
  "utf8"
);
const spotlightWorkflowSource = readFileSync(
  join(repoRoot, "frontend/src/pages/shopControl/ShopControlSpotlightWorkflow.tsx"),
  "utf8"
);
const shopAssetsSource = readFileSync(
  join(repoRoot, "frontend/src/pages/ShopAssetsPage.tsx"),
  "utf8"
);
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
  /const spotlightCommercialAction = useMemo\(\(\) => \{[\s\S]*?label: hasPrice \? "Request to buy" : "Request quote"[\s\S]*?kind: "contact_advertiser"[\s\S]*?label: "Contact advertiser"[\s\S]*?kind: "visit_shop"[\s\S]*?label: "View shop"[\s\S]*?kind: "unavailable"/,
  "Spotlight must distinguish a product request, a verified Shop, a GSN House advertiser phone, and an advert with no destination."
);
requirePattern(
  /data-spotlight-primary-action="follow-shop"[\s\S]*?data-spotlight-primary-action=\{[\s\S]*?spotlightCommercialAction\.intentType/,
  "Visitor Follow and adaptive commercial actions must be principal Spotlight controls."
);
requirePattern(
  /data-spotlight-purchase-card="true"[\s\S]*?Quantity[\s\S]*?Collection[\s\S]*?Delivery[\s\S]*?Confirm request[\s\S]*?View shop[\s\S]*?Ask seller/,
  "Spotlight must provide a compact structured purchase card without claiming payment."
);
requirePattern(
  /createMarketplacePurchaseIntention\(\{[\s\S]*?clan_id: null[\s\S]*?origin_source: "spotlight"[\s\S]*?origin_campaign_id: spotlightCampaignId[\s\S]*?origin_broadcast_id: positiveNumber\(miniSpotlight\?\.id\)/,
  "Purchase confirmation must attribute the existing request to the exact Spotlight campaign and placement without confusing the display community with product ownership."
);
requirePattern(
  /setSpotlightPurchaseOpen\(false\);[\s\S]*?navigate\([\s\S]*?\/app\/demand-box\?demand_id=\$\{created\.id\}&queue=mine&focus=conversation/,
  "Confirmed Spotlight purchase requests must open the exact private DemandBox conversation."
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
requirePattern(
  /spotlightIsGsnHouse[\s\S]*?spotlightAdvertiserCallUrl[\s\S]*?This GSN House advert is not attached to a GSN Shop[\s\S]*?window\.location\.assign\(spotlightAdvertiserCallUrl\)/,
  "GSN House must use its explicit advertiser phone and must never be redirected to a synthetic Shop."
);
requirePattern(
  /sourceClanName/,
  "Spotlight product context may show only the supplied broad community location."
);

if (!/source_product_id: selectedSpotlightProduct\?\.id \|\| null/.test(shopControlSource)) {
  findings.push("Direct Spotlight publishing must carry the explicitly selected Shop product id.");
}
if (
  !/SPOTLIGHT_PRODUCT_HANDOFF_STORAGE_KEY[\s\S]*?source[\s\S]*?spotlight-product[\s\S]*?handleSpotlightProductSaved/.test(
    shopControlSource
  )
) {
  findings.push("The existing guided product editor must return to the preserved Spotlight draft.");
}
if (
  !/onSpotlightProductSelected[\s\S]*?General Shop promotion - no product request[\s\S]*?Add a new Shop item/.test(
    spotlightWorkflowSource
  )
) {
  findings.push("The composer must offer explicit product selection without silently creating a product.");
}
if (
  !/hadLocalImage: Boolean\(spotlightImageFile\)[\s\S]*?hadLocalVideo: Boolean\(spotlightVideoFile\)[\s\S]*?cannot recover the local \$\{missingMediaLabel\} after a refresh[\s\S]*?!localImageNeedsReselection/.test(
    shopControlSource
  )
) {
  findings.push("The creator handoff must preserve ordinary local media and explicitly block silent media substitution after a refresh.");
}
if (
  !/ownerProductManageRequest\.source === "spotlight-product"[\s\S]*?!publicGallerySlots\[matchedSlotIndex\][\s\S]*?openAddForPublicSlot\(matchedSlot\)/.test(
    shopAssetsSource
  )
) {
  findings.push("Spotlight must open the existing guided product creator directly at the validated empty Shop space.");
}
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
