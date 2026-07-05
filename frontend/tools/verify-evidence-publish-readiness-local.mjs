#!/usr/bin/env node

/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const readinessSteps = [
  {
    label: "evidence local batch manifest audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-evidence-boundary-local-batch-manifest.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "evidence display boundary suite audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-evidence-display-boundary-suite.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "evidence local batch stage plan audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-evidence-local-batch-stage-plan.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "evidence local batch status scope audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-evidence-local-batch-status-scope.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "all-local evidence boundary verifier",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "verify-evidence-boundary-local-all.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "git diff whitespace check",
    command: "git",
    args: ["diff", "--check"],
    cwd: repoRoot,
  },
];

const failures = [];

for (const step of readinessSteps) {
  console.log(`\n[evidence-publish-readiness-local] ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    cwd: step.cwd,
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
  console.error("\nEvidence publish readiness local verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  [
    "\nEvidence publish readiness local verification passed:",
    "the local batch manifest, discoverability suite, stage-plan audit, status-scope audit, all-local evidence verifier, and whitespace check passed.",
    "This does not commit, push, deploy, prove Render state, prove live API authorization, or prove production payload shape.",
  ].join(" ")
);
