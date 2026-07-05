/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const evidenceBoundarySmokes = [
  {
    label: "public TrustSlip Verify states",
    script: "smoke-public-trustslip-verify-states.mjs",
  },
  {
    label: "TrustSlip Verify private evidence boundary",
    script: "smoke-trustslip-verify-private-evidence-boundary.mjs",
  },
  {
    label: "community confirmation outcome boundary",
    script: "smoke-community-confirmation-outcome-boundary.mjs",
  },
  {
    label: "community verification boundary",
    script: "smoke-community-verification-boundary.mjs",
  },
  {
    label: "Trust Passport and holder TrustSlip boundary",
    script: "smoke-trust-passport-trustslip-boundary.mjs",
  },
  {
    label: "Trust Timeline and evidence pack boundary",
    script: "smoke-trust-timeline-evidence-boundary.mjs",
  },
];

const failures = [];

for (const smoke of evidenceBoundarySmokes) {
  console.log(`\n[evidence-display-boundary-smoke-batch] ${smoke.label}`);
  const result = spawnSync(
    process.execPath,
    [join(frontendRoot, "tools", smoke.script)],
    {
      cwd: frontendRoot,
      stdio: "inherit",
    }
  );

  if (result.status !== 0) {
    failures.push(`${smoke.label} (${smoke.script})`);
  }
}

if (failures.length > 0) {
  console.error("\nEvidence display boundary smoke batch failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "\nEvidence display boundary smoke batch passed: mocked browser route-state checks are runnable as one local batch."
);
