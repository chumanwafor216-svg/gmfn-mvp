/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dashboardFile = "src/pages/DashboardPage.tsx";
const frameToolsFile = "src/components/PictureFrameToolsControl.tsx";
const dashboardSource = readFileSync(join(frontendRoot, dashboardFile), "utf8");
const frameToolsSource = readFileSync(join(frontendRoot, frameToolsFile), "utf8");
const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function debugIdFrom(block) {
  return (
    block.match(/debugId="([^"]+)"/)?.[1] ||
    block.match(/debugId=\{`([^`]+)`\}/)?.[1] ||
    block.match(/debugId=\{([^}]+)\}/)?.[1] ||
    ""
  ).replace(/\s+/g, " ");
}

const actionPattern =
  /<(StableButton|StableDisclosureSummary)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(dashboardSource))) {
  const block = match[0];
  const tag = match[1];
  const id = debugIdFrom(block);
  actions.push({
    tag,
    id,
    line: lineAt(dashboardSource, match.index),
    block,
  });
}

const counts = {
  StableButton: actions.filter((action) => action.tag === "StableButton").length,
  StableDisclosureSummary: actions.filter(
    (action) => action.tag === "StableDisclosureSummary"
  ).length,
  PictureFrameToolsControl:
    dashboardSource.match(/<PictureFrameToolsControl\b/g)?.length || 0,
};
const frameToolRailActions = 3;
counts.EffectiveDashboardActionRoots =
  counts.StableButton +
  counts.StableDisclosureSummary +
  counts.PictureFrameToolsControl * (1 + frameToolRailActions);

const expected = {
  StableButton: 54,
  StableDisclosureSummary: 1,
  PictureFrameToolsControl: 2,
  EffectiveDashboardActionRoots: 63,
};

for (const [key, value] of Object.entries(expected)) {
  if (counts[key] === value) continue;
  findings.push({
    file: dashboardFile,
    line: 1,
    message: `Dashboard ${key} inventory changed from ${value} to ${counts[key]}. Update this page-level inventory intentionally after auditing the new/removed controls.`,
    text: JSON.stringify(counts),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: dashboardFile,
      line: action.line,
      message: "Every Dashboard stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^dashboard\./.test(action.id)) {
    findings.push({
      file: dashboardFile,
      line: action.line,
      message: "Dashboard stable actions must stay in the dashboard debug namespace.",
      text: action.id || action.open.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/style=/.test(action.block)) {
    findings.push({
      file: dashboardFile,
      line: action.line,
      message: "Every Dashboard stable action must declare route-local styling for phone geometry.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const frontToInnerOrder = [
  { label: "attention popup", pattern: /^dashboard\.attention-popup\./ },
  { label: "attention reminder", pattern: /^dashboard\.attention-reminder\./ },
  { label: "passport signal row", pattern: /^dashboard\.passport-signal\./ },
  { label: "trust detail", pattern: /^dashboard\.trust-detail\./ },
  { label: "trust actions", pattern: /^dashboard\.trust-action\./ },
  { label: "apps hub", pattern: /^dashboard\.apps\./ },
  { label: "spotlight", pattern: /^dashboard\.spotlight\./ },
  { label: "demand box", pattern: /^dashboard\.demand\./ },
  { label: "inbox", pattern: /^dashboard\.inbox\./ },
  { label: "market wisdom", pattern: /^dashboard\.market-wisdom\./ },
  { label: "most-used apps", pattern: /^dashboard\.most-used-app\./ },
  { label: "focus", pattern: /^dashboard\.focus\./ },
];
let previousSection = null;

for (const section of frontToInnerOrder) {
  const firstAction = actions.find((action) => section.pattern.test(action.id));
  if (!firstAction) {
    findings.push({
      file: dashboardFile,
      line: 1,
      message:
        "Dashboard front-to-inner action inventory is missing an expected section.",
      text: section.label,
    });
    continue;
  }

  if (previousSection && firstAction.line <= previousSection.line) {
    findings.push({
      file: dashboardFile,
      line: firstAction.line,
      message:
        "Dashboard front-to-inner action order changed. Re-audit phone button flow before accepting this reorder.",
      text: `${previousSection.label} at line ${previousSection.line}; ${section.label} at line ${firstAction.line}`,
    });
  }

  previousSection = { label: section.label, line: firstAction.line };
}

const rawActionPattern =
  /<(button|a|summary)\b|role="button"|data-gmfn-action-root|data-cta-id/g;
while ((match = rawActionPattern.exec(dashboardSource))) {
  findings.push({
    file: dashboardFile,
    line: lineAt(dashboardSource, match.index),
    message:
      "Dashboard page must not bypass shared stable primitives with raw action roots.",
    text: dashboardSource.slice(match.index, match.index + 160).replace(/\s+/g, " "),
  });
}

if (
  !/<PictureFrameToolsControl[\s\S]*?label="Frame tools"[\s\S]*?label: "Upload"[\s\S]*?label: "Change"[\s\S]*?label: "Remove"[\s\S]*?<PictureFrameToolsControl[\s\S]*?label="Picture frame"[\s\S]*?label: "Upload"[\s\S]*?label: "Change"[\s\S]*?label: "Remove"/.test(
    dashboardSource
  )
) {
  findings.push({
    file: dashboardFile,
    line: 1,
    message:
      "Dashboard must keep both front passport and inner picture-frame controls with Upload, Change, and Remove.",
    text: "Expected both PictureFrameToolsControl action sets.",
  });
}

if (!/debugId="picture-frame-tools\.toggle"/.test(frameToolsSource)) {
  findings.push({
    file: frameToolsFile,
    line: 1,
    message: "Shared picture-frame tools must expose a stable toggle debug ID.",
    text: "Expected picture-frame-tools.toggle.",
  });
}

if (
  !/data-cta-id=\{`picture-frame-tools\.action\.\$\{action\.label\.toLowerCase\(\)\}`\}/.test(
    frameToolsSource
  )
) {
  findings.push({
    file: frameToolsFile,
    line: 1,
    message: "Shared picture-frame file labels must expose stable rail action IDs.",
    text: "Expected lower-case picture-frame-tools action data-cta-id.",
  });
}

if (!/debugId=\{`picture-frame-tools\.action\.\$\{action\.label\}`\}/.test(frameToolsSource)) {
  findings.push({
    file: frameToolsFile,
    line: 1,
    message: "Shared picture-frame buttons must expose stable rail action debug IDs.",
    text: "Expected picture-frame-tools.action.${action.label}.",
  });
}

if (findings.length > 0) {
  console.error("Dashboard button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Dashboard button inventory audit passed: ${counts.StableButton} StableButton, ${counts.StableDisclosureSummary} StableDisclosureSummary, ${counts.PictureFrameToolsControl} PictureFrameToolsControl, ${counts.EffectiveDashboardActionRoots} effective action roots.`
);
