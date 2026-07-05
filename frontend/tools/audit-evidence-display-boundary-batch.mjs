/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const evidenceBoundaryAudits = [
  {
    label: "evidence display boundary suite registration",
    script: "audit-evidence-display-boundary-suite.mjs",
  },
  {
    label: "public TrustSlip Verify boundary",
    script: "audit-public-trustslip-verify-boundary.mjs",
  },
  {
    label: "community confirmation outcome boundary",
    script: "audit-community-confirmation-outcome-boundary.mjs",
  },
  {
    label: "community verification boundary",
    script: "audit-community-verification-boundary.mjs",
  },
  {
    label: "Trust Passport and holder TrustSlip boundary",
    script: "audit-trust-passport-trustslip-boundary.mjs",
  },
  {
    label: "Trust Timeline and evidence pack boundary",
    script: "audit-trust-timeline-evidence-boundary.mjs",
  },
  {
    label: "finance and loan evidence boundary",
    script: "audit-finance-loan-evidence-boundary.mjs",
  },
  {
    label: "marketplace and public shop evidence boundary",
    script: "audit-marketplace-shop-evidence-boundary.mjs",
  },
  {
    label: "Community Domain evidence readiness boundary",
    script: "audit-community-domain-evidence-readiness-boundary.mjs",
  },
  {
    label: "evidence field mapping decision log",
    script: "audit-evidence-field-mapping-decision-log.mjs",
  },
];

const failures = [];

for (const audit of evidenceBoundaryAudits) {
  console.log(`\n[evidence-display-boundary-batch] ${audit.label}`);
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
  console.error("\nEvidence display boundary batch audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "\nEvidence display boundary batch audit passed: static route-family evidence boundary audits are runnable as one local batch."
);
