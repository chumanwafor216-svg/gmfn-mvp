/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const communityFile = "src/pages/CommunityHomePage.tsx";
const source = readFileSync(join(frontendRoot, communityFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function debugIdFrom(block) {
  return (
    block.match(/debugId="([^"]+)"/)?.[1] ||
    block.match(/debugId=\{`([^`]+)`\}/)?.[1] ||
    block.match(/debugId=\{([^}]+)\}/)?.[1] ||
    ""
  ).replace(/\s+/g, " ");
}

function assertContains(pattern, message, text = "Expected pattern was not found.") {
  if (pattern.test(source)) return;
  findings.push({
    file: communityFile,
    line: 1,
    message,
    text,
  });
}

const actionPattern = /<StableButton\b[\s\S]*?(?:\/>|<\/StableButton>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  actions.push({
    id: debugIdFrom(block),
    line: lineAt(match.index),
    block,
  });
}

const expectedStableButtonCount = 14;
if (actions.length !== expectedStableButtonCount) {
  findings.push({
    file: communityFile,
    line: 1,
    message: `Community Home StableButton inventory changed from ${expectedStableButtonCount} to ${actions.length}. Re-audit the new/removed button on phone before accepting this baseline.`,
    text: `StableButton count: ${actions.length}`,
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: communityFile,
      line: action.line,
      message: "Every Community Home stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^community-home\./.test(action.id)) {
    findings.push({
      file: communityFile,
      line: action.line,
      message: "Community Home stable actions must stay in the community-home debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/style=/.test(action.block)) {
    findings.push({
      file: communityFile,
      line: action.line,
      message: "Community Home stable actions must declare route-local styling for phone geometry.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const frontToInnerOrder = [
  { label: "empty state", pattern: /^community-home\.empty\./ },
  { label: "finance summary", pattern: /^community-home\.finance-summary\./ },
  { label: "trust summary", pattern: /^community-home\.trust-summary\./ },
  { label: "front next actions", pattern: /^community-home\.next-action\./ },
  { label: "spotlight guided lane", pattern: /^community-home\.spotlight-guided\./ },
  { label: "compact tool rows", pattern: /^community-home\.tool\./ },
  { label: "spotlight status", pattern: /^community-home\.spotlight-status\./ },
  { label: "community rows", pattern: /^community-home\.communities\./ },
];
let previousSection = null;

for (const section of frontToInnerOrder) {
  const firstAction = actions.find((action) => section.pattern.test(action.id));
  if (!firstAction) {
    findings.push({
      file: communityFile,
      line: 1,
      message: "Community Home front-to-inner action inventory is missing an expected section.",
      text: section.label,
    });
    continue;
  }

  if (previousSection && firstAction.line <= previousSection.line) {
    findings.push({
      file: communityFile,
      line: firstAction.line,
      message:
        "Community Home front-to-inner action order changed. Re-audit phone button flow before accepting this reorder.",
      text: `${previousSection.label} at line ${previousSection.line}; ${section.label} at line ${firstAction.line}`,
    });
  }

  previousSection = { label: section.label, line: firstAction.line };
}

assertContains(
  /const communityNextActionItems = useMemo<NextActionGuideItem\[]>\([\s\S]*?id: "choose-community"[\s\S]*?id: "marketplace"[\s\S]*?id: "create-community"[\s\S]*?id: "join-community"[\s\S]*?id: "circle"[\s\S]*?id: "shop-control"[\s\S]*?id: "spotlight"[\s\S]*?id: "finance"[\s\S]*?id: "support"[\s\S]*?id: "trust"[\s\S]*?id: "notifications"/,
  "Community Home next-action guide must keep the full inner action manifest."
);

assertContains(
  /\{\[\s*\{[\s\S]*?id: "choose-community"[\s\S]*?id: "marketplace"[\s\S]*?id: "create-community"[\s\S]*?id: "join-community"[\s\S]*?id: "circle"[\s\S]*?\]\.map\(\(item, index\) => \([\s\S]*?debugId=\{`community-home\.next-action\.\$\{item\.id\}`\}/,
  "Community Home front quick-action grid must keep exactly the five front buttons before deeper tools."
);

assertContains(
  /debugId="community-home\.empty\.create-community"[\s\S]*?openCommunityRoute\(event, "\/create"\)/,
  "Community Home empty-state Create New Community must open the real create-community lane, not the retired /app/clans alias."
);

assertContains(
  /const spotlightHandleItems = useMemo<NextActionGuideItem\[]>\([\s\S]*?id: "spotlight-free"[\s\S]*?id: "spotlight-paid"[\s\S]*?id: "spotlight-vault"[\s\S]*?id: "spotlight-shop-setup"/,
  "Community Home spotlight guided lane must keep the four spotlight-family inner choices."
);

assertContains(
  /\{\[\s*\{[\s\S]*?id: "owner-actions"[\s\S]*?id: "shop-control"[\s\S]*?id: "vault-control"[\s\S]*?id: "free-spotlight"[\s\S]*?id: "spotlight-subscription"[\s\S]*?id: "trusted-circle"[\s\S]*?id: "spotlight-status"[\s\S]*?\]\.map\(\(item, index\) => \([\s\S]*?debugId=\{`community-home\.tool\.\$\{item\.id\}`\}/,
  "Community Home compact tool row manifest must stay traceable and ordered."
);

const rawActionPattern =
  /<(button|a|summary)\b|role="button"|data-gmfn-action-root|data-cta-id/g;
while ((match = rawActionPattern.exec(source))) {
  findings.push({
    file: communityFile,
    line: lineAt(match.index),
    message: "Community Home page must not bypass shared stable primitives with raw action roots.",
    text: source.slice(match.index, match.index + 160).replace(/\s+/g, " "),
  });
}

if (findings.length > 0) {
  console.error("Community Home button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Community Home button inventory audit passed: ${actions.length} StableButton source actions, plus checked front quick actions, guided actions, and compact tool rows.`
);
