/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const protectedAudits = [
  {
    label: "shared mobile tap guard",
    script: "audit-mobile-tap-stability.mjs",
  },
  {
    label: "global action debug ids",
    script: "audit-global-action-debugids.mjs",
  },
  {
    label: "global raw action elements",
    script: "audit-global-raw-action-elements.mjs",
  },
  {
    label: "dashboard action contracts",
    script: "audit-dashboard-actions.mjs",
  },
  {
    label: "dashboard button inventory",
    script: "audit-dashboard-button-inventory.mjs",
  },
  {
    label: "dashboard phone buttons",
    script: "audit-dashboard-phone-buttons.mjs",
  },
  {
    label: "community home button inventory",
    script: "audit-community-home-button-inventory.mjs",
  },
  {
    label: "community home phone buttons",
    script: "audit-community-home-phone-buttons.mjs",
  },
  {
    label: "community join requests layout",
    script: "audit-community-join-requests-layout.mjs",
  },
  {
    label: "action inbox button inventory",
    script: "audit-notifications-button-inventory.mjs",
  },
  {
    label: "entry/auth contracts",
    script: "audit-entry-auth-contracts.mjs",
  },
  {
    label: "member and entry actions",
    script: "audit-member-entry-actions.mjs",
  },
  {
    label: "entry flow polish",
    script: "audit-entry-flow-polish.mjs",
  },
  {
    label: "entry copy and response",
    script: "audit-entry-copy-response.mjs",
  },
  {
    label: "share tag actions",
    script: "audit-share-tag-actions.mjs",
  },
  {
    label: "route fallthrough recovery",
    script: "audit-route-fallthrough.mjs",
  },
];

const failures = [];

for (const audit of protectedAudits) {
  console.log(`\n[protected-button-freeze] ${audit.label}`);
  const result = spawnSync(
    process.execPath,
    [join(frontendRoot, "tools", audit.script)],
    {
      cwd: frontendRoot,
      stdio: "inherit",
    }
  );

  if (result.status !== 0) {
    failures.push(`${audit.label} (${audit.script})`);
  }
}

if (failures.length > 0) {
  console.error("\nProtected button freeze audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "\nProtected button freeze audit passed: Dashboard, Community Home, Action Inbox, entry/auth, shared tap guard, and global stable-action hygiene are still caged."
);
