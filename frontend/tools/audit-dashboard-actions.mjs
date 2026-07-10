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
const attentionEngineFile = "src/lib/dashboardAttentionEngine.ts";
const dashboardText = read(dashboardFile);
const attentionEngineText = read(attentionEngineFile);

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

function assertEngineContains(pattern, message) {
  if (pattern.test(attentionEngineText)) return;
  findings.push({
    file: attentionEngineFile,
    line: 1,
    message,
    text: "Expected Dashboard attention engine pattern was not found.",
  });
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
  "dashboard.attention-popup.secondary",
  "dashboard.attention-popup.trust-journey",
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
  /buildDashboardAttentionSignal\(\{[\s\S]*?notificationsTo: DASHBOARD_TARGETS\.WHAT_MATTERS_NOW/,
  "Dashboard attention signal must keep the notifications route wired to What Matters Now."
);

assertContains(
  /debugId="dashboard\.attention-reminder\.open"[\s\S]*?onClick=\{\(event\) =>[\s\S]*?runDashboardUiMutation\(event, \(\) => setAttentionPopupVisible\(true\), 260\)[\s\S]*?onPointerUp=\{\(event\) =>[\s\S]*?runDashboardUiMutation\(event, \(\) => setAttentionPopupVisible\(true\), 260\)[\s\S]*?position: "fixed"[\s\S]*?top: isPhone \? "auto" : isCompact \? 12 : 18[\s\S]*?bottom: isPhone \? 86 : undefined[\s\S]*?zIndex: isPhone \? 2300 : 1190[\s\S]*?display: "inline-flex"/,
  "Dashboard attention reminder must stay visible above the phone bottom nav and open from both click and pointer-up instead of being mounted as a hidden or inert Companion-covered button."
);

assertContains(
  /attentionPopupVisible \? \([\s\S]*?position: "fixed"[\s\S]*?zIndex: isPhone \? 2300 : 1200/,
  "Dashboard opened attention popup must sit above Companion on phone so its notifications CTA remains tappable."
);

assertContains(
  /if \(!dashboardIdentityReady\) return;[\s\S]*?if \(!attentionSignal\.active \|\| !attentionSignal\.shouldShow\) return;[\s\S]*?if \(attentionQuietActive\) return;[\s\S]*?if \(!attentionAutoOpenAllowed\) \{\s*return;\s*\}/,
  "Dashboard disabled auto-open mode must not force-close an attention popup that the user opened manually."
);

assertContains(
  /debugId="dashboard\.attention-popup\.secondary"[\s\S]*?openAttentionTarget\([\s\S]*?event,[\s\S]*?attentionDisplaySignal\.secondaryCtaTo \|\| ""[\s\S]*?\)[\s\S]*?\{attentionDisplaySignal\.secondaryCtaLabel\}/,
  "Dashboard attention popup secondary CTA must keep routing through openAttentionTarget with the engine-provided notifications target."
);

assertEngineContains(
  /const notificationsSecondary =[\s\S]*?input\.nextRouteKey !== "notifications" && input\.totalNotifications > 0[\s\S]*?secondaryCtaLabel: "Open notifications"[\s\S]*?secondaryCtaTo: input\.notificationsTo/,
  "Dashboard attention engine must keep a secondary Open notifications CTA when the primary next step is not notifications."
);

assertEngineContains(
  /if \(sourceKind === "notifications"\) \{[\s\S]*?ctaTo: input\.nextRouteTo[\s\S]*?secondaryCtaLabel: "Open notifications"[\s\S]*?secondaryCtaTo: input\.notificationsTo/,
  "Dashboard attention engine must keep notifications-source alerts tied back to the notifications page."
);

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
  /function getCciState\(me: any, trustSlip\?: any, trust\?: any\)[\s\S]*?trustSlip\?\.cci_score[\s\S]*?trust\?\.cci\?\.score[\s\S]*?trustSlip\?\.cci_band[\s\S]*?trust\?\.cci\?\.band/,
  "Dashboard CCI must read the same /me, TrustSlip, and trust-explanation evidence ladder as Marketplace."
);

assertContains(
  /const routeSelectedClanId = useMemo\(\(\) => \{[\s\S]*?new URLSearchParams\(location\.search\)[\s\S]*?query\.get\("community"\)[\s\S]*?query\.get\("clan_id"\)[\s\S]*?query\.get\("community_id"\)[\s\S]*?const selectedClanId = routeSelectedClanId \|\| Number\(getSelectedClanId\(\) \|\| 0\)/,
  "Dashboard must honor route community/clan ids before falling back to stored selected community."
);

assertContains(
  /useEffect\(\(\) => \{[\s\S]*?if \(routeSelectedClanId > 0\) \{[\s\S]*?setSelectedClanId\(routeSelectedClanId\)/,
  "Dashboard must persist route-selected community ids for follow-on trust and CCI reads."
);

assertContains(
  /function cciDisplayText\(cci: ReadingState\)[\s\S]*?return `\$\{classText\} \/ \$\{scoreText\}`[\s\S]*?return scoreText/,
  "Dashboard CCI display must write the real numeric reading when one exists."
);

assertNotContains(
  /classText: "Pending"/,
  "Dashboard CCI/Open Trust fallbacks must not make uncalculated evidence look like a pending identity state."
);

assertContains(
  /classText: "Not shown yet"[\s\S]*?No cross-community consistency reading yet[\s\S]*?classText: "Not shown yet"[\s\S]*?Select your community to view local trust[\s\S]*?classText: "Not shown yet"[\s\S]*?No local community reading yet/,
  "Dashboard CCI/Open Trust missing-reading states must use honest not-shown-yet language."
);

assertContains(
  /label: "CCI"[\s\S]*?value: cciDisplayText\(cci\)[\s\S]*?detail: "Cross-Community Integrity"[\s\S]*?label: "TrustSlip"[\s\S]*?value: trustSlipCode \|\| "Not issued yet"/,
  "Dashboard passport signals must keep the approved Trust, CCI, and TrustSlip readings."
);

assertContains(
  /order: 30,[\s\S]*?display: "grid"[\s\S]*?label: "Trust"[\s\S]*?label: "CCI"[\s\S]*?label: "TrustSlip"/,
  "Dashboard passport Trust / CCI / TrustSlip strip must remain visibly restored inside the passport pack."
);

assertContains(
  /<PictureFrameToolsControl[\s\S]*?open=\{passportPictureToolsOpen\}[\s\S]*?label="Frame tools"[\s\S]*?triggerHeight=\{isPhone \? 40 : 42\}[\s\S]*?label: "Upload"[\s\S]*?inputId: avatarInputId[\s\S]*?label: "Change"[\s\S]*?inputId: avatarInputId[\s\S]*?label: "Remove"[\s\S]*?disabled: !avatarSrc[\s\S]*?label: "Visible"[\s\S]*?to: DASHBOARD_TARGETS\.TRUST[\s\S]*?label: "Portable"[\s\S]*?to: DASHBOARD_TARGETS\.TRUST[\s\S]*?label: "Usable"[\s\S]*?to: DASHBOARD_TARGETS\.TRUST[\s\S]*?debugId=\{`dashboard\.passport-feature\.\$\{item\.label\.toLowerCase\(\)\}`\}[\s\S]*?onClick=\{\(event\) => openDashboardRoute\(event, item\.to\)\}/,
  "Dashboard passport must keep one Frame tools button hiding active file-backed Upload, Change, and Remove actions plus clickable Visible/Portable/Usable Trust Passport surfaces."
);

assertContains(
  /DASHBOARD_AVATAR_LOCAL_FALLBACK_STORAGE_KEY[\s\S]*?dashboardAvatarLocalFallbackStorageKeysForUser[\s\S]*?dashboardAvatarLocalFallbackStorageKeys[\s\S]*?storedLocalFallbackAvatar[\s\S]*?usableBackendAvatar \|\| storedAvatar \|\| storedLocalFallbackAvatar[\s\S]*?readStoredImageExcept\(\s*\[\.\.\.dashboardAvatarStorageKeys,\s*\.\.\.dashboardAvatarLocalFallbackStorageKeys\][\s\S]*?writeStoredImage\(dashboardAvatarLocalFallbackStorageKeys,\s*localPreview\)/,
  "Dashboard profile picture must keep a local fallback copy so a Render upload URL failure does not blank the same-phone dashboard."
);

assertContains(
  /label: "TrustSlip"[\s\S]*?to: trustSlipCode[\s\S]*?DASHBOARD_TARGETS\.TRUST_SLIP_VERIFY[\s\S]*?encodeURIComponent\(trustSlipCode\)[\s\S]*?: DASHBOARD_TARGETS\.TRUST_SLIP_VERIFY/,
  "Dashboard passport TrustSlip surface must route to the TrustSlip Verify decoder, prefilled when a code exists."
);

assertContains(
  /data-dashboard-passport-reference="gsn-trust-card"[\s\S]*?Your trust[\s\S]*?first currency[\s\S]*?Frame tools[\s\S]*?aria-label="GSN Global Support Network connector"[\s\S]*?Global Support Network[\s\S]*?Verifiable identity you can see[\s\S]*?Your identity, anytime, anywhere[\s\S]*?Accepted with evidence where it matters[\s\S]*?<GSNBrandMark width=\{isPhone \? 70 : 90\}[\s\S]*?GSN Global ID[\s\S]*?Issued by GSN[\s\S]*?Status:/,
  "Dashboard passport must keep the supplied GSN trust-card reference treatment: framed headline, floating Frame tools, central GSN connector, light evidence icons, watermark, and truthful issued/status metadata."
);

assertContains(
  /passportGlobalIdDisplay[\s\S]*?GSN Global ID[\s\S]*?Your GSN identity record across the network[\s\S]*?globalIdParts[\s\S]*?\{passportGlobalIdDisplay\}/,
  "Dashboard passport Global ID block must keep the simplified identity-record card with the formal passport-style ID display."
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
