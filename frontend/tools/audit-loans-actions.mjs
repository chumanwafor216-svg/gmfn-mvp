/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

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
  const actionPattern = /<Stable(?:Button|CtaLink|DisclosureSummary)\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 900);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Loans-domain stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

[
  "src/pages/LoansPage.tsx",
  "src/pages/LoanReadinessPage.tsx",
  "src/pages/LoanSuggestionsPage.tsx",
  "src/pages/LoanWorkbenchPage.tsx",
  "src/pages/LoanSummaryPage.tsx",
  "src/pages/LoanDecisionPage.tsx",
  "src/pages/GuarantorInboxPage.tsx",
  "src/pages/GuarantorEarningsPage.tsx",
  "src/pages/RepaymentPage.tsx",
  "src/pages/RevenueAllocationPage.tsx",
].forEach(assertStableActionsHaveDebugIds);

assertContains(
  "src/pages/LoansPage.tsx",
  /function responsiveGridColumns\(minWidth: number\): string \{[\s\S]*?repeat\(auto-fit, minmax\(min\(100%, \$\{minWidth\}px\), 1fr\)\)/,
  "Loans page must use container-safe grids so phone route cards cannot collapse into narrow vertical text columns."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /gridTemplateColumns: responsiveGridColumns\(260\)[\s\S]*?debugId="loans\.route\.start-support"[\s\S]*?debugId="loans\.route\.money-in"[\s\S]*?debugId="loans\.route\.money-out"[\s\S]*?debugId="loans\.route\.readiness"[\s\S]*?debugId="loans\.route\.suggestions"[\s\S]*?debugId="loans\.route\.guarantor-inbox"[\s\S]*?debugId="loans\.route\.notifications"[\s\S]*?debugId="loans\.route\.guarantor-earnings"[\s\S]*?debugId="loans\.route\.marketplace"/,
  "Loans live support modules must stay in a phone-safe grid and keep every route action traceable."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /overflowWrap: "normal"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"/,
  "Loans route labels must not inherit anywhere-breaking text that can turn labels into one-letter columns."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /startSupport: routeTarget\([\s\S]*?"marketplace"[\s\S]*?"loans\.route\.start-support"[\s\S]*?"marketplace-loans-support"[\s\S]*?readiness: routeTarget\([\s\S]*?"loanReadiness"[\s\S]*?suggestions: routeTarget\([\s\S]*?"loanSuggestions"[\s\S]*?guarantorInbox: routeTarget\([\s\S]*?"guarantorInbox"[\s\S]*?notifications: routeTarget\([\s\S]*?"notifications"[\s\S]*?guarantorEarnings: routeTarget\([\s\S]*?"guarantorEarnings"/,
  "Loans route targets must keep their intended support, readiness, suggestions, guarantor, inbox, and earnings destinations."
);

assertNotContains(
  "src/pages/LoansPage.tsx",
  /gridTemplateColumns: isCompact \? "1fr" : "repeat\(3, minmax\(0, 1fr\)\)"/,
  "Loans live route modules must not return to the old three-column grid that squeezed phone text."
);

if (findings.length > 0) {
  console.error("Loans action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Loans action audit passed.");
