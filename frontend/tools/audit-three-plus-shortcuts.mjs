/* global console, process */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  component: 'src/components/ExistingWorkflowPlusLink.tsx',
  shop: 'src/pages/ShopGalleryPage.tsx',
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

if (usages.length !== 3) {
  findings.push(`Expected exactly three workflow-plus usages; found ${usages.length}: ${usages.join(', ')}`);
}
if (usages.filter((file) => file.endsWith('ShopGalleryPage.tsx')).length !== 2) {
  findings.push('Public Shop must own exactly the Spotlight and Shop Diary shortcuts.');
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
  console.error('Three plus shortcuts audit failed:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('Three plus shortcuts audit passed: exactly three authorized 48px navigation/focus controls reuse existing workflows without business writes.');
