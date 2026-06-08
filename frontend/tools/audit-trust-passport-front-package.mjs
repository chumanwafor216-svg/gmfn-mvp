/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  trust: "src/pages/TrustScorePage.tsx",
  app: "src/App.tsx",
  targets: "src/lib/actionTargetRoutes.ts",
  package: "package.json",
  protocol: "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md",
  specs: "../docs/SCREEN_SPECS.md",
};

const sourceByFile = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);
const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(file, source, index, message, text = "Expected pattern was not found.") {
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 280),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByFile[key];
  if (pattern.test(source)) return;
  addFinding(files[key], source, -1, message, text);
}

function assertOrderedSnippets(key, snippets, message) {
  const source = sourceByFile[key];
  let cursor = -1;
  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    if (index === -1) {
      addFinding(files[key], source, Math.max(cursor, 0), message, snippet);
      return;
    }
    cursor = index;
  }
}

function flexibleTextRegex(text) {
  return new RegExp(
    String(text)
      .split(/\s+/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+"),
    "i"
  );
}

assertContains(
  "app",
  /const TrustScorePage = React\.lazy\(\(\) => import\("\.\/pages\/TrustScorePage"\)\)[\s\S]*?<Route path="trust" element=\{<TrustScorePage \/>\} \/>[\s\S]*?<Route path="trust-passport" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\}/,
  "Trust Passport route ownership must stay explicit: /app/trust renders TrustScorePage and /app/trust-passport redirects to it."
);

assertContains(
  "targets",
  /TRUST: APP_ROUTES\.TRUST[\s\S]*?"trust-passport": ACTION_TARGETS\.TRUST[\s\S]*?trust: "TRUST"/,
  "Shared route targets must keep Trust Passport aliases normalized to the canonical trust route."
);

assertContains(
  "trust",
  /sectionLabel="Trust Passport"[\s\S]*?title="Trust Passport"[\s\S]*?subtitle="Loading the trust passport\.\.\."[\s\S]*?homeTo=\{routes\.dashboard\}[\s\S]*?backTo=\{routes\.dashboard\}/,
  "Trust Passport loading shell must keep the Trust Passport identity and Dashboard recovery route."
);

assertContains(
  "trust",
  /const routes = useMemo\([\s\S]*?dashboard: routeTarget\("dashboard", selectedClanId, "trust-score\.route\.dashboard"\)[\s\S]*?notifications: routeTarget\("notifications", selectedClanId, "trust-score\.route\.notifications"\)[\s\S]*?identity: routeTarget\("cci", selectedClanId, "trust-score\.route\.identity"\)[\s\S]*?openTrust: routeTarget\("openTrust", selectedClanId, "trust-score\.route\.open-trust"\)[\s\S]*?cciReading: routeTarget\("cciReading", selectedClanId, "trust-score\.route\.cci-reading"\)[\s\S]*?trustSlip: routeTarget\("trustSlip", selectedClanId, "trust-score\.route\.trust-slip"\)/,
  "Trust Passport must keep traceable shared CTA intents for dashboard, notifications, CCI, local trust, CCI reading, and TrustSlip."
);

[
  "Identity Overview",
  "2. Current trust verdict",
  "3. What this reading says",
  "4. Why this reading looks like this",
  "5. Trust surfaces",
  "6. Why did my trust change?",
  "7. Shareable trust tools",
  "8. Evidence & institutional context",
].forEach((label) => {
  assertContains(
    "trust",
    new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `Trust Passport current front package must keep the ${label} section until a deliberate lane redesign replaces it.`
  );
});

[
  "Current Trust Standing",
  "Evidence Story",
  "Community Confirmation",
  "Finance Discipline",
  "Documents / TrustSlip",
  "Repair or Next Step",
].forEach((lane) => {
  assertContains(
    "protocol",
    flexibleTextRegex(lane),
    `Guided work protocol must keep the Trust Passport ${lane} lane named.`
  );
  assertContains(
    "specs",
    flexibleTextRegex(lane),
    `Trust Passport screen spec must keep the ${lane} lane named.`
  );
});

assertOrderedSnippets(
  "trust",
  [
    "const trustSurfaceCards = [",
    "title: \"Local community trust\"",
    "to: routes.openTrust",
    "debugId: \"trust-score.surface.local-community-trust\"",
    "title: \"Cross-community consistency\"",
    "to: routes.cciReading",
    "debugId: \"trust-score.surface.cross-community-consistency\"",
  ],
  "Trust Passport local/cross-community trust surface cards must keep their route targets and stable debug IDs."
);

assertOrderedSnippets(
  "trust",
  [
    "7. Shareable trust tools",
    "debugId=\"trust-score.refresh\"",
    "debugId=\"trust-score.copy-snapshot\"",
    "debugId=\"trust-score.open-trust-slip\"",
    "debugId=\"trust-score.verify\"",
    "debugId=\"trust-score.review-care\"",
    "debugId=\"trust-score.export\"",
  ],
  "Trust Passport shareable tools must keep the current ordered action set until the Documents / TrustSlip lane is intentionally redesigned."
);

assertContains(
  "package",
  /"audit:trust-passport-front-package"/,
  "Trust Passport front package audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Trust Passport front package work[\s\S]*?audit:trust-passport-front-package[\s\S]*?audit:trust-passport-button-inventory/,
  "Guided work protocol must require Trust Passport front-package and button-inventory audits."
);

if (findings.length > 0) {
  console.error("Trust Passport front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Trust Passport front package audit passed.");
