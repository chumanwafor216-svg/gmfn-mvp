/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

const adminOpsFiles = [
  "src/pages/AdminIdentityRiskPage.tsx",
  "src/pages/AdminTrustEventsPage.tsx",
  "src/pages/AdminTrustGraphPage.tsx",
  "src/pages/AdminIncompleteLoansPage.tsx",
  "src/pages/ExposureAdminPage.tsx",
  "src/pages/ExposurePage.tsx",
  "src/pages/SystemOperationsPage.tsx",
  "src/pages/CommunityJoinRequestsPage.tsx",
  "src/pages/NotificationsPage.tsx",
];

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

function assertNotContains(file, pattern, message) {
  const text = read(file);

  text.split(/\r?\n/).forEach((line, index) => {
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

function assertStableActionsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern =
    /<(?:PrimaryButton|SecondaryButton|SubtleButton|DangerButton|StableButton|StableCtaLink|StableDisclosureSummary)\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 1100);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Admin / Operations stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

adminOpsFiles.forEach(assertStableActionsHaveDebugIds);

for (const file of adminOpsFiles) {
  assertNotContains(
    file,
    /to=["']\/cover["']|to=["']\/welcome["']/,
    "Admin / Operations actions must not send signed-in users directly to Cover or Welcome."
  );
}

assertContains(
  "src/pages/SystemOperationsPage.tsx",
  /debugId="system-operations\.toggle\.overview"[\s\S]*?debugId="system-operations\.toggle\.intake"[\s\S]*?debugId="system-operations\.toggle\.signals"[\s\S]*?debugId="system-operations\.route\.bank-console"/,
  "System Operations toggles and route actions must remain traceable."
);

assertContains(
  "src/pages/AdminTrustGraphPage.tsx",
  /debugId="admin-trust-graph\.toggle-overview"[\s\S]*?debugId="admin-trust-graph\.toggle-structure"[\s\S]*?debugId="admin-trust-graph\.route\.analytics"[\s\S]*?debugId="admin-trust-graph\.route\.command-center"/,
  "Admin Trust Graph toggles and route actions must remain traceable."
);

assertContains(
  "src/pages/AdminTrustEventsPage.tsx",
  /debugId="admin-trust-events\.route\.analytics"[\s\S]*?debugId="admin-trust-events\.route\.graph"[\s\S]*?debugId="admin-trust-events\.route\.identity-risk"[\s\S]*?debugId="admin-trust-events\.route\.command-center"/,
  "Admin Trust Events route actions must remain traceable."
);

assertContains(
  "src/pages/AdminIncompleteLoansPage.tsx",
  /debugId="admin-incomplete-loans\.copy-queue"[\s\S]*?debugId="admin-incomplete-loans\.route\.system-operations"[\s\S]*?debugId="admin-incomplete-loans\.route\.bank-console"[\s\S]*?debugId="admin-incomplete-loans\.route\.command-center"/,
  "Admin Incomplete Loans queue and route actions must remain traceable."
);

assertContains(
  "src/pages/ExposureAdminPage.tsx",
  /debugId="exposure-admin\.toggle\.overview"[\s\S]*?debugId="exposure-admin\.toggle\.queues"[\s\S]*?debugId="exposure-admin\.route\.system-operations"[\s\S]*?debugId="exposure-admin\.route\.bank-console"/,
  "Exposure Admin toggles and route actions must remain traceable."
);

assertContains(
  "src/pages/ExposurePage.tsx",
  /debugId="exposure\.run-overdue"[\s\S]*?debugId="exposure\.refresh"[\s\S]*?debugId="exposure\.load-cci"[\s\S]*?debugId="exposure\.open-trust-analytics"/,
  "Exposure operational actions must remain traceable."
);

assertContains(
  "src/pages/CommunityJoinRequestsPage.tsx",
  /debugId=\{communityHomeCta\.debugId\}[\s\S]*?debugId=\{marketplaceCta\.debugId\}[\s\S]*?debugId="community-join-requests\.refresh"[\s\S]*?debugId="community-join-requests\.approve"/,
  "Community Join Requests navigation, refresh, and approval actions must remain traceable."
);

assertContains(
  "src/pages/NotificationsPage.tsx",
  /debugId="notifications\.show-urgent"[\s\S]*?debugId="notifications\.focus\.primary"[\s\S]*?debugId="notifications\.selected\.open"[\s\S]*?debugId="notifications\.toggle-raw-feed"/,
  "Notifications focus, selected notice, and feed actions must remain traceable."
);

assertContains(
  "src/pages/AdminIdentityRiskPage.tsx",
  /debugId=\{`admin-identity-risk\.\$\{g\.userId\}\.details`\}/,
  "Admin Identity Risk disclosure rows must remain traceable."
);

if (findings.length > 0) {
  console.error("Admin / Operations action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Admin / Operations action audit passed.");
