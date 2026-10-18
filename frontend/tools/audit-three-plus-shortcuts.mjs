/* global console, process */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  component: 'src/components/ExistingWorkflowPlusLink.tsx',
  shop: 'src/pages/ShopGalleryPage.tsx',
  control: 'src/pages/ShopControlPage.tsx',
  assets: 'src/pages/ShopAssetsPage.tsx',
  marketplace: 'src/pages/MarketplacePage.tsx',
  demand: 'src/pages/DemandBoxPage.tsx',
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(frontendRoot, file), 'utf8')])
);
const findings = [];

function assertContains(key, pattern, message) {
  if (!pattern.test(source[key])) findings.push(`${files[key]}: ${message}`);
}

function pageFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(path);
    return /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
  });
}

const allPageSources = pageFiles(join(frontendRoot, 'src/pages')).map((file) => ({
  file,
  text: readFileSync(file, 'utf8'),
}));
const usages = allPageSources.flatMap(({ file, text }) =>
  [...text.matchAll(/<ExistingWorkflowPlusLink\b/g)].map(() => file)
);

if (usages.length !== 4) {
  findings.push(`Expected the three entry shortcuts plus one owner product-media shortcut template; found ${usages.length}: ${usages.join(', ')}`);
}
if (usages.filter((file) => file.endsWith('ShopGalleryPage.tsx')).length !== 3) {
  findings.push('Public Shop must own Spotlight, Shop Diary, and one expanded owner product-media shortcut template.');
}
if (usages.filter((file) => file.endsWith('MarketplacePage.tsx')).length !== 1) {
  findings.push('Marketplace must own exactly one DemandBox shortcut.');
}

assertContains(
  'component',
  /stableHeight=\{48\}[\s\S]*?minWidth=\{48\}[\s\S]*?width: 48[\s\S]*?height: 48[\s\S]*?<span aria-hidden='true'>\+<\/span>/,
  'Shared plus control must keep a compact 48 by 48 touch target and an accessible text label.'
);
assertContains(
  'shop',
  /const signedInOwnsShop = Boolean\([\s\S]*?ownerSurfaceIdentityMatches[\s\S]*?signedInOwnsShop \? \([\s\S]*?label='Add Spotlight'[\s\S]*?shortcut='spotlight'/,
  'Spotlight shortcut must be gated by the signed-in owner identity match.'
);
assertContains(
  'shop',
  /ownerSpotlightStatusView\?\.state === 'none' \? 'create' : 'manage'[\s\S]*?data-spotlight-shortcut-mode=\{ownerSpotlightShortcutMode\}/,
  'Spotlight shortcut must retain truthful create-versus-manage state.'
);
assertContains(
  'shop',
  /ownerSpotlightShortcutPath = routeWithCommunity\([\s\S]*?APP_ROUTES\.FREE_SPOTLIGHT[\s\S]*?signedInOwnsShop \? \([\s\S]*?to=\{ownerSpotlightShortcutPath\}/,
  'Spotlight shortcut must use the existing Shop Control Spotlight route with community context.'
);
assertContains(
  'shop',
  /ownerShopDiaryPath = routeWithCommunity\([\s\S]*?#shop-assets-diary[\s\S]*?signedInOwnsShop \? \([\s\S]*?to=\{ownerShopDiaryPath\}[\s\S]*?label=["']Add diary entry["']/,
  'Shop Diary shortcut must be owner-only and reach the existing diary anchor with community context.'
);
assertContains(
  'shop',
  /function ownerProductManagePath\(product: ShopProduct\)[\s\S]*?manage_product_id[\s\S]*?manage_block[\s\S]*?source", "public-shop-product"[\s\S]*?#shop-control-gallery-tools[\s\S]*?debugId=\{\`shop-gallery\.product\.\$\{productOpenId\}\.toggle\`\}[\s\S]*?debugId=\{\`shop-gallery\.product\.\$\{productOpenId\}\.owner-share\`\}[\s\S]*?debugId=\{\`shop-gallery\.product\.\$\{productOpenId\}\.paid-placement\`\}[\s\S]*?showBlockPlacementAction && positiveNumber\(product\.id\)[\s\S]*?label=\{\`Manage media for \$\{displayTitle\}\`\}[\s\S]*?debugId=\{\`shop-gallery\.product\.\$\{productOpenId\}\.owner-manage\`\}[\s\S]*?shortcut="shop-product"[\s\S]*?display: isProductOpen \? "inline-flex" : "none"/,
  'An expanded owned product card must keep Close, Share, Repost, then one owner-only media-management plus that routes to the exact existing block workflow.'
);
assertContains(
  'shop',
  /shortcut="shop-product"[\s\S]*?preserveOrigin=\{false\}[\s\S]*?data-owner-product-id/,
  'The exact-product handoff must use its computed product/block return instead of a generic route origin.'
);
assertContains(
  'assets',
  /manage_product_id[\s\S]*?manage_block[\s\S]*?source[\s\S]*?publicGallerySlots\.findIndex[\s\S]*?This is the exact public block you opened[\s\S]*?shop-assets-selected-public-block[\s\S]*?data-owner-product-manage-target=\{selectedPublicProduct\?\.id \|\| ""\}[\s\S]*?Manage this public block[\s\S]*?Change media or details[\s\S]*?Delete permanently/,
  'Shop Assets must resolve the requested product/block, explain the exact task, and expose Change and permanent deletion first.'
);
assertContains(
  'control',
  /publicShopBlockPath[\s\S]*?ownerProductManageFocusRequested[\s\S]*?ownerProductManageReturnPath[\s\S]*?ownerProductManageFocusRequested[\s\S]*?"Manage product"[\s\S]*?ownerProductManageReturnPath \|\| ownerPublicShopPath \|\| routes\.marketplace[\s\S]*?"Public Shop"/,
  'The focused product task must expose a truthful exact-product Public Shop return path.'
);
assertContains(
  'control',
  /activeOwnerLayer === "products"[\s\S]*?!ownerProductManageFocusRequested && !shopDiaryTaskFocused \? \([\s\S]*?Shop Gallery Tools[\s\S]*?Shop billboard[\s\S]*?Write diary update[\s\S]*?Marketplace capacity[\s\S]*?embeddedSection=\{shopDiaryTaskFocused \? "diary" : "products"\}[\s\S]*?focusedProductReturnPath=\{ownerProductManageReturnPath \|\| null\}/,
  'Ordinary Gallery Tools must show its shortcuts, while exact-product and Diary handoffs each reveal only their requested task.'
);
assertContains(
  'assets',
  /embeddedSection\?: "products" \| "diary"[\s\S]*?!embedded \|\| embeddedSection === "diary"[\s\S]*?embedded && embeddedSection === "products"/,
  'Embedded Shop Assets must keep the Shop Diary and Products & Services tasks separate.'
);
assertContains(
  'assets',
  /showGalleryActionNotice\([\s\S]*?Block #\$\{deletedSlotNumber\} is empty[\s\S]*?debugId="shop-assets\.focused-product\.return"[\s\S]*?View updated product[\s\S]*?Back to public shop/,
  'Focused save/delete outcomes must stay visible beside the selected block and offer a clear Public Shop return.'
);
assertContains(
  'shop',
  /state === "live"[\s\S]*?detail: ""[\s\S]*?Owner invitation only\.[\s\S]*?Request access[\s\S]*?Copy request/,
  'Public Shop must keep the approved concise live-Spotlight and Private Vault copy.'
);
assertContains(
  'marketplace',
  /demandBoxCreatePath = useMemo\([\s\S]*?resolveCtaTarget\("demandBox"[\s\S]*?params\.set\("mode", "create"\)[\s\S]*?canCreateMarketplaceDemand = Boolean\([\s\S]*?activeCommunityId &&[\s\S]*?me &&[\s\S]*?memberCommunityIds\.includes\(activeCommunityId\) &&[\s\S]*?!demandBoxFeatureOff[\s\S]*?label="Add request"[\s\S]*?shortcut="demand-box"/,
  'DemandBox shortcut must require authenticated membership in the selected community, respect policy OFF, and open create mode.'
);
assertContains(
  'marketplace',
  /setMemberCommunityIds\([\s\S]*?clanRows\.map\(\(row: any\) => getRowId\(row\)\)\.filter/,
  'DemandBox shortcut membership must come from the authenticated member community list.'
);
assertContains(
  'demand',
  /useState\(\(\) => routeSelectedClanId > 0\)[\s\S]*?setCreateCommunityConfirmed\(true\)[\s\S]*?if \(!isCreateMode\) return[\s\S]*?revealDemandCreate\(\)/,
  'A selected-community create handoff must reveal the existing DemandBox form without a duplicate chooser.'
);
assertContains(
  'demand',
  /revealElementWithoutJump\(target, \{[\s\S]*?targetId: "demand-box-create"[\s\S]*?reason: "create-reveal"/,
  'DemandBox create mode must retain the existing stable scroll/focus target.'
);

const shortcutBlocks = [source.shop, source.marketplace]
  .flatMap((text) => [...text.matchAll(/<ExistingWorkflowPlusLink\b[\s\S]*?\/>/g)])
  .map((match) => match[0]);
for (const block of shortcutBlocks) {
  if (/onClick=|createMarketplace|createShopDiary|publish|debit|allowOneHopRelay|consent/i.test(block)) {
    findings.push(`Shortcut performs or references a business action: ${block.replace(/\s+/g, ' ')}`);
  }
}

if (findings.length) {
  console.error('Workflow plus shortcuts audit failed:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('Workflow plus audit passed: the three entry shortcuts and expanded owner-only product-media shortcut reuse existing workflows without business writes.');
