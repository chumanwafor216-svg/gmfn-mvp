#!/usr/bin/env node

/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const verificationSteps = [
  {
    label: "local evidence display boundary verification",
    script: "verify-evidence-display-boundary-local.mjs",
  },
  {
    label: "local evidence live-readiness verification",
    script: "verify-evidence-live-readiness-local.mjs",
  },
];

const failures = [];

for (const step of verificationSteps) {
  console.log(`\n[evidence-boundary-local-all] ${step.label}`);
  const result = spawnSync(
    process.execPath,
    [join(frontendRoot, "tools", step.script)],
    {
      cwd: frontendRoot,
      stdio: "inherit",
    }
  );

  if (result.error) {
    failures.push(`${step.label} (${result.error.message})`);
    continue;
  }

  if (result.status !== 0) {
    failures.push(`${step.label} (${step.script})`);
  }
}

if (failures.length > 0) {
  console.error("\nEvidence boundary all-local verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  [
    "\nEvidence boundary all-local verification passed:",
    "display-boundary source audits, mocked browser route-state smokes, live-readiness fixture handling, dry-run usage, and fail-closed refusal behavior are caged.",
    "This does not prove live API authorization, production payload shape, visual QA, build health, deployment state, or any real fixture.",
  ].join(" ")
);
