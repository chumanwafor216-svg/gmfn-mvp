/* global console, process */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(frontendRoot, "src");

const wrapperFiles = new Set([
  "src/components/StableButton.tsx",
  "src/components/uiKit.tsx",
]);

const strictOpeningTagFiles = new Set([
  "src/pages/RouteSmokeCheckPage.tsx",
]);

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

function assertStableActionsHaveDebugIds(fullPath) {
  const file = repoPath(fullPath);
  if (wrapperFiles.has(file)) return;

  const text = readFileSync(fullPath, "utf8");
  const actionPattern =
    /<(?:PrimaryButton|SecondaryButton|SubtleButton|DangerButton|StableButton|StableCtaLink|StableDisclosureSummary)\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const tagEnd = text.indexOf(">", match.index);
    const openingTag = text.slice(
      match.index,
      tagEnd === -1 ? match.index + 1100 : tagEnd + 1
    );
    const legacyWindow = text.slice(match.index, match.index + 1100);
    const hasDebugId = strictOpeningTagFiles.has(file)
      ? /debugId=/.test(openingTag)
      : /debugId=/.test(legacyWindow);

    if (!hasDebugId) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        text: (strictOpeningTagFiles.has(file) ? openingTag : legacyWindow)
          .replace(/\s+/g, " ")
          .slice(0, 220),
      });
    }
  }
}

walk(srcRoot).forEach(assertStableActionsHaveDebugIds);

if (findings.length > 0) {
  console.error("Global action debug ID audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} Stable action is missing debugId.\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Global action debug ID audit passed.");
