/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const communityFile = "frontend/src/pages/CommunityHomePage.tsx";
const backendFile = "gmfn_backend/app/api/routes/clans.py";
const backendTestFile = "gmfn_backend/tests/test_default_clan_removal.py";
const specFile = "docs/SCREEN_SPECS.md";
const communitySource = readFileSync(join(repoRoot, communityFile), "utf8");
const backendSource = readFileSync(join(repoRoot, backendFile), "utf8");
const backendTestSource = readFileSync(join(repoRoot, backendTestFile), "utf8");
const specSource = readFileSync(join(repoRoot, specFile), "utf8");
const findings = [];

function requirePattern(source, pattern, file, message) {
  if (pattern.test(source)) return;
  findings.push({ file, message });
}

function forbidPattern(source, pattern, file, message) {
  if (!pattern.test(source)) return;
  findings.push({ file, message });
}

requirePattern(
  backendSource,
  /class ClanOut[\s\S]*?member_count: int = 0[\s\S]*?active_member_count: int = 0[\s\S]*?membership_status: str = "active"[\s\S]*?def _clan_out\([\s\S]*?_active_clan_member_count\(db, clan_id=int\(clan\.id\)\)[\s\S]*?"member_count": active_member_count[\s\S]*?"active_member_count": active_member_count[\s\S]*?"membership_status": "active" if membership_role else "unknown"/,
  backendFile,
  "The signed-in community list must return an authoritative active membership count and explicit membership status."
);
requirePattern(
  backendTestSource,
  /assert data\["items"\]\[0\]\["membership_status"\] == "active"[\s\S]*?assert data\["items"\]\[0\]\["member_count"\] == 2[\s\S]*?assert data\["items"\]\[0\]\["active_member_count"\] == 2[\s\S]*?assert data\["items"\]\[1\]\["member_count"\] == 1/,
  backendTestFile,
  "Backend regression coverage must prove that /clans/me returns per-community membership totals rather than a fixed fallback."
);
requirePattern(
  communitySource,
  /function getCommunityMemberCount\([\s\S]*?active_member_count[\s\S]*?member_count[\s\S]*?members_count[\s\S]*?return null[\s\S]*?selectedCommunityMemberCount === null[\s\S]*?"Count unavailable"/,
  communityFile,
  "Community Home must distinguish a missing count from a real zero."
);
requirePattern(
  communitySource,
  /function communityIdentityFactsStyle\(\)[\s\S]*?gridTemplateColumns: "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?data-community-home-billboard-facts="true"[\s\S]*?label="Members"[\s\S]*?label="Community ID"[\s\S]*?label="Your position"[\s\S]*?label="Membership"/,
  communityFile,
  "The first billboard must keep its four immediate facts in the approved two-column layout."
);
requirePattern(
  communitySource,
  /getPoolMe\("NGN", 1, \{ clan_id: selectedClanId \}\)[\s\S]*?positiveNumber\(response\?\.clan_id\) !== selectedClanId[\s\S]*?amount <= 0\) return[\s\S]*?selectedCommunityBalance \? \([\s\S]*?label="Available now"/,
  communityFile,
  "The optional balance must come from the selected community and remain hidden unless it is positive."
);
requirePattern(
  communitySource,
  /data-debug-id="community-home\.identity-card"[\s\S]*?<SimpleCommunityInviteCard[\s\S]*?<\/section>[\s\S]*?<section id="community-home-bulletin"/,
  communityFile,
  "The identity billboard, Invite action, and immediate Bulletin order must remain intact."
);
forbidPattern(
  communitySource,
  /getPoolMeSummary/,
  communityFile,
  "Community Home must not restore the cross-community cumulative finance summary."
);
requirePattern(
  specSource,
  /missing count data must say `Count unavailable`[\s\S]*?selected-community `Available now` balance only when[\s\S]*?must not fetch `getPoolMeSummary`/,
  specFile,
  "The frozen screen specification must record the truthful count and selected-community-only balance exception."
);

if (findings.length > 0) {
  console.error("Community Home billboard audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Community Home billboard audit passed.");
