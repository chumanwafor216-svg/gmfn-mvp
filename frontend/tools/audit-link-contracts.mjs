/* global console, process */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const sourceRoot = join(frontendRoot, "src");
const allowedExtensions = new Set([".ts", ".tsx"]);

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return allowedExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
}

function findPattern(pattern, message, paths = listSourceFiles(sourceRoot)) {
  for (const filePath of paths) {
    const text = readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        findings.push({
          file: relative(frontendRoot, filePath),
          line: index + 1,
          message,
          text: line.trim(),
        });
      }
    });
  }
}

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
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
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

const findings = [];
const sourceFiles = listSourceFiles(sourceRoot);

assertContains(
  "src/lib/publicLinks.ts",
  /DEFAULT_PUBLIC_FRONTEND_ORIGIN\s*=\s*"https:\/\/gmfn-frontend\.onrender\.com"/,
  "Public links must fall back to the deployed public frontend domain."
);

assertContains(
  "src/lib/publicLinks.ts",
  /return\s+`\/shop\/\$\{encodeURIComponent\(ownerId\)\}#\$\{PUBLIC_SHOP_DIARIES_ANCHOR\}`;/,
  "Public shop links must land on the whole shop diaries domain, not a private app route or one block."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopBlockPath[\s\S]*?return publicShopPath\(params\.gmfnId\);[\s\S]*?}/,
  "Product/block shares must resolve back to the complete public shop domain."
);

assertContains(
  "src/lib/joinLinks.ts",
  /return canonicalPublicFrontendUrl\(`\/start\/join\/\$\{encodeURIComponent\(cleanCode\)\}`\);/,
  "Invite links must canonicalize to the public join route."
);

assertContains(
  "src/lib/joinLinks.ts",
  /if \(isJoinInviteLink\(direct\)\) return canonicalPublicFrontendUrl\(direct\);\s*return "";/,
  "Invite normalization must reject unrelated fallback links such as Finance or Marketplace routes."
);

assertContains(
  "src/pages/ClansPage.tsx",
  /normalizedJoinInviteUrl\(raw\)\s*\|\|\s*canonicalJoinInviteUrl\(code\)/,
  "Community invite cards must fall back to canonical public join URLs, not arbitrary app routes."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /const publicShopViewLink = useMemo\(\(\) => \{[\s\S]*?if \(!currentGmfnId\) return "";[\s\S]*?return publicShopUrl\(currentGmfnId\);[\s\S]*?}, \[currentGmfnId\]\);/,
  "Marketplace public shop copy/open actions must use the canonical full public shop URL whenever a GSN ID exists, even before public items are visible."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /href=\{publicShopViewLink\}[\s\S]*?\{publicShopViewLink\}/,
  "Marketplace public shop card must visibly show the full public shop domain as a real public link."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function linkReserveTextStyle\(\): React\.CSSProperties[\s\S]*?height: 66,[\s\S]*?maxHeight: 66,[\s\S]*?overflowY: "auto",/,
  "Marketplace public link reserves must stay fixed-height so link refresh does not make surrounding buttons jump."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function joinLinkReserveTextStyle\(isCompact: boolean\): React\.CSSProperties[\s\S]*?height: isCompact \? 78 : 66,[\s\S]*?maxHeight: isCompact \? 78 : 66,[\s\S]*?overflowY: "auto",/,
  "The Join this community URL reserve must stay fixed-height so the buttons do not jump when a long invite link appears."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function joinShareMessageCardStyle\(isCompact: boolean\): React\.CSSProperties[\s\S]*?height: isCompact \? 146 : 132,[\s\S]*?maxHeight: isCompact \? 146 : 132,[\s\S]*?overscrollBehavior: "contain",/,
  "The Join this community message preview must stay fixed-height so the lane does not reflow after invite creation."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /sectionLabel\(\)}>Join this community[\s\S]*?joinLinkReserveTextStyle\(isCompact\)[\s\S]*?Copy Join Link[\s\S]*?Refresh Join Link[\s\S]*?Copy Invite Message[\s\S]*?Email Join Link[\s\S]*?WhatsApp[\s\S]*?joinShareMessageCardStyle\(isCompact\)/,
  "The Join this community lane must keep its stable button set and order."
);

assertContains(
  "src/layout/AppLayout.tsx",
  /const myShopGalleryDisabled = !location\.pathname\.startsWith\("\/shop\/"\) && !myGmfnId;/,
  "Global Public Shop navigation must be disabled until the member GSN ID is known."
);

assertContains(
  "src/layout/AppLayout.tsx",
  /makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)/,
  "Global Public Shop navigation must not fall back to Shop Control while the public shop URL is loading."
);

assertNotContains(
  "src/layout/AppLayout.tsx",
  /const myShopGalleryTo = useMemo[\s\S]*?return "\/app\/shop-control";[\s\S]*?}, \[location\.hash, location\.pathname, location\.search, myGmfnId\]\);/,
  "Public Shop navigation must never use Shop Control as a loading fallback."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /return selectedMemberGmfnId \? publicShopUrl\(selectedMemberGmfnId\) : "";/,
  "Marketplace workspace public shop fallback must use the canonical full public shop URL."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /\{shopViewLink \|\| "Public shop link not available yet\."\}/,
  "Marketplace workspace must visibly show the full public shop domain."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /return gmfnId \? publicShopUrl\(gmfnId\) : "";/,
  "Owner shop control must build the copyable public shop link from the canonical full domain helper."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /function normalizeShop\(raw: any, fallbackGmfnId: string, currentClan: any\): ShopSummary \| null \{[\s\S]*?if \(!raw && !fallbackGmfnId\) return null;/,
  "Owner shop control must preserve a public shop domain from the member GSN ID even when the shop record is not returned yet."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /href=\{publicShopLink\}[\s\S]*?\{publicShopLink\}/,
  "Owner shop control must visibly show the full public shop domain as a real public link."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const copied = await safeCopy\(absoluteShopLink\);[\s\S]*?Clipboard copy was blocked\. Use the visible public shop link instead\./,
  "Public Shop Gallery copy must wait for clipboard success instead of claiming success while the old clipboard may still contain another route."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /href=\{absoluteShopLink\}[\s\S]*?\{absoluteShopLink\}/,
  "Public Shop Gallery must visibly show the complete public shop domain as a real link."
);

assertNotContains(
  "src/components/CommunityShopControlPanel.tsx",
  /^\s*disabled(?:=|\s*$)/,
  "Owner public shop controls must capture missing-link taps with aria-disabled instead of native disabled fall-through."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /maskedShopFaceLabel/,
  "Marketplace public shop cards must not hide the public domain behind a masked label."
);

findPattern(
  /publicFrontendUrl\([^)]*["'`]\/start\/join/,
  "Use canonicalJoinInviteUrl for join links so invite links cannot inherit the wrong current host or route.",
  sourceFiles
);

findPattern(
  /(safeCopy|copyText|copyMarketplaceLink)\(\s*publicShopPath\b/,
  "Copy/share actions must copy the full public shop URL, not a relative public shop path.",
  sourceFiles
);

if (findings.length > 0) {
  console.error("Link contract audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Link contract audit passed.");
