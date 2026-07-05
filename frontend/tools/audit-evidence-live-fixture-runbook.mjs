#!/usr/bin/env node

/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  runbook: "docs/GSN_EVIDENCE_LIVE_FIXTURE_RUNBOOK.md",
  gapLog: "docs/GSN_EVIDENCE_LIVE_VERIFICATION_GAP_LOG.md",
  package: "frontend/package.json",
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
  "verify:evidence-boundary-local-all",
  "node tools/verify-evidence-boundary-local-all.mjs"
);
assertScript(
  "audit:evidence-live-fixture-runbook",
  "node tools/audit-evidence-live-fixture-runbook.mjs"
);
assertScript(
  "verify:evidence-live-readiness-local",
  "node tools/verify-evidence-live-readiness-local.mjs"
);

assertContains(
  "runbook",
  /Template-only live\/staging fixture runbook[\s\S]*?Do not paste real values[\s\S]*?temporary shell environment variables[\s\S]*?Clear them when\s+the run is finished/,
  "Runbook must stay template-only and instruct operators not to record real values."
);

assertContains(
  "runbook",
  /GSN_LIVE_EVIDENCE_BASE_URL[\s\S]*?GSN_LIVE_TRUSTSLIP_CODE[\s\S]*?GSN_LIVE_COMMUNITY_KEY[\s\S]*?GSN_LIVE_COMMUNITY_MEMBER_KEY[\s\S]*?GSN_LIVE_CONFIRMATION_TOKEN[\s\S]*?GSN_LIVE_AUTH_TOKEN/,
  "Runbook must list every live harness fixture variable."
);

assertContains(
  "runbook",
  /<staging-or-production-api-base-url>[\s\S]*?<public-trustslip-code>[\s\S]*?<public-community-key>[\s\S]*?<public-community-member-key>[\s\S]*?<public-confirmation-token>[\s\S]*?<short-lived-signed-in-token>/,
  "Runbook must use placeholder fixture values instead of real values."
);

assertContains(
  "runbook",
  /npm --prefix frontend run verify:evidence-boundary-local-all[\s\S]*?npm --prefix frontend run verify:evidence-live-readiness-local[\s\S]*?npm --prefix frontend run audit:evidence-live-verification-gap-log[\s\S]*?npm --prefix frontend run audit:live-evidence-boundary-refusals[\s\S]*?npm --prefix frontend run audit:live-evidence-boundaries -- --dry-run/,
  "Runbook must require no-network checks before live checks."
);

assertContains(
  "runbook",
  /verify:evidence-live-readiness-local[\s\S]*?template-only fixture runbook\s+audit[\s\S]*?live verification gap audit[\s\S]*?live harness dry-run[\s\S]*?fail-closed refusal audit[\s\S]*?verify:evidence-boundary-local-all[\s\S]*?local evidence-display\s+boundary verifier[\s\S]*?broadest local\s+preflight[\s\S]*?still not live API proof/,
  "Runbook must explain the combined live-readiness verifier and its proof limit."
);

assertContains(
  "runbook",
  /Remove-Item Env:\\GSN_LIVE_EVIDENCE_BASE_URL[\s\S]*?Remove-Item Env:\\GSN_LIVE_TRUSTSLIP_CODE[\s\S]*?Remove-Item Env:\\GSN_LIVE_COMMUNITY_KEY[\s\S]*?Remove-Item Env:\\GSN_LIVE_COMMUNITY_MEMBER_KEY[\s\S]*?Remove-Item Env:\\GSN_LIVE_CONFIRMATION_TOKEN[\s\S]*?Remove-Item Env:\\GSN_LIVE_AUTH_TOKEN/,
  "Runbook must include cleanup commands for live fixture environment variables."
);

assertContains(
  "runbook",
  /Record only non-secret evidence:[\s\S]*?command name[\s\S]*?target environment name[\s\S]*?exact commit SHA[\s\S]*?sanitized HTTP status summary[\s\S]*?Never record the bearer token/,
  "Runbook must separate non-secret evidence from forbidden sensitive values."
);

assertContains(
  "gapLog",
  /GSN_EVIDENCE_LIVE_FIXTURE_RUNBOOK\.md[\s\S]*?template-only/,
  "Gap log must point operators to the template-only fixture runbook."
);

assertContains(
  "suite",
  /audit:evidence-live-fixture-runbook[\s\S]*?audit-evidence-live-fixture-runbook\.mjs/,
  "Discoverability suite must keep the live fixture runbook audit registered."
);

assertNotContains(
  "runbook",
  /https?:\/\/[^\s>)]+/,
  "Runbook must not contain real-looking URLs."
);

assertNotContains(
  "runbook",
  /\bBearer\s+(?:eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|[A-Za-z0-9._~+/=-]{20,})\b/i,
  "Runbook must not contain bearer token values."
);

assertNotContains(
  "runbook",
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  "Runbook must not contain JWT-shaped values."
);

assertNotContains(
  "runbook",
  /\b(?:sk|rk|pk)_[A-Za-z0-9]{16,}\b/i,
  "Runbook must not contain API-key-shaped values."
);

assertNotContains(
  "runbook",
  /deploy-hook|hooks\.render\.com|RENDER_[A-Z_]*KEY/,
  "Runbook must not contain deploy hook or Render API secret values."
);

if (findings.length > 0) {
  console.error("Evidence live fixture runbook audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Evidence live fixture runbook audit passed: fixture instructions are template-only, no-secret, and discoverable."
);
