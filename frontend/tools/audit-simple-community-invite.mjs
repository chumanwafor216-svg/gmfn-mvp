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
  /getClanInviteLink\(communityId\)[\s\S]*?normalizedJoinInviteUrl\(response\)/,
  "The simple invite card must load the canonical invite for the selected community."
);
assertContains(
  "component",
  /Send the link\. They open it and ask to join\. The community still approves them\./,
  "The simple invite card must explain the three-step invite outcome in plain language."
);
assertContains(
  "component",
  /kind="primary"[\s\S]*?debugId="simple-community-invite\.copy"[\s\S]*?Copy invite link[\s\S]*?debugId="simple-community-invite\.share"[\s\S]*?Share invite/,
  "Copy invite link must remain the dominant action, with Share invite as the only secondary action."
);
assertNotContains(
  "component",
  /<(?:input|select|textarea|details)\b/,
  "The simple invite card must not expose forms or advanced disclosure controls."
);
assertContains(
  "community",
  /data-debug-id="community-home\.identity-card"[\s\S]*?<SimpleCommunityInviteCard[\s\S]*?communityId=\{selectedClanId\}[\s\S]*?id="community-home-bulletin"/,
  "Every selected Community Home must show the simple invite card directly after community identity."
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
