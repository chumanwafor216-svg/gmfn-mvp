/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(frontendRoot, "src/lib/routePreload.ts"), "utf8");
const findings = [];

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  findings.push(message);
}

assertContains(
  /const PRIORITY_CORE_ROUTE_KEYS = \[[\s\S]*?"community-home"[\s\S]*?"marketplace"[\s\S]*?"identity-home"[\s\S]*?\];/,
  "Priority route list must keep Community Home, Marketplace, and Profile first."
);

assertContains(
  /const STANDARD_CORE_ROUTE_KEYS = \[[\s\S]*?"dashboard"[\s\S]*?"shop-gallery"[\s\S]*?"trust-slip"[\s\S]*?"finance"[\s\S]*?"loans"[\s\S]*?\];/,
  "Already-fast and secondary core routes must remain behind the owner-reported slow tabs."
);

assertContains(
  /key: "shop-assets"[\s\S]*?import\("\.\.\/pages\/ShopAssetsPage"\)/,
  "Route preloading must know the Shop Assets interior page instead of leaving its warm calls as no-ops."
);

assertContains(
  /key: "payment-instructions"[\s\S]*?key: "withdrawal-instructions"[\s\S]*?key: "loan-readiness"[\s\S]*?key: "community-confirmation-inbox"[\s\S]*?key: "notifications"/,
  "Route preloading must know common finance, support, community confirmation, and notice pages instead of leaving warm calls as no-ops."
);

assertContains(
  /const BRIDGE_ROUTE_KEYS = \[[\s\S]*?"notifications"[\s\S]*?"payment-instructions"[\s\S]*?"withdrawal-instructions"[\s\S]*?"loan-readiness"[\s\S]*?"community-confirmation-inbox"[\s\S]*?"shop-assets"[\s\S]*?"trust-timeline"[\s\S]*?\];/,
  "Bridge route preload list must keep common interior Community, finance, support, shop, and trust pages warm after the top tabs."
);

assertContains(
  /function shouldPreloadBridgeRoutes\(\): boolean \{[\s\S]*?return shouldPreloadSecondaryHeavyRoutes\(\);[\s\S]*?\}/,
  "Bridge route preloading must respect the heavier-route network gate."
);

assertContains(
  /BRIDGE_ROUTE_KEYS\.forEach\(\(key, index\) => \{[\s\S]*?scheduleIdle\(\(\) => preloadRouteByKey\(key\), 5000 \+ index \* 520\);[\s\S]*?\}\);/,
  "Bridge route chunks must warm after the standard core routes instead of competing with first paint."
);
assertContains(
  /function scheduleSoon\(task: \(\) => void, delayMs: number\): void \{[\s\S]*?window\.setTimeout\(task, delayMs\);[\s\S]*?\}/,
  "Slow-tab chunks must use the short timer preload helper instead of waiting for idle callback."
);

assertContains(
  /PRIORITY_CORE_ROUTE_KEYS\.forEach\(\(key, index\) => \{[\s\S]*?scheduleSoon\(\(\) => preloadRouteByKey\(key\), 250 \+ index \* 400\);[\s\S]*?\}\);/,
  "Slow-tab chunks must preload at 250ms, 650ms, and 1050ms after authenticated shell mount."
);

assertContains(
  /STANDARD_CORE_ROUTE_KEYS\.forEach\(\(key, index\) => \{[\s\S]*?scheduleIdle\(\(\) => preloadRouteByKey\(key\), 1900 \+ index \* 650\);[\s\S]*?\}\);/,
  "Standard core chunks must stay idle-preloaded after the priority slow tabs."
);

assertContains(
  /connection\?\.saveData[\s\S]*?effectiveType !== "slow-2g" && effectiveType !== "2g"/,
  "Preloading must continue to respect data-saver and very slow network signals."
);

if (findings.length > 0) {
  console.error("Slow-tab preload priority audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(
  "Slow-tab preload priority audit passed: Community Home, Marketplace, and Profile warm before lower-priority app chunks."
);