/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(toolDir, "..", "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const text = read(file);
  if (!pattern.test(text)) {
    findings.push({ file, line: 1, message, text: "Expected pattern was not found." });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  if (pattern.test(text)) {
    findings.push({ file, line: 1, message, text: "Forbidden pattern was found." });
  }
}

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /build_spotlight_opportunity_candidates[\s\S]*?allocate_spotlight_opportunity_candidates[\s\S]*?apply_spotlight_frequency_control[\s\S]*?plan_persistent_spotlight_delivery_opportunities[\s\S]*?consume_spotlight_delivery_round[\s\S]*?_persist_presentation_lease[\s\S]*?record_spotlight_qualifying_impression/,
  "Presentation service must plan candidate, diversity, frequency, and pacing stages before atomically consuming a round with the durable lease, then qualify through the ledger."
);

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /SPOTLIGHT_PRESENTATION_ROTATION_MS = 2000[\s\S]*?SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS = 1000[\s\S]*?SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO = 0\.6[\s\S]*?SPOTLIGHT_PRESENTATION_INTERACTION_PAUSE_MS = 8000[\s\S]*?SPOTLIGHT_PRESENTATION_REDUCED_MOTION_ROTATION_MS = 30000/,
  "Backend presentation policy constants must be centralized and explicit."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /@router\.get\("\/public\/shop\/\{gmfn_id\}\/spotlight-opportunity"\)[\s\S]*?select_spotlight_presentation[\s\S]*?db\.commit\(\)[\s\S]*?opportunity_presentation_token/,
  "Public Shop opportunity endpoint must select a canonical presentation and persist consumed delivery rounds."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /@router\.post\("\/spotlight-presentations\/qualify"\)[\s\S]*?document_visible[\s\S]*?visible_ms[\s\S]*?visible_ratio[\s\S]*?record_spotlight_presentation_qualification/,
  "Qualification endpoint must require visible presentation evidence before writing canonical exposure."
);

assertContains(
  "frontend/src/lib/spotlightPresentationPolicy.ts",
  /PUBLIC_SHOP_SPOTLIGHT_PRESENTATION_ROTATION_MS = 2000[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS = 1000[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO = 0\.6/,
  "Frontend Public Shop presentation policy constants must be centralized."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /getPublicShopSpotlightOpportunity[\s\S]*?qualifySpotlightPresentation[\s\S]*?document\.visibilityState[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS[\s\S]*?IntersectionObserver[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO/,
  "Public Shop must fetch canonical presentation and qualify only via viewport and tab-visibility evidence."
);
assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /publicShopSpotlightSelectionCycles[\s\S]*?function loadPublicShopSpotlightPresentationCycle[\s\S]*?existingCycle\?\.promise[\s\S]*?publicShopSpotlightCycleIsAuthoritative[\s\S]*?requestId[\s\S]*?getPublicShopSpotlightOpportunity\(cleanedGmfnId,\s*requestId\)[\s\S]*?serving_contract_version[\s\S]*?authoritative:\s*true[\s\S]*?items:\s*\[\][\s\S]*?SPOTLIGHT_PILOT_REFRESH_MS/,
  "Public Shop canonical presentation selection must keep one stable issuance key, cache v2 empty results authoritatively, and fail closed for the bounded stale interval."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /publicShopSpotlightCycleExpiryMs[\s\S]*?filter\(\(value\) => Number\.isFinite\(value\)\)[\s\S]*?expiryMs > requestFinishedAtMs[\s\S]*?\? opportunityItems[\s\S]*?: \[\]/,
  "Elapsed server presentation deadlines must survive parsing so delayed responses fail closed instead of receiving a fresh client lease."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /function handleVisibilityChange\(\)[\s\S]*?revalidateSpotlightPresentation[\s\S]*?result\?\.valid === true[\s\S]*?publicShopSpotlightSelectionCycles\.delete[\s\S]*?clearQualificationTimer/,
  "A previously hidden Public Shop page must revalidate its existing presentation and invalidate stale cached delivery before qualification."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /const replacingHeldContent[\s\S]*?!replacingHeldContent[\s\S]*?A free Spotlight is already live[\s\S]*?const createRes = replacingHeldContent[\s\S]*?replaceSpotlightContent/,
  "A genuine correction-hold replacement must bypass the new-free-campaign guard and use the replacement writer."
);

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /SPOTLIGHT_PRESENTATION_TOKEN_TTL_SECONDS = 30[\s\S]*?SpotlightPresentationLease[\s\S]*?issuance_key[\s\S]*?lease_expires_at/,
  "Presentation leases must be durable, retry-keyed, and bounded to the 30-second maximum."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /async function loadViewerSpotlightRows\(cleanedGmfnId: string\)[\s\S]*?loadPublicShopSpotlightPresentationCycle\(\s*cleanedGmfnId\s*\)[\s\S]*?const res = await getMarketplaceBroadcasts\(\{[\s\S]*?clan_id: null,[\s\S]*?active_only: true,[\s\S]*?limit: 24,[\s\S]*?\}\)/,
  "Public Shop Spotlight loader must ask the guarded canonical selector once before using the legacy broadcast fallback."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /prefers-reduced-motion: reduce[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_REDUCED_MOTION_ROTATION_MS[\s\S]*?spotlightHasKeyboardFocus[\s\S]*?pauseSpotlightPresentationRotation/,
  "Public Shop rotation must respect reduced motion, keyboard focus, and interaction pause."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /public_shop_spotlight_canonical_visible[\s\S]*?public_shop_spotlight_legacy_visible[\s\S]*?client_event_id: attentionClientEventId/,
  "Owner attention analytics must remain separate and idempotent after visible qualification."
);

assertNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /getPublicShopSpotlightOpportunity|qualifySpotlightPresentation|spotlightPresentationPolicy|CommunityMarketplaceSpotlight/,
  "Dashboard must not become a live Spotlight presentation surface."
);

assertNotContains(
  "frontend/src/pages/CommunityHomePage.tsx",
  /getPublicShopSpotlightOpportunity|qualifySpotlightPresentation|spotlightPresentationPolicy|CommunityMarketplaceSpotlight/,
  "Community Home must not become a live Spotlight presentation surface."
);

assertNotContains(
  "frontend/src/App.tsx",
  /CommunityMarketplaceSpotlight/,
  "The legacy CommunityMarketplaceSpotlight component must not be remounted."
);

assertNotContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /60\s*\/\s*40|0\.4[\s\S]*?source.*ratio|source.*ratio[\s\S]*?0\.4/i,
  "Public Shop frontend must not implement source-ratio allocation or 60/40 logic."
);

assertContains(
  "gmfn_backend/tests/test_spotlight_presentation_contract.py",
  /fetch_consumes_delivery_round_but_not_impression[\s\S]*?visible_presentation_qualifies_once_and_retry_dedupes[\s\S]*?own_public_shop_can_present_another_member_without_self_delivery[\s\S]*?unlinked_repost_fallback_stays_outside_canonical_ledger/,
  "Backend presentation tests must cover fetch-vs-impression, idempotency, own-shop delivery of another member, self-exclusion, and unlinked fallback."
);

if (findings.length > 0) {
  console.error("Spotlight presentation contract audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
    console.error(`  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Spotlight presentation contract audit passed.");
