/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  nav: "src/lib/nav.ts",
  originLink: "src/components/OriginLink.tsx",
  pageTopNav: "src/components/PageTopNav.tsx",
};
const findings = [];

function sourceOf(file) {
  return readFileSync(join(frontendRoot, file), "utf8");
}

function assertContains(source, file, pattern, message) {
  if (pattern.test(source)) return;
  findings.push({
    file,
    message,
    text: "Expected inner-navigation origin pattern was not found.",
  });
}

const navSource = sourceOf(files.nav);
const originLinkSource = sourceOf(files.originLink);
const pageTopNavSource = sourceOf(files.pageTopNav);

assertContains(
  navSource,
  files.nav,
  /export type OriginState = \{[\s\S]*?from\?: string;[\s\S]*?originPath\?: string;[\s\S]*?\}/,
  "Origin state must carry both from and originPath so older and newer routes share one back trail."
);

assertContains(
  navSource,
  files.nav,
  /function resolveBackTarget[\s\S]*?\("originPath" in \(location\.state as any\) \|\| "from" in \(location\.state as any\)\)[\s\S]*?\(location\.state as any\)\.originPath \|\| \(location\.state as any\)\.from/,
  "Shared back resolution must accept both originPath and from."
);

assertContains(
  originLinkSource,
  files.originLink,
  /originPath: `\$\{location\.pathname\}\$\{location\.search\}\$\{location\.hash\}`,[\s\S]*?from: `\$\{location\.pathname\}\$\{location\.search\}\$\{location\.hash\}`/,
  "OriginLink must store both originPath and from for inner-page return navigation."
);

assertContains(
  pageTopNavSource,
  files.pageTopNav,
  /const resolvedBackLabel =[\s\S]*?backLabel \|\| \(originPath && originPath !== currentPath \? "Back" : ""\)/,
  "PageTopNav must show a default Back label when a source origin exists."
);

assertContains(
  pageTopNavSource,
  files.pageTopNav,
  /resolvedBackTo && resolvedBackLabel[\s\S]*?\{ label: resolvedBackLabel, to: resolvedBackTo \}/,
  "PageTopNav must render the origin-aware Back link when available."
);

if (findings.length > 0) {
  console.error("Inner navigation origin audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Inner navigation origin audit passed: links, programmatic navigation, and PageTopNav share a source-aware Back contract."
);
