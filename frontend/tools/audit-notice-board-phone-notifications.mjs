/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  communityNotices: {
    path: "gmfn_backend/app/api/routes/community_notices.py",
    source: readFileSync(
      join(repoRoot, "gmfn_backend", "app", "api", "routes", "community_notices.py"),
      "utf8"
    ),
  },
  communityDomains: {
    path: "gmfn_backend/app/api/routes/community_domains.py",
    source: readFileSync(
      join(repoRoot, "gmfn_backend", "app", "api", "routes", "community_domains.py"),
      "utf8"
    ),
  },
  webPushRoute: {
    path: "gmfn_backend/app/api/routes/web_push.py",
    source: readFileSync(
      join(repoRoot, "gmfn_backend", "app", "api", "routes", "web_push.py"),
      "utf8"
    ),
  },
  webPushService: {
    path: "gmfn_backend/app/services/web_push_service.py",
    source: readFileSync(
      join(repoRoot, "gmfn_backend", "app", "services", "web_push_service.py"),
      "utf8"
    ),
  },
  notificationService: {
    path: "gmfn_backend/app/services/notification_service.py",
    source: readFileSync(
      join(repoRoot, "gmfn_backend", "app", "services", "notification_service.py"),
      "utf8"
    ),
  },
  serviceWorker: {
    path: "frontend/public/sw.js",
    source: readFileSync(join(frontendRoot, "public", "sw.js"), "utf8"),
  },
  webPushClient: {
    path: "frontend/src/lib/webPush.ts",
    source: readFileSync(join(frontendRoot, "src", "lib", "webPush.ts"), "utf8"),
  },
  companionSettingsPanel: {
    path: "frontend/src/components/CompanionSettingsPanel.tsx",
    source: readFileSync(
      join(frontendRoot, "src", "components", "CompanionSettingsPanel.tsx"),
      "utf8"
    ),
  },
  companionLayer: {
    path: "frontend/src/components/CompanionLayer.tsx",
    source: readFileSync(
      join(frontendRoot, "src", "components", "CompanionLayer.tsx"),
      "utf8"
    ),
  },
  marketplacePage: {
    path: "frontend/src/pages/MarketplacePage.tsx",
    source: readFileSync(
      join(frontendRoot, "src", "pages", "MarketplacePage.tsx"),
      "utf8"
    ),
  },
  communityDomainPage: {
    path: "frontend/src/pages/CommunityDomainDashboardPage.tsx",
    source: readFileSync(
      join(frontendRoot, "src", "pages", "CommunityDomainDashboardPage.tsx"),
      "utf8"
    ),
  },
  api: {
    path: "frontend/src/lib/api.ts",
    source: readFileSync(join(frontendRoot, "src", "lib", "api.ts"), "utf8"),
  },
  communityNoticeTests: {
    path: "gmfn_backend/tests/test_community_notices.py",
    source: readFileSync(
      join(repoRoot, "gmfn_backend", "tests", "test_community_notices.py"),
      "utf8"
    ),
  },
  communityDomainTests: {
    path: "gmfn_backend/tests/test_community_domains.py",
    source: readFileSync(
      join(repoRoot, "gmfn_backend", "tests", "test_community_domains.py"),
      "utf8"
    ),
  },
};

const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(file, pattern, message) {
  const { source, path } = file;
  const match = source.match(pattern);
  if (match) return;
  findings.push({
    path,
    line: 1,
    message,
    text: "Expected notice-board phone notification contract pattern was not found.",
  });
}

function assertDoesNotContain(file, pattern, message) {
  const { source, path } = file;
  const match = pattern.exec(source);
  if (!match) return;
  findings.push({
    path,
    line: lineAt(source, match.index),
    message,
    text: match[0].replace(/\s+/g, " ").slice(0, 220),
  });
}

assertContains(
  files.communityNotices,
  /from app\.services\.notification_service import create_notification[\s\S]*?from app\.services\.web_push_service import dispatch_web_push_for_notifications[\s\S]*?COMMUNITY_NOTICE_EVENT = "community\.notice\.posted"/,
  "Marketplace/community official notices must keep using the dedicated community.notice.posted notification kind."
);

assertContains(
  files.communityNotices,
  /def _active_notice_recipient_ids\([\s\S]*?ClanMembership\.left_at\.is_\(None\)[\s\S]*?if user_id == int\(poster_user_id\) or user_id in seen:[\s\S]*?recipient_ids\.append\(user_id\)/,
  "Marketplace/community notice recipients must stay limited to active members of the selected community, excluding the poster."
);

assertContains(
  files.communityNotices,
  /create_notification\([\s\S]*?kind=COMMUNITY_NOTICE_EVENT[\s\S]*?action_url=f"\/app\/marketplace\?clan_id=\{int\(clan_id\)\}#marketplace-official-board"[\s\S]*?action_label="Open Official Board"[\s\S]*?commit=False/,
  "Marketplace/community notice notifications must deep-link to the selected Marketplace Official Board."
);

assertContains(
  files.communityNotices,
  /db\.commit\(\)[\s\S]*?dispatch_web_push_for_notifications\(db, notification_rows\)/,
  "Marketplace/community notice batches must dispatch Web Push only after the notification rows commit."
);

assertContains(
  files.communityNotices,
  /"notification_kind": COMMUNITY_NOTICE_EVENT[\s\S]*?"notifications_created": int\(notifications_created\)/,
  "Marketplace/community notice responses must report notification creation and the no-broadcast boundary."
);

assertContains(
  files.communityNotices,
  /"The notice belongs to this selected community or marketplace only\.[\s\S]*?"community; it does not broadcast to other marketplaces, communities,/,
  "Marketplace/community notice responses must state that notices do not broadcast beyond the selected marketplace/community."
);

assertContains(
  files.communityDomains,
  /from app\.services\.notification_service import create_notification[\s\S]*?from app\.services\.web_push_service import dispatch_web_push_for_notifications[\s\S]*?COMMUNITY_DOMAIN_NOTICE_EVENT = "community_domain\.notice\.posted"/,
  "Community Domain official notices must keep using the dedicated community_domain.notice.posted notification kind."
);

assertContains(
  files.communityDomains,
  /def _active_community_domain_notice_recipient_ids\([\s\S]*?CommunityDomainMembership\.status == "active"[\s\S]*?if user_id == int\(poster_user_id\) or user_id in seen:[\s\S]*?recipient_ids\.append\(user_id\)/,
  "Community Domain notice recipients must stay limited to active members of the selected domain, excluding the poster."
);

assertContains(
  files.communityDomains,
  /create_notification\([\s\S]*?kind=COMMUNITY_DOMAIN_NOTICE_EVENT[\s\S]*?action_url=f"\/app\/community-domain\/\{int\(domain\.id\)\}#community-domain-official-board"[\s\S]*?action_label="Open Notice Board"[\s\S]*?commit=False/,
  "Community Domain notice notifications must deep-link to the selected domain board."
);

assertContains(
  files.communityDomains,
  /db\.commit\(\)[\s\S]*?dispatch_web_push_for_notifications\(db, notification_rows\)/,
  "Community Domain notice batches must dispatch Web Push only after the notification rows commit."
);

assertContains(
  files.communityDomains,
  /"notifications_created": int\(notifications_created\)[\s\S]*?"notification_kind": COMMUNITY_DOMAIN_NOTICE_EVENT/,
  "Community Domain notice responses must report notification creation and the no-broadcast boundary."
);

assertContains(
  files.communityDomains,
  /"The notice belongs to this selected Community Domain only\.[\s\S]*?"Community Domain; it does not broadcast to other domains or communities\./,
  "Community Domain notice responses must state that notices do not broadcast beyond the selected domain."
);

assertContains(
  files.companionLayer,
  /const PHONE_TRIGGER_NOTIFICATION_KINDS = new Set\(\[[\s\S]*?"community\.notice\.posted"[\s\S]*?"community_domain\.notice\.posted"[\s\S]*?\]\)/,
  "CompanionLayer must treat both notice-board notification kinds as phone-facing triggers."
);

assertContains(
  files.companionLayer,
  /kind === "community\.notice\.posted"[\s\S]*?\? "community-notice-board"[\s\S]*?: kind === "community_domain\.notice\.posted"[\s\S]*?\? "community-domain-notice-board"[\s\S]*?: "notification-feed"/,
  "CompanionLayer must preserve notice-board source labels for phone-facing cycles."
);

assertContains(
  files.webPushService,
  /WEB_PUSH_NOTIFICATION_KINDS = \{[\s\S]*?"community\.notice\.posted"[\s\S]*?"community_domain\.notice\.posted"[\s\S]*?\}[\s\S]*?def dispatch_web_push_for_notification\([\s\S]*?kind not in WEB_PUSH_NOTIFICATION_KINDS[\s\S]*?web_push_runtime_status\(\)[\s\S]*?_send_web_push_payload/,
  "Web Push delivery must stay limited to official notice-board notification kinds."
);

assertContains(
  files.notificationService,
  /create_notification\([\s\S]*?db\.commit\(\)[\s\S]*?dispatch_web_push_for_notification\(db, row\)[\s\S]*?Push delivery is best-effort; the GSN notification row is the truth\./,
  "Committed notification creation must attempt best-effort Web Push without making push delivery the source of truth."
);

assertContains(
  files.webPushRoute,
  /APIRouter\(prefix="\/web-push"[\s\S]*?@router\.get\("\/status"\)[\s\S]*?@router\.post\("\/subscriptions"\)[\s\S]*?@router\.delete\("\/subscriptions"\)/,
  "Web Push API must remain limited to authenticated status/register/unregister endpoints."
);

assertContains(
  files.serviceWorker,
  /self\.addEventListener\("push"[\s\S]*?action_url[\s\S]*?showNotification\(title[\s\S]*?self\.addEventListener\("notificationclick"[\s\S]*?actionUrl[\s\S]*?clients\.openWindow/,
  "Service worker must display pushed GSN notifications and deep-link clicks."
);

assertContains(
  files.webPushClient,
  /syncGsnWebPushSubscription[\s\S]*?Notification\.permission[\s\S]*?getWebPushStatus\(\)[\s\S]*?registration\.pushManager\.subscribe[\s\S]*?registerWebPushSubscription/,
  "Frontend Web Push helper must subscribe through the service worker and register the subscription with GSN."
);

assertContains(
  files.companionSettingsPanel,
  /systemPushEnabled[\s\S]*?requestCompanionNotificationPermission\(\)[\s\S]*?syncGsnWebPushSubscription\(\)[\s\S]*?unregisterCurrentWebPushSubscription\(\)/,
  "Companion settings must keep Web Push registration tied to the user's system-notification opt-in."
);

assertContains(
  files.marketplacePage,
  /id="marketplace-official-board"[\s\S]*?Official notices for this selected marketplace\/community only\.[\s\S]*?not broadcast to your other marketplaces/,
  "Marketplace must keep the Official Board anchored and scoped to the selected marketplace/community."
);

assertContains(
  files.communityDomainPage,
  /id="community-domain-official-board"/,
  "Community Domain dashboard must keep the Official Board anchored and scoped to the selected domain."
);

assertContains(
  files.communityDomainPage,
  /Official Board[\s\S]*?Notices for this Community Domain only\.[\s\S]*?limited to[\s\S]*?active members of this selected Community Domain/,
  "Community Domain dashboard must state that notices stay inside the selected domain."
);

assertContains(
  files.api,
  /export async function listCommunityNotices\([\s\S]*?\/community-notices[\s\S]*?export async function createCommunityNotice\([\s\S]*?httpJson\("\/community-notices", "POST", payload\)/,
  "Frontend API helpers must keep the marketplace/community notice-board calls."
);

assertContains(
  files.api,
  /export async function listCommunityDomainNotices\([\s\S]*?\/community-domains\/\$\{encodeURIComponent\([\s\S]*?\)\}\/notices[\s\S]*?export async function createCommunityDomainNotice\([\s\S]*?\/community-domains\/\$\{encodeURIComponent\(String\(communityDomainId\)\)\}\/notices/,
  "Frontend API helpers must keep the Community Domain notice-board calls."
);

assertContains(
  files.communityNoticeTests,
  /notification_kind"\] == "community\.notice\.posted"[\s\S]*?notifications_created"\] == 1[\s\S]*?\/app\/marketplace\?clan_id=1#marketplace-official-board[\s\S]*?Open Official Board/,
  "Marketplace/community notice tests must assert notification kind, count, and board CTA."
);

assertContains(
  files.communityDomainTests,
  /notification_kind"\] == "community_domain\.notice\.posted"[\s\S]*?notifications_created"\] == 1[\s\S]*?\/app\/community-domain\/\{domain_id\}#community-domain-official-board[\s\S]*?Open Notice Board/,
  "Community Domain notice tests must assert notification kind, count, and board CTA."
);

assertDoesNotContain(
  files.communityNotices,
  /kind=["']assistant\.nudge["']|kind=["']broadcast/i,
  "Marketplace/community official board notices must not be downgraded into generic nudges or broadcasts."
);

assertDoesNotContain(
  files.communityDomains,
  /kind=["']assistant\.nudge["']|kind=["']broadcast/i,
  "Community Domain official board notices must not be downgraded into generic nudges or broadcasts."
);

if (findings.length > 0) {
  console.error("Notice-board phone notification audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.path}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Notice-board phone notification audit passed: scoped notice boards create notification rows, trigger Web Push delivery when configured, and still feed Companion phone-facing fallback."
);
