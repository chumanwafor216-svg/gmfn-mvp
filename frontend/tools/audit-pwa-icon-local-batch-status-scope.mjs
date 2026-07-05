#!/usr/bin/env node

/* global console, process */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inScopePwaIconBatchFiles,
  outOfScopePwaIconBatchPrefixes,
} from "./pwa-icon-local-batch-scope.mjs";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const inScopeFiles = new Set(inScopePwaIconBatchFiles);

function normalizePath(path) {
  return path.replace(/\\/g, "/").replace(/^"|"$/g, "");
}

function parseStatusLine(line) {
  const status = line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  const path = rawPath.includes(" -> ")
    ? rawPath.split(" -> ").pop()
    : rawPath;
  return { status, path: normalizePath(path) };
}

const statusResult = spawnSync(
  "git",
  ["status", "--short", "--untracked-files=normal"],
  {
    cwd: repoRoot,
    encoding: "utf8",
  }
);

if (statusResult.error) {
  console.error(
    `PWA icon local batch status-scope audit could not run git status: ${statusResult.error.message}`
  );
  process.exit(1);
}

if (statusResult.status !== 0) {
  console.error("PWA icon local batch status-scope audit failed to read git status:");
  console.error(statusResult.stderr || statusResult.stdout);
  process.exit(1);
}

const changedEntries = statusResult.stdout
  .split(/\r?\n/)
  .map((line) => line.trimEnd())
  .filter(Boolean)
  .map(parseStatusLine);

const unexpected = changedEntries.filter(({ path }) => {
  if (inScopeFiles.has(path)) return false;
  return !outOfScopePwaIconBatchPrefixes.some((prefix) => path.startsWith(prefix));
});

if (unexpected.length > 0) {
  console.error("PWA icon local batch status-scope audit failed:");
  console.error("Unexpected changed paths outside the PWA icon batch manifest:");
  unexpected.forEach(({ status, path }) => {
    console.error(`- ${status} ${path}`);
  });
  process.exit(1);
}

const inScopeCount = changedEntries.filter(({ path }) => inScopeFiles.has(path)).length;
const outOfScopeCount = changedEntries.length - inScopeCount;

console.log(
  [
    "PWA icon local batch status-scope audit passed:",
    `${inScopeCount} changed path(s) are in the PWA icon batch manifest;`,
    `${outOfScopeCount} changed path(s) are explicitly out of scope for this batch.`,
    "No staging, commit, push, or deployment action was performed.",
  ].join(" ")
);
