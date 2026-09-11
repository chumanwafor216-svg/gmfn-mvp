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
  "gmfn_backend/app/api/routes/marketplace.py",
  /if shop is not None:[\s\S]*?if priority_mode != SPOTLIGHT_PAID and visibility_scope == "direct_communities":[\s\S]*?target_clan_ids = \[[\s\S]*?_get_active_clan_ids_for_user\([\s\S]*?user_id=int\(current_user\.id\)[\s\S]*?if _shop_is_visible_in_clan\(db, shop=shop, clan_id=int\(clan_id\)\)/,
  "Free shop Spotlight must target every active community where the one-shop owner is visible, not only the shop's original or selected community."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /FREE_SPOTLIGHT_DAILY_LIMIT_PER_AUTHOR = 1[\s\S]*?def _count_free_spotlight_runs_for_author_today\([\s\S]*?MarketplaceBroadcast\.author_user_id == int\(author_user_id\)[\s\S]*?MarketplaceBroadcast\.priority_mode != SPOTLIGHT_PAID[\s\S]*?MarketplaceBroadcast\.created_at >= start[\s\S]*?MarketplaceBroadcast\.created_at < end/,
  "Free Spotlight quota must be checked by global member identity per UTC day, not by per-community capacity."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /daily_free_spotlight_count = _count_free_spotlight_runs_for_author_today\([\s\S]*?author_user_id=int\(current_user\.id\)[\s\S]*?if daily_free_spotlight_count >= FREE_SPOTLIGHT_DAILY_LIMIT_PER_AUTHOR:[\s\S]*?Your free Spotlight for today is already active/,
  "Free Spotlight publish must block a second same-day run for the same global member identity."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /def _count_active_spotlights_for_clan\([\s\S]*?MarketplaceBroadcast\.priority_mode != SPOTLIGHT_PAID[\s\S]*?\.count\(\)/,
  "Free community quota must ignore paid Spotlight and repost rows."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /def _count_active_paid_spotlights_for_shop\([\s\S]*?MarketplaceBroadcast\.priority_mode == SPOTLIGHT_PAID[\s\S]*?MarketplaceBroadcast\.visibility_scope != "marketplace_repost"[\s\S]*?\.count\(\)/,
  "Network Repost must not count as an active direct paid Subscription Spotlight for the same shop."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /const res = await getMarketplaceBroadcasts\(\{[\s\S]*?clan_id: null,[\s\S]*?active_only: true,[\s\S]*?limit: 20,[\s\S]*?\}\)/,
  "Dashboard active Spotlight must read the authenticated all-active-communities feed, not a selected-community-only feed."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /const recentRes = await getMarketplaceBroadcasts\(\{[\s\S]*?clan_id: null,[\s\S]*?active_only: false,[\s\S]*?limit: 5,[\s\S]*?\}\)/,
  "Dashboard recent Spotlight fallback must use the same all-active-communities feed."
);

assertLineNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /getMarketplaceBroadcasts\(\{[^}]*clan_id:\s*selectedClanId/,
  "Dashboard Spotlight must not drift back to selectedClanId-only fetches."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /source_product_category\?:[\s\S]*?function spotlightPriceLine\([\s\S]*?const spotlightProductName = safeStr\([\s\S]*?activeSpotlight\?\.source_product_title[\s\S]*?const spotlightProductPrice =[\s\S]*?Price on request[\s\S]*?const spotlightPriceIsVisible = Boolean[\s\S]*?spotlightProductPrice !== "Price on request"[\s\S]*?spotlightPriceIsVisible \? \([\s\S]*?\{spotlightProductPrice\}[\s\S]*?debugId="dashboard\.spotlight\.whatsapp"/,
  "Dashboard active Spotlight billboard must keep the product title, optional sender price chip, and WhatsApp contact without restoring source/status clutter."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /const attentionSurfaceVisible =[\s\S]*?attentionDisplaySignal\.active &&[\s\S]*?!activeSpotlight &&/,
  "Dashboard attention guide must stay hidden while a live Spotlight is showing so it cannot look like a Spotlight Active button."
);

assertLineNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /\["Marketplace", spotlightMarketplaceName\]|\["Shop", spotlightShopName\]/,
  "Dashboard active Spotlight body must not restore visible Marketplace/Shop source fact tiles."
);

assertLineNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /dashboard\.spotlight\.guide|Sharing matters|Community display|Rotates every/,
  "Dashboard active Spotlight must not restore the exposed guide, schedule, rotation, market, upload, or shop controls under the billboard."
);

assertContains(
  "frontend/src/pages/CommunityHomePage.tsx",
  /type ActiveCommunitySpotlight = \{[\s\S]*?title: string;[\s\S]*?description: string;[\s\S]*?price: string;[\s\S]*?currency: string;[\s\S]*?category: string;[\s\S]*?availability: string;[\s\S]*?ownerName: string;[\s\S]*?communityName: string;[\s\S]*?function normalizeActiveCommunitySpotlight[\s\S]*?source_product_title[\s\S]*?source_product_description[\s\S]*?source_product_price[\s\S]*?source_product_currency[\s\S]*?source_product_category[\s\S]*?source_product_availability[\s\S]*?Price on request[\s\S]*?Availability shown by owner/,
  "Community Home active Spotlight must visibly render structured product/service title, description, price, category, availability, owner, and community."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /import \{[\s\S]*?getMarketplaceBroadcasts,[\s\S]*?\} from "\.\.\/lib\/api";/,
  "Public Shop must import the shared Marketplace broadcast feed for signed-in Spotlight parity."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /function applyPublicShop\([\s\S]*?viewerSpotlightRows\?: any\[\] \| null[\s\S]*?const spotlightBroadcasts =[\s\S]*?Array\.isArray\(viewerSpotlightRows\) && viewerSpotlightRows\.length > 0[\s\S]*?\? viewerSpotlightRows[\s\S]*?: publicBroadcasts/,
  "Public Shop must prefer the signed-in viewer Spotlight feed while retaining the public endpoint fallback for external links."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /async function loadViewerSpotlightRows\(\)[\s\S]*?if \(!getAccessToken\(\)\) return null;[\s\S]*?const res = await getMarketplaceBroadcasts\(\{[\s\S]*?clan_id: null,[\s\S]*?active_only: true,[\s\S]*?limit: 24,[\s\S]*?\}\)/,
  "Signed-in Public Shop Spotlight must read the same all-active-communities broadcast feed used by Dashboard."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /const ownerShopAnalyticsPath = routeWithCommunity\([\s\S]*?APP_ROUTES\.SHOP_ME[\s\S]*?OWNER_SHOP_HASHES\.summary/,
  "Public Shop owner analytics shortcut must route to the Shop Control summary hash."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /shopFollowState\.isOwner \? \([\s\S]*?<StableCtaLink[\s\S]*?to=\{ownerShopAnalyticsPath\}[\s\S]*?debugId="shop-gallery\.owner\.shop-analytics"/,
  "Public Shop owner analytics shortcut must remain hidden unless the signed-in viewer is the shop owner."
);
assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /label="Followers"[\s\S]*?value=\{shopFollowerCount\}[\s\S]*?Notification audience/,
  "Shop Control analytics must keep follower count visible as a notification audience metric."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace_analytics.py",
  /"followers": \{[\s\S]*?"follower_count": follower_count[\s\S]*?"boundary_label": "Followers are repeat audience, not buyers or payment evidence\."/,
  "Shop owner analytics API must expose follower count with truthful boundary wording."
);
assertContains(
  "frontend/src/lib/shopAnalyticsWisdom.ts",
  /spotlightSeen === 0 \|\| spotlightSeen < 5 \|\| spotlightIsFresh[\s\S]*?diagnosisCode: "GATHERING_DATA"[\s\S]*?headline: "distribution is still low; conversion cannot yet be judged\."/,
  "Shop Market Intelligence must treat fresh or tiny-sample spotlight data as gathering data, not product failure."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /Market Intelligence[\s\S]*?Observation:[\s\S]*?Interpretation:[\s\S]*?Recheck:[\s\S]*?Why this advice\?/,
  "Shop Control analytics must show explainable Market Intelligence inside the owner analytics board."
);
assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /recordMarketplaceAttentionEvent[\s\S]*?"recommendation_actioned"[\s\S]*?shop_market_intelligence[\s\S]*?shop-control\.market-intelligence\.actioned[\s\S]*?Mark tried[\s\S]*?Advice action trail[\s\S]*?\{recommendationActionBoundary\}/,
  "Shop Control Market Intelligence must record owner advice actions through the existing attention-event engine with a truthful boundary."
);

assertContains(
  "frontend/src/lib/shopAnalyticsWisdom.ts",
  /buildAttentionSpineSummary[\s\S]*?buildShopMarketIntelligenceSignal[\s\S]*?source: "market_wisdom"[\s\S]*?engine: "attention_spine_configured_market_intelligence"/,
  "Shop Market Intelligence must reuse the shared Attention Spine signal engine instead of duplicating a separate priority engine."
);
assertContains(
  "frontend/src/lib/shopAnalyticsWisdom.ts",
  /CONTACTS_NOT_PROTECTED[\s\S]*?TRADE_RECORD_PRESSURE[\s\S]*?OUTCOME_EVIDENCE_BUILDING[\s\S]*?tradeRecords\?: number \| null[\s\S]*?Protected Trade is the existing evidence engine/,
  "Shop Market Intelligence must read protected trade outcome metrics without creating a sales or conversion engine."
);
assertContains(
  "frontend/src/lib/shopAnalyticsWisdom.ts",
  /export type ShopSellerHelper[\s\S]*?whatIsHappening: string[\s\S]*?whyItMatters: string[\s\S]*?tryFirst: string[\s\S]*?reassurance: string[\s\S]*?export function buildShopSellerHelper[\s\S]*?SHOP_SETUP_GAP[\s\S]*?LOW_EXPOSURE[\s\S]*?LOW_CONTACT_INTENT[\s\S]*?STRONG_MOMENTUM[\s\S]*?Small data should make you patient, not discouraged/,
  "Shop Market Intelligence must translate analytics into a plain small-seller helper without adding a coaching engine."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /buildShopSellerHelper\(shopAnalyticsWisdom\)[\s\S]*?Small Seller Helper[\s\S]*?What is happening[\s\S]*?Why it matters[\s\S]*?Try first[\s\S]*?Recommended next move/,
  "Shop Control Market Intelligence must show the small-seller helper before deeper evidence and route actions."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /buildShopAnalyticsWisdom\([\s\S]*?tradeRecords: tradeOutcomeRecords7Days[\s\S]*?releasedTradeRecords: tradeOutcomeReleasedRecords[\s\S]*?unresolvedTradeRecords: tradeOutcomeUnresolvedRecords/,
  "Shop Control must feed protected trade outcome counts into the existing Market Intelligence helper."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /marketIntelligencePrimaryAction = useMemo\([\s\S]*?SHOP_SETUP_GAP[\s\S]*?routes\.shopAssets[\s\S]*?LOW_EXPOSURE[\s\S]*?routes\.freeSpotlight[\s\S]*?LOW_CONTACT_INTENT[\s\S]*?routes\.shopDetails[\s\S]*?CONTACTS_NOT_PROTECTED[\s\S]*?routes\.tradeEvidence[\s\S]*?STRONG_MOMENTUM[\s\S]*?routes\.shopGallery[\s\S]*?debugId="shop-control\.market-intelligence\.primary-action"/,
  "Shop Control Market Intelligence must route each diagnosis to an existing shop, spotlight, gallery, or trade-evidence lane."
);
assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /buildShopMarketIntelligenceSummary\([\s\S]*?shopAnalyticsWisdom[\s\S]*?OWNER_SHOP_HASHES\.summary[\s\S]*?Spine: \{shopMarketIntelligenceSummary\.headline\}/,
  "Shop Control must consume the configured shared-engine Market Intelligence summary."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /listMarketplaceRequests\([\s\S]*?status: "open"[\s\S]*?mine_only: false[\s\S]*?limit: 12/,
  "Shop Control Market Intelligence must read Demand Box records from the existing marketplace request lane."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /direct request, not community-wide demand[\s\S]*?Community Needs[\s\S]*?not buyer proof, sales proof, or automatic product matching[\s\S]*?to=\{routes\.askCommunity\}[\s\S]*?shop-control\.market-intelligence\.ask-community[\s\S]*?to=\{routes\.demandBox\}[\s\S]*?shop-control\.market-intelligence\.demand-box/,
  "Shop Control Community Needs must route to Demand Box while avoiding buyer, sales, or community-wide demand claims."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /SHOP_DEMAND_CONTEXT_STOP_WORDS[\s\S]*?SHOP_SENSITIVE_DEMAND_TERMS[\s\S]*?DIRECT_DEMAND_MATCH[\s\S]*?INSUFFICIENT_EVIDENCE[\s\S]*?buildShopCommunityNeedOpportunities[\s\S]*?one request, not a trend[\s\S]*?sensitive or support-related request/,
  "Shop Control Community Needs must reuse Demand Box records, label individual requests, and filter sensitive needs from commercial opportunity guidance."
);
assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /askCommunity: appendRouteQueryParam[\s\S]*?marketplace-official-board[\s\S]*?"ask_market"[\s\S]*?"1"/,
  "Shop Control Ask Community must route into the existing Marketplace official board pulse lane."
);
assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /SHOP_ANALYTICS_PANELS[\s\S]*?key: "key-metrics"[\s\S]*?key: "view-contact"[\s\S]*?key: "visitor-activity"[\s\S]*?key: "trade-outcomes"[\s\S]*?key: "traffic-sources"[\s\S]*?key: "market-intelligence"[\s\S]*?activeAnalyticsPanel[\s\S]*?shop-control\.analytics-panel\.\$\{panel\.key\}/,
  "Shop Analytics must expose six compact section buttons instead of dumping every analytics board at once."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /Open one analytics section at a time[\s\S]*?display: activeAnalyticsPanel === "key-metrics"[\s\S]*?display: activeAnalyticsPanel === "view-contact"[\s\S]*?display: activeAnalyticsPanel === "visitor-activity"[\s\S]*?display: activeAnalyticsPanel === "trade-outcomes"[\s\S]*?display: activeAnalyticsPanel === "traffic-sources"[\s\S]*?display: activeAnalyticsPanel === "market-intelligence"/,
  "Shop Analytics sections must stay independently collapsible so phone users read one block at a time."
);

assertContains(
  "frontend/src/pages/MarketplacePage.tsx",
  /routeAskMarketPulse[\s\S]*?ask_market[\s\S]*?market_need_pulse[\s\S]*?marketplace-official-board[\s\S]*?setMarketplaceNoticeModalMode\("market_need_pulse"\)[\s\S]*?setMarketplaceNoticeModalOpen\(true\)/,
  "Marketplace must open the existing Community Notice composer in market need pulse mode from the governed routeback."
);

assertContains(
  "gmfn_backend/app/api/routes/community_notices.py",
  /NOTICE_MODE_MARKET_NEED_PULSE[\s\S]*?CommunityNoticeIn[\s\S]*?notice_mode: Literal\["notice", "market_need_pulse"\][\s\S]*?availability_enabled = bool\(payload\.availability_enabled\) or is_market_need_pulse[\s\S]*?COMMUNITY_NOTICE_EVENT[\s\S]*?market_need_pulse[\s\S]*?market_need_pulse_response/,
  "Market need pulses must reuse Community Notice posting and availability-response engines, not a new demand engine."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace_analytics.py",
  /ProtectedTradeRecord[\s\S]*?def _protected_trade_outcome_summary\([\s\S]*?protected_trade_records linked by shop_id or seller_user_id within the last 7 days\.[\s\S]*?"trade_outcomes": _protected_trade_outcome_summary/,
  "Shop owner analytics API must summarize protected trade outcome records through the existing Protected Trade engine."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /trade_outcomes\?:[\s\S]*?tradeOutcomeRecords7Days[\s\S]*?label="Trade records"[\s\S]*?Recorded trade outcomes[\s\S]*?Protected trade evidence linked to this shop or seller\.[\s\S]*?\{tradeOutcomeBoundary\}/,
  "Shop Control analytics must show protected trade outcome context with a truthful evidence-only boundary."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /protected_trade_records[\s\S]*?trade_outcomes = body\["trade_outcomes"\][\s\S]*?released_records"\] == 1[\s\S]*?not automatic sales/,
  "Backend analytics tests must lock protected trade outcome counts and boundaries."
);
assertContains(
  "gmfn_backend/app/api/routes/marketplace_analytics.py",
  /def _source_breakdown_summary\([\s\S]*?MarketplaceAttentionEvent\.source[\s\S]*?MarketplaceAttentionEvent\.event_type[\s\S]*?event_type\.notin_\([\s\S]*?EVENT_SHARE_ACTION[\s\S]*?EVENT_RECOMMENDATION_ACTIONED[\s\S]*?Source counts show where attention was recorded, not who bought or paid\.[\s\S]*?"source_breakdown": _source_breakdown_summary/,
  "Shop owner analytics API must summarize existing attention-event sources without creating a duplicate traffic engine."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /source_breakdown\?: ShopAttentionSourceBreakdown\[\][\s\S]*?attentionSourceBreakdownRows[\s\S]*?Traffic sources[\s\S]*?Source counts show where attention was recorded, not who bought or paid\./,
  "Shop Control analytics must show attention source breakdown with the truthful buyer-proof boundary."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /source_breakdown = body\["source_breakdown"\][\s\S]*?source_rows\["public_shop"\]\["shop_visits"\] == 1[\s\S]*?source_rows\["public_shop_spotlight"\]\["spotlight_impressions"\] == 1[\s\S]*?not who bought/,
  "Backend tests must lock shop, spotlight, product, and contact source breakdown counts."
);
assertContains(
  "gmfn_backend/app/api/routes/marketplace_analytics.py",
  /SHOP_FOLLOWER_NOTICE_KINDS[\s\S]*?def _shop_follower_notice_summary[\s\S]*?"follower_notifications": _shop_follower_notice_summary/,
  "Shop owner analytics API must summarize follower notices from the existing notification engine."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /follower_notifications\?:[\s\S]*?followerNotices7Days[\s\S]*?followerNoticeBoundary[\s\S]*?not views, purchases, or push-delivery proof[\s\S]*?label="Follower notices"[\s\S]*?Follower notice trail[\s\S]*?\{followerNoticeBoundary\}/,
  "Shop Control analytics must show follower notice counts with the push-delivery truth boundary."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /follower_notifications = body\["follower_notifications"\][\s\S]*?last_7_days"\] == 1[\s\S]*?year_to_date"\] == 1[\s\S]*?not views/,
  "Backend analytics tests must lock follower notice distribution counts and boundaries."
);
assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /def _shop_notice_action_url[\s\S]*?gsn_source=shop_follower_notice[\s\S]*?gsn_notice=\{quote[\s\S]*?attributed_action_url = _shop_notice_action_url/,
  "Shop follower notice links must carry existing attention-engine attribution tags."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace_analytics.py",
  /def _follower_notification_response_summary[\s\S]*?gsn_source"\) != "shop_follower_notice"[\s\S]*?"follower_notification_response": _follower_notification_response_summary/,
  "Shop owner analytics API must summarize follower notice click-back response through source_path attribution."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /follower_notification_response\?:[\s\S]*?followerNoticeResponseVisitors[\s\S]*?not buyer, payment, delivery, push-display, or sales proof[\s\S]*?label="Notice visits"[\s\S]*?Follower notice response/,
  "Shop Control analytics must show follower notice response separately from notice distribution."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /gsn_source=shop_follower_notice[\s\S]*?follower_response = body\["follower_notification_response"\][\s\S]*?shop_visits"\] == 1[\s\S]*?product_opens"\] == 1[\s\S]*?gsn_source=shop_follower_notice/,
  "Backend analytics tests must lock follower notice attribution tags and click-back response counts."
);
assertContains(
  "gmfn_backend/app/api/routes/marketplace_analytics.py",
  /EVENT_SHARE_ACTION = "share_action"[\s\S]*?EVENT_RECOMMENDATION_ACTIONED = "recommendation_actioned"[\s\S]*?def _share_action_summary[\s\S]*?event_type=share_action[\s\S]*?def _recommendation_action_summary[\s\S]*?event_type=recommendation_actioned[\s\S]*?def _share_response_summary[\s\S]*?source_path includes share attribution parameters[\s\S]*?"share_actions": _share_action_summary[\s\S]*?"share_response": _share_response_summary[\s\S]*?"recommendation_actions": _recommendation_action_summary/,
  "Shop owner analytics API must summarize tracked share attempts and owner advice actions through the existing attention-event engine."
);

assertContains(
  "frontend/src/lib/api.ts",
  /recordMarketplaceAttentionEvent[\s\S]*?\| "share_action"[\s\S]*?\| "recommendation_actioned"/,
  "Frontend API typing must allow share_action and recommendation_actioned attention events."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /appendShopShareAttribution[\s\S]*?gsn_share[\s\S]*?trackShopShareAction[\s\S]*?"share_action"[\s\S]*?copy_shop_link[\s\S]*?share_product/,
  "Public Shop share and copy actions must add campaign attribution and record share attempts without creating a duplicate analytics engine."
);

assertContains(
  "frontend/src/pages/ShopControlPage.tsx",
  /share_actions\?:[\s\S]*?share_response\?:[\s\S]*?recommendation_actions\?:[\s\S]*?shareActions7Days[\s\S]*?shareResponseVisits[\s\S]*?recommendationActions7Days[\s\S]*?label="Shared links"[\s\S]*?Share action trail[\s\S]*?Share response[\s\S]*?Advice action trail/,
  "Shop Control analytics must show share attempts with the recipient-open truth boundary."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /"event_type": "share_action"[\s\S]*?gsn_share=copy_shop_link[\s\S]*?"event_type": "recommendation_actioned"[\s\S]*?recommendation_actions = body\["recommendation_actions"\][\s\S]*?Opened Demand Box[\s\S]*?"shop_gallery_share" not in source_rows[\s\S]*?"shop_market_intelligence" not in source_rows/,
  "Backend analytics tests must lock share attribution, recommendation action logging, and boundary wording."
);
assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /dispatch_web_push_for_notifications[\s\S]*?def _notify_shop_followers\([\s\S]*?-> list\[Notification\][\s\S]*?action_label="Open post"[\s\S]*?dispatch_web_push_for_notifications\(db, follower_notification_rows\)/,
  "Shop follower notices must reuse the existing web-push batch dispatcher and route followers directly to the posted item."
);

assertContains(
  "gmfn_backend/app/services/web_push_service.py",
  /"marketplace\.shop\.broadcast_created"[\s\S]*?"marketplace\.shop\.product_created"[\s\S]*?"marketplace\.shop\.product_updated"[\s\S]*?"marketplace\.shop\.spotlight_created"/,
  "Web Push allow-list must include shop follower product, update, broadcast, and spotlight notices."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /pushed_batches[\s\S]*?dispatch_web_push_for_notifications[\s\S]*?Visible Follow Shop posted Follower Rice[\s\S]*?"action_label": "Open post"/,
  "Backend tests must lock follower Action Inbox notices and the post-commit web-push dispatch call."
);

assertContains(
  "gmfn_backend/tests/test_web_push_notifications.py",
  /test_shop_follower_notifications_are_web_push_allowed[\s\S]*?marketplace\.shop\.product_created[\s\S]*?marketplace\.shop\.spotlight_created/,
  "Web Push tests must lock shop follower notice kinds as allowed push notifications."
);
assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /test_shop_spotlight_publish_targets_all_eligible_owner_communities[\s\S]*?assert body\["propagated_count"\] == 2[\s\S]*?assert body\["item"\]\["source_product_title"\] == "Fresh spotlight"[\s\S]*?assert body\["item"\]\["source_product_description"\] == "Available today for delivery"[\s\S]*?assert body\["item"\]\["source_product_category"\] == "Spotlight update"[\s\S]*?assert \[int\(row\[0\]\) for row in rows\] == \[1, 2\]/,
  "Backend tests must lock one-shop Spotlight placement and visible product information across all eligible owner communities."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /test_shop_spotlight_publish_ignores_community_capacity_but_blocks_second_daily_free_run[\s\S]*?assert body\["propagated_clan_ids"\] == \[1, 2\][\s\S]*?assert body\["free_spotlight_daily_limit_per_author"\] == 1[\s\S]*?Second free spotlight[\s\S]*?assert second_res\.status_code == 400/,
  "Backend tests must lock pilot fairness: community fullness no longer blocks the first free run, but same-day second free runs are blocked per identity."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /test_network_repost_does_not_block_direct_subscription_spotlight[\s\S]*?"visibility_scope"[\s\S]*?"marketplace_repost"[\s\S]*?active_paid_spotlights[\s\S]*?== 0[\s\S]*?can_publish_paid_spotlight[\s\S]*?is True[\s\S]*?"Direct paid spotlight"/,
  "Backend tests must lock Network Repost and direct paid Subscription Spotlight as separate paid lanes."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /SPOTLIGHT_STANDARD_ROTATION_WEIGHT = 1[\s\S]*?SPOTLIGHT_PAID_ROTATION_WEIGHT = 3[\s\S]*?def _spotlight_rotation_weight[\s\S]*?"rotation_weight": _spotlight_rotation_weight\(item\)[\s\S]*?priority_rank = case\([\s\S]*?MarketplaceBroadcast\.priority_mode == SPOTLIGHT_PAID/,
  "Backend Spotlight feed must keep explicit paid rotation metadata and paid-first active ordering."
);

assertContains(
  "frontend/src/lib/spotlightPilot.ts",
  /SPOTLIGHT_PAID_ROTATION_WEIGHT = 3[\s\S]*?function spotlightRotationWeight[\s\S]*?export function buildSpotlightRotationQueue/,
  "Frontend Spotlight pilot controls must keep the shared paid rotation queue helper."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /buildSpotlightRotationQueue[\s\S]*?spotlightRotationWeight[\s\S]*?const weightDelta = spotlightRotationWeight\(b\) - spotlightRotationWeight\(a\)[\s\S]*?setSpotlights\(buildSpotlightRotationQueue\(items\)\)/,
  "Dashboard Spotlight rotation must preserve paid rotation weighting without changing the feed source."
);

assertContains(
  "frontend/src/pages/ShopGalleryPage.tsx",
  /buildSpotlightRotationQueue[\s\S]*?rotationWeight\?: number[\s\S]*?const rotationBroadcasts = buildSpotlightRotationQueue\(normalizedBroadcasts\)[\s\S]*?setCommunitySpotlights\(rotationBroadcasts\)/,
  "Public Shop Spotlight rotation must use the shared paid rotation queue."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /test_marketplace_broadcast_feed_prioritizes_paid_rotation_metadata[\s\S]*?assert \[item\["id"\] for item in items\] == \[2, 1\][\s\S]*?SPOTLIGHT_PAID_ROTATION_WEIGHT/,
  "Backend tests must lock paid-first Spotlight ordering and rotation metadata."
);
if (findings.length > 0) {
  console.error("Spotlight system feed audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Spotlight system feed audit passed: shop-owned placement, daily identity quota, paid/repost separation, and Dashboard/Public Shop feed parity are caged."
);
