/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = "src/pages/PaymentInstructionsPage.tsx";
const source = readFileSync(join(frontendRoot, file), "utf8");
const findings = [];

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  findings.push({
    file,
    message,
    text: "Expected Money In identity fallback pattern was not found.",
  });
}

assertContains(
  /function normalizeMoneyInMemberGmfnId\(value: unknown\): string \{[\s\S]*?replace\(\s*\/\^GSN-\/,\s*"GMFN-"[\s\S]*?\^GMFN-\[A-Z\]-\[A-Z0-9-\]\+\$[\s\S]*?raw\.startsWith\("GMFN-C-"\) \? "" : raw;/,
  "Money In must normalize GSN/GMFN member IDs while rejecting Community IDs."
);

assertContains(
  /function resolveMoneyInMemberGmfnId\(me: any, currentClan: any\): string \{[\s\S]*?me\?\.gmfn_id[\s\S]*?currentClan\?\.current_member_gmfn_id[\s\S]*?currentClan\?\.member_gmfn_id[\s\S]*?currentClan\?\.membership\?\.gmfn_id[\s\S]*?\(api as any\)\.getStoredGmfnId\?\.\(\)/,
  "Money In must use signed-in and selected-community member GSN ID fallbacks."
);

assertContains(
  /const currentGmfnId = useMemo\(\(\) => \{[\s\S]*?return resolveMoneyInMemberGmfnId\(me, currentClan\);[\s\S]*?\}, \[me, currentClan\]\);/,
  "Money In visible identity must update when the selected community row supplies the member GSN ID."
);

assertContains(
  /const gmfnId = resolveMoneyInMemberGmfnId\(meRes, clanRes\);[\s\S]*?setStoredGmfnId\(gmfnId\);[\s\S]*?if \(!selectedClanId \|\| !gmfnId\)/,
  "Money In load should reuse a resolved member GSN ID before blocking."
);

if (findings.length > 0) {
  console.error("Money In identity fallback audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Money In identity fallback audit passed: Money In reuses selected-community member GSN IDs and rejects Community IDs."
);
