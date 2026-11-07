/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

function readRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function requirePattern(file, source, pattern, message) {
  if (pattern.test(source)) return;
  findings.push({ file, message });
}

function forbidPattern(file, source, pattern, message) {
  if (!pattern.test(source)) return;
  findings.push({ file, message });
}

const presentationFile = "frontend/src/design/authenticatedNeon.ts";
const dashboardFile = "frontend/src/pages/DashboardPage.tsx";
const identityFile = "frontend/src/components/dashboard/DashboardCompactIdentityHero.tsx";
const communityFile = "frontend/src/pages/CommunityHomePage.tsx";
const marketplaceFile = "frontend/src/pages/MarketplacePage.tsx";
const presentation = readRepo(presentationFile);
const dashboard = readRepo(dashboardFile);
const identity = readRepo(identityFile);
const community = readRepo(communityFile);
const marketplace = readRepo(marketplaceFile);

requirePattern(
  presentationFile,
  presentation,
  /export const AUTHENTICATED_STATIC_NEON_STAGE[\s\S]*?linear-gradient\(180deg, #061A2E/,
  "Authenticated phone lighting must keep one shared deep-navy static stage."
);
requirePattern(
  presentationFile,
  presentation,
  /cyanViolet[\s\S]*?cyanGold[\s\S]*?goldViolet/,
  "Authenticated lighting must remain limited to the approved cyan, violet, and gold tones."
);
requirePattern(
  presentationFile,
  presentation,
  /export function authenticatedStaticNeonFrame\(/,
  "Authenticated lighting must keep one reusable static frame helper."
);
forbidPattern(
  presentationFile,
  presentation,
  /animation|@keyframes|transition|setInterval|requestAnimationFrame/i,
  "Authenticated neon presentation must remain static and must not add motion."
);

for (const surface of ["trustslip", "demandbox", "pulse", "market-wisdom", "focus"]) {
  requirePattern(
    dashboardFile,
    dashboard,
    new RegExp(`data-dashboard-neon-surface=["']${surface}["']`),
    `Dashboard must keep the approved static neon frame on ${surface}.`
  );
}
requirePattern(
  identityFile,
  identity,
  /data-dashboard-neon-surface="identity"[\s\S]*?authenticatedStaticNeonFrame\("cyanViolet"\)/,
  "Dashboard identity must keep its restrained static cyan-violet frame."
);
requirePattern(
  dashboardFile,
  dashboard,
  /data-dashboard-neon-surface="market-wisdom"[\s\S]{0,900}?authenticatedStaticNeonFrame\([\s\S]{0,80}?"cyanGold"/,
  "Dashboard Market Wisdom may receive only its approved outer static frame."
);

requirePattern(
  communityFile,
  community,
  /background: isCompact[\s\S]{0,80}?AUTHENTICATED_STATIC_NEON_STAGE/,
  "Community Home must keep the shared static stage limited to its compact authenticated view."
);
requirePattern(
  communityFile,
  community,
  /data-gsn-neon-surface="identity"/,
  "Community Home must keep the static frame on its existing identity hero."
);
requirePattern(
  communityFile,
  community,
  /data-gsn-neon-surface="bulletin"/,
  "Community Home must keep the static frame on its existing Bulletin."
);

requirePattern(
  marketplaceFile,
  marketplace,
  /background: isCompact \? AUTHENTICATED_STATIC_NEON_STAGE : "var\(--page-bg\)"/,
  "Marketplace must keep the shared static stage limited to its compact authenticated view."
);
requirePattern(
  marketplaceFile,
  marketplace,
  /data-gsn-neon-surface="identity"/,
  "Marketplace must keep the static frame on its existing community identity hero."
);
requirePattern(
  marketplaceFile,
  marketplace,
  /function marketplaceLiveMarketCardStyle[\s\S]*?authenticatedStaticNeonFrame\([\s\S]*?tone === "needs"[\s\S]*?tone === "shops"/,
  "Marketplace must keep restrained tone-aware static frames on its three primary market lanes."
);
requirePattern(
  marketplaceFile,
  marketplace,
  /data-gsn-neon-surface="wisdom-lens"[\s\S]{0,1200}?authenticatedStaticNeonFrame\([\s\S]{0,80}?"cyanGold"/,
  "Marketplace wisdom must keep only its approved static outer frame."
);

if (findings.length > 0) {
  console.error("Authenticated static neon presentation audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Authenticated static neon presentation audit passed.");