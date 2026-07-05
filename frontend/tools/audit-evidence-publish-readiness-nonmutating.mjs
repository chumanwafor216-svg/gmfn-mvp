#!/usr/bin/env node

/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  package: "frontend/package.json",
  verifier: "frontend/tools/verify-evidence-publish-readiness-local.mjs",
  manifest: "docs/GSN_EVIDENCE_BOUNDARY_LOCAL_BATCH_MANIFEST.md",
  suite: "frontend/tools/audit-evidence-display-boundary-suite.mjs",
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

function assertNotContains(fileKey, pattern, message) {
  const source = sourceByKey[fileKey];
  const match = source.match(pattern);
  if (!match) return;
  addFinding(fileKey, message, match[0]);
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

assertScript(
  "audit:evidence-publish-readiness-nonmutating",
  "node tools/audit-evidence-publish-readiness-nonmutating.mjs"
);
assertScript(
  "verify:evidence-publish-readiness-local",
  "node tools/verify-evidence-publish-readiness-local.mjs"
);

assertContains(
  "verifier",
  /audit-evidence-boundary-local-batch-manifest\.mjs[\s\S]*?audit-evidence-display-boundary-suite\.mjs[\s\S]*?audit-evidence-local-batch-stage-plan\.mjs[\s\S]*?audit-evidence-local-batch-status-scope\.mjs[\s\S]*?verify-evidence-boundary-local-all\.mjs[\s\S]*?command: "git"[\s\S]*?args: \["diff", "--check"\]/,
  "Publish-readiness verifier must run only the manifest audit, suite audit, stage-plan audit, status-scope audit, all-local verifier, and git diff --check."
);

assertContains(
  "verifier",
  /This does not commit, push, deploy, prove Render state, prove live API authorization, or prove production payload shape/,
  "Publish-readiness verifier must print its non-publishing proof limit."
);

assertNotContains(
  "verifier",
  /\b(?:git|gh)\s+(?:add|commit|push|checkout|reset|merge|rebase|tag|release|workflow|run)\b/,
  "Publish-readiness verifier must not embed mutating git or gh shell commands."
);

assertNotContains(
  "verifier",
  /args:\s*\[[^\]]*"(?:add|commit|push|checkout|reset|merge|rebase|tag)"[^\]]*\]/,
  "Publish-readiness verifier must not pass mutating git args."
);

assertNotContains(
  "verifier",
  /command:\s*["']gh["']|command:\s*["']curl["']|command:\s*["']npm["'][\s\S]*?(?:deploy|publish)|hooks\.render\.com|RENDER_[A-Z_]*(?:HOOK|KEY|TOKEN|SECRET)/,
  "Publish-readiness verifier must not call gh, curl, npm deploy/publish, Render hooks, or Render secret variables."
);

assertNotContains(
  "verifier",
  /writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|mkdirSync|rmdirSync|execSync/,
  "Publish-readiness verifier must not write files, delete files, or use opaque shell execution."
);

assertContains(
  "manifest",
  /verify:evidence-publish-readiness-local[\s\S]*?stage-plan audit[\s\S]*?does not stage files,\s+commit, push, trigger GitHub\s+Actions, or deploy/,
  "Manifest must keep the publish-readiness verifier described as non-publishing."
);

assertContains(
  "suite",
  /audit:evidence-publish-readiness-nonmutating[\s\S]*?audit-evidence-publish-readiness-nonmutating\.mjs/,
  "Discoverability suite must keep the non-mutating publish-readiness audit registered."
);

if (findings.length > 0) {
  console.error("Evidence publish-readiness non-mutating audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Evidence publish-readiness non-mutating audit passed: the readiness verifier remains local, read-only, and non-publishing."
);
