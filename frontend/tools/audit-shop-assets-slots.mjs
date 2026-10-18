/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const marketplaceToolsFile = "src/pages/marketplace/MarketplaceToolsSection.tsx";
const shopAssetsFile = "src/pages/ShopAssetsPage.tsx";
const shopAssetsSource = read(shopAssetsFile);

function readRaw(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function composeLazySource(parentPath, replacements) {
  return replacements.reduce((source, [pattern, childPath]) => {
    return source.replace(pattern, readRaw(childPath));
  }, readRaw(parentPath));
}

function read(relativePath) {
  if (relativePath === marketplaceFile) {
    return composeLazySource(marketplaceFile, [
      [/<MarketplaceToolsSection\b[\s\S]*?\n\s*\/>/, marketplaceToolsFile],
    ]);
  }

  return readRaw(relativePath);
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

const forbiddenEmojiIconPattern = /[\u{1F300}-\u{1FAFF}]\uFE0F?|\u00F0/gu;
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
  /type ShopAssetsPageProps = \{[\s\S]*?seedShop\?: ShopRecord \| null;[\s\S]*?seedProducts\?: ProductRecord\[\] \| null;[\s\S]*?onProductDeleted\?: \(productId: number\) => void;[\s\S]*?\}/,
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
  /const publicProductSlotsTotal = useMemo\([\s\S]*?PUBLIC_SHOP_STANDARD_SLOT_COUNT[\s\S]*?const publicProductSlots = useMemo\([\s\S]*?arrangePublicProductsIntoSlots\(publicProducts, publicProductSlotsTotal\)[\s\S]*?const occupiedPublicProductSlotCount = useMemo\([\s\S]*?publicProductSlots\.filter\(Boolean\)\.length/,
  "Shop Control summary must derive public capacity from slot entitlements and count occupied arranged slots."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /occupiedPublicProductSlotCount\} \/ \{publicProductSlotsTotal\}|`\$\{occupiedPublicProductSlotCount\} \/ \$\{publicProductSlotsTotal\}`/,
  "Shop Control visible public item counters must show occupied slots over the current slot capacity."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const publicGallerySlots = useMemo\([\s\S]*?arrangePublicProductsIntoSlots\(publicProducts, publicProductSlotsTotal\)[\s\S]*?const occupiedPublicSlotCount = useMemo[\s\S]*?publicGallerySlots\.filter\(Boolean\)\.length[\s\S]*?\{occupiedPublicSlotCount\} \/ \{publicProductSlotsTotal\} live blocks/,
  "Shop Assets live-block counter must use occupied arranged slots, not raw product row count."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function productDisplayRank\([\s\S]*?createdMs[\s\S]*?id[\s\S]*?function isNewerProductCandidate\([\s\S]*?candidateRank\.createdMs[\s\S]*?candidateRank\.id > currentRank\.id[\s\S]*?function arrangePublicProductsIntoSlots\([\s\S]*?if \(blockNumber >= 1 && blockNumber <= safeSlotCount\) \{[\s\S]*?isNewerProductCandidate\(item, slots\[blockNumber - 1\]\)[\s\S]*?slots\[blockNumber - 1\] = item;[\s\S]*?return;[\s\S]*?overflow\.push\(item\);/,
  "Shop Assets arranged slots must keep the newest product for a numbered block and must not spill duplicate same-block products into another visible slot."
);

if (/publicProducts\.length/.test(shopAssetsSource)) {
  findings.push({
    file: shopAssetsFile,
    line: lineAt(shopAssetsSource, shopAssetsSource.search(/publicProducts\.length/)),
    message:
      "Shop Assets must not count raw public product rows for public gallery capacity or status; use occupiedPublicSlotCount from the arranged public slot gallery.",
    text: shopAssetsSource.match(/publicProducts\.length[^,\n)]*/)?.[0] || "",
  });
}

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /targetVisibility === "community_visible"[\s\S]*?!editingAlreadyPublic[\s\S]*?occupiedPublicSlotCount >= publicProductSlotsTotal[\s\S]*?The public shop gallery has reached its current live-block capacity/,
  "Shop Assets add guard must use visible occupied slots, not raw public product rows."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const pictureChangedWithoutNewVideo =[\s\S]*?Boolean\(editingProduct\)[\s\S]*?!productSelectedVideoFile[\s\S]*?Boolean\(editingVideoUrl\)[\s\S]*?safeStr\(nextVideoUrl\) === editingVideoUrl[\s\S]*?safeStr\(productImageUrlInput\) !== editingImageUrl[\s\S]*?nextVideoUrl = null/,
  "Shop Assets editing must clear a prefilled old video when the owner replaces the block picture without selecting or typing a new video."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /setProductSelectedVideoFile\(prepared\.file\);[\s\S]*?try \{[\s\S]*?createShopGalleryCoverFromVideo\(prepared\.file\)[\s\S]*?\} catch \{[\s\S]*?GSN kept your video/,
  "Shop Assets video selection must survive automatic cover-frame failure so owners do not lose the selected file."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /if \(productSelectedVideoFile\) \{[\s\S]*?try \{[\s\S]*?createShopGalleryCoverFromVideo\(productSelectedVideoFile\)[\s\S]*?\} catch \{[\s\S]*?if \(nextVideoUrl\) \{[\s\S]*?nextImageUrl = nextVideoUrl;/,
  "Shop Assets video-only save must fall back to the uploaded video URL when the phone cannot prepare a cover frame."
);

assertContains(
  "src/lib/shopProductMediaCache.ts",
  /hasVideo = Object\.prototype\.hasOwnProperty\.call\(media, "video_url"\)[\s\S]*?video_url: hasVideo \? videoUrl \|\| null : current\.video_url \|\| null/,
  "Shop product media cache must treat an explicitly provided null/empty video as a cleared video instead of resurrecting old cached media."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const productHasVideoTruth = hasOwnValue\(src, "video_url"\);[\s\S]*?src\?\.video_url \|\| \(!productHasVideoTruth \? cachedMedia\?\.video_url : ""\)[\s\S]*?const productMediaKey = \[[\s\S]*?productImageUrl,[\s\S]*?productVideoUrl,[\s\S]*?\]\.join\("\|"\)[\s\S]*?key=\{productMediaKey\}/,
  "Public Shop Gallery must not revive cached old videos when backend product truth has an empty video_url, and media cards must remount when image/video URLs change."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /Public products: \{occupiedPublicSlotCount\} \/ \{publicProductSlotsTotal\}[\s\S]*?occupiedPublicSlotCount > 0/,
  "Shop Assets header public-products badge must report visible occupied slots."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /<div style=\{sectionLabel\(\)\}>\{labelWithIcon\("shop", "Public"\)\}<\/div>[\s\S]*?\{occupiedPublicSlotCount\}[\s\S]*?Open gallery items/,
  "Shop Assets readiness Public stat must report visible occupied slots."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /debugId="shop-assets\.product\.quick-add"[\s\S]*?\+ Add product/,
  "Shop Assets must expose a simple plus-style product add action above the public block grid."
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
  "Shop Assets selected block must come from the arranged public slot gallery."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /manage_product_id[\s\S]*?manage_block[\s\S]*?source[\s\S]*?publicGallerySlots\.findIndex[\s\S]*?This is the exact public block you opened[\s\S]*?data-owner-product-manage-mode=\{[\s\S]*?"focused"[\s\S]*?Manage this public block[\s\S]*?Change media or details[\s\S]*?Delete permanently/,
  "Public Shop owner handoff must focus the exact block and present Change or permanent deletion as the first owner decision."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /Delete this product permanently\?[\s\S]*?linked Spotlight will stop[\s\S]*?method: "DELETE"[\s\S]*?forgetShopProductMedia\(productId\)[\s\S]*?deletedProductIdsRef\.current\.add\(productId\)[\s\S]*?props\.onProductDeleted\?\.\(productId\)[\s\S]*?Product permanently deleted\. Upload it again if you need it later\./,
  "Shop Assets deletion must be explicit, server-backed, cache-clearing, and non-restorable."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const deletedSlotNumber = selectedPublicSlot[\s\S]*?showGalleryActionNotice\([\s\S]*?Block #\$\{deletedSlotNumber\} is empty[\s\S]*?showGalleryActionNotice\("error", message, deletedSlotNumber\)/,
  "Permanent-delete success and failure must remain visible beside the exact block where the owner acted."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /focusedProductReturnPath\?: string \| null[\s\S]*?focusedShopReturnPath\?: string \| null[\s\S]*?debugId="shop-assets\.focused-product\.return"[\s\S]*?View updated product[\s\S]*?Back to public shop/,
  "The focused product task must provide an in-context return after save or permanent deletion."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /embeddedSection\?: "products" \| "diary"[\s\S]*?const embeddedSection = props\.embeddedSection \|\| "products"[\s\S]*?!embedded \? \([\s\S]*?Public shop picture[\s\S]*?!embedded \|\| embeddedSection === "diary"[\s\S]*?Shop Diary[\s\S]*?embedded && embeddedSection === "products"[\s\S]*?Products & Services block control/,
  "Embedded Gallery Tools must show only Products & Services or Shop Diary, while standalone Shop Assets retains the full workbench."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function openAddForPublicSlot[\s\S]*?marketplaceShopsFeatureOff[\s\S]*?function openEditForPublicSlot[\s\S]*?marketplaceShopsFeatureOff[\s\S]*?async function submitProduct[\s\S]*?marketplaceShopsFeatureOff/,
  "Product add, edit, and save must obey Marketplace Shops policy rather than Shop Diary policy."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /publicBlocksOpen[\s\S]*?function revealSelectedPublicBlock\(\)[\s\S]*?shop-assets-selected-public-block[\s\S]*?setPublicBlocksOpen\(true\)[\s\S]*?showGalleryActionNotice\([\s\S]*?setProductEditorOpen\(false\)[\s\S]*?setPublicBlocksOpen\(true\)[\s\S]*?revealSelectedPublicBlock\(\)[\s\S]*?open=\{ownerProductManageFocusRequested \|\| publicBlocksOpen\}/,
  "Ordinary phone Add/save outcomes must reopen the numbered-block disclosure and return focus to the visible block result."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /lastSavedPublicBlock[\s\S]*?savedId > 0[\s\S]*?productId: savedId[\s\S]*?wasEditing: wasEditingProduct[\s\S]*?!ownerProductManageFocusRequested[\s\S]*?galleryActionNotice\.tone === "success"[\s\S]*?debugId="shop-assets\.ordinary-product\.view-public"[\s\S]*?View product in public shop/,
  "An ordinary successful public-product save must expose one exact saved-product Public Shop continuation."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const seedProducts = normalizeProductRecords\(props\.seedProducts \|\| \[\]\)\.filter\([\s\S]*?deletedProductIdsRef\.current\.has[\s\S]*?nextProducts = mergeProductsById\(nextProducts, publicShopProducts\)\.filter\([\s\S]*?deletedProductIdsRef\.current\.has/,
  "Shop Assets must exclude locally deleted ids from stale embedded seeds and public responses."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /seedProducts=\{products\}[\s\S]*?onProductDeleted=\{\(productId\) =>[\s\S]*?setProducts\(\(current\) =>[\s\S]*?Number\(item\?\.id \|\| 0\) !== productId/,
  "Embedded Shop Control must remove a permanently deleted product from its parent seed state."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function revealProductEditor\(\)[\s\S]*?shop-assets-product-editor[\s\S]*?scrollIntoView[\s\S]*?function openEditForPublicSlot[\s\S]*?revealProductEditor\(\)[\s\S]*?id="shop-assets-product-editor"[\s\S]*?Change picture[\s\S]*?Change video/,
  "Change media must reveal and focus the existing editor, whose picture/video controls use action labels rather than passive readiness labels."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /SPOTLIGHT_VIDEO_QUALITY_GUIDANCE[\s\S]*?debugId="shop-assets\.product\.remove-video"[\s\S]*?New pasted video links are not accepted/,
  "Shop Assets must show shared video guidance, retain explicit removal, and close the pasted-video bypass."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /minHeight: selectedPublicProduct \? \(isCompact \? 236 : 108\) : isCompact \? 68 : 54/,
  "Shop Assets selected block action panel must reserve stable height so Open/Add/Repost controls cannot jump the shelf."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /PAID_REPOST_HASH[\s\S]*?from "\.\.\/lib\/ownerShopHandles";[\s\S]*?function buildPaidRepostPath\(product: ProductRecord, blockNumber: number\): string \{[\s\S]*?repost_product_id[\s\S]*?block[\s\S]*?source", "shop-control-gallery"[\s\S]*?PAID_REPOST_HASH/,
  "Shop Assets owner-side Repost must route the exact selected block into the paid placement rail."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.edit`\}[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.delete`\}[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.copy-link`\}[\s\S]*?Number\(selectedPublicProduct\.id \|\| 0\) > 0[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.paid-repost`\}[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{selectedPublicSlot\}\.paid-repost-unavailable`\}/,
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
