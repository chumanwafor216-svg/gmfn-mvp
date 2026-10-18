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
const mediaRoute = readRepo("gmfn_backend/app/api/routes/marketplace_media.py");
const marketplaceRoute = readRepo("gmfn_backend/app/api/routes/marketplace.py");
const requirements = readRepo("gmfn_backend/requirements.txt");
const prep = readFrontend("src/lib/spotlightMediaPrep.ts");
const pilot = readFrontend("src/lib/spotlightPilot.ts");
const api = readFrontend("src/lib/api.ts");
const shopAssets = readFrontend("src/pages/ShopAssetsPage.tsx");
const vault = readFrontend("src/pages/VaultControlPage.tsx");
const shopControl = readFrontend("src/pages/ShopControlPage.tsx");
const subscription = readFrontend("src/pages/SubscriptionSpotlightPage.tsx");

requirePattern(requirements, /^imageio-ffmpeg==0\.6\.0$/m, "The bundled FFmpeg dependency must stay pinned.");
requirePattern(service, /MIN_VIDEO_SHORT_EDGE = 720[\s\S]*?MIN_VIDEO_FPS = 20\.0[\s\S]*?MAX_VIDEO_ASPECT_RATIO = 1\.85[\s\S]*?MAX_VIDEO_DURATION_SECONDS = 10\.0/, "The server quality thresholds changed without updating this audit.");
requirePattern(service, /"-t",[\s\S]*?str\(MAX_VIDEO_DURATION_SECONDS\)[\s\S]*?"libx264"[\s\S]*?"yuv420p"[\s\S]*?"\+faststart"/, "The server must physically trim and produce web-safe H.264 MP4.");
requirePattern(service, /"aac"[\s\S]*?"loudnorm=I=-16:TP=-1\.5:LRA=11"/, "Existing audio must keep modest AAC loudness normalisation.");
requirePattern(mediaRoute, /@router\.post\("\/video"\)[\s\S]*?Depends\(get_current_user\)[\s\S]*?normalize_marketplace_video[\s\S]*?quality_verified": True/, "The authenticated video endpoint must inspect and mark only verified output.");
requirePattern(mediaRoute, /verified_video_upload_required/g, "Direct video upload bypasses must remain closed.");
requirePattern(marketplaceRoute, /def _require_verified_marketplace_video[\s\S]*?is_verified_marketplace_video_url/, "Marketplace writes must retain the verified managed-video guard.");
requirePattern(prep, /file\.size \|\| 0\) <= maxBytes[\s\S]*?durationSeconds <= maxDurationSeconds[\s\S]*?createSpotlightReadyClip/, "The browser may keep an original only when both size and duration pass; otherwise it must create a real clip.");
requirePattern(pilot, /clean the lens[\s\S]*?good light[\s\S]*?quiet place[\s\S]*?720p-or-better[\s\S]*?opening 10 seconds/, "Shared preparation guidance must remain practical and truthful.");
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
