/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const notificationsFile = "src/pages/NotificationsPage.tsx";
const guidanceFile = "src/lib/guidance.ts";const communityConfirmationPolicyFile = "src/pages/CommunityConfirmationPolicyPage.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const source = readFileSync(join(frontendRoot, notificationsFile), "utf8");
const guidanceSource = readFileSync(join(frontendRoot, guidanceFile), "utf8");const communityConfirmationPolicySource = readFileSync(
  join(frontendRoot, communityConfirmationPolicyFile),
  "utf8"
);
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const findings = [];

const expectedSourceActions = {
  PrimaryButton: 3,
  SecondaryButton: 2,
  StableButton: 1,
  StableCtaLink: 6,
  SubtleButton: 6,
};
const expectedSourceActionCount = Object.values(expectedSourceActions).reduce(
  (sum, count) => sum + count,
  0
);
const expectedNativeFieldCount = 0;
const expectedBucketRowCount = 4;
const expectedMobileShellBreakdown = {
  top: 2,
  drawer: 25,
  pageTools: 7,
  bottom: 5,
};
const expectedMobileShellActionCount = Object.values(
  expectedMobileShellBreakdown
).reduce((sum, count) => sum + count, 0);
const expectedWholeMobileRouteFixedActionFamilies =
  expectedSourceActionCount + expectedBucketRowCount - 1 + expectedMobileShellActionCount;

function lineAt(sourceText, index) {
  return sourceText.slice(0, index).split(/\r?\n/).length;
}

function debugIdFrom(block) {
  return (
    block.match(/debugId="([^"]+)"/)?.[1] ||
    block.match(/debugId=\{`([^`]+)`\}/)?.[1] ||
    block.match(/debugId=\{([^}]+)\}/)?.[1] ||
    ""
  ).replace(/\s+/g, " ");
}

function assertContains(
  pattern,
  message,
  text = "Expected Notifications pattern was not found."
) {
  if (pattern.test(source)) return;
  findings.push({
    file: notificationsFile,
    line: 1,
    message,
    text,
  });
}

function assertLayoutContains(
  pattern,
  message,
  text = "Expected Notifications app-shell pattern was not found."
) {
  if (pattern.test(appLayoutSource)) return;
  findings.push({
    file: appLayoutFile,
    line: 1,
    message,
    text,
  });
}

function assertPolicyContains(
  pattern,
  message,
  text = "Expected Community Confirmation Policy pattern was not found."
) {
  if (pattern.test(communityConfirmationPolicySource)) return;
  findings.push({
    file: communityConfirmationPolicyFile,
    line: 1,
    message,
    text,
  });
}

function assertGuidanceContains(
  pattern,
  message,
  text = "Expected Action Inbox guidance pattern was not found."
) {
  if (pattern.test(guidanceSource)) return;
  findings.push({
    file: guidanceFile,
    line: 1,
    message,
    text,
  });
}

const actionPattern =
  /<(PrimaryButton|SecondaryButton|StableButton|StableCtaLink|SubtleButton)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  actions.push({
    tag: match[1],
    id: debugIdFrom(block),
    line: lineAt(source, match.index),
    block,
  });
}

const tagCounts = Object.fromEntries(
  Object.keys(expectedSourceActions).map((tag) => [
    tag,
    actions.filter((action) => action.tag === tag).length,
  ])
);

for (const [tag, expectedCount] of Object.entries(expectedSourceActions)) {
  if (tagCounts[tag] === expectedCount) continue;
  findings.push({
    file: notificationsFile,
    line: 1,
    message: `Notifications ${tag} inventory changed from ${expectedCount} to ${tagCounts[tag]}. Re-audit phone tap flow before accepting this baseline.`,
    text: actions
      .filter((action) => action.tag === tag)
      .map((action) => `${action.line}:${action.id || "missing-debugId"}`)
      .join(", "),
  });
}

if (actions.length !== expectedSourceActionCount) {
  findings.push({
    file: notificationsFile,
    line: 1,
    message: `Notifications stable source action inventory changed from ${expectedSourceActionCount} to ${actions.length}.`,
    text: JSON.stringify(tagCounts),
  });
}

const nativeFields = [];
const nativeFieldPattern = /<(input|select|textarea)\b/g;
while ((match = nativeFieldPattern.exec(source))) {
  nativeFields.push({
    line: lineAt(source, match.index),
    type: match[1],
  });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({
    file: notificationsFile,
    line: 1,
    message: `Notifications native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit every input/select/textarea as a mobile tap surface before accepting this baseline.`,
    text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: notificationsFile,
      line: action.line,
      message: "Every Notifications stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^notifications\./.test(action.id)) {
    findings.push({
      file: notificationsFile,
      line: action.line,
      message:
        "Notifications stable actions must stay in the notifications debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/stableHeight=/.test(action.block)) {
    findings.push({
      file: notificationsFile,
      line: action.line,
      message:
        "Every Notifications stable action must declare stableHeight for phone geometry.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const expectedOrder = [
  "notifications.hero.dashboard",
  "notifications.show-urgent",
  "notifications.hero.dashboard",
  "notifications.toggle-focus",
  "notifications.focus.primary",
  "notifications.focus.open-page",
  "notifications.focus.mark-read",
  "notifications.toggle-buckets",
  "notifications.bucket.${bucket}",
  "notifications.selected.open",
  "notifications.selected.mark-read",
  "notifications.selected.close",
  "notifications.notice.${notice.id}.primary",
  "notifications.notice.${notice.id}.open-page",
  "notifications.notice.${notice.id}.mark-read",
  "notifications.toggle-raw-feed",
  "notifications.feed.${item.id}.open",
  "notifications.toggle-reading",
];
let cursor = -1;

for (const debugId of expectedOrder) {
  const next = source.indexOf(debugId, cursor + 1);
  if (next === -1) {
    findings.push({
      file: notificationsFile,
      line: 1,
      message:
        "Notifications front-to-inner action inventory is missing an expected action family.",
      text: debugId,
    });
    continue;
  }

  if (next < cursor) {
    findings.push({
      file: notificationsFile,
      line: lineAt(source, next),
      message:
        "Notifications front-to-inner action order changed. Re-audit phone button flow before accepting this reorder.",
      text: debugId,
    });
  }

  cursor = next;
}

const bucketOrder = source.match(/const BUCKET_ORDER: GuidanceInboxBucketKey\[] = \[[\s\S]*?\];/)?.[0] || "";
const bucketKeys =
  bucketOrder.match(/"(actNow|dueSoon|watchAndWait|generalUpdates)"/g) || [];
if (bucketKeys.length !== expectedBucketRowCount) {
  findings.push({
    file: notificationsFile,
    line: 1,
    message: `Notifications bucket row inventory changed from ${expectedBucketRowCount} to ${bucketKeys.length}. Re-audit the mapped bucket buttons before accepting this baseline.`,
    text: bucketOrder.replace(/\s+/g, " "),
  });
}

const rawActionPattern =
  /<(button|a|summary)\b|role="button"|data-gmfn-action-root|data-cta-id/g;
while ((match = rawActionPattern.exec(source))) {
  findings.push({
    file: notificationsFile,
    line: lineAt(source, match.index),
    message:
      "Notifications page must not bypass shared stable primitives with raw action roots.",
    text: source.slice(match.index, match.index + 160).replace(/\s+/g, " "),
  });
}

assertContains(
  /<PageTopNav[\s\S]*?sectionLabel="Identity & Settings"[\s\S]*?title="Action Inbox"[\s\S]*?homeTo=\{routes\.dashboard\}[\s\S]*?homeLabel="Dashboard"/,
  "Notifications desktop top nav must keep the single Dashboard escape link."
);

assertContains(
  /<PrimaryButton[\s\S]*?onClick=\{showUrgentItems\}[\s\S]*?fullWidth[\s\S]*?stableHeight=\{56\}[\s\S]*?debugId="notifications\.show-urgent"/,
  "Notifications urgent action must stay a full-width fixed-height primary action."
);

assertContains(
  /isPhone \? \([\s\S]*?<StableCtaLink[\s\S]*?to=\{routes\.dashboard\}[\s\S]*?kind="secondary"[\s\S]*?stableHeight=\{52\}[\s\S]*?debugId="notifications\.hero\.dashboard"[\s\S]*?width: "fit-content"[\s\S]*?minWidth: 164/,
  "Notifications phone Dashboard escape must stay a compact secondary action under the urgent primary button."
);

assertContains(
  /BUCKET_ORDER\.map\(\(bucket, index\) =>[\s\S]*?<StableButton[\s\S]*?stableHeight=\{bucketRowHeight\}[\s\S]*?debugId=\{`notifications\.bucket\.\$\{bucket\}`\}[\s\S]*?height: bucketRowHeight[\s\S]*?maxHeight: bucketRowHeight/,
  "Notifications bucket rows must keep fixed row geometry through StableButton."
);

assertContains(
  /const bucketRowHeight = isPhone \? 124 : 86/,
  "Notifications bucket rows must keep taller phone rows so labels do not fight the tap target."
);

assertContains(
  /selectedBucketRows\.map\(\(notice\) =>[\s\S]*?debugId=\{`notifications\.notice\.\$\{notice\.id\}\.primary`\}[\s\S]*?debugId=\{`notifications\.notice\.\$\{notice\.id\}\.open-page`\}[\s\S]*?debugId=\{`notifications\.notice\.\$\{notice\.id\}\.mark-read`\}/,
  "Notifications selected-bucket item actions must keep primary/open-page/mark-read action families."
);

assertContains(
  /rawFeed\.map\(\(item\) =>[\s\S]*?<StableCtaLink[\s\S]*?to=\{item\.ctaTo\}[\s\S]*?stableHeight=\{isPhone \? 188 : 158\}[\s\S]*?debugId=\{`notifications\.feed\.\$\{item\.id\}\.open`\}/,
  "Notifications recent-feed cards must stay actionable and route to each notice's normalized task target."
);

assertContains(
  /function notificationKindLabel\(raw: any, fallback: string\): string \{[\s\S]*?community_verification\.request_confirmation[\s\S]*?Community verification[\s\S]*?community_confirmation\.request_to_respond[\s\S]*?Community confirmation/,
  "Notifications recent-feed labels must not expose raw community confirmation event names."
);

assertContains(
  /function policyTargetForCommunityVerificationRequest\(target: string\): string \{[\s\S]*?COMMUNITY_CONFIRMATION_POLICY[\s\S]*?community_verification\.request_confirmation[\s\S]*?COMMUNITY_CONFIRMATION_INBOX[\s\S]*?policyTargetForCommunityVerificationRequest\(explicit\)/,
  "Community verification request notifications must route to responder policy focus instead of a generic inbox dead end."
);

assertContains(
  /function isCommunityConfirmationOutcomeNotice\(raw: any\): boolean \{[\s\S]*?community_confirmation\.outcome_updated[\s\S]*?community_confirmation\.request_expired[\s\S]*?function communityConfirmationOutcomeDecisionTarget\(target: string\): string \{[\s\S]*?community-confirmations\\\/public[\s\S]*?searchParams\.set\("focus", "decision"\)[\s\S]*?if \(isCommunityConfirmationOutcomeNotice\(raw\)\) \{[\s\S]*?return communityConfirmationOutcomeDecisionTarget\(explicit\);[\s\S]*?Record decision/,
  "Community confirmation outcome and expiry notifications must land on the public outcome decision focus, not the top of the public paper."
);

assertContains(
  /function trustPassportNotificationTarget\(target: string, raw: any\): string \{[\s\S]*?path !== NOTIFICATION_TARGETS\.TRUST[\s\S]*?searchParams\.set\([\s\S]*?"focus"[\s\S]*?"repair"[\s\S]*?: "evidence"[\s\S]*?splitPathSuffix\(explicit\)\.path === NOTIFICATION_TARGETS\.TRUST[\s\S]*?trustPassportNotificationTarget\(explicit, raw\)[\s\S]*?Open trust repair[\s\S]*?Open trust evidence[\s\S]*?trustPassportNotificationTarget\(safeStr\(onboardingTrustNotice\.ctaTo\) \|\| NOTIFICATION_TARGETS\.TRUST, onboardingTrustNotice\)/,
  "Trust Passport notifications must focus evidence or repair lanes instead of opening the broad passport top."
);
assertContains(
  /async function handlePrimaryNoticeAction\(notice: GuidanceNotice\)[\s\S]*?const noticeId = safeStr\(normalizedNotice\.id\);[\s\S]*?if \(settings\.openActionsDirectly\) \{[\s\S]*?void markNotificationRead\(Number\(noticeId\)\)\.catch\(\(\) => null\);[\s\S]*?navigateWithOrigin\(navigate, normalizedNotice\.ctaTo, location\);[\s\S]*?return;[\s\S]*?if \(noticeId\) \{[\s\S]*?void markAsRead\(noticeId\);/,
  "Notifications primary action must navigate directly before local review-state repaint when direct-open mode is on."
);

assertPolicyContains(
  /verificationRequestFocus[\s\S]*?verification_request[\s\S]*?sectionLabel=\{memberWitnessFocus \|\| verificationRequestFocus \? "GSN evidence" : "Community confirmation"\}[\s\S]*?title=\{memberWitnessFocus \? "Member Witness" : verificationRequestFocus \? "Verification Request" : "Instant Confirmation Policy"\}[\s\S]*?Review responder readiness before this public request continues\.[\s\S]*?community-confirmation-policy\.verification-request\.review-routing[\s\S]*?Review responders[\s\S]*?community-confirmation-policy\.verification-request\.open-inbox[\s\S]*?!memberWitnessFocus && !verificationRequestFocus \? \([\s\S]*?<ExplainToggle[\s\S]*?!memberWitnessFocus && !verificationRequestFocus \? \([\s\S]*?Who can answer for this community\?[\s\S]*?id="community-confirmation-policy-switches"/,
  "Community Confirmation Policy must show a focused public verification request landing with immediate responder actions before the policy switches, without the generic policy hero in focused mode."
);

assertContains(
  /community_member_witness\.request_to_respond[\s\S]*?Member witness[\s\S]*?community_member_witness\.outcome_updated[\s\S]*?Witness result/,
  "Notifications recent-feed labels must translate member-witness event names."
);

assertContains(
  /COMMUNITY_CONFIRMATION_POLICY[\s\S]*?member_witness_request=[\s\S]*?View witness result[\s\S]*?Record witness/,
  "Member-witness notifications must keep task-specific Action Inbox labels."
);

assertGuidanceContains(
  /COMMUNITY_CONFIRMATION_POLICY[\s\S]*?member_witness_request=[\s\S]*?View witness result[\s\S]*?Record witness/,
  "Shared guidance must keep task-specific member-witness CTA labels."
);

assertGuidanceContains(
  /community_member_witness\.request_to_respond[\s\S]*?community_member_witness\.outcome_updated[\s\S]*?member witness request[\s\S]*?member witness result/,
  "Shared guidance must keep member-witness notifications in Act now."
);

assertGuidanceContains(
  /function guidanceTrustPassportTarget\(focus: "evidence" \| "repair"[\s\S]*?focus=\$\{encodeURIComponent\(focus\)\}[\s\S]*?trust score[\s\S]*?guidanceTrustPassportTarget\("evidence"\)[\s\S]*?primary === "bank" \? GUIDANCE_TARGETS\.PAYOUT_DETAILS : guidanceTrustPassportTarget\("evidence"\)[\s\S]*?ctaTo: guidanceTrustPassportTarget\("repair"\)/,
  "Shared guidance must route trust evidence and repair notices to focused Trust Passport lanes."
);
assertContains(
  /const \[isPhone, setIsPhone\] = useState<boolean>\([\s\S]*?window\.innerWidth <= 640[\s\S]*?gridTemplateColumns: isPhone\s*\?\s*"1fr"/,
  "Notifications action rows must collapse to one-column phone controls."
);

assertLayoutContains(
  /if \(pathname\.startsWith\("\/app\/notifications"\)\) \{[\s\S]*?makeDashboardItem\(\)[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeCommunityItem\(\)[\s\S]*?\{ label: "Loan Support", to: "\/app\/loans" \}[\s\S]*?\{ label: "Demand Box", to: "\/app\/demand-box" \}/,
  "Notifications page tools must keep Dashboard, Marketplace, Community, Loan Support, and Demand Box."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.open-navigation"[\s\S]*?debugId="app-layout\.mobile\.open-tools"/,
  "Notifications mobile shell must keep the two fixed top controls: Menu and Tools."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-navigation"[\s\S]*?debugId=\{`app-layout\.drawer\.\$\{group\.title[\s\S]*?debugId="app-layout\.drawer\.logout"/,
  "Notifications mobile drawer must keep close, grouped nav links, and logout as stable controls."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-tools"[\s\S]*?debugId=\{`app-layout\.page-action\.\$\{item\.label[\s\S]*?debugId="app-layout\.page-action\.logout"/,
  "Notifications mobile tools panel must keep close, page actions, and logout as stable controls."
);

assertLayoutContains(
  /const mobileBottomItems = useMemo<NavLinkItem\[\]>\(\(\) => \{[\s\S]*?makeDashboardItem\(\)[\s\S]*?label: "Community Home"[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?label: "Shop"[\s\S]*?makeProfileItem\(\)[\s\S]*?data-gmfn-bottom-nav="true"[\s\S]*?debugId=\{`app-layout\.bottom-nav\.\$\{item\.label/,
  "Notifications mobile route must keep the five-anchor shared bottom-nav action roots counted."
);

assertLayoutContains(
  /const showMobileBottomRail =[\s\S]*?isMobile && \(!taskMode \|\| shouldKeepBottomRailInTaskMode\(location\.pathname\)\)/,
  "Notifications is a normal authenticated route and must keep the shared mobile bottom rail."
);

if (findings.length > 0) {
  console.error("Notifications button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Notifications button inventory audit passed: ${actions.length} stable source actions (${Object.entries(tagCounts)
    .map(([tag, count]) => `${count} ${tag}`)
    .join(", ")}), ${expectedBucketRowCount} bucket rows, ${expectedMobileShellActionCount} mobile shell controls (${expectedMobileShellBreakdown.top} top, ${expectedMobileShellBreakdown.drawer} drawer, ${expectedMobileShellBreakdown.pageTools} tools, ${expectedMobileShellBreakdown.bottom} bottom), ${expectedWholeMobileRouteFixedActionFamilies} whole-route fixed action families total, plus dynamic notice-row actions.`
);
