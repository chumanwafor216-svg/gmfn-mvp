/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  page: "src/pages/MarketplacePage.tsx",
  section: "src/pages/marketplace/MarketplaceMembersSection.tsx",
  roster: "src/pages/marketplace/MarketplaceCommunityMembers.tsx",
  policy: "src/pages/CommunityConfirmationPolicyPage.tsx",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(frontendRoot, file), "utf8")])
);
const failures = [];

function requirePattern(key, pattern, message) {
  if (!pattern.test(source[key])) failures.push(`${files[key]}: ${message}`);
}

function forbidPattern(key, pattern, message) {
  if (pattern.test(source[key])) failures.push(`${files[key]}: ${message}`);
}

requirePattern(
  "section",
  /<MarketplaceCommunityMembers[\s\S]*?memberRows=\{memberRows\}[\s\S]*?<div[\s\S]*?Find a shop or service/,
  "The compact member roster must remain above the existing shop directory without replacing it."
);
requirePattern(
  "roster",
  /Search name or GSN ID[\s\S]*?Confirm I know this member[\s\S]*?Ask this member to confirm me/,
  "The roster must keep search, bounded paging, and the two real confirmation handoffs."
);
requirePattern(
  "roster",
  /upper\.startsWith\("GSN-"\)[\s\S]*?upper\.startsWith\("GMFN-"\)/,
  "Existing GSN and GMFN member IDs must remain readable without a duplicate brand prefix."
);
requirePattern(
  "roster",
  /profileImageUrl[\s\S]*?initials\(row\.name\)/,
  "Member rows must use a real portrait or initials."
);
requirePattern(
  "roster",
  /Community admin[\s\S]*?Shop active[\s\S]*?Community member/,
  "Member rows must use truthful membership and shop labels."
);
requirePattern(
  "roster",
  /canManageCommunityConfirmation \?[\s\S]*?Request preferences and settings/,
  "Confirmation settings must stay manager-gated."
);
requirePattern(
  "roster",
  /member_witness_subject[\s\S]*?member_witness_action[\s\S]*?#member-witness/,
  "Confirmation links must carry the selected member and explicit action into the canonical policy route."
);
requirePattern(
  "policy",
  /member_witness_subject[\s\S]*?memberWitnessAction[\s\S]*?memberWitnessRouteTargeted[\s\S]*?memberWitnessAction !== "record"/,
  "The policy page must preselect and focus Marketplace member handoffs without changing record into request mode."
);
requirePattern(
  "page",
  /membershipRole: firstTruthy\([\s\S]*?profileImageUrl: firstTruthy\([\s\S]*?member\?\.profile_image_url/,
  "Marketplace must pass safe profile-image and role fields into the member roster."
);
requirePattern(
  "roster",
  /boxShadow:[\s\S]*?rgba\(35,218,255[\s\S]*?rgba\(199,54,255/,
  "The approved member roster must retain restrained static cyan-violet neon framing."
);
forbidPattern(
  "roster",
  /Receiving|Paused|receiving_requests|member_opted_out/,
  "Marketplace must not invent or expose manager-protected confirmation availability."
);
forbidPattern(
  "roster",
  /animation:|@keyframes|setInterval/,
  "Member roster neon must remain static and non-flashing."
);

if (failures.length) {
  console.error("Marketplace community member-row audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Marketplace community member-row audit passed.");