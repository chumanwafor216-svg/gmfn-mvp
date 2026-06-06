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

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function unwrapProductRecord\(raw: any\): any \{[\s\S]*?raw\?\.item \|\| raw\?\.product \|\| raw\?\.data \|\| raw/,
  "Shop Assets must unwrap public/authenticated product response rows before counting owner gallery blocks."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function normalizeProductRecord\(raw: any\): ProductRecord \| null \{[\s\S]*?source_product_slot_number[\s\S]*?sourceProductSlotNumber[\s\S]*?extractPublicBlockNumber/,
  "Shop Assets must preserve backend public block numbers from wrapped rows and metadata."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const seedProducts = normalizeProductRecords\(props\.seedProducts \|\| \[\]\)[\s\S]*?let shopRes = await getMyMarketplaceShop\([\s\S]*?let nextProducts: ProductRecord\[\] = mergeProductsById\([\s\S]*?seedProducts[\s\S]*?normalizeProductRecords\(shopRes\.products\)[\s\S]*?const publicShopProducts: ProductRecord\[\] = Array\.isArray\(publicShopRes\?\.products\)[\s\S]*?normalizeProductRecords\(publicShopRes\.products\)[\s\S]*?nextProducts = mergeProductsById\(nextProducts, publicShopProducts\)/,
  "Shop Assets must merge authenticated shop products with the public shop products that visitors see."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /type ShopAssetsPageProps = \{[\s\S]*?seedShop\?: ShopRecord \| null;[\s\S]*?seedProducts\?: ProductRecord\[\] \| null;[\s\S]*?\}/,
  "Embedded Shop Assets must accept the parent Shop Control shop/products as seed data."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /if \(!shopRes\?\.item && !gmfnId\) \{[\s\S]*?setShop\(seedShop\);[\s\S]*?setProducts\(seedProducts\);[\s\S]*?return seedProducts;[\s\S]*?\}/,
  "Shop Assets must not erase parent-seeded live blocks when the child identity lookup is unavailable."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /let shopRes = await getMyMarketplaceShop\([\s\S]*?if \(!shopRes\?\.item && \(preferredClanId > 0 \|\| selectedClanId > 0\)\) \{[\s\S]*?getMyMarketplaceShop\([\s\S]*?if \(!shopRes\?\.item && gmfnId\) \{[\s\S]*?getMarketplaceShopByGmfnId\(gmfnId/,
  "Shop Control must ask the backend for the signed-in user's own shop before falling back to GMFN lookup."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /<ShopAssetsPage[\s\S]*?preferredGmfnId=\{firstTruthy\(shop\?\.owner_gmfn_id, shop\?\.gmfn_id, me\?\.gmfn_id\) \|\| null\}[\s\S]*?seedShop=\{shop\}[\s\S]*?seedProducts=\{products\}/,
  "Shop Control must pass owner shop/products into the embedded Shop Assets gallery."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const publicGallerySlots = useMemo\([\s\S]*?arrangePublicProductsIntoSlots\(publicProducts\)[\s\S]*?const occupiedPublicSlotCount = useMemo\([\s\S]*?publicGallerySlots\.filter\(Boolean\)\.length[\s\S]*?\{occupiedPublicSlotCount\} \/ 12 live blocks/,
  "Shop Assets live-block counter must use occupied arranged slots, not raw product row count."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /stableHeight=\{isCompact \? 126 : 118\}[\s\S]*?gridTemplateRows: "18px 48px minmax\(0, 1fr\)"[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{slotNumber\}\.select`\}/,
  "Shop Assets public block tiles must be fixed-height controls so slot labels and taps do not jump."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function mergeProductsById\([\s\S]*?const seen = new Map<number, number>\(\);[\s\S]*?const existingIndex = seen\.get\(id\);[\s\S]*?out\[existingIndex\] = enriched;/,
  "Shop Assets product merging must enrich duplicate backend/public rows instead of discarding later richer shop data."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const selectedPublicProduct = publicGallerySlots\[selectedPublicSlot - 1\] \|\| null/,
  "Shop Assets selected block must come from the arranged 12-slot gallery."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /minHeight: isCompact \? 260 : 108/,
  "Shop Assets selected block action panel must reserve stable height so Open/Add/Repost controls cannot jump the shelf."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const PAID_REPOST_HASH = "marketplace-paid-network-placement";[\s\S]*?function buildPaidRepostPath\(product: ProductRecord, blockNumber: number\): string \{[\s\S]*?repost_product_id[\s\S]*?block[\s\S]*?source", "shop-control-gallery"[\s\S]*?PAID_REPOST_HASH/,
  "Shop Assets owner-side Repost must route the exact selected block into the paid placement rail."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.edit`\}[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.hide`\}[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.copy-link`\}[\s\S]*?Number\(selectedPublicProduct\.id \|\| 0\) > 0[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.paid-repost`\}[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.paid-repost-unavailable`\}/,
  "Shop Assets selected live block actions must stay traceable, fixed-height, and must not route Paid Repost for an id-less block."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.add`\}[\s\S]*?stableHeight=\{isCompact \? 56 : 48\}/,
  "Shop Assets selected empty block Add action must remain fixed-height and traceable."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /routeRepostSource === "shop-control-gallery"/,
  "Marketplace must recognize paid Repost requests that originate from the Shop Control gallery."
);

if (findings.length > 0) {
  console.error("Shop Assets slot audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Shop Assets slot audit passed.");
