/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const findings = [];
const shopControlFile = "src/pages/ShopControlPage.tsx";
const shopControlSpotlightWorkflowFile =
  "src/pages/shopControl/ShopControlSpotlightWorkflow.tsx";

function readRaw(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function readShopControlAuditSource() {
  const shopControlSource = readRaw(shopControlFile);
  const spotlightWorkflowSource = readRaw(shopControlSpotlightWorkflowFile);
  return shopControlSource.replace(
    /<ShopControlSpotlightWorkflow[\s\S]*?\/>/,
    spotlightWorkflowSource
  );
}

function read(relativePath) {
  if (relativePath === shopControlFile) {
    return readShopControlAuditSource();
  }
  return readRaw(relativePath);
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
  /const ShopControlSpotlightWorkflow = React\.lazy\(\(\) => import\("\.\/shopControl\/ShopControlSpotlightWorkflow"\)\);[\s\S]*?const spotlightWorkflowSection = spotlightOpen \? \([\s\S]*?<React\.Suspense[\s\S]*?handleCreateSpotlight/,
  "Shop Control must lazy-load the Spotlight workflow only after the publisher lane opens while keeping publish state in the parent."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /<StableButton[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => \{[\s\S]*?setSpotlightMediaChoice\(spotlightImageFile \? "both" : "video"\)[\s\S]*?shop-control-spotlight-video-file[\s\S]*?input\?\.click\(\)[\s\S]*?debugId="shop-control\.spotlight\.media\.video"/,
  "The Free Spotlight video media selector must be an explicit button action, not a submit/navigation fallthrough."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /<PrimaryButton[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => handleCreateSpotlight\(\)\}[\s\S]*?debugId="shop-control\.spotlight\.preview\.publish"/,
  "The Free Spotlight publish control must be an explicit button action, not a submit/navigation fallthrough."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /setSpotlightFlowStep\("upload"\);[\s\S]*?setSpotlightOpen\(true\);/,
  "Free Spotlight must open directly to the product/media composer instead of forcing the user through shop-record setup."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /const \[spotlightProductName, setSpotlightProductName\][\s\S]*?const \[spotlightPriceNote, setSpotlightPriceNote\][\s\S]*?function composeSpotlightMessage\(\)[\s\S]*?safeStr\(spotlightProductName\)[\s\S]*?safeStr\(spotlightPriceNote\)[\s\S]*?safeStr\(spotlightMessage\)/,
  "Free Spotlight must collect product/update details separately from the saved shop identity."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /const activeShop = shop\?\.id \? shop : await ensureSpotlightShopRecord\(\);[\s\S]*?shop_id: Number\(activeShop\.id\)/,
  "Free Spotlight publish must quietly prepare a missing shop record and still attach the spotlight to the user's one shop."
);

assertLineNotContains(
  "src/pages/ShopControlPage.tsx",
  /setSpotlightFlowStep\(shop\?\.id \? "upload" : "setup"\)/,
  "Free Spotlight must not route users into shop-record setup just because the shop row has not hydrated yet."
);

assertLineNotContains(
  "src/pages/ShopControlPage.tsx",
  /Tap Continue in the spotlight setup/,
  "Free Spotlight must not tell users to fill shop setup again before publishing a product spotlight."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /import \{ rememberPublishRecovery \} from "\.\.\/lib\/publishRecovery";[\s\S]*?rememberPublishRecovery\([\s\S]*?routes\.freeSpotlight,[\s\S]*?"shop-control\.spotlight\.preview\.publish"[\s\S]*?\);/,
  "The Free Spotlight publish handler must set a recovery marker before upload/API work so Welcome/Cover can recover from an intermittent route leak."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /import \{ navigateWithOrigin \} from "\.\.\/lib\/nav";[\s\S]*?navigateWithOrigin\(navigate, routes\.subscriptionSpotlight, location[\s\S]*?debugId="shop-control\.subscription\.open"[\s\S]*?navigateWithOrigin\(navigate, routes\.subscriptionSpotlight, location[\s\S]*?debugId="shop-control\.subscription\.publisher"/,
  "Every Shop Control Subscription Spotlight route button must use shared navigation so Spotlight recovery is set before route movement."
);

assertContains(
  "src/pages/SubscriptionSpotlightPage.tsx",
  /import \{ rememberPublishRecovery \} from "\.\.\/lib\/publishRecovery";[\s\S]*?rememberPublishRecovery\([\s\S]*?APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT[\s\S]*?"subscription-spotlight\.publish"[\s\S]*?\);/,
  "The Subscription Spotlight publish handler must set a recovery marker before upload/API work so Welcome/Cover can recover from an intermittent route leak."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /debugId="shop-control\.spotlight\.media\.image"[\s\S]*?<input[\s\S]*?id="shop-control-spotlight-image-file"[\s\S]*?type="file"[\s\S]*?style=\{\{ display: "none" \}\}/,
  "The picture action and hidden upload input must stay mounted so media selection does not move the surface."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /debugId="shop-control\.spotlight\.media\.video"[\s\S]*?<input[\s\S]*?id="shop-control-spotlight-video-file"[\s\S]*?type="file"[\s\S]*?style=\{\{ display: "none" \}\}/,
  "The video action and hidden upload input must stay mounted so media selection does not move the surface."
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

assertContains(
  'src/pages/ShopControlPage.tsx',
  /const spotlightHasImage = Boolean\([\s\S]*?spotlightImageUrl[\s\S]*?const spotlightHasVideo = Boolean\([\s\S]*?spotlightVideoUrl[\s\S]*?const spotlightCanContinueToPreview =[\s\S]*?spotlightHasChosenMedia[\s\S]*?spotlightMediaFeedback\?\.tone !== 'error'/,
  'Free Spotlight preview must require prepared or saved media and remain blocked after a media preparation error.'
);

assertContains(
  'src/pages/ShopControlPage.tsx',
  /if \(!manualImageUrl && !manualVideoUrl && !spotlightImageFile && !spotlightVideoFile\)[\s\S]*?return;[\s\S]*?const createRes =[\s\S]*?getMarketplaceShopSpotlightStatus[\s\S]*?authoritativeSpotlight[\s\S]*?could not verify the saved media[\s\S]*?clearSpotlightDraft\(\)/,
  'Free Spotlight publish must reject media-less drafts and verify the authoritative saved media before clearing the draft.'
);

assertContains(
  'src/pages/shopControl/ShopControlSpotlightWorkflow.tsx',
  /data-spotlight-media-feedback[\s\S]*?disabled=\{creatingSpotlight \|\| !spotlightCanContinueToPreview\}/,
  'Free Spotlight must keep media preparation feedback inline and lock Publish until the ready-media gate passes.'
);

assertContains(
  'src/pages/SubscriptionSpotlightPage.tsx',
  /const hasReadyMedia = Boolean\(imageFile \|\| videoFile\)[\s\S]*?if \(!hasReadyMedia \|\| mediaPreparationFailed\)[\s\S]*?getMarketplaceShopSpotlightStatus[\s\S]*?authoritativeSpotlight[\s\S]*?could not verify the saved media[\s\S]*?setMessage\(/,
  'Subscription Spotlight must require ready media and verify authoritative persistence before clearing its draft.'
);

assertContains(
  'src/pages/SubscriptionSpotlightPage.tsx',
  /data-subscription-spotlight-media-feedback[\s\S]*?disabled=\{[\s\S]*?!hasReadyMedia[\s\S]*?mediaPreparationFailed/,
  'Subscription Spotlight must keep media preparation feedback inline and disable Publish without ready media.'
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
