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