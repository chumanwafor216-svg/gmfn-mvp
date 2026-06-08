/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const notificationsFile = "src/pages/NotificationsPage.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const source = readFileSync(join(frontendRoot, notificationsFile), "utf8");
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const findings = [];

const expectedSourceActions = {
  PrimaryButton: 3,
  SecondaryButton: 2,
  StableButton: 1,
  StableCtaLink: 5,
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
  bottom: 7,
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
  /isPhone \? \([\s\S]*?<StableCtaLink[\s\S]*?to=\{routes\.dashboard\}[\s\S]*?kind="secondary"[\s\S]*?stableHeight=\{46\}[\s\S]*?debugId="notifications\.hero\.dashboard"[\s\S]*?width: "fit-content"[\s\S]*?minWidth: 164/,
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
  /const \[isPhone, setIsPhone\] = useState<boolean>\([\s\S]*?window\.innerWidth <= 640[\s\S]*?gridTemplateColumns: isPhone\s*\?\s*"1fr"/,
  "Notifications action rows must collapse to one-column phone controls."
);

assertLayoutContains(
  /if \(pathname\.startsWith\("\/app\/notifications"\)\) \{[\s\S]*?makeDashboardItem\(\)[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeCommunityItem\(\)[\s\S]*?\{ label: "Loans & Support", to: "\/app\/loans" \}[\s\S]*?\{ label: "Demand Box", to: "\/app\/demand-box" \}/,
  "Notifications page tools must keep Dashboard, Marketplace, Community, Loans & Support, and Demand Box."
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
  /data-gmfn-bottom-nav="true"[\s\S]*?debugId=\{`app-layout\.bottom-nav\.\$\{item\.label/,
  "Notifications mobile route must keep the shared bottom-nav action roots counted."
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
