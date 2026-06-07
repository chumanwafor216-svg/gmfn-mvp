/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const communityFile = "src/pages/CommunityHomePage.tsx";
const source = readFileSync(join(frontendRoot, communityFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  findings.push({
    file: communityFile,
    line: 1,
    message,
    text: "Expected Community Home phone-button pattern was not found.",
  });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: communityFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

const actionPattern = /<StableButton\b[\s\S]*?(?:\/>|<\/StableButton>)/g;
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  const line = lineAt(match.index);

  if (!/style=/.test(block)) {
    findings.push({
      file: communityFile,
      line,
      message: "Community Home StableButton controls must keep route-local phone geometry styles.",
      text: block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (/(^|\s)disabled=/.test(block)) {
    findings.push({
      file: communityFile,
      line,
      message:
        "Community Home StableButton controls must avoid disabled= and stay tappable enough to explain blocked or in-progress actions.",
      text: block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

assertContains(
  /function consumeCommunityButtonEvent\([\s\S]*?event\?\.preventDefault\(\);[\s\S]*?event\?\.stopPropagation\(\);/,
  "Community Home button events must prevent default and stop propagation before route or section handling."
);

assertContains(
  /function communityActionStyle\([\s\S]*?touchAction: "manipulation"[\s\S]*?WebkitTapHighlightColor: "transparent"[\s\S]*?overflowAnchor: "none"[\s\S]*?transform: "none"[\s\S]*?transition: "none"/,
  "Community Home action styles must keep phone tap and movement locks."
);

assertContains(
  /function communityActionIcon\(primary = false\): React\.CSSProperties \{[\s\S]*?width: 40,[\s\S]*?height: 40,[\s\S]*?overflow: "hidden"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"/,
  "Community Home compact row icon slots must clip centered text so labels like ROSCA cannot bleed outside the button."
);

assertContains(
  /function communityActionStyle\([\s\S]*?overflowWrap: "normal"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"[\s\S]*?overflowWrap: "normal"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"[\s\S]*?overflowWrap: "normal"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"/,
  "Community Home route-local action labels must keep whole-word wrapping across all action variants."
);

assertContains(
  /function communityToolRowStyle\(\): React\.CSSProperties \{[\s\S]*?width: "100%"[\s\S]*?gridTemplateColumns: "auto minmax\(0, 1fr\) auto"[\s\S]*?minHeight: 72[\s\S]*?pointerEvents: "auto"[\s\S]*?overflow: "hidden"[\s\S]*?transition: "none"/,
  "Community Home compact rows must keep stable grid geometry and no transition-driven movement."
);

assertContains(
  /debugId="community-home\.summary\.visible-communities"[\s\S]*?aria-controls="community-home-communities-panel"[\s\S]*?openCommunityHomeSection\([\s\S]*?"community-home-community-list"[\s\S]*?"communities"[\s\S]*?style=\{communityToolRowStyle\(\)\}/,
  "Community Home visible-communities summary must be a protected StableButton using compact row geometry."
);

assertContains(
  /item\.id === "vault-control"[\s\S]*?\? 9[\s\S]*?: item\.id === "rosca"[\s\S]*?\? 8\.5[\s\S]*?: 22[\s\S]*?item\.id === "vault-control" \|\| item\.id === "rosca"[\s\S]*?\? 950[\s\S]*?: 800/,
  "Community Home ROSCA row must keep a compact fixed icon text treatment instead of overflowing the icon slot."
);

assertContains(
  /debugId=\{`community-home\.communities\.\$\{clan\.id \?\? clan\.clan_id \?\? clan\.name \?\? "unknown"\}\.open-marketplace`\}[\s\S]*?aria-disabled=\{working \|\| undefined\}[\s\S]*?if \(working\) \{[\s\S]*?showNotice\("success", "Opening this community now\."\);[\s\S]*?return;[\s\S]*?void handleSelectCommunity\(clan, true\);/,
  "Community Home community-row marketplace buttons must stay soft-disabled and explain in-progress taps instead of becoming dead tap targets."
);

assertNotContains(
  /overflowWrap: "anywhere"/g,
  "Community Home route-local action styles must not split words anywhere on phone buttons."
);

assertNotContains(
  /display: "none"[\s\S]{0,1800}<StableButton\b/g,
  "Community Home must not keep hidden StableButton sections in the source action inventory."
);

assertNotContains(
  /display: "none"/g,
  "Community Home must not keep hidden route-local UI remnants in the page source."
);

assertNotContains(
  /<div\s+style=\{communityToolRowStyle\(\)\}/g,
  "Community Home must not use plain divs with compact button geometry; button-looking rows must be protected StableButton actions."
);

assertNotContains(
  /community-home\.(?:owner-actions|circle)\./g,
  "Community Home must not keep legacy hidden owner-actions or circle debug surfaces; use compact tool rows and First Circle routes."
);

if (findings.length > 0) {
  console.error("Community Home phone button audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Community Home phone button audit passed.");
