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
  /build_spotlight_opportunity_candidates[\s\S]*?allocate_spotlight_opportunity_candidates[\s\S]*?apply_spotlight_frequency_control[\s\S]*?plan_persistent_spotlight_delivery_opportunities[\s\S]*?_persist_presentation_lease[\s\S]*?consume_spotlight_delivery_round[\s\S]*?record_spotlight_qualifying_impression/,
  "Presentation service must plan candidate, diversity, frequency, and pacing, persist a bounded reservation, then atomically consume the round with visible qualification."
);

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS = 30[\s\S]*?SPOTLIGHT_PRESENTATION_ROTATION_MS = 5000[\s\S]*?SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS = 1000[\s\S]*?SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO = 0\.6[\s\S]*?SPOTLIGHT_PRESENTATION_INTERACTION_PAUSE_MS = 8000[\s\S]*?SPOTLIGHT_PRESENTATION_REDUCED_MOTION_ROTATION_MS = 30000/,
  "Backend presentation policy constants must be centralized and explicit."
);

assertContains(
  "gmfn_backend/app/services/spotlight_opportunity_candidate_service.py",
  /safe_limit = None if limit is None[\s\S]*?return candidates if safe_limit is None else candidates\[:safe_limit\][\s\S]*?def _active_candidate_campaign_ids[\s\S]*?query = query\.limit/,
  "Candidate discovery must honor explicit limits while allowing the canonical pacing path to request the complete eligible set."
);

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /build_spotlight_opportunity_candidates\([\s\S]*?limit=None[\s\S]*?plan_persistent_spotlight_delivery_opportunities/,
  "Canonical presentation pacing must not truncate eligible campaigns before evaluating persisted due state."
);

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /while remaining_frequency\.candidates[\s\S]*?with db\.begin_nested\(\)[\s\S]*?active_reservation[\s\S]*?_SpotlightReservationUnavailable[\s\S]*?remaining_frequency = replace[\s\S]*?continue/,
  "A campaign with an active reservation must be skipped safely so selection can retry the next eligible candidate."
);

assertContains(
  "gmfn_backend/tests/test_spotlight_presentation_contract.py",
  /test_pacing_sees_due_campaign_beyond_previous_fifty_candidate_cutoff[\s\S]*?campaign_id == 51[\s\S]*?test_active_reservation_retries_the_next_paced_candidate[\s\S]*?blocked_campaign_ids == \(1,\)[\s\S]*?consumed_campaign_ids == \(\)/,
  "Backend regressions must protect full-set pacing and next-candidate fallback around a live reservation."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /@router\.get\("\/public\/shop\/\{gmfn_id\}\/spotlight-opportunity"\)[\s\S]*?select_spotlight_presentation[\s\S]*?db\.commit\(\)[\s\S]*?opportunity_presentation_token/,
  "Public Shop opportunity endpoint must select and persist a canonical presentation reservation."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /@router\.post\("\/spotlight-presentations\/qualify"\)[\s\S]*?document_visible[\s\S]*?visible_ms[\s\S]*?visible_ratio[\s\S]*?record_spotlight_presentation_qualification/,
  "Qualification endpoint must require visible presentation evidence before writing canonical exposure."
);

assertContains(
  "frontend/src/lib/spotlightPresentationPolicy.ts",
  /PUBLIC_SHOP_SPOTLIGHT_PRESENTATION_ROTATION_MS = 5000[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_MIN_ROTATION_MS = 2000[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_MAX_CYCLE_MS = 120000[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS = 1000[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO = 0\.6[\s\S]*?publicShopSpotlightRotationMs[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_MAX_CYCLE_MS \/ safeItemCount/,
  "Frontend Public Shop presentation policy constants must be centralized."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /getPublicShopSpotlightOpportunity[\s\S]*?qualifySpotlightPresentation[\s\S]*?document\.visibilityState[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS[\s\S]*?IntersectionObserver[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO/,
  "Public Shop must fetch canonical presentation and qualify only via viewport and tab-visibility evidence."
);
assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /publicShopSpotlightSelectionCycles[\s\S]*?function loadPublicShopSpotlightPresentationCycle[\s\S]*?existingCycle\?\.promise[\s\S]*?publicShopSpotlightCycleIsAuthoritative[\s\S]*?requestId[\s\S]*?getPublicShopSpotlightOpportunity\(cleanedGmfnId,\s*requestId\)[\s\S]*?serving_contract_version[\s\S]*?safeItems[\s\S]*?authoritative:\s*true[\s\S]*?\.catch\(\(error\)[\s\S]*?publicShopSpotlightSelectionCycles\.delete\(cycleKey\)[\s\S]*?throw error/,
  "Public Shop canonical presentation selection must keep one stable issuance key, cache v2 empty results authoritatively, and fail closed for the bounded stale interval."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /publicShopSpotlightCycleExpiryMs[\s\S]*?opportunity_replay_expires_at[\s\S]*?opportunity_visibility_expires_at[\s\S]*?currentCanonicalItems[\s\S]*?expiryMs > requestFinishedAtMs[\s\S]*?\? currentCanonicalItems[\s\S]*?: \[\]/,
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
  /prefers-reduced-motion: reduce[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_REDUCED_MOTION_ROTATION_MS[\s\S]*?publicShopSpotlightRotationMs\(spotlightRotationItemCount\)[\s\S]*?spotlightHasKeyboardFocus[\s\S]*?pauseSpotlightPresentationRotation/,
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
  /fetch_reserves_round_but_consumes_nothing[\s\S]*?abandoned_reservation_spends_no_round[\s\S]*?visible_presentation_qualifies_once_and_retry_dedupes[\s\S]*?own_public_shop_can_present_another_member_without_self_delivery[\s\S]*?unlinked_repost_fallback_stays_outside_canonical_ledger/,
  "Backend presentation tests must cover reservation-vs-consumption, abandonment, idempotency, own-shop delivery of another member, self-exclusion, and unlinked fallback."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /loadNextPublicShopSpotlightPresentations[\s\S]*?newSpotlightPresentationRequestId\(\)[\s\S]*?requestNextCanonicalSpotlight[\s\S]*?spotlightQualifiedKeysRef\.current\.add\(presentationKey\)[\s\S]*?requestNextCanonicalSpotlight\(\)/,
  "The next canonical Spotlight must be requested just in time only after the current presentation qualifies visibly."
);

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /list_spotlight_presentation_replays[\s\S]*?status == "qualified"[\s\S]*?pacing_exhausted[\s\S]*?SpotlightExposureEvent\.presentation_id[\s\S]*?route_placement_ids[\s\S]*?SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS[\s\S]*?replay_expires_at = min/,
  "Canonical replay must require a matching qualified exposure and exact still-authorized route, while allowing exhausted campaigns only through a short revalidated replay lease."
);

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /SpotlightCampaign\.id == campaign_id[\s\S]*?with_for_update\(\)[\s\S]*?SpotlightPresentationLease\.presentation_id == presentation_id[\s\S]*?with_for_update\(\)[\s\S]*?db\.query\(User\.id\)[\s\S]*?_current_presentable_candidate[\s\S]*?consume_spotlight_delivery_round[\s\S]*?commit=False[\s\S]*?lease\.status = 'qualified'[\s\S]*?db\.commit\(\)/,
  "Qualification must lock campaign, lease, and viewer, recheck frequency, and atomically commit the round, exposure, and qualified lease."
);

assertContains(
  "gmfn_backend/tests/test_spotlight_presentation_contract.py",
  /test_qualification_commit_failure_rolls_back_exposure_and_lease[\s\S]*?pytest\.raises\(RuntimeError[\s\S]*?assert _ledger_count\(\) == 0[\s\S]*?assert _consumed_rounds\(\) == 0[\s\S]*?assert lease\["status"\] == "issued"/,
  "Backend tests must prove a failed qualification commit cannot advance the round or exposure without qualifying the lease."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace_analytics.py",
  /EVENT_PRODUCT_OPEN[\s\S]*?PRODUCT_MEDIA_QUALIFYING_VISIBLE_MS = 1000[\s\S]*?PRODUCT_MEDIA_MIN_VISIBLE_RATIO = 0\.6[\s\S]*?payload\.document_visible is not True[\s\S]*?payload\.visible_ms[\s\S]*?payload\.visible_ratio/,
  "Product-open analytics must reject media that lacks active-tab, duration, and viewport evidence."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /productMediaQualifiedKeysRef[\s\S]*?trackMarketplaceAttention\("product_open"[\s\S]*?visible_ms:[\s\S]*?document_visible: true[\s\S]*?IntersectionObserver[\s\S]*?PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO[\s\S]*?data-product-media-attention-id/,
  "Expanded Shop product media must qualify visibly before Product opens analytics are recorded."
);

assertContains(
  "frontend/tools/smoke-spotlight-owner-visibility.mjs",
  /testProductMediaRequiresVisibleDwell[\s\S]*?productOpenCalls !== 0[\s\S]*?waitForTimeout\(1_100\)[\s\S]*?productOpenCalls !== 1[\s\S]*?visible_ms[\s\S]*?visible_ratio[\s\S]*?document_visible/,
  "The phone-browser smoke must prove product media does not count on open and counts once only after visible dwell."
);

assertContains(
  "gmfn_backend/app/services/spotlight_presentation_service.py",
  /allow_due_campaign_ids[\s\S]*?due_frequency_replay[\s\S]*?not due_frequency_replay[\s\S]*?frequency_suppressed_campaign_ids = tuple[\s\S]*?SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP[\s\S]*?SPOTLIGHT_FREQUENCY_SUPPRESSION_DEMANDBOX_OVERRIDE_EXHAUSTED/,
  "A due replay must be explicitly authorized by same-viewer frequency suppression and must not use a past pacing deadline as its replay expiry."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /allow_due_campaign_ids=\([\s\S]*?selection\.frequency_suppressed_campaign_ids[\s\S]*?if not selection\.selected[\s\S]*?else set\(\)/,
  "The Public Shop endpoint must permit due frequency-capped continuity only when no fresh presentation was selected."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /is_canonical_replay"\] = True[\s\S]*?opportunity_presentation_token"\] = None[\s\S]*?opportunity_counts_as_delivery"\] = False[\s\S]*?opportunity_counts_as_exposure"\] = False/,
  "Replay responses must be tokenless and explicitly excluded from delivery and exposure accounting."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /activeSpotlight\.isCanonicalReplay \|\|[\s\S]*?activeSpotlight\.isCanonicalVisibility[\s\S]*?return;[\s\S]*?spotlightQualifiedKeysRef\.current\.add\(presentationKey\)[\s\S]*?trackMarketplaceAttention\(/,
  "Canonical replay must exit before qualification bookkeeping and owner attention analytics."
);

assertContains(
  "gmfn_backend/tests/test_spotlight_presentation_contract.py",
  /qualified_presentation_replays_without_new_delivery_or_exposure[\s\S]*?frequency_capped_due_campaign_replays_without_new_counting[\s\S]*?exhausted_campaign_replays_qualified_item_without_new_counting[\s\S]*?replay_revalidates_viewer_and_exact_community_route/,
  "Backend replay tests must cover accounting neutrality during pacing wait, after same-viewer frequency suppression, after pacing exhaustion, and after exact-route revocation."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /onFocusCapture=\{\(event\)[\s\S]*?focusTarget\.matches\(":focus-visible"\)[\s\S]*?setSpotlightHasKeyboardFocus\(keyboardFocus\)/,
  "Touch-generated control focus must not pause Spotlight rotation indefinitely; only keyboard focus-visible receives the unbounded focus pause."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /spotlightQualificationInFlightKeysRef[\s\S]*?qualifySpotlightPresentation[\s\S]*?const accepted = Boolean[\s\S]*?if \(!accepted\)[\s\S]*?spotlightQualifiedKeysRef\.current\.add\(presentationKey\)[\s\S]*?recordAcceptedAttention\(\)/,
  "Canonical qualification must remain retryable in flight and become locally complete only after server acceptance."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /document\.visibilityState !== "visible"[\s\S]*?publicShopSpotlightCycleIsAuthoritative[\s\S]*?requestGeneration = \+\+spotlightRefreshGenerationRef\.current[\s\S]*?requestGeneration !== spotlightRefreshGenerationRef\.current/,
  "Hidden-tab refreshes must retain authoritative governed state and stale overlapping responses must not overwrite the latest refresh."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /freshPresentationKey[\s\S]*?freshPresentationIndex[\s\S]*?weightedViewerRotationBroadcasts\[freshPresentationIndex\][\s\S]*?nextExpiryMs[\s\S]*?publicShopSpotlightPresentationIsCurrent[\s\S]*?requestNextCanonicalSpotlight/,
  "Fresh governed presentations must be prioritized and canonical rows must be removed and replenished at their server expiry."
);

assertContains(
  "frontend/src/lib/spotlightPilot.ts",
  /maximumSafeOccurrences[\s\S]*?entry\.item !== previous[\s\S]*?queue\[0\] === queue\[queue\.length - 1\][\s\S]*?queue\.pop\(\)/,
  "Weighted rotation must not manufacture consecutive identical presentations or a duplicate cycle boundary."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /spotlightWhatsAppAvailable[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?"minmax\(0, 1fr\) 48px"[\s\S]*?gridColumn: isCompact \? "1 \/ -1"[\s\S]*?heroImage && !ownerSpotlightStatusView/,
  "Compact Spotlight contact must remain inside the card, disappear without a live contact, and never reuse shop hero media for a non-live owner status."
);

assertContains(
  "gmfn_backend/app/services/spotlight_pacing_state_service.py",
  /to_volatile_state[\s\S]*?next_eligible_delivery_at=self\.next_eligible_delivery_at/,
  "Persistent next-eligible pacing state must reach the planner instead of being discarded."
);

assertContains(
  'frontend/src/components/SpotlightMediaFrame.tsx',
  /onMediaReady\?:[\s\S]*?onMediaUnavailable\?:[\s\S]*?IMAGE_AUTO_RETRY_LIMIT[\s\S]*?props\.onMediaUnavailable[\s\S]*?onLoadedData=\{reportMediaReady\}[\s\S]*?onCanPlay=\{reportMediaReady\}[\s\S]*?onLoad=\{reportMediaReady\}/,
  'Shared Spotlight media must report real image/video readiness and terminal unavailability after bounded retries.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /spotlightHasRenderableMedia[\s\S]*?spotlightMediaReadyKey !== spotlightMediaKey[\s\S]*?qualifySpotlightPresentation[\s\S]*?onMediaReady=\{\(\) =>[\s\S]*?setSpotlightMediaReadyKey\(spotlightMediaKey\)[\s\S]*?onMediaUnavailable=\{\(\) =>[\s\S]*?this showing will not be counted/,
  'Public Shop must not qualify or record a Spotlight until its actual media has rendered, and failed media must remain uncounted.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /\.catch\(\(error\) => \{[\s\S]*?publicShopSpotlightSelectionCycles\.delete\(cycleKey\)[\s\S]*?throw error[\s\S]*?viewerSpotlightRows === undefined[\s\S]*?retainedCanonicalBroadcasts[\s\S]*?loadViewerSpotlightRowsWithFeedback[\s\S]*?setSpotlightFeedError[\s\S]*?data-spotlight-feed-error/,
  'Canonical request errors must stay distinct from a true empty result, retain current valid rows, and disclose automatic retry.'
);

assertContains(
  'gmfn_backend/app/services/spotlight_presentation_service.py',
  /SPOTLIGHT_PRESENTATION_MAX_UNQUALIFIED_ATTEMPTS_PER_VIEWER = 2[^]*?abandoned_attempt_count[^]*?[.]count[(][)][^]*?>=[^]*?SPOTLIGHT_PRESENTATION_MAX_UNQUALIFIED_ATTEMPTS_PER_VIEWER/,
  'One expired unqualified lease may recover once, while a second abandonment must block the same viewer and campaign version.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /spotlightPresentationGateRef[^]*?spotlightPresentationVisibleRef[^]*?loadViewerSpotlightRows[^]*?!spotlightPresentationVisibleRef[.]current[^]*?elementIsVisible[(]rail[)][^]*?IntersectionObserver/,
  'Canonical selection must remain dormant until the Public Shop Spotlight surface is genuinely visible.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /spotlightRotationActiveKey[^]*?remainingVisibleMs = spotlightRotationDelayMs[^]*?!spotlightPresentationVisibleRef[.]current[^]*?remainingVisibleMs -=[^]*?advancePastActiveOccurrence/,
  'Every active Spotlight item must receive its own complete visible dwell before rotation advances.'
);

assertContains(
  'frontend/tools/smoke-spotlight-owner-visibility.mjs',
  /testCanonicalIssuanceWaitsForVisibleSpotlightSurface[^]*?canonicalCalls !== 0[^]*?scrollIntoViewIfNeeded[^]*?canonicalCalls < 1[^]*?qualifyCalls < 1/,
  'The phone smoke must prove off-screen loading cannot consume a presentation lease and visible media still qualifies normally.'
);

assertContains(
  'frontend/tools/smoke-spotlight-owner-visibility.mjs',
  /testSpotlightSoundPersistsAcrossRotation[^]*?Turn video sound on[^]*?Turn video sound off[^]*?Community Spotlight 2[^]*?rotatedVideoState[^]*?muted[^]*?volume[^]*?Turn video sound off[^]*?Turn video sound on/,
  'The phone smoke must prove one sound-on tap survives video rotation and sound remains manually reversible.'
);

assertContains(
  'frontend/src/components/SpotlightMediaFrame.tsx',
  /imageRef[^]*?image[.]complete[^]*?image[.]naturalWidth > 0[^]*?video[.]readyState >= HTMLMediaElement[.]HAVE_CURRENT_DATA[^]*?props[.]onMediaReady/,
  'Cached image and video readiness must still reach the Public Shop qualification and dwell gates.'
);

assertContains(
  'frontend/src/components/SpotlightMediaFrame.tsx',
  /audioEnabled\?: boolean[^]*?onAudioEnabledChange\?: \(enabled: boolean\)[^]*?props\.audioEnabled === undefined[^]*?!props\.audioEnabled[^]*?props\.onAudioEnabledChange\?\.\(false\)[^]*?props\.onAudioEnabledChange\?\.\(true\)/,
  'Shared Spotlight media must support a parent-owned sound preference without changing existing uncontrolled media cards.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /spotlightSoundEnabled[^]*?audioEnabled=\{spotlightSoundEnabled\}[^]*?onAudioEnabledChange=\{setSpotlightSoundEnabled\}/,
  'Public Shop must retain the chosen Spotlight sound state above individual rotating media frames.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /recoverExpiredPublicShopSession[^]*?logout\(\)[^]*?\/login\?session=expired&force=1[^]*?status === 401[^]*?recoverExpiredPublicShopSession\(\)[^]*?requestNextCanonicalSpotlight[^]*?status === 401[^]*?recoverExpiredPublicShopSession\(\)/,
  'An expired authenticated Public Shop Spotlight read must clear the stale session and open sign-in instead of leaving a blank rail.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /source_shop_whatsapp[^]*?sourceShopWhatsApp[^]*?spotlightWhatsAppAvailable/,
  'Spotlight normalization must retain an already-normalized WhatsApp contact.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /advertiser_contact_phone[^]*?advertiserContactPhone[^]*?spotlightAdvertiserCallUrl[^]*?spotlightContactAvailable[^]*?shop-gallery\.spotlight\.contact-advertiser[^]*?Call advertiser/,
  'GSN-house Spotlight must retain its explicit advertiser phone and expose one call action without adding another competing button.'
);

assertContains(
  'gmfn_backend/app/services/spotlight_presentation_service.py',
  /SPOTLIGHT_PRESENTATION_VISIBILITY_SCAN_LIMIT[^]*?class SpotlightPresentationVisibility[^]*?counts_as_delivery[^]*?False[^]*?counts_as_exposure[^]*?False[^]*?list_spotlight_presentation_visibility[^]*?scan_limit[^]*?build_spotlight_opportunity_candidates[^]*?allocate_spotlight_opportunity_candidates[^]*?_placement_for_candidate/,
  'Live eligible Spotlight visibility must remain canonical, bounded, revalidated, and accounting-neutral outside delivery pacing.'
);

assertContains(
  'gmfn_backend/app/api/routes/marketplace.py',
  /list_spotlight_presentation_visibility[^]*?is_canonical_visibility[^]*?opportunity_presentation_token[^]*?None[^]*?opportunity_counts_as_delivery[^]*?False[^]*?opportunity_counts_as_exposure[^]*?False/,
  'Public Shop visibility rows must be tokenless and explicitly excluded from delivery and exposure accounting.'
);

assertContains(
  'gmfn_backend/app/api/routes/marketplace.py',
  /replay_candidates = list_spotlight_presentation_replays[^]*?replay_campaign_ids[^]*?visibility = list_spotlight_presentation_visibility[^]*?exclude_campaign_ids=visible_campaign_ids \| replay_campaign_ids[^]*?Recent qualified replays are continuity-only fallbacks[^]*?replays = replay_candidates\[:max\(5 - len\(items\), 0\)\]/,
  'Eligible bounded visibility must fill the phone batch before recent qualified replays are allowed to use leftover slots.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /advancePastActiveOccurrence[^]*?activeRows\.filter\(\(_, index\) => index !== activeIndex\)[^]*?Consume this occurrence after one complete dwell[^]*?advancePastActiveOccurrence\(\)/,
  'Public Shop must consume each queued occurrence after one complete dwell instead of circularly repeating early promotions.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /minimumSafeStartMs = Math\.min\([^]*?PUBLIC_SHOP_SPOTLIGHT_PRESENTATION_ROTATION_MS[^]*?activeDeadlineMs - Date\.now\(\) < minimumSafeStartMs/,
  'The server-deadline guard must protect one standard readable dwell without dropping reduced-motion presentations immediately.'
);

assertContains(
  'gmfn_backend/tests/test_spotlight_presentation_contract.py',
  /test_nineteen_item_visibility_windows_advance_before_wrapping[^]*?candidate_count = 19[^]*?len\(set\(flattened\[:candidate_count\]\)\) == candidate_count/,
  'The backend regression must prove four bounded windows cover a 19-item inventory before wrapping.'
);

assertContains(
  'frontend/src/pages/ShopGalleryPage.tsx',
  /loadNextPublicShopSpotlightPresentations[^]*?throw new Error[^]*?catch \(err: any\)[^]*?last valid showing is kept[^]*?SPOTLIGHT_REFRESH_RETRY_LIMIT/,
  'A failed Spotlight refresh must remain distinct from a genuine empty response, preserve valid content, and retry only within a bound.'
);

assertContains(
  'frontend/tools/smoke-spotlight-owner-visibility.mjs',
  /testCanonicalRefreshFailureKeepsCurrentSpotlight[^]*?transient refresh outage erased[^]*?canonicalCalls !== 5[^]*?qualifyCalls !== 1[^]*?impressionCalls !== 1/,
  'The phone smoke must prove a transient canonical outage preserves the last valid Spotlight and cannot alter accounting.'
);

assertContains(
  'gmfn_backend/tests/test_spotlight_presentation_contract.py',
  /pacing_gap_keeps_unseen_active_spotlight_visible_without_counting[^]*?exhausted_delivery_budget_keeps_live_spotlight_visible_without_counting[^]*?multiple_paced_campaigns_share_bounded_non_counting_rotation/,
  'Backend regressions must prove continuous visibility through pacing gaps, exhausted budgets, and multi-campaign rotation without accounting changes.'
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
