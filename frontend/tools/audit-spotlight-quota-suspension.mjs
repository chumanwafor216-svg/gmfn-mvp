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

function assertLineContains(file, pattern, message) {
  const text = read(file);
  const lines = text.split(/\r?\n/);
  if (!lines.some((line) => pattern.test(line))) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected line pattern was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  if (pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Retired pattern was found.",
    });
  }
}

assertLineContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL = datetime\(2026, 5, 17, 23, 59, 59, tzinfo=timezone\.utc\)/,
  "Free Spotlight capacity override must expire at the end of May 17, 2026 UTC."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /def _spotlight_capacity_pilot_override_active\(now: Optional\[datetime\] = None\) -> bool:[\s\S]*?current_time = now or _now_utc\(\)[\s\S]*?return current_time <= SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL/,
  "Free Spotlight capacity suspension must be date-bound and active during the approved test week."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /FREE_SPOTLIGHT_DAILY_LIMIT_PER_AUTHOR = 1[\s\S]*?def _count_free_spotlight_runs_for_author_today\([\s\S]*?MarketplaceBroadcast\.author_user_id == int\(author_user_id\)[\s\S]*?MarketplaceBroadcast\.priority_mode != SPOTLIGHT_PAID[\s\S]*?MarketplaceBroadcast\.created_at >= start[\s\S]*?MarketplaceBroadcast\.created_at < end/,
  "Free Spotlight fairness must be enforced by global member identity per UTC day."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /if priority_mode == SPOTLIGHT_PAID:[\s\S]*?active_paid_count = _count_active_paid_spotlights_for_shop[\s\S]*?else:[\s\S]*?daily_free_spotlight_count = _count_free_spotlight_runs_for_author_today[\s\S]*?if daily_free_spotlight_count >= FREE_SPOTLIGHT_DAILY_LIMIT_PER_AUTHOR:[\s\S]*?Your free Spotlight for today is already active/,
  "Paid Spotlight active-run guards must stay separate from the Free Spotlight daily identity limit."
);

assertNotContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /elif not _spotlight_capacity_pilot_override_active\(current_time\):/,
  "The retired per-community Free Spotlight capacity block must not return to the publish path."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /test_spotlight_capacity_pilot_override_is_active_for_test_week[\s\S]*?datetime\(2026, 5, 10[\s\S]*?datetime\(2026, 5, 17, 23, 59, 59[\s\S]*?datetime\(2026, 5, 18/,
  "Backend tests must lock the approved May 10-17, 2026 Free Spotlight quota suspension window."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /test_spotlight_capacity_pilot_override_ignores_stale_force_off_env[\s\S]*?setenv\("GMFN_SPOTLIGHT_CAPACITY_OVERRIDE", "0"\)[\s\S]*?assert marketplace_routes\._spotlight_capacity_pilot_override_active/,
  "Backend tests must prove stale env force-off values cannot re-enable the capacity block during the approved test week."
);

assertContains(
  "gmfn_backend/tests/test_marketplace_public_shop.py",
  /test_shop_spotlight_publish_ignores_community_capacity_but_blocks_second_daily_free_run[\s\S]*?assert body\["propagated_clan_ids"\] == \[1, 2\][\s\S]*?assert body\["free_spotlight_daily_limit_per_author"\] == 1[\s\S]*?Second free spotlight[\s\S]*?assert second_res\.status_code == 400/,
  "Backend route tests must prove community fullness no longer blocks the first free run, while same-day second free runs are blocked per identity."
);

if (findings.length > 0) {
  console.error("Spotlight quota suspension audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Spotlight quota suspension audit passed.");
