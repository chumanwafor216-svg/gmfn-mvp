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
let match;

while ((match = actionPattern.exec(dashboardSource))) {
  const tag = match[1];
  const block = match[0];
  const line = lineAt(dashboardSource, match.index);
  const id = debugIdFrom(block);

  if (tag === "StableButton") {
    if (!/onPointerDown=\{consumeDashboardPointerEvent\}/.test(block)) {
      findings.push({
        file: dashboardFile,
        line,
        message:
          "Dashboard StableButton must use the route-local pointer guard before phone click handling.",
        text: id || block.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }

  if (tag === "StableDisclosureSummary") {
    if (!/onPointerDown=\{stopDashboardPointerEvent\}/.test(block)) {
      findings.push({
        file: dashboardFile,
        line,
        message:
          "Dashboard disclosure summaries must stop pointer bubbling without preventing their native toggle.",
        text: id || block.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }

  if (/(^|\s)disabled=/.test(block)) {
    findings.push({
      file: dashboardFile,
      line,
      message:
        "Dashboard stable actions must avoid native disabled; use aria-disabled/soft-disabled patterns so taps cannot fall through.",
      text: id || block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const requiredDashboardPatterns = [
  {
    pattern:
      /function consumeDashboardPointerEvent\([\s\S]*?\{\s*stopDashboardPointerEvent\(event\);\s*\}/,
    message:
      "Dashboard must keep a route-local pointer guard that stops bubbling without cancelling the browser pointer/click path.",
  },
  {
    pattern:
      /const dashboardStableActionFrame = \([\s\S]*?height: stableHeight,[\s\S]*?minHeight: stableHeight,[\s\S]*?maxHeight: style\.maxHeight \?\? stableHeight[\s\S]*?transition: "none"/,
    message:
      "Dashboard must keep fixed-height no-transition action frames for phone hitbox stability.",
  },
  {
    pattern:
      /const dashboardFillButton = \([\s\S]*?width: "100%"[\s\S]*?minWidth: 0[\s\S]*?maxWidth: "100%"/,
    message:
      "Dashboard fill buttons must keep width/min/max constraints for steady phone geometry.",
  },
  {
    pattern:
      /onClick=\{\(event\) =>[\s\S]*?openDashboardRoute\(event,[\s\S]*?onPointerDown=\{consumeDashboardPointerEvent\}/,
    message:
      "Dashboard route buttons must pair route navigation with pointer guards.",
  },
  {
    pattern:
      /<PictureFrameToolsControl[\s\S]*?open=\{passportPictureToolsOpen\}[\s\S]*?setPictureToolsOpen\(false\);[\s\S]*?setPassportPictureToolsOpen\(\(open\) => !open\);[\s\S]*?<PictureFrameToolsControl[\s\S]*?open=\{pictureToolsOpen\}[\s\S]*?setPassportPictureToolsOpen\(false\);[\s\S]*?setPictureToolsOpen\(\(open\) => !open\);/,
    message:
      "Dashboard passport and main picture-frame tools must mutually close the other rail before opening.",
  },
  {
    pattern:
      /debugId="dashboard\.apps\.toggle"[\s\S]*?style=\{dashboardAccordionButtonStyle\(/,
    message:
      "Dashboard app launcher toggle must remain a traceable stable accordion action.",
  },
  {
    pattern:
      /order: 20,[\s\S]*?marginTop: isPhone \? [0-9]+ : undefined,[\s\S]*?debugId="dashboard\.apps\.toggle"/,
    message:
      "Dashboard app launcher section must stay below the initial phone rail instead of landing half-covered by bottom navigation.",
  },
  {
    pattern:
      /<SpotlightMediaFrame[\s\S]*?frameStyle=\{\{[\s\S]*?zIndex: 2[\s\S]*?showVideoControls=\{false\}[\s\S]*?autoPlayVideo=\{Boolean\(spotlightVideoCandidate\)\}[\s\S]*?mutedVideo=\{Boolean\(spotlightVideoCandidate\)\}[\s\S]*?loopVideo=\{Boolean\(spotlightVideoCandidate\)\}[\s\S]*?showAudioUnlock=\{Boolean\(spotlightVideoCandidate\)\}[\s\S]*?audioUnlockLabel="Sound on"[\s\S]*?audioUnlockOffLabel="Muted"[\s\S]*?audioUnlockStyle=\{\{[\s\S]*?right: isPhone \? 12 : 18[\s\S]*?width: isPhone \? 44 : 52[\s\S]*?height: isPhone \? 44 : 52[\s\S]*?maxHeight: isPhone \? 44 : 52[\s\S]*?maxVideoSeconds=\{SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS\}/,
    message:
      "Dashboard Spotlight primary media preview must expose an in-frame Sound on/Muted control for video without moving outside the screen.",
  },
];

for (const check of requiredDashboardPatterns) {
  if (check.pattern.test(dashboardSource)) continue;
  findings.push({
    file: dashboardFile,
    line: 1,
    message: check.message,
    text: "Expected Dashboard phone button stability pattern was not found.",
  });
}

if (/dashboard\.spotlight\.guide|Sharing matters|Rotates every/.test(dashboardSource)) {
  findings.push({
    file: dashboardFile,
    line: 1,
    message:
      "Dashboard Spotlight must not restore the old guide row, rotation copy, or extra phone actions under the live billboard.",
    text: "Forbidden Dashboard Spotlight guide pattern was found.",
  });
}

const requiredFramePatterns = [
  {
    pattern:
      /const triggerAnchorRef = useRef<HTMLDivElement \| null>\(null\);[\s\S]*?stableRailPlacement\([\s\S]*?triggerAnchorRef\.current \|\| slotRef\.current[\s\S]*?window\.visualViewport\?\.addEventListener\("resize", updatePlacement\)/,
    message:
      "Picture frame tools must anchor rails to a trigger-sized element and track phone visual viewport movement.",
  },
  {
    pattern:
      /<div[\s\S]*?ref=\{slotRef\}[\s\S]*?onPointerDown=\{stopFrameToolEvent\}[\s\S]*?<div[\s\S]*?ref=\{triggerAnchorRef\}[\s\S]*?<SubtleButton[\s\S]*?debugId="picture-frame-tools\.toggle"/,
    message:
      "Picture frame tool wrappers must remain inert while the real trigger carries the action root.",
  },
];

for (const check of requiredFramePatterns) {
  if (check.pattern.test(frameToolsSource)) continue;
  findings.push({
    file: frameToolsFile,
    line: 1,
    message: check.message,
    text: "Expected shared picture-frame phone stability pattern was not found.",
  });
}

if (findings.length > 0) {
  console.error("Dashboard phone button audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Dashboard phone button audit passed.");
