/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const shopAssetsFile = "src/pages/ShopAssetsPage.tsx";
const shopAssetsSource = read(shopAssetsFile);

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

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

const forbiddenEmojiIconPattern = /[\u{1F300}-\u{1FAFF}]\uFE0F?|ð/gu;
let forbiddenEmojiMatch;
while ((forbiddenEmojiMatch = forbiddenEmojiIconPattern.exec(shopAssetsSource))) {
  findings.push({
    file: shopAssetsFile,
    line: lineAt(shopAssetsSource, forbiddenEmojiMatch.index),
    message:
      "Shop Assets must use 3D GSN icons for owner-facing status labels, not emoji or mojibake icon text.",
    text: forbiddenEmojiMatch[0],
  });
}

assertContains(
  shopAssetsFile,
  /import \{ GsnLegacyIcon, type GsnIconName \} from "\.\.\/components\/GsnLegacyIcon";/,
  "Shop Assets must use the shared 3D GSN icon adapter for owner-facing icon chips."
);

assertContains(
  shopAssetsFile,
  /function iconBadge\([\s\S]*?icon: GsnIconName[\s\S]*?width: 20,[\s\S]*?height: 20,[\s\S]*?<GsnLegacyIcon name=\{icon\} size=\{18\} \/>/,
  "Shop Assets must keep a readable 3D icon-backed chip helper for shop picture, public products, Vault, hidden, and block status."
);

if (/letterSpacing:\s*[1-9]/.test(shopAssetsSource)) {
  findings.push({
    file: shopAssetsFile,
    line: lineAt(shopAssetsSource, shopAssetsSource.search(/letterSpacing:\s*[1-9]/)),
    message: "Shop Assets must not use spaced-out uppercase section labels on phone-polished surfaces.",
    text: shopAssetsSource.match(/letterSpacing:\s*[1-9][^,\n]*/)?.[0] || "",
  });
}

assertContains(
  shopAssetsFile,
  /iconBadge\("image"[\s\S]*?Shop picture:[\s\S]*?iconBadge\("shop"[\s\S]*?Public products:[\s\S]*?iconBadge\("lock"[\s\S]*?Vault offers:[\s\S]*?iconBadge\("document"[\s\S]*?Hidden:/,
  "Shop Assets workbench counters must use image/shop/lock/document 3D GSN chips instead of emoji labels."
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
  "src/pages/ShopControlPage.tsx",
  /function publicBlockNumberForProduct\([\s\S]*?public_block_number[\s\S]*?source_product_slot_number[\s\S]*?block_number[\s\S]*?extractPublicBlockNumber[\s\S]*?function arrangePublicProductsIntoSlots\([\s\S]*?isNewerProductCandidate\(item, slots\[blockNumber - 1\]\)[\s\S]*?overflow\.push\(item\)/,
  "Shop Control summary must arrange public products by visible block and keep newest duplicate blocks, matching the embedded gallery."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /const publicProductSlots = useMemo\([\s\S]*?arrangePublicProductsIntoSlots\(publicProducts, publicProductSlotsTotal\)[\s\S]*?const occupiedPublicProductSlotCount = useMemo\([\s\S]*?publicProductSlots\.filter\(Boolean\)\.length[\s\S]*?\{occupiedPublicProductSlotCount\} \/ \{publicProductSlotsTotal\}/,
  "Shop Control summary Public items stat must count visible occupied public slots, not raw public product rows."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const publicGallerySlots = useMemo\([\s\S]*?arrangePublicProductsIntoSlots\(publicProducts\)[\s\S]*?const occupiedPublicSlotCount = useMemo\([\s\S]*?publicGallerySlots\.filter\(Boolean\)\.length[\s\S]*?\{occupiedPublicSlotCount\} \/ 12 live blocks/,
  "Shop Assets live-block counter must use occupied arranged slots, not raw product row count."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function productDisplayRank\([\s\S]*?createdMs[\s\S]*?id[\s\S]*?function isNewerProductCandidate\([\s\S]*?candidateRank\.createdMs[\s\S]*?candidateRank\.id > currentRank\.id[\s\S]*?function arrangePublicProductsIntoSlots\([\s\S]*?if \(blockNumber >= 1 && blockNumber <= 12\) \{[\s\S]*?isNewerProductCandidate\(item, slots\[blockNumber - 1\]\)[\s\S]*?slots\[blockNumber - 1\] = item;[\s\S]*?return;[\s\S]*?overflow\.push\(item\);/,
  "Shop Assets arranged slots must keep the newest product for a numbered block and must not spill duplicate same-block products into another visible slot."
);

if (/publicProducts\.length/.test(shopAssetsSource)) {
  findings.push({
    file: shopAssetsFile,
    line: lineAt(shopAssetsSource, shopAssetsSource.search(/publicProducts\.length/)),
    message:
      "Shop Assets must not count raw public product rows for public gallery capacity or status; use occupiedPublicSlotCount from the arranged 12-slot gallery.",
    text: shopAssetsSource.match(/publicProducts\.length[^,\n)]*/)?.[0] || "",
  });
}

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /targetVisibility === "community_visible"[\s\S]*?!editingAlreadyPublic[\s\S]*?occupiedPublicSlotCount >= 12[\s\S]*?The public shop gallery already has 12 live blocks/,
  "Shop Assets add guard must use visible occupied slots, not raw public product rows."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /Public products: \{occupiedPublicSlotCount\} \/ 12[\s\S]*?occupiedPublicSlotCount > 0/,
  "Shop Assets header public-products badge must report visible occupied slots."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /<div style=\{sectionLabel\(\)\}>\{labelWithIcon\("shop", "Public"\)\}<\/div>[\s\S]*?\{occupiedPublicSlotCount\}[\s\S]*?Open gallery items/,
  "Shop Assets readiness Public stat must report visible occupied slots."
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
  /PAID_REPOST_HASH[\s\S]*?from "\.\.\/lib\/ownerShopHandles";[\s\S]*?function buildPaidRepostPath\(product: ProductRecord, blockNumber: number\): string \{[\s\S]*?repost_product_id[\s\S]*?block[\s\S]*?source", "shop-control-gallery"[\s\S]*?PAID_REPOST_HASH/,
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

assertContains(
  "src/pages/MarketplacePage.tsx",
  /type RepostProductOption = \{[\s\S]*?price: string;[\s\S]*?currency: string;[\s\S]*?imageUrl: string;[\s\S]*?videoUrl: string;[\s\S]*?originShopName: string;[\s\S]*?sellerGmfnId: string;/,
  "Marketplace Paid Repost must preserve selected block media, price, shop, and seller identity details."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function normalizeRepostProductOption\(raw: any\): RepostProductOption \| null \{[\s\S]*?price: firstTruthy\(src\?\.price[\s\S]*?currency: firstTruthy\(src\?\.currency[\s\S]*?imageUrl: firstTruthy\([\s\S]*?src\?\.image_url[\s\S]*?videoUrl: firstTruthy\([\s\S]*?src\?\.video_url[\s\S]*?originShopName: firstPublicIdentity\(/,
  "Marketplace Paid Repost must normalize backend media and identity fields for the selected block preview."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /const routeRepostSelectionTokenRef = useRef\(""\);[\s\S]*?const routeToken = \[[\s\S]*?location\.search[\s\S]*?location\.hash[\s\S]*?matchedProduct\.id[\s\S]*?matchedProduct\.blockNumber[\s\S]*?setSelectedRepostProductId\(matchedProduct\.id\)[\s\S]*?Block #\$\{matchedProduct\.blockNumber/,
  "Marketplace Paid Repost route handoff must lock the exact incoming product/block and visibly acknowledge it."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /Selected public block[\s\S]*?Block #\{selectedRepostProduct\.blockNumber \|\| "\?"\}[\s\S]*?Product ID \{selectedRepostProduct\.id\}[\s\S]*?Exact block handoff[\s\S]*?debugId="marketplace\.network-repost\.selected-block\.copy-link"/,
  "Marketplace Paid Repost must show a stable selected-block preview before target and payment controls."
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
