/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageFile = "src/pages/DemandBoxPage.tsx";
const source = readFileSync(join(frontendRoot, pageFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(index, message, text = "Expected pattern was not found.") {
  findings.push({
    file: pageFile,
    line: index >= 0 ? lineAt(index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function requirePattern(pattern, message) {
  const index = source.search(pattern);
  if (index === -1) {
    addFinding(-1, message, pattern.toString());
  }
}

[
  [
    /function demandHeroActionRowStyle\(isCompact: boolean\)/,
    "Demand Box hero actions must use the compact two-row phone grid.",
  ],
  [
    /function demandHeroPrimaryActionStyle\(isCompact: boolean\)/,
    "Demand Box primary hero action must be able to span the phone row.",
  ],
  [
    /Ask clearly from \{currentCommunityName\}\./,
    "Demand Box hero copy must stay community-specific and short.",
  ],
  [
    /Post one real need, keep the community context attached, and close\s+it when it is answered\./,
    "Demand Box hero helper must stay compact and practical.",
  ],
  [
    /Current state/,
    "Demand Box must expose a compact current-state card.",
  ],
  [
    /Mine: \{myOpenRows\.length\}/,
    "Demand Box current-state card must show the user's open demand count.",
  ],
  [
    /Community: \{visibleRows\.length\}/,
    "Demand Box current-state card must show community visible demand count.",
  ],
  [
    /Next: post or review/,
    "Demand Box current-state card must show a simple next step.",
  ],
  [
    /Create only one clear request at a time\. Mark it fulfilled or\s+cancel it when the need is settled\./,
    "Demand Box must keep one active request guidance visible.",
  ],
  [
    /debugId="demand-box\.change-community\.summary"/,
    "Demand Box community switching must stay collapsed behind a stable disclosure.",
  ],
  [
    /<span>Change community<\/span>/,
    "Demand Box community chooser summary must keep the short label.",
  ],
  [
    /<span style=\{badge\(false\)\}>Evidence optional<\/span>/,
    "Demand Box form context must use compact evidence chips.",
  ],
  [
    /<span style=\{badge\(false\)\}>Payment terms optional<\/span>/,
    "Demand Box form context must use compact payment chips.",
  ],
  [
    /minHeight: 82/,
    "Demand Box explanation textarea must stay compact on phone.",
  ],
  [
    /disabled=\{creating\}/,
    "Demand Box post button must allow an in-place missing-title response instead of silently disabling.",
  ],
  [
    /debugId="demand-box\.post"/,
    "Demand Box post action must keep its stable debug id.",
  ],
  [
    /debugId="demand-box\.create"/,
    "Demand Box create action must keep its stable debug id.",
  ],
  [
    /debugId="demand-box\.return"/,
    "Demand Box return action must keep its stable debug id.",
  ],
  [
    /debugId="demand-box\.hero-dashboard"/,
    "Demand Box dashboard escape must keep its stable debug id.",
  ],
  [
    /debugId=\{`demand-box\.request\.\$\{row\?\.id \|\| index\}\.fulfilled`\}/,
    "Demand Box fulfilled actions must keep stable dynamic debug ids.",
  ],
  [
    /debugId=\{`demand-box\.request\.\$\{row\?\.id \|\| index\}\.cancelled`\}/,
    "Demand Box cancel actions must keep stable dynamic debug ids.",
  ],
  [
    /const visiblePreview = useMemo\(\(\) => visibleRows\.slice\(0, 1\), \[visibleRows\]\)/,
    "Demand Box must show only one visible community demand before the drawer.",
  ],
  [
    /const extraVisibleRows = useMemo\(\(\) => visibleRows\.slice\(1, 5\), \[visibleRows\]\)/,
    "Demand Box must tuck additional community demand into a bounded drawer preview.",
  ],
  [
    /const extraMyOpenRows = useMemo\(\(\) => myOpenRows\.slice\(1\), \[myOpenRows\]\)/,
    "Demand Box must tuck additional personal demand behind a drawer.",
  ],
  [
    /myOpenRows\.slice\(0, 1\)\.map/,
    "Demand Box must show only the first live personal demand before the drawer.",
  ],
  [
    /debugId="demand-box\.more-my-demand\.summary"/,
    "Demand Box must keep additional personal demand behind a stable disclosure.",
  ],
  [
    /debugId="demand-box\.more-visible-demand\.summary"/,
    "Demand Box must keep additional community demand behind a stable disclosure.",
  ],
].forEach(([pattern, message]) => requirePattern(pattern, message));

[
  [
    /Ask clearly\. Let your trust speak before people answer\./,
    "Demand Box must not restore the old tall hero sentence.",
  ],
  [
    /How demand works/,
    "Demand Box must not restore the old explainer card heading.",
  ],
  [
    /disabled=\{creating \|\| !safeStr\(title\)\}/,
    "Demand Box post button must not hide validation feedback behind a disabled state.",
  ],
  [
    /institutionalStatTile/,
    "Demand Box must not restore the old exposed stat-tile stack.",
  ],
  [
    /visibleRows\.slice\(0, 6\)/,
    "Demand Box must not restore the six-card community demand preview.",
  ],
  [
    /myOpenRows\.map\(\(row, index\) =>/,
    "Demand Box must not restore the all-open-personal-demand stack.",
  ],
].forEach(([pattern, message]) => {
  const index = source.search(pattern);
  if (index !== -1) addFinding(index, message, source.slice(index, index + 180));
});

if (findings.length > 0) {
  console.error("Demand Box front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Demand Box front package audit passed.");
