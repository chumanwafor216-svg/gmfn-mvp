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
const marketplaceSource = marketplaceLines.join("\n");
const indexCssPath = join(sourceRoot, "index.css");
const indexCssSource = readFileSync(indexCssPath, "utf8");
let insideOwnedLinksSection = false;
let marketplaceButtonCount = 0;

marketplaceLines.forEach((line, index) => {
  if (line.includes('id="marketplace-owned-links"')) {
    insideOwnedLinksSection = true;
  }

  if (line.trim().startsWith("disabled=")) {
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

marketplaceLines.forEach((line, index) => {
  if (!line.includes("<button")) return;
  marketplaceButtonCount += 1;
  const block = marketplaceLines.slice(index, index + 16).join("\n");
  if (
    !block.includes("marketplacePointerGuardProps") &&
    !block.includes("marketplaceButtonGuardProps")
  ) {
    findings.push({
      file: relative(frontendRoot, marketplacePagePath),
      line: index + 1,
      label:
        "Every Marketplace button must use the shared Marketplace tap guard so taps cannot bubble to a neighboring route",
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

const marketplaceActionSystemChecks = [
  {
    label:
      "Marketplace action buttons must not create stacking layers that can drift over neighboring mobile controls",
    pattern:
      /function actionBtn\([\s\S]*?pointerEvents: "auto",(?![\s\S]{0,180}(?:zIndex|isolation):)[\s\S]*?overflow: "hidden",[\s\S]*?function maskedLinkCode/,
  },
  {
    label:
      "Marketplace inline action grids must not create page-local stacking layers around mobile buttons",
    pattern:
      /function marketplaceInlineActionsStyle\([\s\S]*?display: "grid",(?![\s\S]{0,180}(?:zIndex|isolation):)[\s\S]*?function marketplaceInlineActionStyle[\s\S]*?pointerEvents: "auto",(?![\s\S]{0,180}(?:zIndex|isolation):)[\s\S]*?transition: "none",/,
  },
  {
    label:
      "Public shop face actions must use one lock flag and one in-flight ref so refresh/copy/email/open cannot double-fire while the card is reflowing",
    pattern:
      /publicShopPrepareInFlightRef = useRef\(false\)[\s\S]*?const publicShopActionsLocked =[\s\S]*?!currentGmfnId \|\| !activeCommunityId \|\| preparingPublicShopLink[\s\S]*?publicShopPrepareInFlightRef\.current[\s\S]*?publicShopPrepareInFlightRef\.current = true[\s\S]*?publicShopPrepareInFlightRef\.current = false[\s\S]*?aria-disabled=\{publicShopActionsLocked\}[\s\S]*?aria-disabled=\{publicShopActionsLocked\}[\s\S]*?aria-disabled=\{publicShopActionsLocked\}[\s\S]*?aria-disabled=\{publicShopActionsLocked\}/,
  },
  {
    label:
      "Public shop status pill must be height-locked so status wording cannot push the action buttons on phone",
    pattern:
      /function stableStatusPillStyle\([\s\S]*?height: 34,[\s\S]*?maxHeight: 34,[\s\S]*?whiteSpace: "nowrap"[\s\S]*?stableStatusPillStyle\(Boolean\(publicShopViewLink\)\)/,
  },
  {
    label:
      "Marketplace async support buttons must expose inactive state with aria-disabled",
    pattern:
      /aria-disabled=\{startingLoanDraft\}[\s\S]*?aria-disabled=\{loadingSuggestions\}[\s\S]*?aria-disabled=\{cancellingLoanDraft\}/,
  },
  {
    label:
      "Marketplace guarantor request button must use one shared blocked flag",
    pattern:
      /const guarantorRequestsBlocked =[\s\S]*?aria-disabled=\{guarantorRequestsBlocked\}[\s\S]*?actionBtn\([\s\S]*?guarantorRequestsBlocked/,
  },
  {
    label:
      "Refreshing a Marketplace join link must not auto-copy on mobile; copy is a separate tap",
    pattern:
      /async function handleCreateInviteLink\([\s\S]*?setInviteLink\(nextInviteLink\);(?![\s\S]{0,260}safeCopy\(nextInviteLink\))[\s\S]*?Copy it from the link shown here\./,
  },
  {
    label:
      "Marketplace visible public shop URL anchor must use shared tap guard",
    pattern:
      /<a[\s\S]{0,80}\{\.\.\.marketplacePointerGuardProps\(\)\}[\s\S]{0,220}href=\{publicShopViewLink\}/,
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

const appLayoutPath = join(sourceRoot, "layout", "AppLayout.tsx");
const appLayoutSource = readFileSync(appLayoutPath, "utf8");
const gmfnBrandPath = join(sourceRoot, "styles", "gmfnBrand.ts");
const gmfnBrandSource = readFileSync(gmfnBrandPath, "utf8");
const appShellChecks = [
  {
    label:
      "Mobile app shell must reserve enough bottom space so page buttons cannot sit under the fixed bottom rail",
    pattern:
      /const MOBILE_BOTTOM_NAV_RESERVED_SPACE =\s*"calc\(150px \+ env\(safe-area-inset-bottom, 0px\)\)";[\s\S]*?padding: isMobile[\s\S]*?MOBILE_BOTTOM_NAV_RESERVED_SPACE/,
  },
  {
    label:
      "Mobile bottom rail must scroll horizontally without scrollIntoView moving the page",
    pattern:
      /const bottomNav = mobileBottomNavRef\.current;[\s\S]*?bottomNav\.scrollTo\(\{[\s\S]*?left: Math\.max\(nextLeft, 0\),[\s\S]*?behavior: "auto",[\s\S]*?}\);/,
  },
  {
    label:
      "Closed mobile drawer must disable pointer events so transformed fixed layers cannot intercept taps",
    pattern:
      /function drawerPanel\(open: boolean\): React\.CSSProperties[\s\S]*?transform: open \? "translateX\(0\)" : "translateX\(-100%\)",[\s\S]*?pointerEvents: open \? "auto" : "none",/,
  },
];

const sharedTapTargetChecks = [
  {
    label:
      "Shared stable tap target must not put every button/link into a z-index stacking layer",
    forbiddenPattern:
      /export function brandStableTapTarget\(\): React\.CSSProperties \{[\s\S]*?\b(?:zIndex|isolation)\s*:/,
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
