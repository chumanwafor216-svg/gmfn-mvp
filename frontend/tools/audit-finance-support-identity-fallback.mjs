/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/pages/WithdrawalInstructionsPage.tsx",
  "src/pages/LoanReadinessPage.tsx",
  "src/pages/LoanSuggestionsPage.tsx",
];
const findings = [];

function assertContains(source, file, pattern, message) {
  if (pattern.test(source)) return;
  findings.push({
    file,
    message,
    text: "Expected finance/support member identity fallback pattern was not found.",
  });
}

for (const file of files) {
  const source = readFileSync(join(frontendRoot, file), "utf8");

  assertContains(
    source,
    file,
    /function normalizeMemberGmfnId\(value: any\): string \{[\s\S]*?replace\(\s*\/\^GSN-\/,\s*"GMFN-"[\s\S]*?\^GMFN-\[A-Z\]-\[A-Z0-9-\]\+\$[\s\S]*?raw\.startsWith\("GMFN-C-"\) \? "" : raw;/,
    "Finance/support pages must normalize GSN/GMFN member IDs while rejecting Community IDs."
  );

  assertContains(
    source,
    file,
    /function resolveMemberGmfnId\(me: any, currentClan: any\): string \{[\s\S]*?me\?\.gmfn_id[\s\S]*?currentClan\?\.current_member_gmfn_id[\s\S]*?currentClan\?\.member_gmfn_id[\s\S]*?currentClan\?\.membership\?\.gmfn_id[\s\S]*?\(api as any\)\.getStoredGmfnId\?\.\(\)/,
    "Finance/support pages must reuse signed-in and selected-community member GSN ID fallbacks."
  );

  assertContains(
    source,
    file,
    /const currentGmfnId = useMemo\(\(\) => \{[\s\S]*?return resolveMemberGmfnId\(me, currentClan\);[\s\S]*?\}, \[me, currentClan\]\);/,
    "Finance/support visible identity and readiness must update from selected-community member GSN ID fallbacks."
  );

  assertContains(
    source,
    file,
    /setStoredGmfnId\(resolvedGmfnId\);/,
    "Finance/support pages should refresh the signed-in GSN ID cache when a safe fallback is found."
  );
}

{
  const source = readFileSync(
    join(frontendRoot, "src/pages/WithdrawalInstructionsPage.tsx"),
    "utf8"
  );

  assertContains(
    source,
    "src/pages/WithdrawalInstructionsPage.tsx",
    /function communityPublicId\(currentClan: any\): string \{[\s\S]*?\|\| "No community ID yet"/,
    "Money Out must show honest missing-community-ID copy instead of stale issue-tracking language."
  );

  assertContains(
    source,
    "src/pages/WithdrawalInstructionsPage.tsx",
    /`GSN ID: \$\{currentGmfnId \|\| "Not issued yet"\}`/,
    "Money Out copied withdrawal summaries must use honest missing-GSN-ID copy."
  );
}

{
  const source = readFileSync(
    join(frontendRoot, "src/pages/LoanReadinessPage.tsx"),
    "utf8"
  );

  assertContains(
    source,
    "src/pages/LoanReadinessPage.tsx",
    /return firstTruthy\(currentGmfnId, "Not issued yet"\);/,
    "Loan Readiness must show honest missing-GSN-ID copy while keeping actual currentGmfnId for readiness checks."
  );
}

if (findings.length > 0) {
  console.error("Finance/support identity fallback audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Finance/support identity fallback audit passed: Money Out and support pages reuse selected-community member GSN IDs and reject Community IDs."
);
