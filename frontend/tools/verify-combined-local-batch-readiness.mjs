#!/usr/bin/env node

/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const readinessSteps = [
  {
    label: "combined local batch manifest audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-combined-local-batch-manifest.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "combined local batch readiness non-mutating audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-combined-local-batch-readiness-nonmutating.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "combined local batch stage plan audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-combined-local-batch-stage-plan.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "combined local batch stage plan",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "print-combined-local-batch-stage-plan.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "combined local batch status scope audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-combined-local-batch-status-scope.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "evidence publish readiness local verifier",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "verify-evidence-publish-readiness-local.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "PWA icon publish readiness local verifier",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "verify-pwa-icon-publish-readiness-local.mjs")],
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
  console.log(`\n[combined-local-batch-readiness] ${step.label}`);
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
  console.error("\nCombined local batch readiness verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  [
    "\nCombined local batch readiness verification passed:",
    "the combined manifest audit, non-mutating audit, combined stage-plan audit, combined stage-plan print, combined status-scope audit, evidence verifier, PWA icon verifier, and whitespace check passed.",
    "This does not stage, commit, push, trigger GitHub Actions, deploy, prove Render state, prove live evidence behavior, prove live-site availability, or refresh existing phone shortcut caches.",
  ].join(" ")
);
