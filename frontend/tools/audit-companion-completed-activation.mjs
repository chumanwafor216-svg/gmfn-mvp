/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const guidancePath = join(frontendRoot, "src", "lib", "guidance.ts");
const source = readFileSync(guidancePath, "utf8");
const findings = [];

function assertContains(pattern, message) {
  if (!pattern.test(source)) {
    findings.push(message);
  }
}

assertContains(
  /function hasCompletedMemberActivation\(me: any \| null \| undefined\): boolean \{[\s\S]*?statusLooksPendingActivation\(me\?\.activation_status\)[\s\S]*?if \(explicitPending\) return false;[\s\S]*?if \(hasUsableGsnIdentity\(me\)\) return true;[\s\S]*?\/auth\/me is only returned for authenticated, non-pending users on the API\.[\s\S]*?Boolean\(me\?\.id && firstTruthy\(me\?\.email, me\?\.phone_e164, me\?\.role\)\)/,
  "Guidance must recognize completed activation from the authenticated member payload while preserving explicit pending activation."
);

assertContains(
  /function isCompletedActivationNotification\(raw: any, me: any \| null \| undefined\): boolean \{[\s\S]*?if \(!hasCompletedMemberActivation\(me\)\) return false;[\s\S]*?text\.includes\("activate membership"\)[\s\S]*?text\.includes\("\/activate-membership"\)/,
  "Completed activation notifications must be filtered by shared activation-completion logic before Companion/action inbox can surface them."
);

assertContains(
  /const notificationRows = toArrayRows\(params\.rawNotifications\)[\s\S]*?\.filter\(\(item\) => !isResolvedJoinReviewNotification\(item\)\)[\s\S]*?\.filter\(\(item\) => !isCompletedActivationNotification\(item, params\.me\)\)[\s\S]*?\.map\(normalizeNotificationNotice\)/,
  "Action inbox notification rows must drop stale activation notices before normalization."
);

if (findings.length > 0) {
  console.error("Companion completed-activation audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(
  "Companion completed-activation audit passed: stale activation prompts are filtered for active members."
);
