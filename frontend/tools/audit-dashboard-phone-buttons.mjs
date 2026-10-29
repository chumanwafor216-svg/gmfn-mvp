/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dashboardFile = "src/pages/DashboardPage.tsx";
const dashboardCompactIdentityFile =
  "src/components/dashboard/DashboardCompactIdentityHero.tsx";
const dashboardSectionFiles = [
  dashboardCompactIdentityFile,
  "src/components/dashboard/DashboardToolsSection.tsx",
  "src/components/dashboard/DashboardInboxSection.tsx",
];
const frameToolsFile = "src/components/PictureFrameToolsControl.tsx";
const dashboardSource = readFileSync(join(frontendRoot, dashboardFile), "utf8");
const dashboardActionSources = [
  { file: dashboardFile, source: dashboardSource },
  ...dashboardSectionFiles.map((file) => ({
    file,
    source: readFileSync(join(frontendRoot, file), "utf8"),
  })),
];
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

for (const { file, source } of dashboardActionSources) {
  actionPattern.lastIndex = 0;

  while ((match = actionPattern.exec(source))) {
    const tag = match[1];
    const block = match[0];
    const line = lineAt(source, match.index);
    const id = debugIdFrom(block);

    if (tag === "StableButton") {
      if (!/onPointerDown=\{(?:consumeDashboardPointerEvent|onPointerDown)\}/.test(block)) {
        findings.push({
          file,
          line,
          message:
            "Dashboard StableButton must use the route-local pointer guard before phone click handling.",
          text: id || block.replace(/\s+/g, " ").slice(0, 220),
        });
      }
    }

    if (tag === "StableDisclosureSummary") {
      if (
        !/onPointerDown=\{(?:stopDashboardPointerEvent|onDisclosurePointerDown)\}/.test(
          block
        )
      ) {
        findings.push({
          file,
          line,
          message:
            "Dashboard disclosure summaries must stop pointer bubbling without preventing their native toggle.",
          text: id || block.replace(/\s+/g, " ").slice(0, 220),
        });
      }
    }

    if (/(^|\s)disabled=/.test(block)) {
      findings.push({
        file,
        line,
        message:
          "Dashboard stable actions must avoid native disabled; use aria-disabled/soft-disabled patterns so taps cannot fall through.",
        text: id || block.replace(/\s+/g, " ").slice(0, 220),
      });
    }
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
      /<PictureFrameToolsControl[\s\S]*?open=\{passportPictureToolsOpen\}[\s\S]*?ariaLabel="Open passport picture frame tools"[\s\S]*?triggerContent=\{[\s\S]*?avatarSrc[\s\S]*?profileInitials[\s\S]*?Edit photo[\s\S]*?width: isPhone \? 108 : 116[\s\S]*?triggerHeight=\{isPhone \? 40 : 42\}/,
    message:
      "Dashboard visible passport frame must keep its compact live-thumbnail trigger, accessible name, and stable phone hitbox.",
  },
  {
    pattern:
      /debugId="dashboard\.apps\.toggle"[\s\S]*?data-dashboard-trustslip-verification-banner="true"[\s\S]*?style=\{\{[\s\S]*?\.\.\.dashboardAccordionButtonStyle\([\s\S]*?height: 92,[\s\S]*?minHeight: 92,[\s\S]*?maxHeight: 92/,
    message:
      "Dashboard TrustSlip and verification banner must remain a traceable fixed-height stable accordion action.",
  },
  {
    pattern:
      /<DashboardCompactIdentityHero[\s\S]*?order=\{dashboardIdentityOrder\}[\s\S]*?onOpenReading=\{openDashboardRoute\}[\s\S]*?onPointerDown=\{consumeDashboardPointerEvent\}[\s\S]*?onDisclosurePointerDown=\{stopDashboardPointerEvent\}[\s\S]*?gridColumn: isPhone \? "1 \/ -1" : undefined,[\s\S]*?order: isPhone \? 100 : dashboardToolsOrder,[\s\S]*?debugId="dashboard\.apps\.toggle"/,
    message:
      "Dashboard compact identity actions must keep their pointer guards while the covered Tools section stays below the phone decision summaries.",
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

if (/dashboard\.spotlight\.|<SpotlightMediaFrame|activeSpotlight|getMarketplaceBroadcasts|synthetic-spotlight|dashboard\.spotlight\.guide|Sharing matters|Rotates every/.test(dashboardSource)) {
  findings.push({
    file: dashboardFile,
    line: 1,
    message:
      "Dashboard must not keep Spotlight media, guide, fetch, synthetic attention, or phone actions after Spotlight moved to Shop Control.",
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
