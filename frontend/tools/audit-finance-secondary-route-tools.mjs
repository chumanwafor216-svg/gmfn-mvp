/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  finance: "src/pages/FinancePage.tsx",
  targets: "src/lib/actionTargetRoutes.ts",
  app: "src/App.tsx",
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
    text: text.replace(/\s+/g, " ").slice(0, 260),
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

assertContains(
  "finance",
  /const routes = useMemo\([\s\S]*?moneyOut: routeTarget\("moneyOut", selectedClanId, "finance\.route\.money-out-target"\)[\s\S]*?paymentRails: routeTarget\("paymentRails", selectedClanId, "finance\.route\.payment-rails-target"\)[\s\S]*?payoutDetails: routeTarget\("payoutDetails", selectedClanId, "finance\.route\.payout-details-target"\)[\s\S]*?loanReadiness: routeTarget\("loanReadiness", selectedClanId, "finance\.route\.loan-readiness-target"\)[\s\S]*?trust: routeTarget\("trust", selectedClanId, "finance\.route\.trust-target"\)/,
  "Finance secondary route tools must keep their CTA intents and traceable route-target debug ids."
);

[
  ["banking-rails", "bank", "Payment setup", "Check where money can move.", "routes.paymentRails"],
  ["money-out", "out", "Money out", "Open the money-out steps.", "routes.moneyOut"],
  ["payout-details", "receipt", "Payout account", "Check where a payout would go.", "routes.payoutDetails"],
  ["signals-readiness", "check", "Support readiness", "Check the next support step.", "routes.loanReadiness"],
  ["trust-passport", "shield", "Trust Passport", "Read trust record.", "routes.trust"],
].forEach(([debugKey, icon, label, detail, target]) => {
  assertOrderedSnippets(
    "finance",
    [
      "Other money tasks",
      `debugKey: "${debugKey}"`,
      `icon: "${icon}" as FinanceGlyphName`,
      `label: "${label}"`,
      `detail: "${detail}"`,
      `action: () => openFinanceRoute(${target})`,
      "debugId={`finance.mini-tool.${tool.debugKey}`}",
    ],
    `${label} must stay in the compact Finance secondary route tool group with the approved target and debug-id root.`
  );
});

assertContains(
  "finance",
  /const \[otherFinanceLanesOpen, setOtherFinanceLanesOpen\] = useState\(false\);[\s\S]*?const showOtherFinanceLanes = !isCompact \|\| otherFinanceLanesOpen;[\s\S]*?setOtherFinanceLanesOpen\(\(open\) => !open\)[\s\S]*?debugId="finance\.more-lanes\.toggle"[\s\S]*?\{showOtherFinanceLanes \? \([\s\S]*?compactOnly: true[\s\S]*?\.filter\(\(tool\) => !tool\.compactOnly \|\| isCompact\)/,
  "Finance secondary route tools must be collapsed behind one task disclosure on phone."
);

assertContains(
  "finance",
  /FinanceSectionLabel icon="signal" color="#0B4EA2"[\s\S]*?Other money tasks[\s\S]*?Choose another task[\s\S]*?gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(4, minmax\(0, 1fr\)\)"[\s\S]*?debugId=\{`finance\.mini-tool\.\$\{tool\.debugKey\}`\}[\s\S]*?style=\{financeMiniToolButtonStyle\(isCompact\)\}/,
  "Finance secondary route tools must keep compact two-up phone geometry and fixed-height mini buttons."
);

assertContains(
  "finance",
  /function financeMiniToolButtonStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?const compactHeight = 52;[\s\S]*?const desktopHeight = 76;[\s\S]*?height: isCompact \? compactHeight : desktopHeight,[\s\S]*?maxHeight: isCompact \? compactHeight : desktopHeight,[\s\S]*?display: isCompact \? "flex" : "block"[\s\S]*?overflow: "hidden"[\s\S]*?brandClampLines\(2\)[\s\S]*?brandSingleLine\(\)/,
  "Finance mini-tool style must keep fixed heights, hidden overflow, and clamped labels."
);

assertContains(
  "targets",
  /payoutDetails: "PAYOUT_DETAILS"[\s\S]*?trust: "TRUST"[\s\S]*?loanReadiness: "LOAN_READINESS"/,
  "CTA intent mapping must keep payout details, trust, and loan readiness route targets available."
);

assertContains(
  "targets",
  /"payout-details": ACTION_TARGETS\.PAYOUT_DETAILS[\s\S]*?trust: ACTION_TARGETS\.TRUST[\s\S]*?"trust-passport": ACTION_TARGETS\.TRUST[\s\S]*?"loan-readiness": ACTION_TARGETS\.LOAN_READINESS/,
  "Route aliases must keep payout-details, trust-passport, and loan-readiness normalized to their canonical app targets."
);

assertContains(
  "app",
  /<Route path="trust" element=\{<TrustScorePage \/>\} \/>[\s\S]*?<Route path="trust-passport" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\}/,
  "The Finance Trust Passport mini tool must continue resolving to the current Trust Passport alias target instead of an unnamed screen."
);

assertContains(
  "package",
  /"audit:finance-secondary-route-tools"/,
  "Finance secondary route tool audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Finance secondary route tool work[\s\S]*?audit:finance-secondary-route-tools/,
  "Guided work protocol must require the Finance secondary route tool audit."
);

assertContains(
  "specs",
  /Secondary route tools such as Payout Details, Pipeline Credits, and Trust Passport\s+may remain visible only as compact linked tools/,
  "Finance screen spec must record that Payout Details and Trust Passport are compact linked tools, not major Finance lanes."
);

if (findings.length > 0) {
  console.error("Finance secondary route tool audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance secondary route tool audit passed.");
