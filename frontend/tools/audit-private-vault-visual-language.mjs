/* global console, process */

import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  component: "src/components/PrivateVaultEverydayItems.tsx",
  vaultControl: "src/pages/VaultControlPage.tsx",
  shopGallery: "src/pages/ShopGalleryPage.tsx",
  asset: "src/assets/vault/private-vault-everyday-items.webp",
};
const source = Object.fromEntries(
  Object.entries(files)
    .filter(([key]) => key !== "asset")
    .map(([key, relativePath]) => [
      key,
      readFileSync(join(frontendRoot, relativePath), "utf8"),
    ])
);
const findings = [];

function assertContains(fileKey, pattern, message) {
  if (pattern.test(source[fileKey])) return;
  findings.push(`${files[fileKey]}: ${message}`);
}

function assertNotContains(fileKey, pattern, message) {
  if (!pattern.test(source[fileKey])) return;
  findings.push(`${files[fileKey]}: ${message}`);
}

assertContains(
  "component",
  /private-vault-everyday-items\.webp[\s\S]*?data-private-vault-item-strip="true"[\s\S]*?aspectRatio: "3 \/ 1"/,
  "the shared component must keep the bounded three-item image strip"
);
assertContains(
  "vaultControl",
  /Offer everyday items privately while you are still using them\.[\s\S]*?<PrivateVaultEverydayItems[\s\S]*?Everyday items, privately offered/,
  "Vault Control must explain ordinary in-use items and show the shared strip"
);
assertContains(
  "shopGallery",
  /<PrivateVaultEverydayItems compact=\{isCompact\} \/>[\s\S]*?Private Vault[\s\S]*?Everyday items shared privately\.[\s\S]*?Owner invitation only\.[\s\S]*?Request access[\s\S]*?Copy request/,
  "Public Shop must keep the everyday-item strip, privacy meaning, and frozen request actions"
);
assertNotContains(
  "vaultControl",
  /VaultDoorVisual|labelWithIcon\("vault", "(?:Private offers|Vault Control|Vault)"\)/,
  "Vault Control must not restore literal bank-safe imagery"
);
assertNotContains(
  "shopGallery",
  /PublicVaultEmblem|labelWithShopIcon\("vault", "Private Vault"/,
  "Public Shop must not restore the safe-door emblem"
);

const assetBytes = statSync(join(frontendRoot, files.asset)).size;
if (assetBytes > 200_000) {
  findings.push(`${files.asset}: image asset is ${assetBytes} bytes; keep it at or below 200000 bytes`);
}

if (findings.length > 0) {
  console.error("Private Vault visual-language audit failed:\n");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `Private Vault visual-language audit passed (${assetBytes} byte everyday-item strip; safe-door metaphor absent).`
);
