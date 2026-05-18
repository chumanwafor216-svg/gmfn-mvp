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

function assertStableActionsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern = /<Stable(?:Button|CtaLink)\b[\s\S]*?>/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const tag = match[0];
    if (!/debugId=/.test(tag)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Marketplace-domain stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: tag.replace(/\s+/g, " ").slice(0, 180),
      });
    }
  }
}

[
  "src/pages/MarketplacePage.tsx",
  "src/pages/MarketplaceWorkspacePage.tsx",
  "src/pages/ShopGalleryPage.tsx",
].forEach(assertStableActionsHaveDebugIds);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /return publicShopDiariesUrl\(publicShopOwnerId\);[\s\S]*?const link = ownerId \? publicShopDiariesUrl\(ownerId\) : "";/,
  "Marketplace owner share/copy/open actions must send outward visitors to Shop Diaries, not only the upper shop face."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.public-shop\.visible-link"[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?debugId="marketplace\.public-shop\.open"/,
  "Marketplace public shop controls must keep stable debug ids in the visible-link, refresh, copy, email, and open order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?debugId="marketplace\.links\.join\.refresh"[\s\S]*?debugId="marketplace\.links\.join\.copy-message"[\s\S]*?debugId="marketplace\.links\.join\.email"[\s\S]*?debugId="marketplace\.links\.join\.whatsapp"/,
  "Marketplace join-link controls must keep named, traceable actions in their stable order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.create\.copy"[\s\S]*?debugId="marketplace\.links\.create\.copy-message"[\s\S]*?debugId="marketplace\.links\.create\.email"[\s\S]*?debugId="marketplace\.links\.create\.open"[\s\S]*?debugId="marketplace\.links\.create\.whatsapp"/,
  "Marketplace create-link controls must keep named, traceable actions in their stable order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.support\.start-request"[\s\S]*?debugId="marketplace\.support\.refresh-fit"[\s\S]*?debugId="marketplace\.support\.cancel-draft"[\s\S]*?debugId="marketplace\.support\.loan-readiness"[\s\S]*?debugId="marketplace\.support\.loan-suggestions"[\s\S]*?debugId="marketplace\.support\.loan-workbench"[\s\S]*?debugId="marketplace\.support\.finance"[\s\S]*?debugId="marketplace\.support\.full-loans"/,
  "Marketplace support and loan actions must stay explicitly traceable so they cannot silently fall into unrelated routes."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}[\s\S]*?Shop Diaries[\s\S]*?visibleProducts\.map/,
  "Public Shop Gallery must anchor the 12-block Shop Diaries shelf for shared shop links."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /publicShopBlockUrl\(\{[\s\S]*?productId: product\.id,[\s\S]*?block: product\.slotNumber,/,
  "Public Shop Gallery product sharing must keep product/block links inside Shop Diaries."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const shouldRevealProduct = id !== PUBLIC_SHOP_DIARIES_ANCHOR;[\s\S]*?revealGalleryTarget\(id\);/,
  "Public Shop Gallery hash handling must distinguish whole Shop Diaries links from exact product/block links."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /function shopLinkForRecord\(shop: any\): string \{[\s\S]*?publicShopRootUrl\(direct\)[\s\S]*?return gmfnId \? publicShopUrl\(gmfnId\) : "";/,
  "Marketplace Workspace internal shop browsing must continue to use confirmed public shop roots, not unconfirmed app routes."
);

if (findings.length > 0) {
  console.error("Marketplace action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace action audit passed.");
