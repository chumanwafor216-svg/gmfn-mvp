/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageFile = "src/pages/CommunityJoinRequestsPage.tsx";
const source = readFileSync(join(frontendRoot, pageFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  findings.push({
    file: pageFile,
    line: 1,
    message,
    text: "Expected Join Requests mobile layout pattern was not found.",
  });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: pageFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

assertContains(
  /function pageShell\(\)[\s\S]*?maxWidth: "100%"[\s\S]*?margin: "0"[\s\S]*?padding: "0 clamp\(12px, 4vw, 20px\) 34px"[\s\S]*?boxSizing: "border-box"[\s\S]*?overflowX: "hidden"/,
  "Join Requests page shell must stay inside the phone viewport without negative route margins."
);

assertContains(
  /function contentRail\(\)[\s\S]*?maxWidth: "min\(980px, 100%\)"[\s\S]*?minWidth: 0[\s\S]*?overflowX: "hidden"/,
  "Join Requests content rail must stay inside the phone viewport."
);

assertContains(
  /function navActionStyle[\s\S]*?width: "100%"[\s\S]*?minWidth: 0[\s\S]*?flexShrink: 1[\s\S]*?fontSize: 13[\s\S]*?whiteSpace: "normal"[\s\S]*?wordBreak: "normal"/,
  "Join Requests navigation buttons must keep compact full-width phone hitboxes without clipped words."
);

assertContains(
  /gridTemplateColumns: isCompact[\s\S]*?\? "minmax\(0, 1fr\) minmax\(0, 1fr\)"[\s\S]*?: "repeat\(3, minmax\(0, 1fr\)\)"[\s\S]*?debugId="community-join-requests\.refresh"[\s\S]*?gridColumn: isCompact \? "1 \/ -1" : undefined/,
  "Join Requests top action row must give Refresh a full-width second row on phone."
);

assertContains(
  /gridTemplateColumns: isCompact[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?: "repeat\(4, minmax\(0, 1fr\)\)"/,
  "Join Requests stats must use a 2x2 phone grid instead of a four-card overflow row."
);

assertContains(
  /gridTemplateColumns: isCompact[\s\S]*?\? "minmax\(0, 1fr\)"[\s\S]*?: "repeat\(3, minmax\(0, 1fr\)\)"/,
  "Join Requests request metadata must collapse to one column on phone."
);

assertContains(
  /gridTemplateColumns: isCompact \? "minmax\(0, 1fr\)" : "minmax\(0, 1fr\) 220px"[\s\S]*?display: isCompact \? "none" : "grid"/,
  "Join Requests top hero must not reserve decorative-icon width on phone."
);

assertContains(
  /gridTemplateColumns: isCompact \? "minmax\(0, 1fr\)" : "minmax\(0, 1fr\) 190px"[\s\S]*?display: isCompact \? "none" : "grid"/,
  "Join Requests selected-community panel must not reserve decorative-icon width on phone."
);

assertContains(
  /gridTemplateColumns: isCompact \? "minmax\(0, 1fr\)" : "minmax\(0, 1fr\) auto"/,
  "Join Requests request header must stack status badges under text on phone."
);

assertContains(
  /debugId=\{communityHomeCta\.debugId\}[\s\S]*?fullWidth[\s\S]*?debugId=\{marketplaceCta\.debugId\}[\s\S]*?fullWidth[\s\S]*?debugId="community-join-requests\.refresh"[\s\S]*?fullWidth/,
  "Join Requests top route buttons must explicitly fill their grid cells."
);

assertContains(
  /import \{ GsnLegacyIcon, type GsnIconName \} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*?const JOIN_REQUEST_ICON_MAP[\s\S]*?satisfies Record<JoinRequestIconName, GsnIconName>[\s\S]*?function JoinRequestIcon[\s\S]*?<GsnLegacyIcon[\s\S]*?function StatusMark/,
  "Join Requests must use shared 3D GSN icons instead of local SVG, emoji, or status text symbols."
);

assertNotContains(
  /<svg\s|\bstrokeWidth\b|viewBox: "0 0 24 24"/g,
  "Join Requests must not restore local SVG pictograms after 3D icon migration."
);

assertContains(
  /const shouldCollapse = isCompact && activeRequestId !== null && !isActive[\s\S]*?setActiveRequestId\(item\.id\)[\s\S]*?debugId="community-join-requests\.review-request"/,
  "Join Requests mobile review flow must collapse inactive request cards behind one stable Review action."
);

assertNotContains(
  /isCompact\s*\?\s*"repeat\(2, minmax\(0, 1fr\)\)"\s*:\s*"repeat\(3, minmax\(0, 1fr\)\)"/g,
  "Join Requests request fact grid must not return to a two-column phone layout."
);

if (findings.length > 0) {
  console.error("Community Join Requests layout audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Community Join Requests layout audit passed.");
