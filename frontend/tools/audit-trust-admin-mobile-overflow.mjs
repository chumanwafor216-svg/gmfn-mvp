/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const files = {
  snapshot: "src/components/GsnSnapshotPaperCard.tsx",
  events: "src/pages/AdminTrustEventsPage.tsx",
  command: "src/pages/TrustCommandCentrePage.tsx",
  layout: "src/layout/AppLayout.tsx",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, relativePath]) => [
    key,
    readFileSync(join(frontendRoot, relativePath), "utf8"),
  ])
);

const findings = [];

function lineAt(source, index) {
  return source.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const source = sourceByKey[key];
  findings.push({
    file: files[key],
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 260),
  });
}

function assertContains(key, pattern, message) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message);
}

function assertNotContains(key, pattern, message) {
  const source = sourceByKey[key];
  source.split(/\r?\n/).forEach((line, index) => {
    if (!pattern.test(line)) return;
    findings.push({
      file: files[key],
      line: index + 1,
      message,
      text: line.trim(),
    });
  });
}

function assertOrdered(key, snippets, message) {
  const source = sourceByKey[key];
  let cursor = -1;
  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    if (index === -1) {
      addFinding(key, Math.max(cursor, 0), message, snippet);
      return;
    }
    cursor = index;
  }
}

assertContains(
  "snapshot",
  /function containedTextStyle\(\): React\.CSSProperties[\s\S]*?overflowWrap: "anywhere"[\s\S]*?wordBreak: "break-word"/,
  "GSN snapshot paper must keep a shared contained text style for long record URLs, references, and notes."
);

assertContains(
  "snapshot",
  /<div style=\{\{ \.\.\.valueStyle\(\), \.\.\.containedTextStyle\(\) \}\}>\{generatedAtText\}<\/div>/,
  "GSN snapshot paper generated time must stay wrapped by containedTextStyle."
);

assertContains(
  "snapshot",
  /<div style=\{\{ \.\.\.valueStyle\(\), \.\.\.containedTextStyle\(\) \}\}>[\s\S]*?\{paper\.reference \|\| "GSN current record"\}[\s\S]*?<\/div>/,
  "GSN snapshot paper record code must stay wrapped by containedTextStyle."
);

assertContains(
  "snapshot",
  /<div style=\{\{ \.\.\.valueStyle\(\), \.\.\.containedTextStyle\(\) \}\}>\{fact\.value\}<\/div>/,
  "GSN snapshot paper context values must stay wrapped by containedTextStyle."
);

assertContains(
  "snapshot",
  /style=\{\{[\s\S]*?\.\.\.valueStyle\(\),[\s\S]*?\.\.\.containedTextStyle\(\),[\s\S]*?color: "#0B4AA2"[\s\S]*?\}\}[\s\S]*?\{paper\.actionLink\}/,
  "GSN snapshot paper action link must stay wrapped by containedTextStyle."
);

assertContains(
  "snapshot",
  /paper\.securityMarks[\s\S]*?style=\{\{[\s\S]*?lineHeight: 1\.4,[\s\S]*?\.\.\.containedTextStyle\(\),[\s\S]*?\}\}[\s\S]*?\{paper\.securityMarks\}/,
  "GSN snapshot paper security marks must stay wrapped by containedTextStyle."
);

assertContains(
  "snapshot",
  /\[paper\.privacy, paper\.limitation\][\s\S]*?map\(\(note\)[\s\S]*?style=\{\{[\s\S]*?lineHeight: 1\.45,[\s\S]*?\.\.\.containedTextStyle\(\),[\s\S]*?\}\}[\s\S]*?\{note\}/,
  "GSN snapshot paper privacy and limitation notes must stay wrapped by containedTextStyle."
);

assertContains(
  "events",
  /function adminTrustEventActionStyle[\s\S]*?width: "100%"[\s\S]*?minWidth: 0[\s\S]*?maxWidth: "100%"[\s\S]*?overflow: "hidden"/,
  "Trust Events row actions must stay bounded to their grid cell on phone widths."
);

assertContains(
  "events",
  /function labelWithIcon[\s\S]*?maxWidth: "100%"[\s\S]*?overflow: "hidden"[\s\S]*?overflowWrap: "anywhere"[\s\S]*?wordBreak: "break-word"/,
  "Trust Events label-with-icon text must wrap long event names instead of widening the card."
);

assertContains(
  "events",
  /function eventIconBadge[\s\S]*?overflowWrap: "anywhere"[\s\S]*?wordBreak: "break-word"/,
  "Trust Events badges must wrap long values inside their chip."
);

assertOrdered(
  "events",
  [
    "gridTemplateColumns: \"repeat(auto-fit, minmax(190px, 1fr))\"",
    "debugId={`admin-trust-events.row.${rowKey}.copy`}",
    "debugId={`admin-trust-events.row.${rowKey}.toggle`}",
  ],
  "Trust Events row actions must remain in the responsive grid used to prevent phone overflow."
);

assertContains(
  "events",
  /style=\{\{ marginTop: 14,[\s\S]*?overflowWrap: "anywhere"[\s\S]*?wordBreak: "break-word"[\s\S]*?\}\}>[\s\S]*?\{supportDisplayText\(row\?\.reason \|\| row\?\.note/,
  "Trust Events reason/note text must wrap long system event strings inside the card."
);

assertContains(
  "command",
  /function compactOperatorName\([\s\S]*?looksLikeEmail[\s\S]*?looksLikePhone[\s\S]*?return "Admin"/,
  "Admin Tools hero must keep email/phone-like identifiers out of the giant welcome name."
);

assertContains(
  "command",
  /const PROFILE_NAME_STORAGE_KEY = "gmfn_profile_name"/,
  "Admin Tools must use the same local profile-name key saved by My GSN Identity settings."
);

assertContains(
  "command",
  /function readLocalText\(key: string\): string[\s\S]*?window\.localStorage\.getItem\(key\)/,
  "Admin Tools must be able to read the locally saved profile name before falling back to account identifiers."
);

assertContains(
  "command",
  /const operatorName = useMemo\(\(\) => \{[\s\S]*?const localProfileName = readLocalText\(PROFILE_NAME_STORAGE_KEY\)[\s\S]*?return compactOperatorName\([\s\S]*?localProfileName[\s\S]*?me\?\.display_name[\s\S]*?me\?\.username[\s\S]*?me\?\.gmfn_id[\s\S]*?me\?\.email[\s\S]*?me\?\.phone/,
  "Admin Tools operatorName must prefer saved profile names, then safe GSN identifiers, before email and phone sources."
);

assertNotContains(
  "command",
  /Welcome,\s*\{firstTruthy|Welcome,\s*\{me\?\.email|Welcome,\s*\{me\?\.phone/,
  "Admin Tools hero must not directly render raw email or phone identifiers."
);

assertContains(
  "command",
  /overflowWrap: "anywhere"[\s\S]*?wordBreak: "break-word"[\s\S]*?\}\}[\s\S]*?>[\s\S]*?Welcome, \{operatorName\}/,
  "Admin Tools welcome line must keep long fallback text contained on phone widths."
);

assertContains(
  "layout",
  /function bottomNav\(\)[\s\S]*?gridTemplateColumns: "repeat\(5, minmax\(0, 1fr\)\)"[\s\S]*?gap: 4[\s\S]*?padding: "7px 7px calc\(9px \+ env\(safe-area-inset-bottom, 0px\)\)"/,
  "Authenticated bottom rail must keep the tighter five-tab mobile geometry."
);

assertContains(
  "layout",
  /function bottomNavItem[\s\S]*?height: 58[\s\S]*?padding: "5px 2px 6px"[\s\S]*?fontSize: 9\.5/,
  "Authenticated bottom rail tab labels must keep the compact phone-safe font and padding."
);

assertContains(
  "layout",
  /function bottomNavLabel\(\)[\s\S]*?lineHeight: 1[\s\S]*?maxHeight: 24[\s\S]*?overflowWrap: "normal"[\s\S]*?wordBreak: "normal"/,
  "Authenticated bottom rail labels must keep fixed-height non-fragmenting text behavior."
);

if (findings.length > 0) {
  console.error("Trust/Admin mobile overflow audit failed:");
  findings.forEach((finding) => {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  });
  process.exit(1);
}

console.log(
  "Trust/Admin mobile overflow audit passed: Trust paper wrapping, Trust Events row containment, Admin Tools hero identity fallback, and bottom rail fit are caged."
);
