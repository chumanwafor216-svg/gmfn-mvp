/* global console, process */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const sourceRoot = join(frontendRoot, "src");
const allowedExtensions = new Set([".ts", ".tsx"]);
const rawActionAllowed = new Set([
  "src/components/OriginLink.tsx",
  "src/components/StableButton.tsx",
]);
const publicFallbackAllowed = new Set([
  "src/App.tsx",
  "src/pages/CreateEntryPage.tsx",
  "src/pages/InstitutionPreviewPage.tsx",
  "src/pages/InviteComposerPreviewPage.tsx",
  "src/pages/InviteLandingPage.tsx",
  "src/pages/JoinByInvitePage.tsx",
  "src/pages/JoinEntryPage.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/MemberActivationPage.tsx",
  "src/pages/RegisterPage.tsx",
  "src/pages/ShopAccessPage.tsx",
  "src/pages/TrustSlipVerifyPage.tsx",
  "src/pages/WelcomePage.tsx",
]);

const findings = [];

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return allowedExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
}

function addFinding(file, line, message, text) {
  findings.push({ file, line, message, text: text.trim() });
}

for (const filePath of listSourceFiles(sourceRoot)) {
  const relativePath = relative(frontendRoot, filePath).replaceAll("\\", "/");
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    if (
      !rawActionAllowed.has(relativePath) &&
      /^\s*<\s*(button|a|summary)\b/.test(line)
    ) {
      addFinding(
        relativePath,
        index + 1,
        "Raw action surface found outside the shared stable action primitives.",
        line
      );
    }

    if (
      !publicFallbackAllowed.has(relativePath) &&
      /(navigate|nav)\(\s*["']\/(?:cover|welcome)\b|to=["']\/(?:cover|welcome)\b|href=["']\/(?:cover|welcome)\b/.test(
        line
      )
    ) {
      addFinding(
        relativePath,
        index + 1,
        "Direct Cover/Welcome navigation found outside the app shell. Route recovery must decide public fallback centrally.",
        line
      );
    }

    if (
      /window\.location\.(?:href|assign|replace)\s*[=(]\s*["']\/(?:app|cover|welcome)\b/.test(line) &&
      !/isExternalTarget|openExternalLink|migrateSuspendedPublicHost/.test(line)
    ) {
      addFinding(
        relativePath,
        index + 1,
        "Direct window.location navigation can bypass app route recovery.",
        line
      );
    }
  });
}

if (findings.length > 0) {
  console.error("Action surface contract audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Action surface contract audit passed.");
