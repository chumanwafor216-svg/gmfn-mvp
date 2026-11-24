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
  /const spotlightProductLinked = Boolean\([\s\S]*?spotlightSourceShopId[\s\S]*?spotlightSourceProductId[\s\S]*?\);/,
  "Spotlight engagement must require both an exact source Shop and product."
);
requirePattern(
  /\{spotlightProductLinked \? \([\s\S]*?data-spotlight-product-actions="true"[\s\S]*?\) : null\}/,
  "The product action rail must remain guarded from house and general Spotlight content."
);
requirePattern(
  /async function toggleSpotlightProductSave\(\)[\s\S]*?unsaveMarketplaceProduct\([\s\S]*?saveMarketplaceProduct\(/,
  "Spotlight preference must reuse the canonical product save authority."
);
requirePattern(
  /async function contactSpotlightProductSeller\(\)[\s\S]*?createMarketplaceProductEnquiry\([\s\S]*?product_id: productId[\s\S]*?shop_id: shopId/,
  "Ask seller must create a product-linked DemandBox enquiry with exact source identifiers."
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
  /data-spotlight-product-action="save"[\s\S]*?spotlightProductSaved \? "\\u2665" : "\\u2661"/,
  "The heart control must remain an accessible preference toggle without a vanity count."
);
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