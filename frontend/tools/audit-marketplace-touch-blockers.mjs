/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const mobileTapGuardFile = "src/lib/mobileTapGuard.ts";
const marketplaceSource = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const tapGuardSource = readFileSync(join(frontendRoot, mobileTapGuardFile), "utf8");
const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(file, source, index, message, text = "Expected pattern was not found.") {
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function assertContains(file, source, pattern, message) {
  if (pattern.test(source)) return;
  addFinding(file, source, -1, message);
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start === -1) return { text: "", start: -1 };
  const nextFunction = source.slice(start + 1).search(/\nfunction\s+\w+/);
  const end = nextFunction === -1 ? source.length : start + 1 + nextFunction;
  return { text: source.slice(start, end), start };
}

const surfaceHelper = functionBody(marketplaceSource, "marketplaceSurfaceTouchProps");
if (!surfaceHelper.text) {
  addFinding(
    marketplaceFile,
    marketplaceSource,
    -1,
    "Marketplace surface touch helper must exist so inner panels carry stable debug metadata."
  );
} else {
  assertContains(
    marketplaceFile,
    surfaceHelper.text,
    /"data-gmfn-surface-root": "true"[\s\S]*?"data-gmfn-debug-id": debugId/,
    "Marketplace surface touch helper must keep neutral surface/debug metadata for diagnostics."
  );

  const actionRoot = surfaceHelper.text.match(/data-gmfn-action-root|data-cta-id/);
  if (actionRoot) {
    addFinding(
      marketplaceFile,
      marketplaceSource,
      surfaceHelper.start + actionRoot.index,
      "Marketplace parent surfaces must not be global action roots. A whole panel action root can make mobile taps jump or lock.",
      actionRoot[0]
    );
  }

  const blocker = surfaceHelper.text.match(
    /on(?:Pointer|Mouse|Click)|preventDefault|stopPropagation|stopMarketplaceTap/
  );
  if (blocker) {
    addFinding(
      marketplaceFile,
      marketplaceSource,
      surfaceHelper.start + blocker.index,
      "Marketplace surface helper must be metadata-only. Parent panels must not swallow child taps.",
      blocker[0]
    );
  }
}

const fieldHelper = functionBody(marketplaceSource, "marketplaceFieldTouchProps");
assertContains(
  marketplaceFile,
  fieldHelper.text,
  /"data-gmfn-field-root": "true"[\s\S]*?"data-gmfn-debug-id": debugId[\s\S]*?onPointerDownCapture: stopMarketplaceTap[\s\S]*?onClick: stopMarketplaceTap/,
  "Marketplace native fields must keep field-only tap guards so keyboard taps do not replay nearby actions."
);

const surfaceUses = [...marketplaceSource.matchAll(/marketplaceSurfaceTouchProps\("([^"]+)"\)/g)];
const expectedSurfaceIds = [
  "marketplace.rosca.actions",
  "marketplace.network-repost.surface",
  "marketplace.network-repost.payment-actions",
];
for (const id of expectedSurfaceIds) {
  if (!surfaceUses.some((match) => match[1] === id)) {
    addFinding(
      marketplaceFile,
      marketplaceSource,
      -1,
      "Marketplace inner surface tap metadata is missing from an expected panel.",
      id
    );
  }
}

for (const match of surfaceUses) {
  const id = match[1];
  if (!expectedSurfaceIds.includes(id)) {
    addFinding(
      marketplaceFile,
      marketplaceSource,
      match.index,
      "Unexpected Marketplace surface tap root must be audited before it can wrap inner controls.",
      id
    );
  }
}

assertContains(
  mobileTapGuardFile,
  tapGuardSource,
  /function actionRootFromTarget\(target: EventTarget \| null\): Element \| null \{[\s\S]*?if \(editableFieldFromTarget\(target\)\) return null;[\s\S]*?return target\.closest\(ACTION_ROOT_SELECTOR\);/,
  "Global tap guard must ignore editable fields before looking for an action root."
);

assertContains(
  mobileTapGuardFile,
  tapGuardSource,
  /if \(isMarketplacePath\(\) && isMarketplaceAction\(intendedRoot\)\)[\s\S]*?marketplace-click-mismatch-no-replay[\s\S]*?clearActiveTap\(\);[\s\S]*?lastPointerContext = null;[\s\S]*?return;/,
  "Marketplace mismatched taps must fail closed instead of replaying a guessed action."
);

assertContains(
  marketplaceFile,
  marketplaceSource,
  /const routeHashLandingAppliedRef = useRef\(""\);/,
  "Marketplace hash landings must keep a one-shot ref so route hashes cannot repeatedly drag the screen."
);

for (const hash of [
  "marketplace-loans-support",
  "marketplace-rosca",
  "marketplace-owned-links",
]) {
  assertContains(
    marketplaceFile,
    marketplaceSource,
    new RegExp(
      `if \\(hash !== "${hash}"\\) return;[\\s\\S]*?routeHashLandingAppliedRef\\.current === landingToken[\\s\\S]*?routeHashLandingAppliedRef\\.current = landingToken;[\\s\\S]*?scrollToMarketplaceSection\\("${hash}"\\);[\\s\\S]*?clearMarketplaceHash\\(\\);`
    ),
    `Marketplace ${hash} route landing must scroll once and clear the hash instead of fighting user scrolling.`
  );
}

if (findings.length) {
  console.error("Marketplace touch-blocker line audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Marketplace touch-blocker line audit passed: ${surfaceUses.length} neutral inner surfaces, one-shot hash landings, field taps guarded, and Marketplace mismatch replay disabled.`
);
