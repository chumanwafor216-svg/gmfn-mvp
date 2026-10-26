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
  /<StableButton[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => \{[\s\S]*?setSpotlightMediaChoice\(spotlightImageFile \? "both" : "video"\)[\s\S]*?shop-control-spotlight-video-file[\s\S]*?input\.value = ""[\s\S]*?input\.click\(\)[\s\S]*?debugId="shop-control\.spotlight\.media\.video"/,
  "The Free Spotlight video selector must reset before opening so choosing the same phone file again still fires the media handler."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /<PrimaryButton[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => handleCreateSpotlight\(\)\}[\s\S]*?debugId="shop-control\.spotlight\.preview\.publish"/,
  "The Free Spotlight publish control must be an explicit button action, not a submit/navigation fallthrough."
);

assertContains(
  "src/pages/shopControl/ShopControlSpotlightWorkflow.tsx",
  /async function openSpotlightReview\(\)[\s\S]*?spotlightVideoSound[\s\S]*?!spotlightCanContinueToPreview[\s\S]*?prepareSpotlightNaturalFinish\(\)[\s\S]*?setSpotlightFlowStep\("preview"\)/,
  "Free Spotlight must explain recoverable review blockers and prepare an enabled Natural Finish before opening review."
);

assertContains(
  "src/pages/shopControl/ShopControlSpotlightWorkflow.tsx",
  /function focusSpotlightTarget[\s\S]*?data-spotlight-video-options[\s\S]*?video-sound\.rights[\s\S]*?!spotlightHasImage && !spotlightHasVideo[\s\S]*?shop-control-spotlight-add-picture[\s\S]*?!safeSpotlightText\(spotlightProductName\)[\s\S]*?shop-control-spotlight-item/,
  "Check and publish must open or focus the exact sound-rights, media, or item control that needs attention."
);

assertContains(
  "src/pages/shopControl/ShopControlSpotlightWorkflow.tsx",
  /data-spotlight-publish-actions="persistent"[\s\S]*?onClick=\{\(\) => openSpotlightReview\(\)\}[\s\S]*?Check and publish[\s\S]*?debugId="shop-control\.spotlight\.upload\.cancel"/,
  "The phone composer must keep a visible Check and publish action before optional video tools, with its stable close action."
);

assertContains(
  "src/pages/shopControl/ShopControlSpotlightWorkflow.tsx",
  /data-spotlight-video-options[\s\S]*?debugId="shop-control\.spotlight\.video-options"[\s\S]*?Improve my video automatically[\s\S]*?<option value=\{5\}>[\s\S]*?5 seconds[\s\S]*?<option value=\{10\}>[\s\S]*?10 seconds[\s\S]*?<VideoSoundEditor/,
  "Optional sound and automatic video improvement must stay inside one closed Video options disclosure."
);

assertLineNotContains(
  "src/pages/shopControl/ShopControlSpotlightWorkflow.tsx",
  /Prepare finished preview|debugId="shop-control\.spotlight\.video-finish"/,
  "Free Spotlight must not reintroduce a separate manual video-finish step before Check and publish."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /function isSpotlightVideoFile\([\s\S]*?SPOTLIGHT_ALLOWED_VIDEO_EXTENSIONS\.includes\(ext\)[\s\S]*?startsWith\("video\/"\)[\s\S]*?function isSpotlightImageFile\([\s\S]*?SPOTLIGHT_ALLOWED_IMAGE_EXTENSIONS\.includes\(ext\)[\s\S]*?startsWith\("image\/"\)[\s\S]*?handleSpotlightImagePicked[\s\S]*?isSpotlightVideoFile\(file\)[\s\S]*?handleSpotlightVideoPicked\(file\)[\s\S]*?handleSpotlightVideoPicked[\s\S]*?isSpotlightImageFile\(file\)[\s\S]*?handleSpotlightImagePicked\(file\)/,
  "Spotlight must recover when a phone returns a selected video through the picture input or a picture through the video input."
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

assertContains(
  "src/pages/ShopControlPage.tsx",
  /Number\(err\?\.status \|\| 0\) === 401[\s\S]*?rememberPublishRecovery\([\s\S]*?shop-control\.spotlight\.shop\.session-expired[\s\S]*?setAccessToken\(null\)[\s\S]*?\/login\?session=expired&force=1&next=/,
  "Expired Spotlight shop sessions must preserve the publisher return target, clear the stale token, and open the existing forced sign-in recovery flow."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /const activeShop = shop\?\.id \? shop : await ensureSpotlightShopRecord\(\);\s*if \(!activeShop\?\.id\) return;/,
  "The Spotlight publish caller must preserve the exact shop preparation outcome instead of overwriting authentication or governance feedback with a generic linkage error."
);

assertLineNotContains(
  "src/pages/ShopControlPage.tsx",
  /GSN could not connect this spotlight to your shop yet/,
  "Spotlight must not hide authentication or governance outcomes behind a false shop-linkage error."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /const sessionExpired = searchParams\.get\("session"\) === "expired";[\s\S]*?previous sign-in expired before GSN could finish the action[\s\S]*?choose the picture or video again before publishing/,
  "Forced sign-in recovery must explain why Spotlight stopped and that phone media must be selected again after login."
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
  /data-paid-promotion-primary-action="true"[\s\S]*?data-paid-promotion-video-options="true"[\s\S]*?data-subscription-spotlight-media-feedback/,
  'Paid promotion must place its guarded primary action before optional video controls and preparation feedback.'
);

assertContains(
  'src/pages/SubscriptionSpotlightPage.tsx',
  /disabled=\{[\s\S]*?!hasReadyMedia[\s\S]*?mediaPreparationFailed[\s\S]*?debugId="subscription-spotlight\.publish"[\s\S]*?data-paid-promotion-primary-action="true"/,
  'Subscription Spotlight must keep media preparation feedback inline and disable Publish without ready media.'
);

assertContains(
  'src/pages/SubscriptionSpotlightPage.tsx',
  /type PaidPromotionStage = "activate" \| "payment" \| "publish" \| "live"[\s\S]*?const hasOpenPayment = Boolean\([\s\S]*?const paidPromotionStage: PaidPromotionStage =[\s\S]*?effectiveActivePaidCount > 0[\s\S]*?: canPublishPaid[\s\S]*?: hasOpenPayment[\s\S]*?data-paid-promotion-next-step=\{paidPromotionStage\}/,
  'Paid promotion must derive one truthful phone next step from live, ready-credit, open-payment, or activation state.'
);

assertContains(
  'src/pages/SubscriptionSpotlightPage.tsx',
  /function PhonePaidPromotionStage[\s\S]*?data-paid-promotion-stage-active=\{active \? "true" : "false"\}[\s\S]*?<details[\s\S]*?<StableDisclosureSummary[\s\S]*?paidPromotionStage === "activate"[\s\S]*?paidPromotionStage === "payment"[\s\S]*?paidPromotionStage === "publish" \|\| paidPromotionStage === "live"/,
  'Only the relevant Paid promotion stage may lead on phone; the other complete stages must remain behind disclosures.'
);

assertContains(
  'src/pages/SubscriptionSpotlightPage.tsx',
  /\{isCompact \? shopName : "Subscription Spotlight"\}[\s\S]*?display: isCompact \? "none" : "block"[\s\S]*?What to do next[\s\S]*?1\. Choose a paid promotion plan[\s\S]*?2\. Complete bank transfer[\s\S]*?3\. Create your paid promotion/,
  'Paid promotion must use direct member wording on phone while preserving the desktop Subscription Spotlight identity.'
);

assertContains(
  'src/pages/SubscriptionSpotlightPage.tsx',
  /async function runPaidPromotionPrimaryAction\(\)[\s\S]*?prepareNaturalFinish\(\)[\s\S]*?publishSpotlight\(\)[\s\S]*?What are you promoting\?[\s\S]*?Add a picture or short video[\s\S]*?"Publish paid promotion"[\s\S]*?open=\{!isCompact\}[\s\S]*?data-paid-promotion-video-options="true"/,
  'Paid promotion must show the required content first, keep phone video options closed, and expose one truthful prepare-or-publish action.'
);

assertContains(
  'src/layout/AppLayout.tsx',
  /pathname === "\/app\/shop-control\/subscription-spotlight"[\s\S]*?title: "Paid promotion"[\s\S]*?Complete the next payment or publishing step for your shop[\s\S]*?pathname === "\/app\/shop-control\/subscription-spotlight"[\s\S]*?page: "Paid promotion"/,
  'The focused-route shell must call the member task Paid promotion and explain its next action plainly.'
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
