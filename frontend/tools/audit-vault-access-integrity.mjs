/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  api: "src/lib/api.ts",
  access: "src/pages/ShopAccessPage.tsx",
  control: "src/pages/VaultControlPage.tsx",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);
const findings = [];

function assertContains(fileKey, pattern, message) {
  if (pattern.test(source[fileKey])) return;
  findings.push(files[fileKey] + ": " + message);
}

function assertNotContains(fileKey, pattern, message) {
  if (!pattern.test(source[fileKey])) return;
  findings.push(files[fileKey] + ": " + message);
}

for (const status of [
  "subscription_inactive",
  "domain_vault_disabled",
  "shop_inactive",
  "not_found",
]) {
  assertContains(
    "api",
    new RegExp("[\"']" + status + "[\"']"),
    "Vault access status " + status + " must remain explicit"
  );
}
assertContains(
  "api",
  /let status: VaultShopAccessView\["status"\] = "invalid"/,
  "unknown Vault access responses must fail closed"
);
assertContains(
  "api",
  /const restrictionsSrc = src\?\.restrictions \|\| policySrc/,
  "backend restrictions must drive normalized access controls"
);
assertContains(
  "api",
  /recordVaultShopAccessOpen[\s\S]*?return normalizeVaultAccessView\(res\)/,
  "the content-opening request must return a normalized Vault view"
);
assertContains(
  "access",
  /const res = await recordVaultShopAccessOpen\(token\)/,
  "the public Vault page must consume a view before rendering content"
);
assertNotContains(
  "access",
  /getVaultShopAccessView\(token\)/,
  "the public Vault page must not fetch private content through the metadata route"
);
assertContains(
  "control",
  /const activeVaultSlotNumbers = useMemo[\s\S]*?firstTruthy\(block\?\.state\)\.toLowerCase\(\) === "active"/,
  "owner controls must derive active slots from backend block state"
);
assertNotContains(
  "control",
  /selectedSlot <= confirmedVaultSlots/,
  "owner controls must not assume active Vault slots are contiguous"
);

if (findings.length > 0) {
  console.error("Vault access integrity audit failed:\n");
  for (const finding of findings) console.error("- " + finding);
  process.exit(1);
}

console.log("Vault access integrity audit passed.");
