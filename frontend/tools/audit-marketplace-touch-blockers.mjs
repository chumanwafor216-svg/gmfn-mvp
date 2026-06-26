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
  /const rememberMarketplaceFieldPointer[\s\S]*?markMarketplaceFieldInteraction\(\)[\s\S]*?const rememberMarketplaceFieldFocus[\s\S]*?markMarketplaceFieldInteraction\(\)[\s\S]*?"data-gmfn-field-root": "true"[\s\S]*?"data-gmfn-debug-id": debugId[\s\S]*?onPointerDownCapture: rememberMarketplaceFieldPointer[\s\S]*?onFocusCapture: rememberMarketplaceFieldFocus/,
  "Marketplace native fields must mark pointer/focus interaction early and keep field-only metadata so keyboard taps do not replay nearby actions."
);

const fieldBlocker = fieldHelper.text.match(
  /stopPropagation|stopMarketplaceTap|onClick(?:Capture)?:|onPointerDown:|onPointerUp(?:Capture)?:|onMouseDown(?:Capture)?:/
);
if (fieldBlocker) {
  addFinding(
    marketplaceFile,
    marketplaceSource,
    fieldHelper.start + fieldBlocker.index,
    "Marketplace native fields must not swallow pointer/mouse/click events. Real phone Chrome needs normal native focus behavior.",
    fieldBlocker[0]
  );
}

if (/\.focus\(/.test(fieldHelper.text)) {
  addFinding(
    marketplaceFile,
    marketplaceSource,
    fieldHelper.start + fieldHelper.text.search(/\.focus\(/),
    "Marketplace field tap guards must not force programmatic focus during pointerdown; mobile Chrome should handle native field focus.",
    "Remove forced .focus() from marketplaceFieldTouchProps."
  );
}

assertContains(
  marketplaceFile,
  marketplaceSource,
  /marketplaceSurfaceTouchProps\("marketplace\.links\.join\.surface"\)[\s\S]*?<input[\s\S]*?\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\.sender-name"\)\}[\s\S]*?id="marketplace-join-sender-name"[\s\S]*?value=\{joinSenderName\}[\s\S]*?aria-label="Sender name for join invitation"[\s\S]*?<input[\s\S]*?\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\.recipient-name"\)\}[\s\S]*?id="marketplace-join-recipient-name"[\s\S]*?value=\{joinRecipientName\}[\s\S]*?<input[\s\S]*?\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\.invite-note"\)\}[\s\S]*?id="marketplace-join-invite-note"[\s\S]*?type="text"[\s\S]*?value=\{joinInviteNote\}[\s\S]*?<select[\s\S]*?\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\.relationship-type"\)\}[\s\S]*?id="marketplace-join-relationship-type"[\s\S]*?value=\{joinRelationshipType\}[\s\S]*?<select[\s\S]*?\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\.known-duration"\)\}[\s\S]*?id="marketplace-join-known-duration"[\s\S]*?value=\{joinKnownDuration\}[\s\S]*?<textarea[\s\S]*?\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\.relationship-context"\)\}[\s\S]*?id="marketplace-join-relationship-context"[\s\S]*?value=\{joinRelationshipContext\}[\s\S]*?Private trust note only[\s\S]*?marketplaceSurfaceTouchProps\("marketplace\.links\.join\.actions"\)/,
  "Marketplace Join surface, native sender/receiver/evidence fields, private trust warning, and action packages must be protected without duplicating field roots on outer labels."
);

assertContains(
  marketplaceFile,
  marketplaceSource,
  /htmlFor="marketplace-join-sender-name"[\s\S]*?id="marketplace-join-sender-name"[\s\S]*?htmlFor="marketplace-join-recipient-name"[\s\S]*?id="marketplace-join-recipient-name"[\s\S]*?htmlFor="marketplace-join-invite-note"[\s\S]*?id="marketplace-join-invite-note"[\s\S]*?htmlFor="marketplace-join-relationship-type"[\s\S]*?id="marketplace-join-relationship-type"[\s\S]*?htmlFor="marketplace-join-known-duration"[\s\S]*?id="marketplace-join-known-duration"[\s\S]*?htmlFor="marketplace-join-relationship-context"[\s\S]*?id="marketplace-join-relationship-context"/,
  "Marketplace Join labels must be explicit htmlFor/id pairs so label taps do not depend on wrapper-label behavior."
);

if (/<label[\s\S]{0,240}\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\./.test(marketplaceSource)) {
  addFinding(
    marketplaceFile,
    marketplaceSource,
    marketplaceSource.search(/<label[\s\S]{0,240}\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\./),
    "Marketplace Join labels must not duplicate native field roots because label/input identity mismatches can make phone field taps unstable.",
    "Keep marketplaceFieldTouchProps on input/select/textarea only."
  );
}

const surfaceUses = [...marketplaceSource.matchAll(/marketplaceSurfaceTouchProps\("([^"]+)"\)/g)];
const expectedSurfaceIds = [
  "marketplace.rosca.actions",
  "marketplace.links.join.surface",
  "marketplace.links.join.actions",
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
  /const EDITABLE_FIELD_SELECTOR = \[[\s\S]*?data-gmfn-field-root="true"[\s\S]*?function actionRootFromTarget\(target: EventTarget \| null\): Element \| null \{[\s\S]*?if \(editableFieldFromTarget\(target\)\) return null;[\s\S]*?return target\.closest\(ACTION_ROOT_SELECTOR\);/,
  "Global tap guard must ignore editable fields before looking for an action root."
);

assertContains(
  mobileTapGuardFile,
  tapGuardSource,
  /field-click-mismatch-suppressed[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?focused-field-action-suppressed[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/,
  "Global tap guard must suppress wrong-root clicks after field taps instead of allowing Marketplace Join field taps to become share actions."
);

assertContains(
  mobileTapGuardFile,
  tapGuardSource,
  /function replayMarketplaceActionIfTapLike\([\s\S]*?if \(!Number\.isFinite\(moved\) \|\| moved > 18\) return false;[\s\S]*?return commitOriginalAction\(root, reason, detail\);[\s\S]*?marketplace-orphan-mismatch-replayed[\s\S]*?marketplace-click-mismatch-replayed/,
  "Marketplace action taps may replay only the original Marketplace action when the movement is still tap-like."
);

assertContains(
  mobileTapGuardFile,
  tapGuardSource,
  /function shouldReplayMismatchedOriginalAction\(root: Element \| null\): boolean \{[\s\S]*?if \(isMarketplacePath\(\)\) \{[\s\S]*?!isMarketplaceAction\(root\)[\s\S]*?!isAppShellAction\(root\)[\s\S]*?!isBottomNavAction\(root\)[\s\S]*?function isMarketplaceShellReplayBlocked\(root: Element \| null\): boolean \{[\s\S]*?isMarketplacePath\(\) && \(isAppShellAction\(root\) \|\| isBottomNavAction\(root\)\)[\s\S]*?marketplace-shell-mismatch-no-replay/,
  "Marketplace mismatched taps must not replay stale Menu, Tools, page-action, or bottom-rail routes."
);

assertContains(
  marketplaceFile,
  marketplaceSource,
  /const routeHashLandingAppliedRef = useRef\(""\);/,
  "Marketplace hash landings must keep a one-shot ref so route hashes cannot repeatedly drag the screen."
);

for (const hash of ["marketplace-rosca", "marketplace-owned-links"]) {
  assertContains(
    marketplaceFile,
    marketplaceSource,
    new RegExp(
      `if \\(hash !== "${hash}"\\) return;[\\s\\S]*?routeHashLandingAppliedRef\\.current === landingToken[\\s\\S]*?routeHashLandingAppliedRef\\.current = landingToken;[\\s\\S]*?scrollToMarketplaceSection\\("${hash}"\\);[\\s\\S]*?clearMarketplaceHash\\(\\);`
    ),
    `Marketplace ${hash} route landing must scroll once and clear the hash instead of fighting user scrolling.`
  );
}

assertContains(
  marketplaceFile,
  marketplaceSource,
  /const isMoneyOutSupportFlow =[\s\S]*?routeSupportFlow === "money-out" && routeFocus === "support"[\s\S]*?if \(hash !== "marketplace-loans-support" && !isMoneyOutSupportFlow\) return;[\s\S]*?const landingTarget = "marketplace-loans-support"[\s\S]*?routeHashLandingAppliedRef\.current === landingToken[\s\S]*?routeHashLandingAppliedRef\.current = landingToken;[\s\S]*?setSectionsTouched\(\(prev\) => touchedMarketplaceSectionState\(prev, "support"\)\)[\s\S]*?setSectionsOpen\(focusedMarketplaceSectionState\("support"\)\)[\s\S]*?scheduleMarketplaceSectionScroll\("marketplace-loans-support", \{\s*force: true,\s*\}\);[\s\S]*?clearMarketplaceHash\(\);/,
  "Marketplace marketplace-loans-support landing must accept direct hashes and Money Out support handoffs, then use the scheduled forced phone-safe scroll once and clear the hash."
);

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
  `Marketplace touch-blocker line audit passed: ${surfaceUses.length} neutral inner surfaces, one-shot hash landings, field taps guarded, and Marketplace tap-like replay bounded.`
);
