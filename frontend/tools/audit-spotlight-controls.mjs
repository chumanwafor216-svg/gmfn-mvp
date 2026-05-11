/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const text = read(file);
  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertLineNotContains(file, pattern, message) {
  const text = read(file);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

assertContains(
  "src/pages/ShopControlPage.tsx",
  /<StableButton[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => setSpotlightMediaChoice\("video"\)\}[\s\S]*?debugId="shop-control\.spotlight\.media\.video"/,
  "The Free Spotlight video media selector must be an explicit button action, not a submit/navigation fallthrough."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /<PrimaryButton[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => handleCreateSpotlight\(\)\}[\s\S]*?debugId="shop-control\.spotlight\.preview\.publish"/,
  "The Free Spotlight publish control must be an explicit button action, not a submit/navigation fallthrough."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /import \{ rememberPublishRecovery \} from "\.\.\/lib\/publishRecovery";[\s\S]*?rememberPublishRecovery\([\s\S]*?routes\.freeSpotlight,[\s\S]*?"shop-control\.spotlight\.preview\.publish"[\s\S]*?\);/,
  "The Free Spotlight publish handler must set a recovery marker before upload/API work so Welcome/Cover can recover from an intermittent route leak."
);

assertContains(
  "src/pages/SubscriptionSpotlightPage.tsx",
  /import \{ rememberPublishRecovery \} from "\.\.\/lib\/publishRecovery";[\s\S]*?rememberPublishRecovery\([\s\S]*?APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT[\s\S]*?"subscription-spotlight\.publish"[\s\S]*?\);/,
  "The Subscription Spotlight publish handler must set a recovery marker before upload/API work so Welcome/Cover can recover from an intermittent route leak."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /aria-hidden=\{spotlightMediaChoice === "video" \|\| undefined\}[\s\S]*?visibility: spotlightMediaChoice === "video" \? "hidden" : "visible"[\s\S]*?pointerEvents: spotlightMediaChoice === "video" \? "none" : "auto"[\s\S]*?minHeight: 170/,
  "The picture upload slot must stay mounted when Video is selected so the surface does not jump under the tap."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /aria-hidden=\{spotlightMediaChoice === "image" \|\| undefined\}[\s\S]*?visibility: spotlightMediaChoice === "image" \? "hidden" : "visible"[\s\S]*?pointerEvents: spotlightMediaChoice === "image" \? "none" : "auto"[\s\S]*?minHeight: 170/,
  "The video upload slot must stay mounted when Picture is selected so the surface does not jump under the tap."
);

assertLineNotContains(
  "src/pages/ShopControlPage.tsx",
  /spotlightMediaChoice !== "video" \? \(/,
  "The picture upload slot must not be conditionally unmounted by media choice."
);

assertLineNotContains(
  "src/pages/ShopControlPage.tsx",
  /spotlightMediaChoice !== "image" \? \(/,
  "The video upload slot must not be conditionally unmounted by media choice."
);

if (findings.length > 0) {
  console.error("Spotlight controls audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Spotlight controls audit passed.");
