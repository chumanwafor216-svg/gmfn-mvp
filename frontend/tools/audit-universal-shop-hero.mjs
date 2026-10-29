/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  selector: "src/lib/shopHeroSelection.ts",
  component: "src/components/shop/UniversalShopHero.tsx",
  gallery: "src/pages/ShopGalleryPage.tsx",
  assets: "src/pages/ShopAssetsPage.tsx",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, relativePath]) => [
    key,
    readFileSync(join(frontendRoot, relativePath), "utf8"),
  ])
);
const findings = [];

function requireText(fileKey, text, message) {
  if (source[fileKey].includes(text)) return;
  findings.push({ file: files[fileKey], message });
}

function forbidText(fileKey, text, message) {
  if (!source[fileKey].includes(text)) return;
  findings.push({ file: files[fileKey], message });
}

const shopIndex = source.selector.indexOf("if (selectedShopImage");
const productIndex = source.selector.indexOf("const selectedProduct");
const fallbackIndex = source.selector.lastIndexOf('kind: "fallback"');
if (!(shopIndex >= 0 && productIndex > shopIndex && fallbackIndex > productIndex)) {
  findings.push({
    file: files.selector,
    message:
      "Hero source order must remain owner-selected shop photo, eligible public product photo, then neutral fallback.",
  });
}

requireText("selector", 'product.isActive !== false', "Inactive product media must never enter the public hero selector.");
requireText("selector", 'publicModes.has(mode)', "Only known public visibility modes may enter the hero selector.");
requireText("selector", "product.imageAvailable !== false", "Known-missing product media must be rejected.");
requireText("selector", "!brokenImageUrls[imageUrl]", "Broken media must fall through deterministically.");
for (const forbidden of ["Spotlight", "spotlight", "ShopDiary", "shopDiary", "TrustSlip", "trustSlip"]) {
  forbidText("selector", forbidden, `Universal Shop Hero selector must not depend on ${forbidden}.`);
}

requireText("component", 'data-universal-shop-hero="true"', "The shared hero component contract is missing.");
requireText("component", "onError={() => onImageError?.(source.imageUrl)}", "Hero image failures must trigger fallback selection.");
requireText("component", 'name="shop-storefront"', "Neutral GSN storefront fallback is missing.");

requireText("gallery", "selectShopHeroSource({", "Public Shop must use the deterministic selector.");
requireText("gallery", "image_url_available === false", "Public Shop must respect backend media availability.");
requireText("gallery", "<UniversalShopHero", "Public Shop must render the shared hero component.");
forbidText("gallery", "src?.profile_image_url", "Public Shop must not silently inherit profile portraits.");

requireText("assets", "Use my GSN portrait (optional)", "Shop Picture must expose portrait reuse only as an optional disclosure.");
requireText("assets", "Use this portrait publicly", "Portrait reuse must require explicit public-use consent.");
requireText("assets", "new File(", "Portrait reuse must create an independent shop-media file.");
requireText("assets", "setShopPreviewFromFile(profilePortraitFile)", "Portrait reuse must enter the ordinary shop preview path.");
requireText("assets", "uploadMarketplaceImageFile(shopSelectedFile)", "Selected portraits must use the existing marketplace image engine.");
requireText(
  "assets",
  "will not\n                            change automatically when your profile portrait changes",
  "Portrait consent copy must explain that shop media does not silently track profile changes."
);

if (findings.length) {
  console.error("Universal Shop Hero audit failed:\n");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Universal Shop Hero audit passed.");
console.log("Source order: shop photo -> public product photo -> neutral GSN fallback.");
console.log("Profile portrait: explicit consent -> ordinary preview -> existing marketplace media engine.");
