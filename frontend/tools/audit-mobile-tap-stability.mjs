/* global console, process */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const sourceRoot = join(frontendRoot, "src");
const allowedExtensions = new Set([".css", ".ts", ".tsx"]);

const forbiddenPatterns = [
  {
    label: "GPU tap promotion can cause mobile button hit-box drift",
    pattern: /translateZ\(0\)/,
  },
  {
    label: "Smooth post-action scroll can move the tapped control under the finger",
    pattern: /behavior\s*:\s*["']smooth["']/,
  },
  {
    label: "Immediate propagation stop can block shared routing/copy handlers",
    pattern: /stopImmediatePropagation/,
  },
  {
    label: "Touch handlers can double-fire beside pointer/click handlers",
    pattern: /onTouch(?:Start|StartCapture|End|Move)\b/,
  },
  {
    label: "CSS active states can introduce tap-time layout movement",
    pattern: /:active\b/,
  },
  {
    label: "Transform will-change can keep tappable controls on unstable layers",
    pattern: /willChange\s*:\s*["']transform["']|will-change\s*:\s*transform/,
  },
  {
    label: "Offscreen legacy copy fields can make mobile browsers re-anchor after tap",
    pattern: /\.(?:left|top)\s*=\s*["']-9999px["']/,
  },
  {
    label: "Legacy copy focus must opt out of scroll movement on mobile",
    pattern: /(?:ta|textarea|copyTarget|copyTextarea)\.focus\(\s*\)/i,
  },
];

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return allowedExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
}

const findings = [];

for (const filePath of listSourceFiles(sourceRoot)) {
  const relativePath = relative(frontendRoot, filePath);
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(line)) {
        findings.push({
          file: relativePath,
          line: index + 1,
          label: forbidden.label,
          text: line.trim(),
        });
      }
    }
  });
}

const marketplacePagePath = join(sourceRoot, "pages", "MarketplacePage.tsx");
const marketplaceLines = readFileSync(marketplacePagePath, "utf8").split(/\r?\n/);
let insideOwnedLinksSection = false;

marketplaceLines.forEach((line, index) => {
  if (line.includes('id="marketplace-owned-links"')) {
    insideOwnedLinksSection = true;
  }

  if (insideOwnedLinksSection && line.trim().startsWith("disabled={")) {
    findings.push({
      file: relative(frontendRoot, marketplacePagePath),
      line: index + 1,
      label:
        "Marketplace Records & Links controls must capture missing-link taps instead of becoming native-disabled dead targets",
      text: line.trim(),
    });
  }

  if (insideOwnedLinksSection && line.includes('id="marketplace-members-shops"')) {
    insideOwnedLinksSection = false;
  }
});

const dashboardPagePath = join(sourceRoot, "pages", "DashboardPage.tsx");
const dashboardSource = readFileSync(dashboardPagePath, "utf8");
const dashboardFrameChecks = [
  {
    label:
      "Dashboard passport picture tools must use the shared system-level frame tools control",
    pattern:
      /<PictureFrameToolsControl[\s\S]*?open=\{passportPictureToolsOpen\}[\s\S]*?label=\{isPhone \? "Frame" : "Picture frame"\}[\s\S]*?railGap=\{6\}[\s\S]*?actions=\{\[[\s\S]*?label: "Upload"[\s\S]*?label: "Change"[\s\S]*?label: "Remove"[\s\S]*?disabled: !avatarSrc/,
  },
  {
    label:
      "Dashboard main picture tools must use the shared system-level frame tools control",
    pattern:
      /<PictureFrameToolsControl[\s\S]*?open=\{pictureToolsOpen\}[\s\S]*?label="Picture frame"[\s\S]*?railGap=\{8\}[\s\S]*?railColumns="repeat\(3, minmax\(0, 1fr\)\)"[\s\S]*?actions=\{\[[\s\S]*?label: "Upload"[\s\S]*?label: "Change"[\s\S]*?label: "Remove"[\s\S]*?disabled: !avatarSrc/,
  },
];

for (const check of dashboardFrameChecks) {
  if (!check.pattern.test(dashboardSource)) {
    findings.push({
      file: relative(frontendRoot, dashboardPagePath),
      line: 1,
      label: check.label,
      text: "Expected fixed-slot anchored picture-frame tool rail was not found.",
    });
  }
}

const pictureFrameControlPath = join(
  sourceRoot,
  "components",
  "PictureFrameToolsControl.tsx"
);
const pictureFrameControlSource = readFileSync(pictureFrameControlPath, "utf8");
const pictureFrameSystemChecks = [
  {
    label:
      "Picture frame tools must render through a portal so card overflow cannot hide them",
    pattern: /createPortal\(/,
  },
  {
    label:
      "Picture frame tools must use fixed overlay placement instead of page-local absolute rails",
    pattern: /position: "fixed"/,
  },
  {
    label:
      "Picture frame tools must capture rail taps so they cannot fall through to route controls",
    pattern:
      /onPointerDown=\{stopFrameToolEvent\}[\s\S]*?onPointerUp=\{stopFrameToolEvent\}[\s\S]*?onClick=\{stopFrameToolEvent\}/,
  },
];

for (const check of pictureFrameSystemChecks) {
  if (!check.pattern.test(pictureFrameControlSource)) {
    findings.push({
      file: relative(frontendRoot, pictureFrameControlPath),
      line: 1,
      label: check.label,
      text: "Expected shared picture-frame tool behavior was not found.",
    });
  }
}

if (/(^|\s)disabled=\{!avatarSrc\}/m.test(dashboardSource)) {
  findings.push({
    file: relative(frontendRoot, dashboardPagePath),
    line: 1,
    label:
      "Dashboard picture-frame tool buttons must avoid native disabled so mobile taps cannot fall through to route controls",
    text: "disabled={!avatarSrc}",
  });
}

if (findings.length > 0) {
  console.error("Mobile tap stability audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.label}\n  ${finding.text}`,
    );
  }
  process.exit(1);
}

console.log("Mobile tap stability audit passed.");
