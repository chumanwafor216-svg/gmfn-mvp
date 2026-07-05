#!/usr/bin/env node

/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const readinessSteps = [
  {
    label: "PWA icon protocol audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-icon-protocol.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "PWA icon publish-readiness non-mutating audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-pwa-icon-publish-readiness-nonmutating.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "PWA icon local batch stage plan audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-pwa-icon-local-batch-stage-plan.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "PWA icon local batch stage plan",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "print-pwa-icon-local-batch-stage-plan.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "PWA icon local batch status scope audit",
    command: process.execPath,
    args: [join(frontendRoot, "tools", "audit-pwa-icon-local-batch-status-scope.mjs")],
    cwd: frontendRoot,
  },
  {
    label: "frontend production build",
    command: npmCommand,
    args: ["run", "build"],
    cwd: frontendRoot,
    shell: process.platform === "win32",
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
  console.log(`\n[pwa-icon-publish-readiness-local] ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    cwd: step.cwd,
    stdio: "inherit",
    shell: step.shell || false,
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
  console.error("\nPWA icon publish readiness local verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  [
    "\nPWA icon publish readiness local verification passed:",
    "the icon protocol audit, non-mutating audit, stage-plan audit, stage-plan print, status-scope audit, frontend build, and whitespace check passed.",
    "This does not stage, commit, push, trigger GitHub Actions, deploy, prove Render state, prove live-site availability, or refresh existing phone shortcut caches.",
  ].join(" ")
);
