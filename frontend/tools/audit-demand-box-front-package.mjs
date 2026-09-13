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
    "DemandBox hero actions must use the compact two-row phone grid.",
  ],
  [
    /function demandHeroPrimaryActionStyle\(isCompact: boolean\)/,
    "DemandBox primary hero action must be able to span the phone row.",
  ],
  [
    /Ask clearly from \{currentCommunityName\}\./,
    "DemandBox hero copy must stay community-specific and short.",
  ],
  [
    /Post one real need, keep the community context attached, and close\s+it when it is answered\./,
    "DemandBox hero helper must stay compact and practical.",
  ],
  [
    /Current state/,
    "DemandBox must expose a compact current-state card.",
  ],
  [
    /Mine: \{myOpenRows\.length\}/,
    "DemandBox current-state card must show the user's open demand count.",
  ],
  [
    /Community: \{visibleRows\.length\}/,
    "DemandBox current-state card must show community visible demand count.",
  ],
  [
    /Next: post or review/,
    "DemandBox current-state card must show a simple next step.",
  ],
  [
    /Create only one clear request at a time\. Mark it fulfilled or\s+cancel it when the need is resolved\./,
    "DemandBox must keep one active request guidance visible.",
  ],
  [
    /debugId="demand-box\.change-community\.summary"/,
    "DemandBox community switching must stay collapsed behind a stable disclosure.",
  ],
  [
    /<span>Change community<\/span>/,
    "DemandBox community chooser summary must keep the short label.",
  ],
  [
    /<span style=\{badge\(false\)\}>Evidence optional<\/span>/,
    "DemandBox form context must use compact evidence chips.",
  ],
  [
    /<span style=\{badge\(false\)\}>Payment terms optional<\/span>/,
    "DemandBox form context must use compact payment chips.",
  ],
  [
    /minHeight: 82/,
    "DemandBox explanation textarea must stay compact on phone.",
  ],
  [
    /disabled=\{creating\}/,
    "DemandBox post button must allow an in-place missing-title response instead of silently disabling.",
  ],
  [
    /debugId="demand-box\.post"/,
    "DemandBox post action must keep its stable debug id.",
  ],
  [
    /debugId="demand-box\.create"/,
    "DemandBox create action must keep its stable debug id.",
  ],
  [
    /debugId="demand-box\.return"/,
    "DemandBox return action must keep its stable debug id.",
  ],
  [
    /askCommunity: appendRouteQueryParam[\s\S]*?routeTarget\("demandBox", selectedClanId, "demand-box\.ask-community"\)[\s\S]*?"mode"[\s\S]*?"ask_community"/,
    "DemandBox Ask Community must route into DemandBox question mode, not a separate Marketplace modal path.",
  ],
  [
    /to=\{routes\.askCommunity\}[\s\S]*?debugId="demand-box\.ask-community"[\s\S]*?Ask Community/,
    "DemandBox hero must expose the Ask Community action without creating a separate demand engine.",
  ],
  [
    /debugId="demand-box\.mode\.normal-demand"[\s\S]*?Post demand[\s\S]*?debugId="demand-box\.ask-community\.inline"[\s\S]*?Ask Community/,
    "DemandBox form must show Ask Community as a Demand type beside normal demand posting.",
  ],
  [
    /submitMarketNeedPulse[\s\S]*?createMarketplaceRequest[\s\S]*?category: "Community Ask"[\s\S]*?Community question posted in DemandBox/,
    "DemandBox Ask Community must post into DemandBox requests, not the Community Bulletin notice engine.",
  ],
  [
    /pulseDestination="demand_box"/,
    "DemandBox Ask Community modal must use DemandBox destination wording and controls.",
  ],
  [
    /debugId="demand-box\.hero-dashboard"/,
    "DemandBox dashboard escape must keep its stable debug id.",
  ],
  [
    /debugId=\{`demand-box\.request\.\$\{row\?\.id \|\| index\}\.fulfilled`\}/,
    "DemandBox fulfilled actions must keep stable dynamic debug ids.",
  ],
  [
    /debugId=\{`demand-box\.request\.\$\{row\?\.id \|\| index\}\.cancelled`\}/,
    "DemandBox cancel actions must keep stable dynamic debug ids.",
  ],
  [
    /const visiblePreview = useMemo\(\(\) => visibleRows\.slice\(0, 1\), \[visibleRows\]\)/,
    "DemandBox must show only one visible community demand before the drawer.",
  ],
  [
    /const extraVisibleRows = useMemo\(\(\) => visibleRows\.slice\(1, 5\), \[visibleRows\]\)/,
    "DemandBox must tuck additional community demand into a bounded drawer preview.",
  ],
  [
    /const extraMyOpenRows = useMemo\(\(\) => myOpenRows\.slice\(1\), \[myOpenRows\]\)/,
    "DemandBox must tuck additional personal demand behind a drawer.",
  ],
  [
    /myOpenRows\.slice\(0, 1\)\.map/,
    "DemandBox must show only the first live personal demand before the drawer.",
  ],
  [
    /debugId="demand-box\.more-my-demand\.summary"/,
    "DemandBox must keep additional personal demand behind a stable disclosure.",
  ],
  [
    /debugId="demand-box\.my-demand\.summary"[\s\S]*?<span>Open my demand<\/span>[\s\S]*?myOpenRows\.slice\(0, 1\)\.map/,
    "DemandBox personal demand preview must sit behind the compact Open my demand drawer.",
  ],
  [
    /debugId="demand-box\.community-demand\.summary"[\s\S]*?<span>Open community demand<\/span>[\s\S]*?visiblePreview\.map/,
    "DemandBox community demand preview must sit behind the compact Open community demand drawer.",
  ],
  [
    /debugId="demand-box\.more-visible-demand\.summary"/,
    "DemandBox must keep additional community demand behind a stable disclosure.",
  ],
].forEach(([pattern, message]) => requirePattern(pattern, message));

[
  [
    /createCommunityNotice[\s\S]*?notice_mode: "market_need_pulse"/,
    "DemandBox Ask Community must not post into Community Notice Board as a market-need pulse.",
  ],
  [
    /Ask clearly\. Let your trust speak before people answer\./,
    "DemandBox must not restore the old tall hero sentence.",
  ],
  [
    /How demand works/,
    "DemandBox must not restore the old explainer card heading.",
  ],
  [
    /disabled=\{creating \|\| !safeStr\(title\)\}/,
    "DemandBox post button must not hide validation feedback behind a disabled state.",
  ],
  [
    /institutionalStatTile/,
    "DemandBox must not restore the old exposed stat-tile stack.",
  ],
  [
    /visibleRows\.slice\(0, 6\)/,
    "DemandBox must not restore the six-card community demand preview.",
  ],
  [
    /myOpenRows\.map\(\(row, index\) =>/,
    "DemandBox must not restore the all-open-personal-demand stack.",
  ],
].forEach(([pattern, message]) => {
  const index = source.search(pattern);
  if (index !== -1) addFinding(index, message, source.slice(index, index + 180));
});

if (findings.length > 0) {
  console.error("DemandBox front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("DemandBox front package audit passed.");
