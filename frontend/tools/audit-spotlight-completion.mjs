/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(toolDir, "..", "..");
const findings = [];

function read(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function requirePattern(path, pattern, message) {
  if (!pattern.test(read(path))) findings.push({ path, message });
}

function forbidPattern(path, pattern, message) {
  if (pattern.test(read(path))) findings.push({ path, message });
}

requirePattern(
  "frontend/src/lib/spotlightPilot.ts",
  /SPOTLIGHT_PILOT_ROTATION_MS = 12000[\s\S]*?SPOTLIGHT_PREMIUM_MAX_VIDEO_SECONDS = 12[\s\S]*?SPOTLIGHT_MIN_IMAGE_SHORT_EDGE = 720[\s\S]*?SPOTLIGHT_MIN_VIDEO_SHORT_EDGE = 576[\s\S]*?SPOTLIGHT_MIN_VIDEO_FPS = 24/,
  "Spotlight must publish and present against the approved 12-second premium profile."
);
requirePattern(
  "gmfn_backend/app/services/marketplace_media_quality_service.py",
  /SPOTLIGHT_MIN_VIDEO_SHORT_EDGE = 576[\s\S]*?SPOTLIGHT_MIN_VIDEO_FPS = 24\.0[\s\S]*?SPOTLIGHT_MAX_VIDEO_DURATION_SECONDS = 12\.0[\s\S]*?delivery_profile[\s\S]*?is_spotlight_delivery/,
  "Backend preparation must apply the premium limits only to Spotlight delivery."
);
requirePattern(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /SPOTLIGHT_PRESENTATION_VIDEO_MAX_ROTATION_MS = 12000/,
  "Backend presentation timing must match the 12-second maximum."
);
requirePattern(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /(?=[\s\S]*data-spotlight-immersive)(?=[\s\S]*100dvh)(?=[\s\S]*data-spotlight-view-action="immersive")(?=[\s\S]*data-spotlight-information-overlay)(?=[\s\S]*data-spotlight-action-row)/,
  "Public Shop Spotlight must expose one edge-to-edge immersive stage with overlay and persistent actions."
);
requirePattern(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /listSavedMarketplaceProducts[\s\S]*?listLikedMarketplaceProducts[\s\S]*?data-spotlight-product-action="save"[\s\S]*?data-spotlight-product-action="like"[\s\S]*?data-spotlight-product-action="ask-seller"[\s\S]*?data-spotlight-product-action="business-area"/,
  "Spotlight must hydrate and expose private Save, private Like, protected enquiry, and public Business Area actions."
);
requirePattern(
  "gmfn_backend/app/api/routes/marketplace.py",
  /@router\.get\("\/products\/liked"\)[\s\S]*?@router\.put\("\/products\/\{product_id\}\/like"\)[\s\S]*?_get_saveable_product[\s\S]*?@router\.delete\("\/products\/\{product_id\}\/like"\)/,
  "Private Like must reuse the product visibility and owner-self-action guard."
);
requirePattern(
  "gmfn_backend/alembic/versions/20261125_product_likes.py",
  /marketplace_product_likes[\s\S]*?UniqueConstraint\("product_id", "user_id"/,
  "The unexecuted Like migration must enforce one private preference per user and product."
);
requirePattern(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /createMarketplacePurchaseIntention[\s\S]*?origin_source: "spotlight"[\s\S]*?\/app\/demand-box\?demand_id=[\s\S]*?data-spotlight-protected-sales-path/,
  "Buy Now must create a source-attributed private purchase intention and retain the Protected Sales path."
);
requirePattern(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /contactSpotlightProductSeller[\s\S]*?createMarketplaceProductEnquiry[\s\S]*?Need more information\? Ask seller/,
  "Ask Seller must remain an optional enquiry path rather than the purchase prerequisite."
);
forbidPattern(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /like_count|publicLike|public_like|sellerLikeNotification/,
  "Private Like must not introduce public counts or seller notifications."
);

if (findings.length) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: 10 }, null, 2));
