/* global console, process */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(frontendRoot, "src");

const allowedRawButtonFiles = new Set(["src/components/StableButton.tsx"]);
const allowedRawAnchorFiles = new Set(["src/components/OriginLink.tsx"]);

const findings = [];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (/\.(tsx|ts)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function repoPath(fullPath) {
  return relative(frontendRoot, fullPath).replace(/\\/g, "/");
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function assertNoUnexpectedRawActionElements(fullPath) {
  const file = repoPath(fullPath);
  const text = readFileSync(fullPath, "utf8");
  const checks = [
    {
      pattern: /<\/?button\b/g,
      allowed: allowedRawButtonFiles,
      message:
        "Raw button found outside StableButton wrapper. Use StableButton, PrimaryButton, SecondaryButton, SubtleButton, or DangerButton.",
    },
    {
      pattern: /<a\b/g,
      allowed: allowedRawAnchorFiles,
      message:
        "Raw anchor found outside OriginLink wrapper. Use OriginLink or StableCtaLink.",
    },
  ];

  for (const check of checks) {
    if (check.allowed.has(file)) continue;

    let match;
    while ((match = check.pattern.exec(text))) {
      const preview = text
        .slice(match.index, match.index + 180)
        .replace(/\s+/g, " ")
        .trim();
      findings.push({
        file,
        line: lineNumber(text, match.index),
        message: check.message,
        text: preview,
      });
    }
  }
}

walk(srcRoot).forEach(assertNoUnexpectedRawActionElements);

if (findings.length > 0) {
  console.error("Global raw action element audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Global raw action element audit passed.");
