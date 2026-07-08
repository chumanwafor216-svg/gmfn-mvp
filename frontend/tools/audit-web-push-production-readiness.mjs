/* global console, process */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

function readRepo(path) {
  return readFileSync(join(repoRoot, ...path.split("/")), "utf8");
}

function assertContains(path, pattern, message) {
  const source = readRepo(path);
  if (pattern.test(source)) return;
  findings.push(`${path}: ${message}`);
}

const noticeAudit = spawnSync(
  process.execPath,
  [join(frontendRoot, "tools", "audit-notice-board-phone-notifications.mjs")],
  {
    cwd: frontendRoot,
    stdio: "inherit",
  }
);

if (noticeAudit.status !== 0) {
  findings.push(
    "audit-notice-board-phone-notifications.mjs must pass before Web Push can be production-ready."
  );
}

assertContains(
  "frontend/package.json",
  /"audit:web-push-production-readiness": "node tools\/audit-web-push-production-readiness\.mjs"/,
  "package script must expose the named Web Push production readiness audit."
);

assertContains(
  "frontend/package.json",
  /"audit:live-web-push-status": "node tools\/audit-live-web-push-status\.mjs"/,
  "package script must expose the authenticated live Web Push status audit."
);

assertContains(
  "docs/WEB_PUSH_PRODUCTION_RUNBOOK.md",
  /Before calling Web Push live:[\s\S]*?\/web-push\/status` must return `configured: true`[\s\S]*?audit:live-web-push-status[\s\S]*?Do not add more notification kinds/,
  "runbook must keep live-readiness gates, authenticated live audit, and expansion warning."
);

assertContains(
  "frontend/tools/audit-live-web-push-status.mjs",
  /GSN_LIVE_AUTH_TOKEN[\s\S]*?Missing required \$\{AUTH_ENV\}\. Refusing to claim live Web Push status proof\.[\s\S]*?configured=false[\s\S]*?allowed_kinds/,
  "live Web Push status audit must fail closed without auth and verify configured status plus allowed kinds."
);

assertContains(
  "gmfn_backend/tests/test_web_push_notifications.py",
  /test_web_push_status_reports_not_configured_without_vapid_keys[\s\S]*?configured"\] is False[\s\S]*?test_official_notice_dispatches_web_push_to_registered_member/,
  "backend tests must prove both not-configured truth and official-notice dispatch."
);

assertContains(
  "gmfn_backend/alembic/versions/20260708_add_web_push_subscriptions.py",
  /revision = "20260708_add_web_push_subscriptions"[\s\S]*?down_revision = "20260628_comm_domain_review_apply_audit"[\s\S]*?web_push_subscriptions/,
  "Web Push subscription migration must remain the current additive migration."
);

assertContains(
  "gmfn_backend/app/services/web_push_service.py",
  /WEB_PUSH_NOTIFICATION_KINDS = \{[\s\S]*?"community\.notice\.posted"[\s\S]*?"community_domain\.notice\.posted"[\s\S]*?\}[\s\S]*?"web_push_not_configured"/,
  "Web Push service must stay allowlisted and truthfully report missing configuration."
);

assertContains(
  "frontend/public/sw.js",
  /self\.addEventListener\("push"[\s\S]*?showNotification[\s\S]*?self\.addEventListener\("notificationclick"[\s\S]*?clients\.openWindow/,
  "service worker must keep push display and click-open handling."
);

if (findings.length > 0) {
  console.error("Web Push production readiness audit failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  "Web Push production readiness audit passed: code, runbook, env placeholders, migration, tests, service worker, and official-board push boundaries are caged."
);
