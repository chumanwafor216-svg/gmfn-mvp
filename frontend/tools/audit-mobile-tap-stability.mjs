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
    pattern: /willChange\s*:\s*["'][^"']*transform[^"']*["']|will-change\s*:\s*[^;]*transform/,
  },
  {
    label: "Layout paint containment can cause mobile button hit-box drift",
    pattern: /contain\s*:\s*["']layout paint["']/,
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
      const allowedStableNoopActive =
        forbidden.pattern.source === ":active\\b" &&
        line.includes(".gmfn-stable-action");

      if (allowedStableNoopActive) continue;

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
const marketplaceSource = marketplaceLines.join("\n");
const marketplaceWorkspacePath = join(
  sourceRoot,
  "pages",
  "MarketplaceWorkspacePage.tsx"
);
const marketplaceWorkspaceLines = readFileSync(
  marketplaceWorkspacePath,
  "utf8"
).split(/\r?\n/);
const marketplaceWorkspaceSource = marketplaceWorkspaceLines.join("\n");
const communityMarketplaceSpotlightPath = join(
  sourceRoot,
  "components",
  "CommunityMarketplaceSpotlight.tsx"
);
const communityMarketplaceSpotlightSource = readFileSync(
  communityMarketplaceSpotlightPath,
  "utf8"
);
const indexCssPath = join(sourceRoot, "index.css");
const indexCssSource = readFileSync(indexCssPath, "utf8");
const stableButtonPath = join(sourceRoot, "components", "StableButton.tsx");
const stableButtonSource = readFileSync(stableButtonPath, "utf8");
const originLinkPath = join(sourceRoot, "components", "OriginLink.tsx");
const originLinkSource = readFileSync(originLinkPath, "utf8");
const mobileTapGuardPath = join(sourceRoot, "lib", "mobileTapGuard.ts");
const mobileTapGuardSource = readFileSync(mobileTapGuardPath, "utf8");
const appLayoutPath = join(sourceRoot, "layout", "AppLayout.tsx");
const appLayoutSource = readFileSync(appLayoutPath, "utf8");
const companionLayerPath = join(sourceRoot, "components", "CompanionLayer.tsx");
const companionLayerSource = readFileSync(companionLayerPath, "utf8");
const mainPath = join(sourceRoot, "main.tsx");
const mainSource = readFileSync(mainPath, "utf8");
const brandPath = join(sourceRoot, "styles", "gmfnBrand.ts");
const brandSource = readFileSync(brandPath, "utf8");
let insideOwnedLinksSection = false;
let marketplaceButtonCount = 0;

marketplaceLines.forEach((line, index) => {
  if (line.includes('id="marketplace-owned-links"')) {
    insideOwnedLinksSection = true;
  }

  if (
    line.trim().startsWith("disabled=") &&
    !marketplaceSource.includes('import { StableButton, StableCtaLink } from "../components/StableButton";')
  ) {
    findings.push({
      file: relative(frontendRoot, marketplacePagePath),
      line: index + 1,
      label:
        "Marketplace controls must capture inactive taps with aria-disabled instead of native-disabled dead targets",
      text: line.trim(),
    });
  }

  if (insideOwnedLinksSection && line.includes('id="marketplace-members-shops"')) {
    insideOwnedLinksSection = false;
  }
});

marketplaceWorkspaceLines.forEach((line, index) => {
  if (line.trim().startsWith("disabled=")) {
    findings.push({
      file: relative(frontendRoot, marketplaceWorkspacePath),
      line: index + 1,
      label:
        "Community Access Desk controls must use guarded aria-disabled states instead of native-disabled dead targets",
      text: line.trim(),
    });
  }
});

marketplaceLines.forEach((line, index) => {
  if (!line.includes("<StableButton")) return;
  marketplaceButtonCount += 1;
  if (!marketplaceSource.includes('import { StableButton, StableCtaLink } from "../components/StableButton";')) {
    findings.push({
      file: relative(frontendRoot, marketplacePagePath),
      line: index + 1,
      label:
        "Every Marketplace button must use the shared stable primitive so taps cannot bubble to a neighboring route",
      text: line.trim(),
    });
  }
});

if (marketplaceButtonCount < 40) {
  findings.push({
    file: relative(frontendRoot, marketplacePagePath),
    line: 1,
    label:
      "Marketplace button audit expected to inspect the full button surface",
    text: `Only found ${marketplaceButtonCount} Marketplace buttons.`,
  });
}

const globalButtonStackingRule =
  /:where\(button,\s*\[role="button"\],\s*\.gmfn-btn\)\s*\{[^}]*?(?:position:\s*relative|z-index:\s*1|isolation:\s*isolate)[^}]*?\}/;

if (globalButtonStackingRule.test(indexCssSource)) {
  findings.push({
    file: relative(frontendRoot, indexCssPath),
    line: 1,
    label:
      "Global button reset must not create stacking layers that can move mobile hit testing",
    text:
      "Remove global position/z-index/isolation from the button reset; layer only named overlays deliberately.",
  });
}

if (
  !/:where\([\s\S]*?\[data-gmfn-action-root="true"\][\s\S]*?\)\s*:where\(span,\s*div,\s*strong,\s*small,\s*b,\s*i,\s*svg,\s*p\)\s*\{[^}]*pointer-events:\s*none;/.test(
    indexCssSource
  )
) {
  findings.push({
    file: relative(frontendRoot, indexCssPath),
    line: 1,
    label:
      "Stable CTA children must not steal the mobile tap target from the parent button/link",
    text:
      "Expected data-cta-id child pointer-events guard was not found in the global CSS.",
  });
}

if (
  !/export function installMobileTapGuard\(\): void[\s\S]*?document\.addEventListener\("pointerdown", handlePointerDown, true\);[\s\S]*?document\.addEventListener\("pointerup", handlePointerUp, true\);[\s\S]*?document\.addEventListener\("click", handleClick, true\);/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must capture pointer-down and click so late phone clicks cannot land on a different action",
    text: "Expected installMobileTapGuard capture listeners were not found.",
  });
}

if (
  !/function isDisabledAction\(root: Element \| null\): boolean[\s\S]*?aria-disabled[\s\S]*?function handlePointerUp\(event: PointerEvent\): void[\s\S]*?pointerup-geometry-shift[\s\S]*?suppressNextClick: true[\s\S]*?function handleClick\(event: MouseEvent\): void[\s\S]*?isDisabledAction\(endRoot\)[\s\S]*?insideSettleWindow[\s\S]*?click-settle-shell-suppressed[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?click-settle-observed[\s\S]*?activeTap\.suppressNextClick[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?commitOriginalAction\(intendedRoot, reason/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must trace unstable tap geometry and replay the originally touched action when a phone click lands on the wrong root",
    text:
      "Expected pointer-up suppression marking, disabled-action suppression, settle-window shell suppression, settle-window observation, and original-action replay were not found.",
  });
}

if (
  !/function isAppShellAction\(root: Element \| null\): boolean \{[\s\S]*?ctaId\.startsWith\("app-layout\."\)[\s\S]*?isAppShellAction\(endRoot\)[\s\S]*?!isAppShellAction\(lastAcceptedActionRoot\)[\s\S]*?!sameActionRoot\(lastAcceptedActionRoot, endRoot\)[\s\S]*?click-settle-shell-suppressed/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must suppress phantom app-shell navigation immediately after a page action is accepted",
    text:
      "Expected app-layout settle-window suppression was not found.",
  });
}

if (
  !/function isCompanionToastAction\(root: Element \| null\): boolean \{[\s\S]*?ctaId\.startsWith\("companion-toast\."\)[\s\S]*?if \(isCompanionToastAction\(endRoot\)\) \{[\s\S]*?lastFieldPointerContext = null;[\s\S]*?lastFocusedFieldContext = null;[\s\S]*?clearActiveTap\(\);[\s\S]*?companion-toast-click-accepted/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Companion toast actions must bypass mobile tap-guard suppression so Dismiss and Open stay reachable on phone",
    text:
      "Expected companion-toast action whitelist was not found in the mobile tap guard.",
  });
}

if (
  !/dismissedToastIdsRef = useRef<Set<string>>\(new Set\(\)\)[\s\S]*?const dismissToast = useCallback[\s\S]*?markCompanionUserInteraction\(\);[\s\S]*?dismissedToastIdsRef\.current\.add\(toast\.id\);[\s\S]*?if \(dismissedToastIdsRef\.current\.has\(payload\.id\)\) \{[\s\S]*?return;[\s\S]*?zIndex: 2200[\s\S]*?onClick=\{\(\) => dismissToast\(toast\)\}[\s\S]*?debugId=\{`companion-toast\.\$\{toast\.id\}\.dismiss-icon`\}[\s\S]*?onClick=\{\(\) => dismissToast\(toast\)\}[\s\S]*?debugId=\{`companion-toast\.\$\{toast\.id\}\.dismiss`\}/.test(
    companionLayerSource
  )
) {
  findings.push({
    file: relative(frontendRoot, companionLayerPath),
    line: 1,
    label:
      "Companion toast dismiss controls must remain above mobile overlays and suppress the dismissed toast id for the current session",
    text:
      "Expected Companion dismiss session memory, high overlay z-index, and shared dismiss handler were not found.",
  });
}

if (
  !/let lastAcceptedActionRoot: Element \| null = null;[\s\S]*?function isFileInputAction\(root: Element \| null\): root is HTMLInputElement[\s\S]*?function isAssociatedFileInputClick\([\s\S]*?data-gmfn-file-input-id[\s\S]*?HTMLLabelElement[\s\S]*?click-file-input-associated-accepted/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must allow an associated file-input click after a frame/upload action",
    text: "Expected associated file-input click allowance was not found.",
  });
}

if (
  !/function sameActionRoot\(startedAt: Element, endedAt: Element \| null\): boolean \{[\s\S]*?startedAt === endedAt[\s\S]*?startedId[\s\S]*?endedId[\s\S]*?startedId === endedId[\s\S]*?function handlePointerDown\(event: PointerEvent\): void \{[\s\S]*?const coveredDashboardRoot = coveredDashboardActionFromBottomNav\(event, initialRoot\);[\s\S]*?const coveredCommunityHomeRoot = coveredCommunityHomeActionFromAppShell\([\s\S]*?const root = coveredDashboardRoot \|\| coveredCommunityHomeRoot \|\| initialRoot;/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Mobile tap guard must require a strict action-root match while tracking ordinary action starts without pointer capture",
    text:
      "Expected strict action-root matching and ordinary pointer-down tracking were not found.",
  });
}

if (
  !/const EDITABLE_FIELD_SELECTOR = \[[\s\S]*?data-gmfn-field-root="true"[\s\S]*?textarea[\s\S]*?select/.test(
    mobileTapGuardSource
  ) ||
  !/const FIELD_CONTEXT_STALE_MS = 3600;[\s\S]*?const FIELD_CANCEL_SUPPRESS_MS = 2600;[\s\S]*?const FIELD_TAP_MOVE_TOLERANCE_PX = 72;/.test(
    mobileTapGuardSource
  ) ||
  !/function actionRootFromTarget\(target: EventTarget \| null\): Element \| null \{[\s\S]*?editableFieldFromTarget\(target\)[\s\S]*?return null[\s\S]*?return target\.closest\(ACTION_ROOT_SELECTOR\);/.test(
    mobileTapGuardSource
  ) ||
  !/function actionRootFromEvent\(event: Event\): Element \| null \{[\s\S]*?const root = actionRootFromTarget\(item\);/.test(
    mobileTapGuardSource
  ) ||
  !/function editableFieldFromTarget\(target: EventTarget \| null\): Element \| null[\s\S]*?function sameFieldRoot\(startedAt: Element, endedAt: Element \| null\): boolean/.test(
    mobileTapGuardSource
  ) ||
  !/type FocusedFieldContext = \{[\s\S]*?let lastFieldPointerContext: FieldPointerContext \| null = null;[\s\S]*?let lastFocusedFieldContext: FocusedFieldContext \| null = null;[\s\S]*?function rememberFocusedField\(root: Element \| null\): void/.test(
    mobileTapGuardSource
  ) ||
  !/function handlePointerDown\(event: PointerEvent\): void \{[\s\S]*?const fieldRoot = editableFieldFromEvent\(event\);[\s\S]*?rememberFocusedField\(fieldRoot\);[\s\S]*?lastFieldPointerContext = \{/.test(
    mobileTapGuardSource
  ) ||
  !/function handleClick\(event: MouseEvent\): void \{[\s\S]*?const endFieldRoot = editableFieldFromEvent\(event\);[\s\S]*?field-click-accepted[\s\S]*?field-click-mismatch-suppressed[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?field-click-observed/.test(
    mobileTapGuardSource
  ) ||
  !/focused-field-action-suppressed[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/.test(
    mobileTapGuardSource
  ) ||
  /shouldAllowMarketplaceJoinFieldAction|marketplace-join-field-action-allowed|marketplace-join-focused-field-action-allowed/.test(
    mobileTapGuardSource
  ) ||
  !/document\.addEventListener\([\s\S]*?"focusin"[\s\S]*?rememberFocusedField\(editableFieldFromEvent\(event\)\)/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Editable fields must be tracked separately from action buttons so keyboard viewport shifts cannot trigger Marketplace route buttons",
    text:
      "Expected editable-field package markers, accepted field clicks, wrong-root field-click suppression, and no Marketplace Join field/action exception.",
  });
}

if (
  !/function isMarketplaceAction\(root: Element \| null\): boolean \{[\s\S]*?ctaId\.startsWith\("marketplace\."\)[\s\S]*?function isMarketplacePath\(\): boolean \{[\s\S]*?window\.location\.pathname === "\/app\/marketplace"[\s\S]*?function shouldReplayMismatchedOriginalAction\(root: Element \| null\): boolean \{[\s\S]*?!isMarketplaceAction\(root\)[\s\S]*?!isAppShellAction\(root\)[\s\S]*?!isBottomNavAction\(root\)[\s\S]*?function isMarketplaceShellReplayBlocked\(root: Element \| null\): boolean \{[\s\S]*?isMarketplacePath\(\) && \(isAppShellAction\(root\) \|\| isBottomNavAction\(root\)\)[\s\S]*?function replayMarketplaceActionIfTapLike\([\s\S]*?moved > 18[\s\S]*?commitOriginalAction\(root, reason, detail\)[\s\S]*?marketplace-orphan-mismatch-replayed[\s\S]*?marketplace-click-mismatch-replayed[\s\S]*?marketplace-shell-mismatch-no-replay/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Marketplace mobile taps must replay only tiny moved Marketplace taps while shell and bottom-rail replays stay blocked",
    text:
      "Expected Marketplace-specific bounded replay protection was not found in the shared tap guard.",
  });
}

if (/setPointerCapture\?\.\(event\.pointerId\)/.test(mobileTapGuardSource)) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Mobile tap guard must not globally capture pointer streams for ordinary app buttons",
    text:
      "Found setPointerCapture in mobileTapGuard. Global pointer capture made normal buttons feel dead or jumpy on phone.",
  });
}

if (
  !/const BOTTOM_NAV_SELECTOR[\s\S]*?data-gmfn-bottom-nav[\s\S]*?function isDashboardAction\(root: Element \| null\): boolean \{[\s\S]*?ctaId\.startsWith\("dashboard\."\)[\s\S]*?ctaId\.startsWith\("picture-frame-tools\."\)[\s\S]*?function coveredDashboardActionFromBottomNav\([\s\S]*?event: PointerEvent \| MouseEvent,[\s\S]*?topRoot = actionRootFromEvent\(event\)[\s\S]*?document\.elementsFromPoint\(event\.clientX, event\.clientY\)[\s\S]*?coveredDashboardActionFromBottomNav\(event, endRoot\)[\s\S]*?bottom-nav-covered-dashboard-suppressed/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must stop fixed bottom rail links from stealing dashboard controls underneath them",
    text: "Expected dashboard/frame-tools-under-bottom-nav suppression was not found.",
  });
}

if (
  !/const OPEN_MOBILE_OVERLAY_SELECTOR[\s\S]*?data-gmfn-mobile-overlay-open="true"[\s\S]*?function isInsideOpenMobileOverlay\(root: Element \| null\): boolean[\s\S]*?function isCommunityHomeAction\(root: Element \| null\): boolean \{[\s\S]*?ctaId\.startsWith\("community-home\."\)[\s\S]*?function coveredCommunityHomeActionFromAppShell\([\s\S]*?window\.location\.pathname !== "\/app\/community"[\s\S]*?!isAppShellAction\(topRoot\)[\s\S]*?isInsideOpenMobileOverlay\(topRoot\)[\s\S]*?document\.elementsFromPoint\(event\.clientX, event\.clientY\)[\s\S]*?app-shell-covered-community-home-suppressed[\s\S]*?commitOriginalAction\([\s\S]*?coveredCommunityHomeRoot,[\s\S]*?"app-shell-covered-community-home"/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must rescue Community Home actions when a closed app-shell control steals the phone hit-test",
    text:
      "Expected /app/community app-shell-covered community action rescue was not found.",
  });
}

if (
  !/data-gmfn-mobile-overlay="drawer"[\s\S]*?data-gmfn-mobile-overlay-open=\{isDrawerOpen \? "true" : "false"\}[\s\S]*?data-gmfn-mobile-overlay="tools"[\s\S]*?data-gmfn-mobile-overlay-open=\{isActionsOpen \? "true" : "false"\}/.test(
    appLayoutSource
  )
) {
  findings.push({
    file: relative(frontendRoot, appLayoutPath),
    line: 1,
    label:
      "Mobile app shell overlays must expose open/closed state for the tap guard",
    text:
      "Expected drawer/tools data-gmfn-mobile-overlay-open markers were not found.",
  });
}

if (
  /coveredMarketplaceActionFromBottomNav|bottom-nav-covered-marketplace|commitOriginalAction\(coveredMarketplaceRoot/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must let Marketplace bottom navigation taps land on the visible bottom navigation item",
    text:
      "Found legacy Marketplace-under-bottom-nav redispatch logic. This can make a visible bottom-nav tap replay a hidden Marketplace/Shop action underneath it.",
  });
}

if (
  !/function isTrustedPublicShopAction\(root: Element \| null\): boolean \{[\s\S]*?ctaId\.startsWith\("shop-gallery\."\)[\s\S]*?shop-gallery\.member-nav\.[\s\S]*?\.paid-placement[\s\S]*?function preserveTrustedPublicShopClick\([\s\S]*?public-shop-trusted-click-preserved[\s\S]*?function handleClick\(event: MouseEvent\): void \{[\s\S]*?isDisabledAction\(endRoot\)[\s\S]*?click-orphan-mismatch-suppressed[\s\S]*?preserveTrustedPublicShopClick\(endRoot, "click-after-orphan-check"/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Public Shop visitor actions must keep the original trusted mobile click for share, WhatsApp, copy, verify, and media controls",
    text:
      "Expected public shop trusted-click preservation after orphan wrong-root suppression was not found.",
  });
}

if (
  !/type PointerContext = \{[\s\S]*?let lastPointerContext: PointerContext \| null = null;[\s\S]*?function handlePointerCancel\(event: PointerEvent\): void \{[\s\S]*?cancelledAt: nowMs\(\)[\s\S]*?function handleClick\(event: MouseEvent\): void \{[\s\S]*?if \(!activeTap && endRoot && lastPointerContext\) \{[\s\S]*?click-after-cancel-suppressed[\s\S]*?click-orphan-mismatch-suppressed[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?commitOriginalAction\(intendedRoot, reason[\s\S]*?click-orphan-mismatch-no-commit/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must suppress orphan wrong-root clicks after pointer cancel/loss and replay the original tapped action",
    text: "Expected pointer-context orphan/cancel suppression with original-action replay was not found.",
  });
}

if (
  !/const recentPointer = elapsedSinceStart <= 900;[\s\S]*?const wrongRoot = endRoot && !sameRoot;[\s\S]*?const wrongOrShifted = wrongRoot \|\| unsafeGeometry;[\s\S]*?const movedLikeTap = moved <= 40;[\s\S]*?const cancelledTap = recentCancel && moved <= 18;[\s\S]*?if \([\s\S]*?recentPointer && wrongOrShifted && movedLikeTap[\s\S]*?cancelledTap && wrongOrShifted[\s\S]*?click-after-cancel-suppressed[\s\S]*?click-orphan-geometry-shift-suppressed[\s\S]*?click-orphan-mismatch-suppressed[\s\S]*?commitOriginalAction\(intendedRoot, reason/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Orphan mobile clicks must not be allowed to navigate a wrong action after a valid tap-sized movement",
    text:
      "Expected orphan wrong-root suppression and original-action replay was not found.",
  });
}

if (
  !/:where\(a,\s*button,\s*\[role="button"\],\s*summary,\s*input\[type="button"\],\s*input\[type="submit"\],\s*\.gmfn-btn,\s*\[data-gmfn-action-root="true"\]\)\s*\{[\s\S]*?line-height:\s*1\.18;[\s\S]*?overflow-wrap:\s*normal;[\s\S]*?word-break:\s*normal;[\s\S]*?hyphens:\s*none;/.test(
    indexCssSource
  )
) {
  findings.push({
    file: relative(frontendRoot, indexCssPath),
    line: 1,
    label:
      "Global action surfaces must hold text sizing and wrapping steady on phone",
    text: "Expected global action surface sizing/wrapping rule was not found.",
  });
}

if (
  !/const ACTION_ROOT_SELECTOR = \[[\s\S]*?'\[data-gmfn-action-root="true"\]'[\s\S]*?"\[data-cta-id\]"[\s\S]*?"button"[\s\S]*?"a"/.test(
    mobileTapGuardSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must recognize shared action roots and legacy raw actions",
    text: "Expected action-root selector was not found.",
  });
}

if (!/'input\[type="file"\]'/.test(mobileTapGuardSource)) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must recognize visible file inputs as action roots",
    text: "Expected input[type=\"file\"] in ACTION_ROOT_SELECTOR.",
  });
}

if (
  !/import \{ installMobileTapGuard \} from "\.\/lib\/mobileTapGuard";[\s\S]*?installMobileTapGuard\(\);/.test(
    mainSource
  )
) {
  findings.push({
    file: relative(frontendRoot, mainPath),
    line: 1,
    label: "App boot must install the global mobile tap guard before rendering",
    text: "Expected installMobileTapGuard() boot call was not found.",
  });
}

if (
  !/data-gmfn-action-root="true"[\s\S]*?data-cta-id=\{resolvedDebugId\}[\s\S]*?data-gmfn-action-root="true"[\s\S]*?data-cta-id=\{resolvedDebugId\}[\s\S]*?data-gmfn-action-root="true"[\s\S]*?data-cta-id=\{resolvedDebugId\}/.test(
    stableButtonSource
  )
) {
  findings.push({
    file: relative(frontendRoot, stableButtonPath),
    line: 1,
    label:
      "StableButton, StableCtaLink, and StableDisclosureSummary must mark action roots for the global phone tap guard",
    text: "Expected data-gmfn-action-root markers were not found.",
  });
}

if (
  !/const STABLE_ACTION_CLASS = "gmfn-stable-action";[\s\S]*?function stableActionClassName[\s\S]*?className=\{stableActionClassName\(className\)\}[\s\S]*?className=\{stableActionClassName\(className\)\}[\s\S]*?className=\{stableActionClassName\(className\)\}/.test(
    stableButtonSource
  )
) {
  findings.push({
    file: relative(frontendRoot, stableButtonPath),
    line: 1,
    label:
      "Stable action primitives must carry a shared class for press-state visual stabilization",
    text: "Expected gmfn-stable-action class wiring was not found.",
  });
}

if (
  !/:where\(\.gmfn-stable-action,[\s\S]*?\[data-gmfn-action-root="true"\]\)[\s\S]*?transition: none !important;[\s\S]*?:where\([\s\S]*?\.gmfn-stable-action,[\s\S]*?\[data-gmfn-action-root="true"\]\):active[\s\S]*?transform: none !important;[\s\S]*?transition: none !important;/.test(
    indexCssSource
  )
) {
  findings.push({
    file: relative(frontendRoot, indexCssPath),
    line: 1,
    label:
      "Stable action press state must not introduce a temporary visual layer or shifted alignment",
    text: "Expected stable-action no-op active-state rule was not found.",
  });
}

if (
  !/:where\(\.gmfn-action-press-lock\)[\s\S]*?transform: none !important;[\s\S]*?transition: none !important;/.test(
    indexCssSource
  )
) {
  findings.push({
    file: relative(frontendRoot, indexCssPath),
    line: 1,
    label:
      "Global active action lock must neutralize press-time movement for every action captured by the mobile tap guard",
    text: "Expected gmfn-action-press-lock no-op movement rule was not found.",
  });
}

if (
  !/type ActionRect = \{/.test(mobileTapGuardSource) ||
  !/function rectForAction\(root: Element \| null\): ActionRect \| null/.test(
    mobileTapGuardSource
  ) ||
  !/function geometryBecameUnsafe\([\s\S]*?rectHasShifted/.test(
    mobileTapGuardSource
  ) ||
  !/function markActiveAction\(root: Element \| null\): void[\s\S]*?ACTIVE_ACTION_CLASS/.test(
    mobileTapGuardSource
  ) ||
  !/function clearActiveTap\(\): void/.test(mobileTapGuardSource) ||
  !/function commitOriginalAction\([\s\S]*?click-original-action-committed/.test(
    mobileTapGuardSource
  ) ||
  !/click-redispatch-accepted/.test(mobileTapGuardSource) ||
  !/pointerup-geometry-shift/.test(mobileTapGuardSource) ||
  !/click-geometry-shift-suppressed/.test(mobileTapGuardSource)
) {
  findings.push({
    file: relative(frontendRoot, mobileTapGuardPath),
    line: 1,
    label:
      "Global mobile tap guard must commit the original action when a valid tap shifts under the finger",
    text:
      "Expected action-geometry guard, active action lock, and original-action commit were not found.",
  });
}

if (
  !/data-gmfn-action-root="true"[\s\S]*?style=\{stableStyle\}[\s\S]*?<Link[\s\S]*?data-gmfn-action-root="true"[\s\S]*?style=\{stableStyle\}/.test(
    originLinkSource
  )
) {
  findings.push({
    file: relative(frontendRoot, originLinkPath),
    line: 1,
    label:
      "OriginLink must mark external and router links as action roots for the global phone tap guard",
    text: "Expected OriginLink data-gmfn-action-root markers were not found.",
  });
}

if (
  !/const guardedPointerDown = useMemo[\s\S]*?const guardedPointerUp = useMemo[\s\S]*?const guardedMouseDown = useMemo[\s\S]*?onPointerDown=\{guardedPointerDown\}[\s\S]*?onPointerUp=\{guardedPointerUp\}[\s\S]*?onMouseDown=\{guardedMouseDown\}[\s\S]*?onClick=\{handleClick\}/.test(
    stableButtonSource
  )
) {
  findings.push({
    file: relative(frontendRoot, stableButtonPath),
    line: 1,
    label:
      "StableButton must guard pointer-up as well as pointer-down so taps cannot bubble into parent mobile cards",
    text: "Expected StableButton pointer-up guard was not found.",
  });
}

if (
  !/onPointerDown=\{\(event\) => guardLinkTap\(event, rest\.onPointerDown\)\}[\s\S]*?onPointerUp=\{\(event\) => guardLinkTap\(event, rest\.onPointerUp\)\}[\s\S]*?onMouseDown=\{\(event\) => guardLinkTap\(event, rest\.onMouseDown\)\}[\s\S]*?onClick=\{\(event\) => guardLinkTap\(event, rest\.onClick\)\}/.test(
    originLinkSource
  )
) {
  findings.push({
    file: relative(frontendRoot, originLinkPath),
    line: 1,
    label:
      "OriginLink must guard pointer-up as well as pointer-down so route links cannot fall through parent mobile cards",
    text: "Expected OriginLink pointer-up guard was not found.",
  });
}

if (
  !/onClick=\{\(event\) => \{[\s\S]*?guardLinkTap\(event, rest\.onClick\);[\s\S]*?if \(!event\.defaultPrevented\) \{[\s\S]*?rememberAppRouteRecovery\(nextTo, linkDebugId\);/.test(
    originLinkSource
  )
) {
  findings.push({
    file: relative(frontendRoot, originLinkPath),
    line: 1,
    label:
      "OriginLink must record route recovery only after disabled/default-prevented handlers run",
    text: "Expected route recovery to happen after guardLinkTap and defaultPrevented check.",
  });
}

if (
  !/export function actionTapGuardProps\(\): Pick<[\s\S]*?"onPointerDown" \| "onPointerUp" \| "onMouseDown"[\s\S]*?onPointerDown: stopActionTap,[\s\S]*?onPointerUp: stopActionTap,[\s\S]*?onMouseDown: stopActionTap,/.test(
    brandSource
  )
) {
  findings.push({
    file: relative(frontendRoot, brandPath),
    line: 1,
    label:
      "Shared action tap guard props must include pointer-up, not only pointer-down",
    text: "Expected actionTapGuardProps pointer-up guard was not found.",
  });
}

const marketplaceActionSystemChecks = [
  {
    label:
      "Marketplace action buttons must not create stacking layers that can drift over neighboring mobile controls",
    pattern:
      /function marketplaceActionStyle\([\s\S]*?pointerEvents: "auto",(?![\s\S]{0,180}(?:zIndex|isolation):)[\s\S]*?overflow: "hidden",[\s\S]*?function maskedLinkCode/,
  },
  {
    label:
      "Marketplace inline action grids must not create page-local stacking layers around mobile buttons",
    pattern:
      /function marketplaceInlineActionsStyle\([\s\S]*?width: "100%"[\s\S]*?maxWidth: "100%"[\s\S]*?minWidth: 0[\s\S]*?boxSizing: "border-box"[\s\S]*?display: "grid",(?![\s\S]{0,180}(?:zIndex|isolation):)[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?gridAutoRows: isCompact \? "56px" : "58px"[\s\S]*?justifyItems: "stretch"[\s\S]*?overflow: "hidden"[\s\S]*?function marketplaceInlineActionStyle[\s\S]*?maxWidth: "100%"[\s\S]*?boxSizing: "border-box"[\s\S]*?height: _isCompact \? 56 : 58[\s\S]*?maxHeight: _isCompact \? 56 : 58[\s\S]*?pointerEvents: "auto",(?![\s\S]{0,180}(?:zIndex|isolation):)[\s\S]*?whiteSpace: "normal"[\s\S]*?wordBreak: "normal"[\s\S]*?transition: "none",/,
  },
  {
    label:
      "Public shop face actions must use one lock flag and one in-flight ref, while locked taps still reach the page-level explanation",
    pattern:
      /publicShopPrepareInFlightRef = useRef\(false\)[\s\S]*?const publicShopActionsLocked =[\s\S]*?!currentGmfnId \|\| !activeCommunityId \|\| preparingPublicShopLink[\s\S]*?async function preparePublicShopLink[\s\S]*?publicShopPrepareInFlightRef\.current[\s\S]*?publicShopPrepareInFlightRef\.current = true[\s\S]*?publicShopPrepareInFlightRef\.current = false[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?if \(publicShopActionsLocked\) \{[\s\S]*?publicShopActionUnavailableMessage[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?debugId="marketplace\.public-shop\.open"/,
  },
  {
    label:
      "Public shop status pill must be height-locked so status wording cannot push the action buttons on phone",
    pattern:
      /function stableStatusPillStyle\([\s\S]*?height: 34,[\s\S]*?maxHeight: 34,[\s\S]*?whiteSpace: "nowrap"[\s\S]*?stableStatusPillStyle\(Boolean\(publicShopViewLink\)\)/,
  },
  {
    label:
      "Marketplace async support buttons must expose inactive state through stable disabled props",
    pattern:
      /const supportProcessBusy =[\s\S]*?startingLoanDraft[\s\S]*?loadingSuggestions[\s\S]*?sendingGuarantorRequests[\s\S]*?cancellingLoanDraft[\s\S]*?disabled=\{supportProcessBusy\}[\s\S]*?disabled=\{supportProcessBusy\}[\s\S]*?disabled=\{supportProcessBusy\}/,
  },
  {
    label:
      "Marketplace guarantor request button must use one shared blocked flag while blocked taps still explain in place",
    pattern:
      /const guarantorRequestsBlocked =[\s\S]*?function showGuarantorRequestBlockedNotice\(\)[\s\S]*?showNotice\([\s\S]*?debugId="marketplace\.support\.send-guarantor-requests"[\s\S]*?if \(guarantorRequestsBlocked\) \{[\s\S]*?showGuarantorRequestBlockedNotice\(\);[\s\S]*?stableHeight=\{58\}[\s\S]*?marketplaceInlineActionStyle\([\s\S]*?guarantorRequestsBlocked/,
  },
  {
    label:
      "Preparing a Marketplace join link must not auto-copy on mobile; copy is a separate tap",
    pattern:
      /handleCreateInviteLink = useCallback\(async \([\s\S]*?setInviteLink\(nextInviteLink\);(?![\s\S]{0,260}safeCopy\(nextInviteLink\))[\s\S]*?Reusable join invite prepared\. Copy it from here\./,
  },
  {
    label:
      "Marketplace visible public shop URL link must use the shared stable link primitive",
    pattern:
      /<StableCtaLink[\s\S]{0,160}to=\{publicShopViewLink\}/,
  },
  {
    label:
      "Marketplace public shop link actions must keep fixed-height labels while the link is preparing",
    pattern:
      /debugId="marketplace\.public-shop\.refresh"[\s\S]*?style=\{marketplaceInlineActionStyle\([\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?style=\{marketplaceInlineActionStyle\([\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?style=\{marketplaceInlineActionStyle\([\s\S]*?debugId="marketplace\.public-shop\.open"[\s\S]*?style=\{marketplaceInlineActionStyle\(/,
  },
  {
    label:
      "Marketplace section buttons must focus one open body so old sections cannot keep the page loose",
    pattern:
      /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"[\s\S]*?function touchedMarketplaceSectionState[\s\S]*?\[key\]: true[\s\S]*?function normalizeMarketplaceSectionState[\s\S]*?state\.support[\s\S]*?focusedMarketplaceSectionState\("support"\)[\s\S]*?function openMarketplaceSection[\s\S]*?setSectionsTouched\(\(prev\) => touchedMarketplaceSectionState\(prev, key\)\)[\s\S]*?setSectionsOpen\(focusedMarketplaceSectionState\(key\)\)[\s\S]*?scheduleMarketplaceSectionScroll\(sectionId\)/,
  },
  {
    label:
      "Marketplace inactive touched section shells must not render after another body is chosen",
    pattern:
      /\{sectionsOpen\.money \? \([\s\S]*?\{sectionsOpen\.tools \? \([\s\S]*?\{sectionsOpen\.members \? \([\s\S]*?\{sectionsOpen\.support \? \(/,
  },
  {
    label:
      "Marketplace inner buttons must keep strong active and disabled contrast instead of a washed-out white treatment",
    pattern:
      /function marketplaceActionStyle\([\s\S]*?#DDE8F1[\s\S]*?color: disabled \? "#34495F"[\s\S]*?opacity: 1[\s\S]*?kind === "soft"[\s\S]*?#E0EAF2[\s\S]*?#B5C9DA[\s\S]*?color: disabled \? "#34495F" : "#08233A"[\s\S]*?opacity: 1[\s\S]*?linear-gradient\(180deg, #0B2D4A 0%, #08233A 62%, #061827 100%\)[\s\S]*?color: disabled \? "#34495F" : "#FFFFFF"[\s\S]*?opacity: 1/,
  },
  {
    label:
      "Marketplace join-link response must explain reusable member sharing and community review",
    pattern:
      /marketplaceJoinLinkGuidance[\s\S]*?GSN will prepare the reusable join link automatically[\s\S]*?Every join request still goes through community review[\s\S]*?marketplaceJoinRefreshBlockedMessage[\s\S]*?Select an active community before preparing a join link[\s\S]*?Community needed/,
  },
];

for (const check of marketplaceActionSystemChecks) {
  if (!check.pattern.test(marketplaceSource)) {
    findings.push({
      file: relative(frontendRoot, marketplacePagePath),
      line: 1,
      label: check.label,
      text: "Expected Marketplace action stability pattern was not found.",
    });
  }
}

const communityHomePath = join(sourceRoot, "pages", "CommunityHomePage.tsx");
const communityHomeSource = readFileSync(communityHomePath, "utf8");

const communityHomeButtonChecks = [
    {
      label:
        "Community Home quick action tiles must keep fixed height so labels cannot shake on mobile",
      pattern:
        /function communityQuickActionButton\([\s\S]*?height: isCompact \? 58 : 100,[\s\S]*?minHeight: isCompact \? 58 : 100,[\s\S]*?maxHeight: isCompact \? 58 : 100,[\s\S]*?overflow: "hidden"[\s\S]*?function communityQuickActionIcon\([\s\S]*?width: 25,[\s\S]*?height: 25,/,
    },
  {
    label:
      "Community Home tool rows must stay height-locked for mobile tap stability",
    pattern:
      /function communityToolRowStyle\([\s\S]*?height: 72,[\s\S]*?minHeight: 72,[\s\S]*?maxHeight: 72,[\s\S]*?transform: "none"[\s\S]*?transition: "none"/,
  },
];

for (const check of communityHomeButtonChecks) {
  if (!check.pattern.test(communityHomeSource)) {
    findings.push({
      file: relative(frontendRoot, communityHomePath),
      line: 1,
      label: check.label,
      text: "Expected Community Home button stability pattern was not found.",
    });
  }
}

const marketplaceWorkspaceChecks = [
  {
    label:
      "Community Access Desk must use shared stable CTA primitives instead of a page-local button helper",
    pattern:
      /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";(?![\s\S]*?function btn\()/,
  },
  {
    label:
      "Community Access Desk public shop actions must keep stable shared copy controls tied to the live shopViewLink",
    pattern:
      /debugId="marketplace-workspace\.copy-public-shop-link"[\s\S]*?style=\{workspaceActionStyle\(!shopViewLink\)\}[\s\S]*?Copy Public Shop Link[\s\S]*?debugId="marketplace-workspace\.copy-public-shop-message"[\s\S]*?style=\{workspaceActionStyle\(!shopViewLink\)\}[\s\S]*?Copy Public Shop Message/,
  },
];

for (const check of marketplaceWorkspaceChecks) {
  if (!check.pattern.test(marketplaceWorkspaceSource)) {
    findings.push({
      file: relative(frontendRoot, marketplaceWorkspacePath),
      line: 1,
      label: check.label,
      text: "Expected Community Access Desk tap-stability pattern was not found.",
    });
  }
}

const communityMarketplaceSpotlightChecks = [
  {
    label:
      "Community Marketplace Spotlight must route the live spotlight CTA through the shared resolved primaryCta",
    pattern:
      /function spotlightShopPath\(item: MarketplaceFeedItem \| null\): string[\s\S]*?publicShopSharePath\(\{[\s\S]*?publicShopPath\(gmfnId\)[\s\S]*?const shopTo = spotlightShopPath\(activeItem\.feed\);[\s\S]*?const primaryCta = gmfnId[\s\S]*?resolveCtaTarget\("shop"[\s\S]*?explicitTo: shopTo[\s\S]*?resolveCtaTarget\("marketplace"[\s\S]*?primaryCta[\s\S]*?to=\{ctaPath\(activeItemView\.primaryCta\)\}/,
  },
  {
    label:
      "Community Marketplace Spotlight must use shared stable controls instead of local buttons or OriginLink",
    pattern:
      /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?\} from "\.\/StableButton";(?![\s\S]*?(?:function btn\(|<button|OriginLink))/,
  },
];

for (const check of communityMarketplaceSpotlightChecks) {
  if (!check.pattern.test(communityMarketplaceSpotlightSource)) {
    findings.push({
      file: relative(frontendRoot, communityMarketplaceSpotlightPath),
      line: 1,
      label: check.label,
      text: "Expected Community Marketplace Spotlight dynamic CTA stability pattern was not found.",
    });
  }
}

const dashboardPagePath = join(sourceRoot, "pages", "DashboardPage.tsx");
const dashboardSource = readFileSync(dashboardPagePath, "utf8");
const dashboardFrameChecks = [
  {
    label:
      "Dashboard passport picture tools must stay hidden under one active Frame tools control beside the active passport image input",
    pattern:
      /<PictureFrameToolsControl[\s\S]*?open=\{passportPictureToolsOpen\}[\s\S]*?label="Frame tools"[\s\S]*?railGap=\{8\}[\s\S]*?railColumns="repeat\(3, minmax\(0, 1fr\)\)"[\s\S]*?triggerHeight=\{isPhone \? 40 : 42\}[\s\S]*?zIndex=\{3200\}[\s\S]*?label: "Upload"[\s\S]*?inputId: avatarInputId[\s\S]*?label: "Change"[\s\S]*?inputId: avatarInputId[\s\S]*?label: "Remove"[\s\S]*?disabled: !avatarSrc[\s\S]*?<input[\s\S]*?id=\{avatarInputId\}[\s\S]*?ref=\{fileInputRef\}[\s\S]*?onChange=\{onAvatarSelected\}/,
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
      "Picture frame tools must measure placement before paint and lock trigger height so opening the rail cannot visibly jump",
    pattern:
      /useLayoutEffect\(\(\) => \{[\s\S]*?stableRailPlacement\([\s\S]*?triggerAnchorRef\.current \|\| slotRef\.current[\s\S]*?window\.visualViewport\?\.addEventListener\("resize", updatePlacement\)[\s\S]*?stableHeight=\{triggerHeight\}/,
  },
  {
    label:
      "Picture frame tools must capture rail taps so they cannot fall through to route controls",
    pattern:
      /onPointerDown=\{stopFrameToolEvent\}[\s\S]*?onPointerUp=\{stopFrameToolEvent\}[\s\S]*?onClick=\{stopFrameToolEvent\}/,
  },
  {
    label:
      "Picture frame upload/change labels must declare their associated file input for the mobile tap guard",
    pattern:
      /htmlFor=\{action\.inputId\}[\s\S]*?data-gmfn-file-input-id=\{action\.inputId\}/,
  },
  {
    label:
      "Picture frame tool slots must remain inert wrappers so only the trigger and rail actions are tap roots",
    pattern:
      /<div[\s\S]*?ref=\{slotRef\}[\s\S]*?onPointerDown=\{stopFrameToolEvent\}[\s\S]*?onClick=\{stopFrameToolEvent\}[\s\S]*?<div[\s\S]*?ref=\{triggerAnchorRef\}[\s\S]*?<SubtleButton/,
  },
];

const gmfnBrandPath = join(sourceRoot, "styles", "gmfnBrand.ts");
const gmfnBrandSource = readFileSync(gmfnBrandPath, "utf8");
const marketplaceActionStabilityPath = join(
  sourceRoot,
  "lib",
  "marketplaceActionStability.ts"
);
const marketplaceActionStabilitySource = readFileSync(
  marketplaceActionStabilityPath,
  "utf8"
);
const appShellChecks = [
  {
    label:
      "Mobile app shell must not double-reserve bottom-rail height while the rail is in normal flow",
    pattern:
      /function mainContent\(\s*isMobile: boolean,\s*taskMode: boolean\s*\): React\.CSSProperties \{[\s\S]*?const mobileBottomPadding = "calc\(16px \+ env\(safe-area-inset-bottom, 0px\)\)";[\s\S]*?function bottomNav\(\): React\.CSSProperties \{[\s\S]*?position: "relative"[\s\S]*?flexShrink: 0[\s\S]*?style=\{mainContent\(isMobile, !!taskMode\)\}[\s\S]*?\{showMobileBottomRail \?/,
  },
  {
    label:
      "Mobile app shell must keep the bottom rail visible while main content keeps vertical drags contained",
    pattern:
      /function mobileShell\(\): React\.CSSProperties[\s\S]*?minHeight: "100svh"[\s\S]*?height: "100svh"[\s\S]*?overflow: "hidden"[\s\S]*?function mainContent\([\s\S]*?overflowY: isMobile \? "auto" : undefined[\s\S]*?WebkitOverflowScrolling: isMobile \? "touch" : undefined[\s\S]*?overscrollBehaviorY: isMobile \? "contain" : undefined[\s\S]*?touchAction: isMobile \? "pan-y pinch-zoom" : undefined[\s\S]*?minHeight: isMobile \? 0 : undefined/,
  },
  {
    label:
      "Mobile overlays must not animate into a visible-but-tap-through closing state and must keep their own vertical scroll",
    pattern:
      /function overlayBackdrop\([\s\S]*?transition: "none"[\s\S]*?function drawerPanel\([\s\S]*?overflowY: "auto"[\s\S]*?WebkitOverflowScrolling: "touch"[\s\S]*?overscrollBehaviorY: "contain"[\s\S]*?touchAction: "pan-y pinch-zoom"[\s\S]*?transition: "none"[\s\S]*?function actionsPanel\([\s\S]*?overflowY: "auto"[\s\S]*?WebkitOverflowScrolling: "touch"[\s\S]*?overscrollBehaviorY: "contain"[\s\S]*?touchAction: "pan-y pinch-zoom"[\s\S]*?transition: "none"/,
  },
  {
    label:
      "Mobile bottom rail must scroll horizontally without stealing vertical page momentum",
    pattern:
      /function bottomNav\(\): React\.CSSProperties \{[\s\S]*?overflowX: "auto"[\s\S]*?overflowY: "hidden"[\s\S]*?WebkitOverflowScrolling: "touch"[\s\S]*?overscrollBehaviorX: "contain"[\s\S]*?overscrollBehaviorY: "none"[\s\S]*?touchAction: "pan-x pinch-zoom"[\s\S]*?const bottomNav = mobileBottomNavRef\.current;[\s\S]*?bottomNav\.scrollTo\(\{[\s\S]*?left: Math\.max\(nextLeft, 0\),[\s\S]*?behavior: "auto",[\s\S]*?}\);/,
  },
  {
    label:
      "Mobile bottom rail must mark its container and items so the shared tap guard can detect bottom-nav interception",
    pattern:
      /<nav[\s\S]*?data-gmfn-bottom-nav="true"[\s\S]*?<StableCtaLink[\s\S]*?data-gmfn-bottom-nav-item="true"/,
  },
  {
    label:
      "Mobile Public Shop bottom item must stay active on internal shop workspace routes",
    pattern:
      /function makeShopGalleryItem\([\s\S]*?label: "Public Shop"[\s\S]*?pathname\.startsWith\("\/shop\/"\)[\s\S]*?pathname === "\/app\/shop-assets"[\s\S]*?pathname\.startsWith\("\/app\/shop-gallery"\)[\s\S]*?pathname === "\/app\/shop\/me"[\s\S]*?if \(pathname === "\/app\/shop-assets"\)[\s\S]*?section: "Shop tools"[\s\S]*?page: "Shop Assets"/,
  },
  {
    label:
      "Closed mobile drawer must disable pointer events so transformed fixed layers cannot intercept taps",
    pattern:
      /function drawerPanel\(open: boolean\): React\.CSSProperties[\s\S]*?transform: open \? "translateX\(0\)" : "translateX\(-100%\)",[\s\S]*?pointerEvents: open \? "auto" : "none",/,
  },
  {
    label:
      "Mobile top Menu and Tools buttons must stay fixed-height while pages load",
    pattern:
      /function mobileIconButton\(\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44,[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"/,
  },
];

const marketplaceLandingChecks = [
  {
    label:
      "Marketplace section landing offset must reserve enough mobile header space so opened bodies do not tuck under Menu/Tools",
    pattern:
      /function marketplaceLandingOffsetPx\(\): number[\s\S]*?if \(\(window\.innerWidth \|\| 0\) > 980\) return 96;[\s\S]*?Math\.min\([\s\S]*?196,[\s\S]*?Math\.max\(132,[\s\S]*?viewportHeight \* 0\.16[\s\S]*?addressBarDelta \* 0\.5/,
  },
  {
    label:
      "Marketplace section landing must scroll the real mobile scroll container before falling back to window scrolling",
    pattern:
      /function scrollableAncestor\(target: HTMLElement\): HTMLElement \| null[\s\S]*?node\.scrollHeight > node\.clientHeight[\s\S]*?const container = scrollableAncestor\(target\)[\s\S]*?container\.scrollTo\(\{ top, behavior: "auto" \}\)[\s\S]*?window\.scrollTo\(\{ top, behavior: "auto" \}\)/,
  },
];

const sharedTapTargetChecks = [
  {
    label:
      "Shared stable tap target must not put every button/link into a z-index stacking layer",
    forbiddenPattern:
      /export function brandStableTapTarget\(\): React\.CSSProperties \{[\s\S]*?\b(?:zIndex|isolation)\s*:/,
  },
  {
    label:
      "Shared stable tap target must not use layout containment because it can drift mobile hit testing",
    forbiddenPattern:
      /export function brandStableTapTarget\(\): React\.CSSProperties \{[\s\S]*?\bcontain\s*:/,
  },
  {
    label:
      "Shared card helpers must not use layout containment around interactive controls",
    forbiddenPattern:
      /export function brand(?:Page|Soft|Inner)Card\([\s\S]*?\bcontain\s*:/,
  },
];

for (const check of appShellChecks) {
  if (!check.pattern.test(appLayoutSource)) {
    findings.push({
      file: relative(frontendRoot, appLayoutPath),
      line: 1,
      label: check.label,
      text: "Expected mobile app-shell tap-stability behavior was not found.",
    });
  }
}

for (const check of sharedTapTargetChecks) {
  if (check.forbiddenPattern.test(gmfnBrandSource)) {
    findings.push({
      file: relative(frontendRoot, gmfnBrandPath),
      line: 1,
      label: check.label,
      text: "Unexpected stacking-layer style found in brandStableTapTarget().",
    });
  }
}

for (const check of marketplaceLandingChecks) {
  if (!check.pattern.test(marketplaceActionStabilitySource)) {
    findings.push({
      file: relative(frontendRoot, marketplaceActionStabilityPath),
      line: 1,
      label: check.label,
      text: "Expected Marketplace landing-offset pattern was not found.",
    });
  }
}

if (
  /function stableStyle\([\s\S]*?\bcontain\s*:/.test(stableButtonSource)
) {
  findings.push({
    file: relative(frontendRoot, stableButtonPath),
    line: 1,
    label:
      "StableButton action styles must not use layout containment because it can drift mobile hit testing",
    text: "Unexpected contain style found in stableStyle().",
  });
}

if (
  /:where\(a,\s*button,\s*\[role="button"\],\s*summary,\s*input\[type="button"\],\s*input\[type="submit"\],\s*\.gmfn-btn\)\s*\{[\s\S]*?contain\s*:/m.test(
    indexCssSource
  )
) {
  findings.push({
    file: relative(frontendRoot, indexCssPath),
    line: 1,
    label:
      "Global interactive controls must not force CSS contain because it can drift mobile hit testing",
    text: "Unexpected contain rule found on global action surfaces.",
  });
}

const apiPath = join(sourceRoot, "lib", "api.ts");
const apiSource = readFileSync(apiPath, "utf8");
const copySystemChecks = [
  {
    label:
      "Legacy clipboard fallback must restore scroll immediately and on the next frame",
    pattern:
      /const restoreScroll = \(\) => win\?\.scrollTo\(scrollX, scrollY\);[\s\S]*?ta\.focus\(\{ preventScroll: true \}\);[\s\S]*?restoreScroll\(\);[\s\S]*?win\?\.requestAnimationFrame\(restoreScroll\);/,
  },
  {
    label:
      "Legacy clipboard fallback must avoid mobile keyboard/zoom focus movement",
    pattern:
      /ta\.setAttribute\("inputmode", "none"\);[\s\S]*?ta\.style\.fontSize = "16px";[\s\S]*?ta\.style\.caretColor = "transparent";/,
  },
];

for (const check of copySystemChecks) {
  if (!check.pattern.test(apiSource)) {
    findings.push({
      file: relative(frontendRoot, apiPath),
      line: 1,
      label: check.label,
      text: "Expected shared clipboard anti-jump behavior was not found.",
    });
  }
}

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
