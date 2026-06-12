/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/pages/SubscriptionSpotlightPage.tsx",
  "src/pages/VaultControlPage.tsx",
];
const findings = [];

function assertContains(source, file, pattern, message) {
  if (pattern.test(source)) return;
  findings.push({
    file,
    message,
    text: "Expected payment instruction phone-row pattern was not found.",
  });
}

for (const file of files) {
  const source = readFileSync(join(frontendRoot, file), "utf8");

  assertContains(
    source,
    file,
    /function paymentInstructionRowStyle\(isCompact: boolean\)[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?\? "minmax\(0, 1fr\)"[\s\S]*?: "minmax\((?:112|120)px, 0\.42fr\) minmax\(0, 0\.58fr\)"/,
    "Payment instruction rows must stack label and value into one readable phone column."
  );

  assertContains(
    source,
    file,
    /function paymentInstructionValueStyle\(isCompact: boolean\)[\s\S]*?overflowWrap: "normal"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"/,
    "Payment instruction values must keep whole words instead of forcing narrow anywhere breaks."
  );

  assertContains(
    source,
    file,
    /style=\{paymentInstructionRowStyle\(isCompact\)\}[\s\S]*?style=\{paymentInstructionValueStyle\(isCompact\)\}/,
    "Payment instruction renderer must use the audited phone-safe row and value styles."
  );
}

if (findings.length > 0) {
  console.error("Payment instruction phone row audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Payment instruction phone row audit passed: Subscription Spotlight and Vault Control use readable one-column phone transfer rows."
);
