/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const layoutPath = join(frontendRoot, "src", "layout", "AppLayout.tsx");
const source = readFileSync(layoutPath, "utf8");
const findings = [];

function assertContains(pattern, message) {
  pattern.lastIndex = 0;
  if (!pattern.test(source)) findings.push(message);
}

function assertNotContains(pattern, message) {
  pattern.lastIndex = 0;
  if (pattern.test(source)) findings.push(message);
}

assertContains(
  /const mobileBottomItems = useMemo<NavLinkItem\[\]>\(\(\) => \{[\s\S]*?label: "Shop"[\s\S]*?label: "Community Home"[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeDashboardItem\(\)[\s\S]*?makeProfileItem\(\)/,
  "Authenticated phone tabs must stay ordered Shop, Community Home, Marketplace, Dashboard, Profile."
);

assertContains(
  /function bottomNav\(\): React\.CSSProperties \{[\s\S]*?position: "relative"[\s\S]*?gridTemplateColumns: "repeat\(5, minmax\(0, 1fr\)\)"[\s\S]*?linear-gradient\(180deg, rgba\(2,28,48,0\.995\)[\s\S]*?borderTop: "1px solid rgba\(85,232,255,0\.34\)"/,
  "The shared rail must stay in normal flow with five equal columns and its permanent deep-navy finish."
);

assertContains(
  /function bottomNavItem\(active = false, disabled = false\): React\.CSSProperties \{[\s\S]*?height: 76,[\s\S]*?minHeight: 76,[\s\S]*?maxHeight: 76[\s\S]*?borderRadius: 18[\s\S]*?border: active \? "1px solid #55E8FF"[\s\S]*?pointerEvents: "auto"[\s\S]*?rgba\(0,224,255,0\.78\)[\s\S]*?rgba\(221,43,255,0\.52\)/,
  "Each tab must keep stable 76px tap geometry and the restrained cyan-violet active frame."
);

assertContains(
  /function bottomNavIcon\(active = false, disabled = false\): React\.CSSProperties \{[\s\S]*?width: 40,[\s\S]*?height: 40,[\s\S]*?linear-gradient\(180deg, #FFFDF7 0%, #F7EBCB 100%\)[\s\S]*?<GsnRealisticIcon[\s\S]*?name=\{navIconForLabel\(item\.label\)\}[\s\S]*?size=\{36\}/,
  "Authenticated tabs must keep the premium realistic icon family in stable 40px tiles."
);

assertContains(
  /data-gmfn-bottom-nav="true"[\s\S]*?data-gsn-authenticated-tab-standard="realistic-3d-neon-v1"[\s\S]*?aria-label="Primary navigation"[\s\S]*?aria-current=\{active \? "page" : undefined\}[\s\S]*?data-bottom-nav-active=\{active \? "true" : "false"\}/,
  "The permanent rail marker, navigation label, active-page semantics and existing test marker must remain present."
);

const railStart = source.indexOf('{showMobileBottomRail ? (');
const railEnd = source.indexOf('      ) : null}', railStart);
const railSource = railStart >= 0 && railEnd > railStart ? source.slice(railStart, railEnd) : "";
assertNotContains(
  /data-gsn-authenticated-tab-standard="realistic-3d-neon-v1"[\s\S]*?isDemandBoxRoute/,
  "The permanent authenticated rail must not fall back to a DemandBox-only visual exception."
);
if (!railSource || !railSource.includes('style={bottomNav()}')) {
  findings.push("Every authenticated phone route must consume the same shared bottomNav style.");
}

if (findings.length > 0) {
  console.error("Authenticated mobile tab rail audit failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("Authenticated mobile tab rail audit passed.");