/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  nav: "src/lib/nav.ts",
  originLink: "src/components/OriginLink.tsx",
  pageTopNav: "src/components/PageTopNav.tsx",
  appLayout: "src/layout/AppLayout.tsx",
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
const appLayoutSource = sourceOf(files.appLayout);

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
  originLinkSource,
  files.originLink,
  /preserveOrigin\s*=\s*true[\s\S]*?const nextState = preserveOrigin[\s\S]*?: state;/,
  "OriginLink must allow explicit return links to opt out of rewriting the source origin."
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
  /resolvedBackTo && resolvedBackLabel[\s\S]*?\{ label: resolvedBackLabel, to: resolvedBackTo, preserveOrigin: false \}/,
  "PageTopNav must render the origin-aware Back link without rewriting the origin."
);

assertContains(
  pageTopNavSource,
  files.pageTopNav,
  /<StableCtaLink[\s\S]*?preserveOrigin=\{item\.preserveOrigin\}/,
  "PageTopNav must pass preserveOrigin through to rendered links."
);

assertContains(
  appLayoutSource,
  files.appLayout,
  /const originPath = originPathFromState\(location\);[\s\S]*?const originMeta = originRoute[\s\S]*?findCurrentRouteMeta/,
  "AppLayout must resolve source route metadata for the shared in-page return navigator."
);

assertContains(
  appLayoutSource,
  files.appLayout,
  /aria-label="Return to previous page"[\s\S]*?Back to \{originMeta\.page\}[\s\S]*?preserveOrigin=\{false\}/,
  "AppLayout must render a visible return strip that goes back without rewriting origin."
);

if (findings.length > 0) {
  console.error("Inner navigation origin audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Inner navigation origin audit passed: links, programmatic navigation, PageTopNav, and the app shell share a source-aware Back contract."
);
