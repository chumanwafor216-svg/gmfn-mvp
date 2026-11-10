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
const communityInviteFile =
  "frontend/src/components/SimpleCommunityInviteCard.tsx";
const marketplaceFile = "frontend/src/pages/MarketplacePage.tsx";
const profileFile = "frontend/src/pages/MyGMFNAndIPage.tsx";
const presentation = readRepo(presentationFile);
const dashboard = readRepo(dashboardFile);
const identity = readRepo(identityFile);
const community = readRepo(communityFile);
const communityInvite = readRepo(communityInviteFile);
const marketplace = readRepo(marketplaceFile);
const profile = readRepo(profileFile);
const marketWisdomStart = dashboard.indexOf('data-dashboard-surface="market-wisdom"');
const marketWisdomEnd = dashboard.indexOf(
  'data-dashboard-neon-surface="focus"',
  marketWisdomStart
);
const marketWisdomSection = dashboard.slice(marketWisdomStart, marketWisdomEnd);

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
requirePattern(
  presentationFile,
  presentation,
  /const VIVID_STATIC_NEON_TONES[\s\S]*?rgba\(91,226,255,0\.82\)[\s\S]*?export function authenticatedStaticNeonAction\(/,
  "Authenticated lighting must keep the approved readable frame tier and reusable action-edge helper."
);
forbidPattern(
  presentationFile,
  presentation,
  /animation|@keyframes|transition|setInterval|requestAnimationFrame/i,
  "Authenticated neon presentation must remain static and must not add motion."
);

for (const surface of ["trustslip", "demandbox", "pulse", "focus"]) {
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
  /data-dashboard-neon-surface="identity"[\s\S]*?authenticatedStaticNeonFrame\("cyanViolet", "vivid"\)/,
  "Dashboard identity must keep its readable static cyan-violet frame."
);
requirePattern(
  dashboardFile,
  dashboard,
  /authenticatedStaticNeonFrame\([\s\S]{0,80}?isPhone \? "vivid" : "soft"/,
  "Dashboard primary phone surfaces must use the readable frame tier without changing desktop restraint."
);
requirePattern(
  dashboardFile,
  marketWisdomSection,
  /data-dashboard-surface="market-wisdom"[\s\S]{0,500}?linear-gradient\(180deg, #F7FBFF 0%, #EAF3FF 52%, #DCEAFB 100%\)[\s\S]*?linear-gradient\(180deg, #FFFFFF 0%, #F4F9FF 100%\)/,
  "Dashboard Market Wisdom must keep its restored light outer and inner backgrounds."
);
forbidPattern(
  dashboardFile,
  marketWisdomSection,
  /authenticatedStaticNeonFrame|textShadow|#08233D|#061A2E|#041426/,
  "Dashboard Market Wisdom must not render neon frames, glow text, or the replaced dark-neon background."
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
  /function communityHeroStyle[\s\S]*?authenticatedStaticNeonFrame\("cyanViolet", "vivid"\)/,
  "Community Home must keep the readable frame on its existing phone identity hero."
);
requirePattern(
  communityFile,
  community,
  /function announcementBoardShellStyle[\s\S]*?authenticatedStaticNeonFrame\([\s\S]{0,80}?"cyanGold",[\s\S]{0,80}?isCompact \? "vivid" : "soft"/,
  "Community Home must keep a readable phone Bulletin frame and softer desktop frame."
);
requirePattern(
  communityFile,
  community,
  /heroActionStyle=\{authenticatedStaticNeonAction\("cyanViolet"\)\}[\s\S]*?community-home\.identity\.share-community[\s\S]*?authenticatedStaticNeonAction\("cyanViolet"\)/,
  "Community Home must light its existing Invite and Share front-door actions."
);
requirePattern(
  communityFile,
  community,
  /community-home\.bulletin\.reactions[\s\S]{0,1800}?authenticatedStaticNeonAction\("cyanViolet"\)/,
  "Community Home must light its existing Open notice front-door action."
);
requirePattern(
  communityInviteFile,
  communityInvite,
  /heroActionStyle\?: React\.CSSProperties[\s\S]*?identityPresentation \? heroActionStyle : \{\}/,
  "The shared invite card must expose an optional identity-trigger edge without changing other invite surfaces."
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
  /function marketplaceHeroShellStyle[\s\S]*?authenticatedStaticNeonFrame\([\s\S]{0,80}?"cyanViolet",[\s\S]{0,80}?isCompact \? "vivid" : "soft"/,
  "Marketplace must keep the readable phone frame on its existing community identity hero."
);
requirePattern(
  marketplaceFile,
  marketplace,
  /function marketplaceLiveMarketCardStyle[\s\S]*?tone === "needs"[\s\S]*?tone === "shops"[\s\S]*?isCompact \? "vivid" : "soft"/,
  "Marketplace must keep readable tone-aware phone frames on its three primary market lanes."
);
requirePattern(
  marketplaceFile,
  marketplace,
  /data-gsn-neon-surface="wisdom-lens"[\s\S]{0,1200}?authenticatedStaticNeonFrame\([\s\S]{0,80}?"cyanGold",[\s\S]{0,80}?isCompact \? "vivid" : "soft"/,
  "Marketplace wisdom must keep only its approved readable phone outer frame."
);
requirePattern(
  marketplaceFile,
  marketplace,
  /marketplace\.front\.invite-someone[\s\S]*?authenticatedStaticNeonAction\("cyanViolet"\)[\s\S]*?marketplace\.job\.add-need-shortcut[\s\S]*?authenticatedStaticNeonAction\("cyanViolet"\)[\s\S]*?marketplace\.job\.find-people-services[\s\S]*?authenticatedStaticNeonAction\("cyanGold"\)[\s\S]*?marketplace\.row\.wisdom-action[\s\S]*?authenticatedStaticNeonAction\("cyanGold"\)/,
  "Marketplace must light only its existing front-door invite, need, shop, match, and wisdom actions."
);

requirePattern(
  profileFile,
  profile,
  /authenticatedStaticNeonFrame\([\s\S]{0,80}?"cyanViolet",[\s\S]{0,80}?"vivid"[\s\S]{0,300}?data-gsn-neon-surface=\{[\s\S]{0,80}?"profile-identity"/,
  "My GSN must keep the readable frame on its existing compact identity hero."
);
requirePattern(
  profileFile,
  profile,
  /authenticatedStaticNeonFrame\([\s\S]{0,80}?"cyanGold",[\s\S]{0,80}?"vivid"[\s\S]{0,300}?data-gsn-neon-surface=\{[\s\S]{0,80}?"profile-community"/,
  "My GSN must keep the readable frame on its existing selected-community card."
);
requirePattern(
  profileFile,
  profile,
  /debugId="my-gmfn\.profile\.primary-action"[\s\S]{0,900}?authenticatedStaticNeonAction\("cyanViolet"\)/,
  "My GSN must light only its existing state-aware phone primary action."
);

if (findings.length > 0) {
  console.error("Authenticated static neon presentation audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Authenticated static neon presentation audit passed.");
