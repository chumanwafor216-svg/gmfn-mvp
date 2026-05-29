/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];
const dashboardFile = "src/pages/DashboardPage.tsx";

function assertContains(pattern, message) {
  const text = read(dashboardFile);

  if (!pattern.test(text)) {
    findings.push({
      file: dashboardFile,
      line: 1,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertStableActionsHaveDebugIds() {
  const text = read(dashboardFile);
  const actionPattern =
    /<(?:PrimaryButton|SecondaryButton|SubtleButton|DangerButton|StableButton|StableCtaLink|StableDisclosureSummary)\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 1100);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file: dashboardFile,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Dashboard stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

function assertNoSignedInPublicEntryLinks() {
  const text = read(dashboardFile);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/openDashboardRoute\([^)]*["`]\/(?:cover|welcome)\b/.test(line)) {
      findings.push({
        file: dashboardFile,
        line: index + 1,
        message:
          "Dashboard signed-in actions must not route directly to public entry pages.",
        text: line.trim(),
      });
    }
  });
}

assertStableActionsHaveDebugIds();
assertNoSignedInPublicEntryLinks();

[
  "dashboard.attention-popup.dismiss",
  "dashboard.attention-popup.primary",
  "dashboard.attention-reminder.open",
  "dashboard.trust-detail.toggle",
  "dashboard.trust-action.trust-slip",
  "dashboard.apps.toggle",
  "dashboard.spotlight.open-marketplace",
  "dashboard.spotlight.open-shop",
  "dashboard.spotlight.guide.toggle",
  "dashboard.demand.toggle",
  "dashboard.demand.primary",
  "dashboard.inbox.toggle",
  "dashboard.inbox.open-alerts",
  "dashboard.market-wisdom.open-focus-commitments",
  "dashboard.focus.toggle",
  "dashboard.focus.composer.toggle",
  "dashboard.focus.composer.save",
].forEach((debugId) => {
  assertContains(
    new RegExp(`debugId="${debugId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
    `Dashboard must keep stable action debug id ${debugId}.`
  );
});

assertContains(
  /debugId=\{`dashboard\.passport-signal\.\$\{item\.label\.toLowerCase\(\)\}`\}/,
  "Dashboard passport signal buttons must keep dynamic debug IDs."
);

assertContains(
  /function readableTrustStatus\(classText: unknown\)[\s\S]*?return "Not enough info"[\s\S]*?return "Building"[\s\S]*?return "Developing"/,
  "Dashboard passport trust language must stay plain-language and non-numeric."
);

assertContains(
  /label: "CCI"[\s\S]*?value: readableTrustStatus\(cci\.classText\)[\s\S]*?detail: "Cross-Community Integrity"[\s\S]*?label: "TrustSlip"[\s\S]*?value: trustSlipCode \|\| "Pending"/,
  "Dashboard passport signals must keep the approved Trust, CCI, and TrustSlip readings."
);

assertContains(
  /label=\{"\\u2713"\}[\s\S]*?\["eye", "Visible"\][\s\S]*?\["briefcase", "Portable"\][\s\S]*?\["check", "Usable"\]/,
  "Dashboard passport must keep the approved shield badge and Visible/Portable/Usable strip."
);

assertContains(
  /debugId=\{`dashboard\.apps\.primary\.\$\{item\.label[\s\S]*?debugId=\{`dashboard\.apps\.secondary\.\$\{item\.label/,
  "Dashboard app launcher rows must keep dynamic debug IDs."
);

assertContains(
  /debugId=\{`dashboard\.focus\.check-in\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`dashboard\.focus\.replan\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`dashboard\.focus\.complete\.\$\{item\.id\}`\}/,
  "Dashboard focus commitment row actions must keep item-specific debug IDs."
);

assertContains(
  /const dashboardStableActionFrame = \([\s\S]*?height: stableHeight,[\s\S]*?minHeight: stableHeight,[\s\S]*?maxHeight: style\.maxHeight \?\? stableHeight[\s\S]*?transition: "none"[\s\S]*?const dashboardFillButton = \([\s\S]*?dashboardStableActionFrame\(\{/,
  "Dashboard route-local action helpers must turn min-height actions into fixed-height no-transition tap surfaces."
);

assertContains(
  /const dashboardAccordionButtonStyle = \([\s\S]*?const height = isPhone \? 74 : 76;[\s\S]*?return dashboardStableActionFrame\(\{[\s\S]*?height,[\s\S]*?minHeight: height,[\s\S]*?maxHeight: height[\s\S]*?transition: "none"[\s\S]*?const dashboardAccordionTitleStyle[\s\S]*?WebkitLineClamp: 1[\s\S]*?const dashboardAccordionSummaryStyle[\s\S]*?WebkitLineClamp: 1/,
  "Dashboard accordion buttons must keep fixed heights, no transition movement, and clamped title/summary text."
);

assertContains(
  /const dashboardLauncherHeight = isPhone \? 76 : 74;[\s\S]*?const dashboardLauncherButtonStyle: React\.CSSProperties = dashboardStableActionFrame\(\{[\s\S]*?height: dashboardLauncherHeight,[\s\S]*?maxHeight: dashboardLauncherHeight/,
  "Dashboard app launcher buttons must reserve fixed phone-safe heights."
);

if (findings.length > 0) {
  console.error("Dashboard action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Dashboard action audit passed.");
