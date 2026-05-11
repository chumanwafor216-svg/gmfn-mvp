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
  /elif not _spotlight_capacity_pilot_override_active\(current_time\):[\s\S]*?_count_active_spotlights_for_clan[\s\S]*?_max_spotlights_for_clan/,
  "Only the Free Spotlight capacity quota should be bypassed by this test-window override."
);

assertContains(
  "gmfn_backend/app/api/routes/marketplace.py",
  /if priority_mode == SPOTLIGHT_PAID:[\s\S]*?active_paid_count = _count_active_paid_spotlights_for_shop[\s\S]*?elif not _spotlight_capacity_pilot_override_active\(current_time\):/,
  "Paid Spotlight entitlement and active-paid guards must remain separate from the Free Spotlight capacity suspension."
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
  /test_free_spotlight_capacity_reached_is_suspended_for_test_week[\s\S]*?status_code == 200[\s\S]*?Spotlight capacity reached/,
  "Backend route tests must prove a full clan can still publish Free Spotlight during the approved test week."
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
