/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const source = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const findings = [];

const expectedStableActionCount = 72;
const expectedNativeFieldCount = 37;
const allowedBusyDisabledExpressions = new Set([
  "creatingRepostPaymentInstruction",
  "loadingRepostCredits",
  "savingMoneyOutDestination",
  "savingPayInAccount",
  "supportProcessBusy",
]);

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function compact(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 260);
}

function addFinding(line, message, text) {
  findings.push({
    file: marketplaceFile,
    line,
    message,
    text: compact(text),
  });
}

function debugIdFor(block) {
  const match = block.match(
    /debugId=(?:"([^"]+)"|\{`([^`]+)`\}|\{([^}]+)\})/
  );
  return match?.[1] || match?.[2] || match?.[3] || "";
}

function propExpression(block, propName) {
  const escaped = propName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`${escaped}=\\{([^}]+)\\}`));
  return match?.[1]?.trim() || "";
}

function propString(block, propName) {
  const escaped = propName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`${escaped}="([^"]*)"`));
  return match?.[1] ?? "";
}

function disabledExpression(block) {
  const expression = propExpression(block, "disabled");
  if (expression) return expression;
  return /\sdisabled(?:\s|>|\/)/.test(block) ? "true" : "";
}

function targetExpression(block) {
  return propExpression(block, "to") || propString(block, "to");
}

function buttonType(block) {
  return propString(block, "type") || "button";
}

const actionPattern =
  /<(StableButton|StableCtaLink|SocialTagShareButton)\b[\s\S]*?(?:\/>|<\/(?:StableButton|StableCtaLink|SocialTagShareButton)>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  actions.push({
    type: match[1],
    line: lineAt(match.index),
    debugId: debugIdFor(block),
    disabled: disabledExpression(block),
    to: targetExpression(block),
    buttonType: match[1] === "StableButton" ? buttonType(block) : "",
    block,
  });
}

const nativeFieldPattern =
  /<(input|select|textarea)\b[\s\S]*?(?:\/>|<\/(?:select|textarea)>)/g;
const nativeFields = [];

while ((match = nativeFieldPattern.exec(source))) {
  nativeFields.push({
    type: match[1],
    line: lineAt(match.index),
    block: match[0],
  });
}

if (actions.length !== expectedStableActionCount) {
  addFinding(
    1,
    `Marketplace stable action count changed from ${expectedStableActionCount} to ${actions.length}. Re-run the line audit and review every new/removed action.`,
    actions.map((action) => `${action.line}:${action.debugId || "missing-debugId"}`).join(", ")
  );
}

if (nativeFields.length !== expectedNativeFieldCount) {
  addFinding(
    1,
    `Marketplace native field count changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit native field tap roots.`,
    nativeFields.map((field) => `${field.line}:${field.type}`).join(", ")
  );
}

for (const action of actions) {
  if (!action.debugId) {
    addFinding(
      action.line,
      "Marketplace stable action is missing debugId, so a phone misroute cannot be traced back to the exact line.",
      action.block
    );
  }

  if (!/style=/.test(action.block)) {
    addFinding(
      action.line,
      "Marketplace stable action is missing explicit route-local geometry/style.",
      action.block
    );
  }

  if (
    action.type === "StableButton" &&
    action.buttonType !== "submit" &&
    !/onClick=/.test(action.block)
  ) {
    addFinding(
      action.line,
      "Marketplace StableButton has no onClick handler. A visible button must route, respond, or explain in place.",
      action.block
    );
  }

  if (action.type === "StableCtaLink") {
    if (!action.to) {
      addFinding(
        action.line,
        "Marketplace StableCtaLink has no target. A visible link must never land nowhere.",
        action.block
      );
    }

    if (action.to === "\"\"" || action.to === "") {
      addFinding(
        action.line,
        "Marketplace StableCtaLink target is blank.",
        action.block
      );
    }

    if (/APP_ROUTES\./.test(action.to) && !/routeWithCommunity/.test(action.to)) {
      addFinding(
        action.line,
        "Marketplace app-route link must carry active community context with routeWithCommunity.",
        action.block
      );
    }
  }

  if (action.disabled && action.type !== "SocialTagShareButton") {
    if (!allowedBusyDisabledExpressions.has(action.disabled)) {
      addFinding(
        action.line,
        `Marketplace action uses disabled={${action.disabled}}. Only true busy locks may use disabled; missing-state actions must stay tappable and explain what to do.`,
        action.block
      );
    }

    if (/!|\|\||&&|Locked|Blocked/i.test(action.disabled)) {
      addFinding(
        action.line,
        "Marketplace action has a state/permission disabled expression. This can become a quiet dead button; make it a tappable explainer instead.",
        action.block
      );
    }
  }
}

for (const field of nativeFields) {
  if (!/marketplaceFieldTouchProps\(\s*(?:"[^"]+"|`[^`]+`)\s*\)/.test(field.block)) {
    addFinding(
      field.line,
      "Marketplace native input/select/textarea is missing marketplaceFieldTouchProps, so mobile taps may leak into neighbouring actions.",
      field.block
    );
  }
}

const rawInteractivePattern = /<(button|a|Link|summary)\b/g;
while ((match = rawInteractivePattern.exec(source))) {
  addFinding(
    lineAt(match.index),
    "Marketplace page must not use raw interactive elements. Use StableButton, StableCtaLink, StableDisclosureSummary, or guarded native fields.",
    source.slice(match.index, match.index + 180)
  );
}

if (findings.length) {
  console.error("Marketplace button line audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

const disabledRows = actions
  .filter((action) => action.disabled)
  .map((action) => `${action.line}:${action.debugId} disabled={${action.disabled}}`);
const actionRows = actions.map(
  (action) => `${action.line}:${action.debugId || "missing-debugId"}`
);

console.log(
  `Marketplace button line audit passed: ${actions.length} stable actions, ${nativeFields.length} native fields, ${disabledRows.length} busy-only disabled actions.`
);
console.log(`Marketplace stable action lines: ${actionRows.join(", ")}`);
if (disabledRows.length) {
  console.log(`Allowed busy disabled lines: ${disabledRows.join(", ")}`);
}
