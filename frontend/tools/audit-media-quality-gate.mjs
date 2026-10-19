/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

function readFrontend(path) {
  return readFileSync(join(frontendRoot, path), "utf8");
}

function readRepo(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function requirePattern(source, pattern, message) {
  if (!pattern.test(source)) findings.push(message);
}

function forbidPattern(source, pattern, message) {
  if (pattern.test(source)) findings.push(message);
}

const service = readRepo(
  "gmfn_backend/app/services/marketplace_media_quality_service.py"
);
const serviceTests = readRepo(
  "gmfn_backend/tests/test_marketplace_media_quality.py"
);
const mediaRoute = readRepo("gmfn_backend/app/api/routes/marketplace_media.py");
const marketplaceRoute = readRepo("gmfn_backend/app/api/routes/marketplace.py");
const screenSpecs = readRepo("docs/SCREEN_SPECS.md");
const freezePolicy = readRepo("docs/FREEZE_POLICY.md");
const requirements = readRepo("gmfn_backend/requirements.txt");
const prep = readFrontend("src/lib/spotlightMediaPrep.ts");
const pilot = readFrontend("src/lib/spotlightPilot.ts");
const api = readFrontend("src/lib/api.ts");
const shopAssets = readFrontend("src/pages/ShopAssetsPage.tsx");
const vault = readFrontend("src/pages/VaultControlPage.tsx");
const shopControl = readFrontend("src/pages/ShopControlPage.tsx");
const subscription = readFrontend("src/pages/SubscriptionSpotlightPage.tsx");

requirePattern(requirements, /^imageio-ffmpeg==0\.6\.0$/m, "The bundled FFmpeg dependency must stay pinned.");
requirePattern(service, /MIN_VIDEO_SHORT_EDGE = 360[\s\S]*?MIN_VIDEO_FPS = 15\.0[\s\S]*?MAX_VIDEO_ASPECT_RATIO = 2\.4[\s\S]*?MAX_VIDEO_DURATION_SECONDS = 10\.0/, "The server must keep a practical hard-rejection floor without restoring the rigid 720p gate.");
requirePattern(service, /MAX_SOURCE_VIDEO_BYTES = 100 \* 1024 \* 1024[\s\S]*?MAX_NORMALIZED_VIDEO_BYTES = 15 \* 1024 \* 1024/, "Large phone sources and bounded published outputs must retain separate ceilings.");
requirePattern(service, /"-t",[\s\S]*?str\(MAX_VIDEO_DURATION_SECONDS\)[\s\S]*?"libx264"[\s\S]*?"yuv420p"[\s\S]*?"\+faststart"/, "The server must physically trim and produce web-safe H.264 MP4.");
requirePattern(service, /"aac"[\s\S]*?"loudnorm=I=-16:TP=-1\.5:LRA=11"/, "Existing audio must keep modest AAC loudness normalisation.");
requirePattern(mediaRoute, /@router\.post\("\/video"\)[\s\S]*?Depends\(get_current_user\)[\s\S]*?normalize_marketplace_video[\s\S]*?quality_verified": True/, "The authenticated video endpoint must inspect and mark only verified output.");
requirePattern(mediaRoute, /_write_limited_upload\([\s\S]*?MAX_SOURCE_VIDEO_BYTES[\s\S]*?normalize_marketplace_video/, "The server must stream a bounded large source before normalising it.");
requirePattern(mediaRoute, /verified_video_upload_required/g, "Direct video upload bypasses must remain closed.");
requirePattern(marketplaceRoute, /def _require_verified_marketplace_video[\s\S]*?is_verified_marketplace_video_url/, "Marketplace writes must retain the verified managed-video guard.");
requirePattern(prep, /file\.size \|\| 0\) <= maxBytes[\s\S]*?durationSeconds <= maxDurationSeconds[\s\S]*?createSpotlightReadyClip/, "The browser may keep an original only when both size and duration pass; otherwise it must create a real clip.");
requirePattern(prep, /This is not a quality-gate bypass[\s\S]*?server inspects,[\s\S]*?trims and normalises/, "Unsupported phone-side preparation must fall back to the authoritative server gate.");
requirePattern(pilot, /clean the lens[\s\S]*?good light[\s\S]*?quiet place[\s\S]*?Common social-video downloads are accepted[\s\S]*?opening 10 seconds[\s\S]*?extremely small[\s\S]*?very choppy/, "Shared guidance must accept usable social video and reserve rejection for clearly unusable sources.");
requirePattern(serviceTests, /accepts_usable_576x1296_social_portrait[\s\S]*?size="576x1296"[\s\S]*?output\.short_edge >= MIN_VIDEO_SHORT_EDGE/, "Backend regression coverage must prove the reported 576x1296 portrait video is accepted and prepared.");
requirePattern(screenSpecs, /practical hard-rejection floor[\s\S]*?576x1296[\s\S]*?must not require 720p/, "Screen specs must record the owner-approved usable-social-video correction.");
requirePattern(freezePolicy, /Media Quality Gate v1 usable-social-video correction[\s\S]*?576x1296[\s\S]*?must not require 720p/, "Freeze policy must record the owner-approved quality-gate correction.");
requirePattern(api, /j\.detail\.message \|\| j\.detail\.explanation \|\| j\.detail\.error/, "Structured server rejections must surface their plain corrective message.");
requirePattern(shopAssets, /shop-assets\.product\.remove-video[\s\S]*?New pasted video links are not accepted/, "Shop Assets must keep removal and reject pasted video links.");
requirePattern(vault, /vault-control\.editor\.remove-video[\s\S]*?New pasted video links are not accepted/, "Vault Control must keep removal and reject pasted video links.");
forbidPattern(shopAssets, /placeholder="Paste video link"/, "Shop Assets restored the pasted-video bypass.");
forbidPattern(vault, /placeholder="Paste video link"/, "Vault Control restored the pasted-video bypass.");
forbidPattern(shopControl, /canUseOriginalForPilot/, "Shop Control restored the untrimmed original-file fallback.");
forbidPattern(subscription, /canUseOriginalForPilot/, "Subscription Spotlight restored the untrimmed original-file fallback.");

if (findings.length) {
  console.error("Media quality gate audit failed:");
  findings.forEach((finding) => console.error("- " + finding));
  process.exit(1);
}

console.log("Media quality gate audit passed.");
