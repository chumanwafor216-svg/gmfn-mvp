#!/usr/bin/env node

/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const harnessPath = join(frontendRoot, "tools", "audit-live-evidence-boundaries.mjs");

const liveEnvKeys = [
  "GSN_LIVE_EVIDENCE_BASE_URL",
  "GSN_LIVE_TRUSTSLIP_CODE",
  "GSN_LIVE_COMMUNITY_KEY",
  "GSN_LIVE_COMMUNITY_MEMBER_KEY",
  "GSN_LIVE_CONFIRMATION_TOKEN",
  "GSN_LIVE_AUTH_TOKEN",
];

function cleanEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  liveEnvKeys.forEach((key) => {
    if (!(key in extra)) delete env[key];
  });
  return env;
}

function runHarness(args, env = {}) {
  return spawnSync(process.execPath, [harnessPath, ...args], {
    cwd: frontendRoot,
    encoding: "utf8",
    env: cleanEnv(env),
  });
}

function assertIncludes(source, text, label) {
  if (source.includes(text)) return;
  throw new Error(`${label} did not include expected text: ${text}`);
}

function assertStatus(result, expected, label) {
  if (result.error) {
    throw new Error(
      `${label} could not start the live harness: ${result.error.message}`
    );
  }

  if (result.status === expected) return;
  throw new Error(
    `${label} exited with ${result.status}; expected ${expected}.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

function assertRefusalCase({ label, args, env, expectedStatus, expectedOutput }) {
  const result = runHarness(args, env);
  assertStatus(result, expectedStatus, label);
  assertIncludes(`${result.stdout}\n${result.stderr}`, expectedOutput, label);
  console.log(`[live-evidence-boundary-refusals] ${label} passed.`);
}

const cases = [
  {
    label: "dry-run prints usage and exits without live requests",
    args: ["--dry-run"],
    expectedStatus: 0,
    expectedOutput: "Live evidence boundary harness is opt-in.",
  },
  {
    label: "missing base URL refuses live requests",
    args: [],
    expectedStatus: 1,
    expectedOutput:
      "Missing required GSN_LIVE_EVIDENCE_BASE_URL. Refusing to make live requests.",
  },
  {
    label: "base URL without fixtures refuses proof claim",
    args: [],
    env: {
      GSN_LIVE_EVIDENCE_BASE_URL: "http://127.0.0.1:9",
    },
    expectedStatus: 1,
    expectedOutput:
      "No live evidence fixture was supplied. Refusing to claim live evidence proof.",
  },
];

try {
  cases.forEach(assertRefusalCase);
} catch (error) {
  console.error("Live evidence boundary refusal audit failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

console.log(
  "Live evidence boundary refusal audit passed: the live harness dry-runs safely and fails closed when base URL or fixtures are missing."
);
