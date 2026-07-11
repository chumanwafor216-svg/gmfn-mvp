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
