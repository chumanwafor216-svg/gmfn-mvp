/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  component: "src/components/SimpleCommunityInviteCard.tsx",
  community: "src/pages/CommunityHomePage.tsx",
  marketplace: "src/pages/MarketplacePage.tsx",
  marketplaceTools: "src/pages/marketplace/MarketplaceToolsSection.tsx",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, relativePath]) => [
    key,
    readFileSync(join(frontendRoot, relativePath), "utf8"),
  ])
);
const findings = [];

function assertContains(key, pattern, message) {
  if (pattern.test(source[key])) return;
  findings.push({ file: files[key], message });
}

function assertNotContains(key, pattern, message) {
  if (!pattern.test(source[key])) return;
  findings.push({ file: files[key], message });
}

assertContains(
  "component",
  /hero[\s\S]*?createClanInvite\(communityId\)[\s\S]*?getClanInviteLink\(communityId\)[\s\S]*?normalizedJoinInviteUrl\(response\)/,
  "The hero invite must create a sender-owned invite while other surfaces may load the reusable community invite."
);
assertContains(
  "component",
  /personalizedJoinInviteUrl\(link,[\s\S]*?inviterName: safeInviterName[\s\S]*?recipientName: safeRecipientName[\s\S]*?communityCode[\s\S]*?communityName/,
  "The simple invite must attach the signed-in inviter and typed recipient to the shared join link."
);
assertNotContains(
  "component",
  /Invite to this community|Invite link ready|Invite link needs preparing/,
  "The simple invite card must not repeat its title or show passive ready-state explanation."
);
assertContains(
  "component",
  /debugId="simple-community-invite\.open"[\s\S]*?Invite[\s\S]*?Their name[\s\S]*?data-debug-id="simple-community-invite\.recipient-name"[\s\S]*?debugId="simple-community-invite\.send"[\s\S]*?Send invite/,
  "The hero invite must stay closed behind one compact Invite action, then ask only for the recipient name before Send invite."
);
assertContains(
  "component",
  /if \(hero\)[\s\S]*?<details[\s\S]*?<StableDisclosureSummary[\s\S]*?<input[\s\S]*?fontSize: 16/,
  "The hero invite recipient field must remain collapsed, stable, and phone-safe."
);
assertContains(
  "community",
  /data-debug-id="community-home\.identity-card"[\s\S]*?selectedCommunityMemberCount[\s\S]*?<SimpleCommunityInviteCard[\s\S]*?communityId=\{selectedClanId\}[\s\S]*?inviterName=\{hasHumanMemberName\(me\) \? resolveMemberName\(me\) : ""\}[\s\S]*?hero[\s\S]*?<\/section>[\s\S]*?id="community-home-bulletin"/,
  "Every selected Community Home must keep member count and one personalized invite action inside the identity hero before Bulletin."
);
assertContains(
  "marketplace",
  /id: "invite"[\s\S]*?label: "Invite people"[\s\S]*?keywords: \["invite", "join", "link", "bring", "people", "share"\]/,
  "Marketplace search must retain the Invite people action and invite-related keywords."
);
assertNotContains(
  "marketplace",
  /id: "invite"[\s\S]{0,420}?visible: false/,
  "Marketplace search must not hide the Invite people action."
);
assertContains(
  "marketplaceTools",
  /activeLinkCenterTool === "join"[\s\S]*?<SimpleCommunityInviteCard[\s\S]*?Personalise invite \(optional\)/,
  "Marketplace Invite Someone must show the simple card first and keep personalization optional."
);

if (findings.length > 0) {
  console.error("Simple community invite audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Simple community invite audit passed.");
