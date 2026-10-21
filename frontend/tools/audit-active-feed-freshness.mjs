/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function requirePattern(text, pattern, message) {
  if (!pattern.test(text)) {
    console.error(`Active feed freshness audit failed: ${message}`);
    process.exitCode = 1;
  }
}

const api = source("src/lib/api.ts");
const communityHome = source("src/pages/CommunityHomePage.tsx");
const marketplace = source("src/pages/MarketplacePage.tsx");
const demandBox = source("src/pages/DemandBoxPage.tsx");
const dashboard = source("src/pages/DashboardPage.tsx");
const notifications = source("src/pages/NotificationsPage.tsx");
const companion = source("src/components/CompanionLayer.tsx");
const spotlight = source("src/components/CommunityMarketplaceSpotlight.tsx");

requirePattern(
  api,
  /getMyNotifications[\s\S]*?fresh\?: boolean[\s\S]*?clearStartupSectionCacheByLabel\("getMyNotifications"\)/,
  "notification polling must be able to bypass the startup cache"
);
requirePattern(
  api,
  /getMarketplaceBroadcasts[\s\S]*?fresh\?: boolean[\s\S]*?clearStartupSectionCacheByLabel\("getMarketplaceBroadcasts"\)/,
  "Spotlight polling must be able to bypass the startup cache"
);
requirePattern(
  api,
  /listMarketplaceRequests[\s\S]*?fresh\?: boolean[\s\S]*?clearStartupSectionCacheByLabel\("listMarketplaceRequests"\)/,
  "DemandBox polling must be able to bypass the startup cache"
);
requirePattern(
  api,
  /createMarketplaceBroadcast[\s\S]*?clearStartupSectionCacheByLabel\("getMarketplaceBroadcasts"\)/,
  "publishing a Spotlight must invalidate the local broadcast cache"
);

for (const [name, text] of [
  ["Community Home", communityHome],
  ["Marketplace", marketplace],
  ["DemandBox", demandBox],
]) {
  requirePattern(
    text,
    /addEventListener\("focus"/,
    `${name} must refresh when the app regains focus`
  );
  requirePattern(
    text,
    /addEventListener\(\s*"visibilitychange"/,
    `${name} must refresh when the app becomes visible`
  );
  requirePattern(
    text,
    /setInterval\(/,
    `${name} must refresh while it remains active`
  );
}

for (const [name, text] of [
  ["Dashboard", dashboard],
  ["Notifications", notifications],
  ["Companion", companion],
  ["Spotlight", spotlight],
]) {
  requirePattern(
    text,
    /fresh: true/,
    `${name} active refresh must request fresh server data`
  );
}

if (!process.exitCode) {
  console.log("Active feed freshness audit passed.");
}
