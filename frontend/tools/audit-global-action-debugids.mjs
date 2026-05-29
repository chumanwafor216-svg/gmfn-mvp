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

const explicitDebugIdFiles = new Set(["src/pages/RouteSmokeCheckPage.tsx"]);

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
    const hasDebugId = explicitDebugIdFiles.has(file) ? /debugId=/.test(openingTag) : true;

    if (!hasDebugId) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        text: openingTag.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

function assertStablePrimitiveGuaranteesActionIds() {
  const file = "src/components/StableButton.tsx";
  const text = readFileSync(join(frontendRoot, file), "utf8");
  const requiredPatterns = [
    {
      pattern: /import React, \{ useId, useRef, useState \} from "react";/,
      message: "Stable action primitives must use React useId for fallback action IDs.",
    },
    {
      pattern: /function actionDebugId\([\s\S]*?explicitDebugId[\s\S]*?dataCtaId[\s\S]*?generatedId[\s\S]*?gmfn-auto-\$\{prefix\}/,
      message:
        "Stable action primitives must derive a fallback debug/action ID when callers omit one.",
    },
    {
      pattern: /export function StableButton[\s\S]*?const generatedId = useId\(\);[\s\S]*?const resolvedDebugId = actionDebugId\([\s\S]*?data-cta-id=\{resolvedDebugId\}/,
      message: "StableButton must always render a resolved data-cta-id.",
    },
    {
      pattern: /export function StableCtaLink[\s\S]*?const generatedId = useId\(\);[\s\S]*?const resolvedDebugId = actionDebugId\([\s\S]*?data-cta-id=\{resolvedDebugId\}/,
      message: "StableCtaLink must always render a resolved data-cta-id.",
    },
    {
      pattern: /export function StableDisclosureSummary[\s\S]*?const generatedId = useId\(\);[\s\S]*?const resolvedDebugId = actionDebugId\([\s\S]*?data-cta-id=\{resolvedDebugId\}/,
      message: "StableDisclosureSummary must always render a resolved data-cta-id.",
    },
  ];

  for (const check of requiredPatterns) {
    if (check.pattern.test(text)) continue;
    findings.push({
      file,
      line: 1,
      text: check.message,
    });
  }
}

assertStablePrimitiveGuaranteesActionIds();
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
