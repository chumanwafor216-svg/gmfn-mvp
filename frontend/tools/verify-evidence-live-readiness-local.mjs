#!/usr/bin/env node

/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const readinessSteps = [
  {
    label: "template-only fixture runbook audit",
    args: ["tools/audit-evidence-live-fixture-runbook.mjs"],
  },
  {
    label: "live verification truth-boundary gap audit",
    args: ["tools/audit-evidence-live-verification-gap-log.mjs"],
  },
  {
    label: "live harness dry-run usage",
    args: ["tools/audit-live-evidence-boundaries.mjs", "--dry-run"],
  },
  {
    label: "live harness fail-closed refusal audit",
    args: ["tools/audit-live-evidence-boundary-refusals.mjs"],
  },
];

const failures = [];

for (const step of readinessSteps) {
  console.log(`\n[evidence-live-readiness-local] ${step.label}`);
  const result = spawnSync(process.execPath, step.args, {
    cwd: frontendRoot,
    stdio: "inherit",
  });

  if (result.error) {
    failures.push(`${step.label} (${result.error.message})`);
    continue;
  }

  if (result.status !== 0) {
    failures.push(`${step.label} (exit ${result.status})`);
  }
}

if (failures.length > 0) {
  console.error("\nEvidence live readiness local verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  [
    "\nEvidence live readiness local verification passed:",
    "fixture-handling, no-secret documentation, dry-run usage, and fail-closed refusal behavior are caged.",
    "This does not prove live API authorization, production payload shape, visual QA, build health, deployment state, or any real fixture.",
  ].join(" ")
);
