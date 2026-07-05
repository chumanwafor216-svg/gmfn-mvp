/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const verificationSteps = [
  {
    label: "static source evidence boundary batch",
    script: "audit-evidence-display-boundary-batch.mjs",
  },
  {
    label: "mocked browser evidence boundary smoke batch",
    script: "smoke-evidence-display-boundary-batch.mjs",
  },
];

const failures = [];

for (const step of verificationSteps) {
  console.log(`\n[evidence-display-boundary-local] ${step.label}`);
  const result = spawnSync(
    process.execPath,
    [join(frontendRoot, "tools", step.script)],
    {
      cwd: frontendRoot,
      stdio: "inherit",
    }
  );

  if (result.status !== 0) {
    failures.push(`${step.label} (${step.script})`);
  }
}

if (failures.length > 0) {
  console.error("\nEvidence display boundary local verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  [
    "\nEvidence display boundary local verification passed:",
    "static source audits and mocked browser route-state smokes both passed.",
    "This does not prove live backend authorization, production payload shape, full visual QA, or deployment state.",
  ].join(" ")
);
