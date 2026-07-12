#!/usr/bin/env node

/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  outOfScopeCombinedLocalBatchPrefixes,
} from "./combined-local-batch-scope.mjs";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  manifest: "docs/GSN_COMBINED_LOCAL_BATCH_MANIFEST.md",
  package: "frontend/package.json",
  self: "frontend/tools/audit-combined-local-batch-manifest.mjs",
  scope: "frontend/tools/combined-local-batch-scope.mjs",
  stagePlan: "frontend/tools/print-combined-local-batch-stage-plan.mjs",
  verifier: "frontend/tools/verify-combined-local-batch-readiness.mjs",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(repoRoot, file), "utf8"),
  ])
);

const packageJson = JSON.parse(sourceByKey.package);
const findings = [];

function addFinding(fileKey, message, text = "Expected pattern was not found.") {
  findings.push({
    file: files[fileKey],
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 360),
  });
}

function assertContains(fileKey, pattern, message, text) {
  const source = sourceByKey[fileKey];
  if (pattern.test(source)) return;
  addFinding(fileKey, message, text || pattern.toString());
}

function assertScript(name, command) {
  if (packageJson.scripts?.[name] === command) return;
  findings.push({
    file: files.package,
    message: `Package script ${name} must stay registered.`,
    text: `Expected ${JSON.stringify(command)}, found ${JSON.stringify(
      packageJson.scripts?.[name]
    )}.`,
  });
}

function escapedPattern(text) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

assertScript(
  "audit:combined-local-batch-manifest",
  "node tools/audit-combined-local-batch-manifest.mjs"
);
assertScript(
  "verify:combined-local-batch-readiness",
  "node tools/verify-combined-local-batch-readiness.mjs"
);

for (const item of outOfScopeCombinedLocalBatchPrefixes) {
  assertContains(
    "manifest",
    escapedPattern(item),
    "Combined manifest must list every explicitly out-of-scope workspace item.",
    item
  );
}

assertContains(
  "manifest",
  /Status: Local combined publish-readiness record, not published[\s\S]*?evidence-boundary readiness work[\s\S]*?PWA shortcut icon alignment work[\s\S]*?does not\s+stage, commit, push, trigger GitHub Actions, deploy, prove Render state, prove\s+live-site availability, prove live evidence behavior, or refresh existing\s+iOS\/Android shortcut caches/,
  "Combined manifest must describe local-only combined scope and non-publishing proof limits."
);

assertContains(
  "manifest",
  /In-Scope Combined Batch Files[\s\S]*?frontend\/tools\/evidence-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/pwa-icon-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/combined-local-batch-scope\.mjs[\s\S]*?docs\/GSN_COMBINED_LOCAL_BATCH_MANIFEST\.md[\s\S]*?frontend\/tools\/audit-combined-local-batch-manifest\.mjs[\s\S]*?frontend\/package\.json/,
  "Combined manifest must list the combined scope sources, combined guard files, and package registration."
);

assertContains(
  "manifest",
  /Registered Commands[\s\S]*?print:combined-local-batch-stage-plan[\s\S]*?audit:combined-local-batch-manifest[\s\S]*?audit:combined-local-batch-stage-plan[\s\S]*?audit:combined-local-batch-status-scope[\s\S]*?audit:combined-local-batch-readiness-nonmutating[\s\S]*?verify:combined-local-batch-readiness[\s\S]*?verify:evidence-publish-readiness-local[\s\S]*?verify:pwa-icon-publish-readiness-local[\s\S]*?git diff --check/,
  "Combined manifest must list the combined and inherited local verification commands."
);

assertContains(
  "manifest",
  /What This Batch Proves Locally[\s\S]*?combined file scope[\s\S]*?dirty-tree paths[\s\S]*?Evidence readiness passes locally[\s\S]*?PWA icon readiness passes locally[\s\S]*?combined verifier remains local, read-only, and non-publishing/,
  "Combined manifest must state only local proof."
);

assertContains(
  "manifest",
  /What This Batch Does Not Prove[\s\S]*?Render deployment completion[\s\S]*?live-site availability[\s\S]*?live backend authorization[\s\S]*?production payload shape[\s\S]*?production evidence behavior[\s\S]*?production service-worker activation[\s\S]*?Android WebAPK behavior[\s\S]*?iOS or Android launcher cache refresh[\s\S]*?existing shortcut repainting/,
  "Combined manifest must block deploy, live, production, and shortcut-cache overclaims."
);

assertContains(
  "manifest",
  /Verification Run Locally[\s\S]*?audit:combined-local-batch-manifest` passed[\s\S]*?audit:combined-local-batch-stage-plan` passed[\s\S]*?audit:combined-local-batch-readiness-nonmutating`[\s\S]*?passed[\s\S]*?34 changed paths are in the combined local batch scope and 3 changed[\s\S]*?19 changed paths are in the PWA icon batch manifest and 18 changed[\s\S]*?9 changed paths are in the evidence batch manifest and 28 changed[\s\S]*?Unprivileged `npm --prefix frontend run verify:combined-local-batch-readiness`[\s\S]*?failed only on known Windows sandbox restrictions[\s\S]*?Escalated `npm --prefix frontend run verify:combined-local-batch-readiness`[\s\S]*?passed\. It ran the combined manifest audit, combined non-mutating audit,[\s\S]*?combined stage-plan audit, combined stage-plan print, combined status-scope[\s\S]*?audit, the evidence publish-readiness verifier, the PWA icon[\s\S]*?publish-readiness verifier including the frontend production build, and[\s\S]*?`git diff --check`/,
  "Combined manifest must record the latest local verification counts and full verifier chain."
);

assertContains(
  "stagePlan",
  /from "\.\/combined-local-batch-scope\.mjs"[\s\S]*?inScopeCombinedLocalBatchFiles\.map[\s\S]*?outOfScopeCombinedLocalBatchPrefixes\.map[\s\S]*?does not stage, commit, push, trigger GitHub Actions, deploy[\s\S]*?prove live evidence behavior[\s\S]*?refresh existing iOS\/Android shortcut caches/,
  "Combined stage plan must print the shared combined scope and local-only proof limits."
);

assertContains(
  "scope",
  /docs\/GSN_COMBINED_LOCAL_BATCH_MANIFEST\.md[\s\S]*?frontend\/tools\/audit-combined-local-batch-manifest\.mjs/,
  "Combined scope must include the combined manifest and its audit."
);

assertContains(
  "verifier",
  /audit-combined-local-batch-manifest\.mjs[\s\S]*?audit-combined-local-batch-readiness-nonmutating\.mjs/,
  "Combined readiness verifier must run the manifest audit before the non-mutating audit."
);

assertContains(
  "self",
  /Combined local batch manifest audit passed: combined scope, commands, verification record, and proof limits are caged\./,
  "Combined manifest audit success output must describe the verification record cage it enforces."
);

if (findings.length > 0) {
  console.error("Combined local batch manifest audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Combined local batch manifest audit passed: combined scope, commands, verification record, and proof limits are caged."
);
