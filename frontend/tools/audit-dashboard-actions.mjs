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
const dashboardText = read(dashboardFile);

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

function assertNotContains(pattern, message) {
  const text = read(dashboardFile);

  if (pattern.test(text)) {
    findings.push({
      file: dashboardFile,
      line: 1,
      message,
      text: "Forbidden pattern was found.",
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
  const text = dashboardText;
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

function assertDashboardSliceStaysInert(label, startNeedle, endNeedle) {
  const start = dashboardText.indexOf(startNeedle);
  const end = start === -1 ? -1 : dashboardText.indexOf(endNeedle, start);

  if (start === -1 || end === -1) {
    findings.push({
      file: dashboardFile,
      line: 1,
      message: `${label} could not be located for inert-surface auditing.`,
      text: "Expected Dashboard source anchors were not found.",
    });
    return;
  }

  const slice = dashboardText.slice(start, end);
  const forbidden =
    /(?:<StableButton\b|<SubtleButton\b|openDashboardRoute\(|onClick=|onPointerDown=|role="button"|data-cta-id|data-gmfn-action-root)/;

  if (forbidden.test(slice)) {
    findings.push({
      file: dashboardFile,
      line: dashboardText.slice(0, start).split(/\r?\n/).length,
      message: `${label} must remain an inert display surface, not a route/action hitbox.`,
      text: slice.replace(/\s+/g, " ").slice(0, 240),
    });
  }
}

assertStableActionsHaveDebugIds();
assertNoSignedInPublicEntryLinks();

assertNotContains(
  /dashboard\.hidden-back\.community/,
  "Dashboard must not keep hidden route buttons mounted inside picture/hero surfaces."
);

assertDashboardSliceStaysInert(
  "Dashboard passport photo surface",
  'alignSelf: "center"',
  "<PictureFrameToolsControl"
);

assertDashboardSliceStaysInert(
  "Dashboard main picture-frame display",
  "height: isPhone ? 378 : isCompact ? 380 : 398",
  "<PictureFrameToolsControl"
);

[
  "dashboard.attention-popup.dismiss",
  "dashboard.attention-popup.primary",
  "dashboard.attention-reminder.open",
  "dashboard.trust-detail.toggle",
  "dashboard.trust-action.trust-slip",
  "dashboard.apps.toggle",
  "dashboard.spotlight.restore",
  "dashboard.spotlight.restore.empty-card",
  "dashboard.spotlight.whatsapp",
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
  /const DASHBOARD_UI_STORAGE_KEY = "gmfn\.dashboard\.ui\.v8";[\s\S]*?function restoreSpotlight\(event\?: React\.SyntheticEvent<HTMLElement>\)[\s\S]*?updateUiState\(\{ spotlightMinimized: false \}\)[\s\S]*?const showSpotlight = Boolean\(activeSpotlight\) \|\| !uiState\.spotlightMinimized;[\s\S]*?debugId="dashboard\.spotlight\.restore"[\s\S]*?Show Spotlight screen[\s\S]*?debugId="dashboard\.spotlight\.restore\.empty-card"[\s\S]*?Show Spotlight screen/,
  "Dashboard Spotlight must reset old minimized UI state and provide a direct Show Spotlight screen restore action."
);

assertContains(
  /source_shop_whatsapp_number[\s\S]*?function openSpotlightWhatsApp\(event\?: React\.SyntheticEvent<HTMLElement>\)[\s\S]*?buildWhatsAppChatUrl[\s\S]*?debugId="dashboard\.spotlight\.whatsapp"/,
  "Dashboard live Spotlight must expose the media-attached WhatsApp action tied to the current source shop."
);

assertNotContains(
  /debugId="dashboard\.spotlight\.open-shop"|debugId="dashboard\.spotlight\.open-marketplace"/,
  "Dashboard live Spotlight must not render the redundant Open Shop / Marketplace button row under the media screen."
);

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
  /<PictureFrameToolsControl[\s\S]*?open=\{passportPictureToolsOpen\}[\s\S]*?label="Frame tools"[\s\S]*?triggerHeight=\{isPhone \? 40 : 42\}[\s\S]*?label: "Upload"[\s\S]*?inputId: avatarInputId[\s\S]*?label: "Change"[\s\S]*?inputId: avatarInputId[\s\S]*?label: "Remove"[\s\S]*?disabled: !avatarSrc[\s\S]*?\["eye", "Visible"\][\s\S]*?\["briefcase", "Portable"\][\s\S]*?\["check", "Usable"\]/,
  "Dashboard passport must keep one Frame tools button hiding active file-backed Upload, Change, and Remove actions plus the Visible/Portable/Usable strip."
);

assertContains(
  /data-dashboard-passport-reference="gsn-trust-card"[\s\S]*?Your trust[\s\S]*?first currency[\s\S]*?<GsnLegacyIcon name="proof"[\s\S]*?Frame tools[\s\S]*?Verifiable identity[\s\S]*?Works anywhere[\s\S]*?Trusted where it matters[\s\S]*?<GSNBrandMark width=\{isPhone \? 70 : 90\}[\s\S]*?GSN Global ID[\s\S]*?Issued by GSN[\s\S]*?Status:/,
  "Dashboard passport must keep the supplied GSN trust-card reference treatment: framed headline, light proof icons, watermark, and truthful issued/status metadata."
);

assertContains(
  /GSN Global ID[\s\S]*?Your permanent network identity[\s\S]*?globalIdParts[\s\S]*?\{visibleGsnId\}/,
  "Dashboard passport Global ID block must keep the simplified centered identity card."
);

assertNotContains(
  /dashboard\.passport-global-id\.copy|Tap to copy|copyGlobalId|globalIdCopyStatus/,
  "Dashboard passport Global ID card must not expose the removed copy affordance."
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
