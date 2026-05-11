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

function assertWholeFileNotContains(file, pattern, message) {
  const text = read(file);

  if (pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: `File matched forbidden pattern ${pattern}.`,
    });
  }
}

function assertFunctionNotContains(file, functionName, pattern, message) {
  const text = read(file);
  const start = text.indexOf(`function ${functionName}(`);

  if (start === -1) {
    findings.push({
      file,
      line: 1,
      message,
      text: `Function ${functionName} was not found.`,
    });
    return;
  }

  const nextFunction = text.indexOf("\nfunction ", start + 1);
  const body = text.slice(start, nextFunction === -1 ? text.length : nextFunction);
  const startLine = text.slice(0, start).split(/\r?\n/).length;

  if (pattern.test(body)) {
    findings.push({
      file,
      line: startLine,
      message,
      text: `Function ${functionName} matched forbidden pattern ${pattern}.`,
    });
  }
}

const findings = [];
const sourceFiles = listSourceFiles(sourceRoot);

assertContains(
  "src/lib/publicLinks.ts",
  /DEFAULT_PUBLIC_FRONTEND_ORIGIN\s*=\s*"https:\/\/gmfn-frontend\.onrender\.com"/,
  "Public links must fall back to the deployed public frontend domain."
);

assertContains(
  "src/lib/appRoutes.ts",
  /FREE_SPOTLIGHT:\s*"\/app\/shop-control#shop-control-spotlight"/,
  "Current Free Spotlight CTAs must open the real Shop Control spotlight section directly, not the legacy redirect alias."
);

assertContains(
  "src/lib/guidance.ts",
  /"free-spotlight":\s*"\/app\/shop-control#shop-control-spotlight"[\s\S]*?"paid-spotlight":\s*"\/app\/shop-control\/subscription-spotlight"/,
  "Guidance/notification aliases for spotlight must resolve to the real Shop Control spotlight targets, not legacy redirect aliases."
);

assertContains(
  "src/lib/guidance.ts",
  /"shop-control\/spotlight":\s*"\/app\/shop-control#shop-control-spotlight"[\s\S]*?"shop-control\/free-spotlight":\s*"\/app\/shop-control#shop-control-spotlight"[\s\S]*?"shop-control\/paid-spotlight":\s*"\/app\/shop-control\/subscription-spotlight"/,
  "Guidance must normalize stale deep shop-control spotlight aliases to real publisher targets before they can fall back."
);

assertContains(
  "src/pages/NotificationsPage.tsx",
  /"free-spotlight":\s*"\/app\/shop-control#shop-control-spotlight"[\s\S]*?"paid-spotlight":\s*"\/app\/shop-control\/subscription-spotlight"/,
  "Notifications must resolve spotlight aliases to the real Shop Control spotlight targets, not legacy redirect aliases."
);

assertContains(
  "src/pages/NotificationsPage.tsx",
  /"shop-control\/spotlight":\s*"\/app\/shop-control#shop-control-spotlight"[\s\S]*?"shop-control\/free-spotlight":\s*"\/app\/shop-control#shop-control-spotlight"[\s\S]*?"shop-control\/paid-spotlight":\s*"\/app\/shop-control\/subscription-spotlight"/,
  "Notifications must normalize stale deep shop-control spotlight aliases to real publisher targets before they can fall back."
);

assertNotContains(
  "src/lib/appRoutes.ts",
  /FREE_SPOTLIGHT:\s*"\/app\/free-spotlight"/,
  "The shared Free Spotlight route must not point at the legacy redirect alias."
);

assertWholeFileNotContains(
  "src/lib/guidance.ts",
  /SAFE_STATIC_APP_PATHS[\s\S]*?"free-spotlight"[\s\S]*?\]\)/,
  "Guidance must not treat free-spotlight as a static app path; it must go through the exact alias to the real Shop Control section."
);

assertWholeFileNotContains(
  "src/pages/NotificationsPage.tsx",
  /SAFE_STATIC_APP_PATHS[\s\S]*?"free-spotlight"[\s\S]*?\]\)/,
  "Notifications must not treat free-spotlight as a static app path; it must go through the exact alias to the real Shop Control section."
);

assertContains(
  "src/App.tsx",
  /path="free-spotlight"[\s\S]*?<PreserveRedirect to="\/app\/shop-control#shop-control-spotlight"/,
  "The legacy /app/free-spotlight alias must still redirect old links to the real Shop Control spotlight section."
);

assertContains(
  "src/App.tsx",
  /path="\/free-spotlight"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.FREE_SPOTLIGHT\}/,
  "The top-level /free-spotlight alias must not fall through to Cover/Welcome; it must canonicalize to the real Shop Control spotlight section."
);

assertContains(
  "src/App.tsx",
  /path="\/paid-spotlight"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT\}/,
  "The top-level /paid-spotlight alias must not fall through to Cover/Welcome; it must canonicalize to the real Shop Control paid spotlight route."
);

assertContains(
  "src/App.tsx",
  /"app\/shop-control\/free-spotlight":\s*APP_ROUTES\.FREE_SPOTLIGHT[\s\S]*?"app\/shop-control\/paid-spotlight":\s*APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT/,
  "The system fallback must catch stale /app/shop-control/free-spotlight and /app/shop-control/paid-spotlight URLs before Cover/Welcome."
);

assertContains(
  "src/App.tsx",
  /path="shop-control\/spotlight"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.FREE_SPOTLIGHT\}[\s\S]*?path="shop-control\/free-spotlight"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.FREE_SPOTLIGHT\}/,
  "Nested /app/shop-control spotlight aliases must redirect to the real Free Spotlight publisher instead of escaping to the public fallback."
);

assertContains(
  "src/App.tsx",
  /path="subscription-spotlight"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT\}[\s\S]*?path="shop-control\/paid-spotlight"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT\}/,
  "Nested /app paid spotlight aliases must redirect to the real paid publisher instead of escaping to the public fallback."
);

assertContains(
  "src/App.tsx",
  /path="\/shop-control"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.SHOP_ME\}/,
  "The top-level /shop-control alias must not fall through to Cover/Welcome; it must canonicalize to the authenticated Shop Control route."
);

assertContains(
  "src/App.tsx",
  /path="\/shop-manager"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.SHOP_ME\}/,
  "The top-level /shop-manager alias must not fall through to Cover/Welcome; it must canonicalize to the authenticated Shop Control route."
);

assertContains(
  "src/App.tsx",
  /path="\/shop-assets"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.SHOP_ASSETS\}/,
  "The top-level /shop-assets alias must not fall through to Cover/Welcome; it must canonicalize to the authenticated Shop Assets route."
);

assertContains(
  "src/App.tsx",
  /path="\/vault-control"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.VAULT_CONTROL\}/,
  "The top-level /vault-control alias must not fall through to Cover/Welcome; it must canonicalize to the authenticated Vault Control route."
);

assertContains(
  "src/App.tsx",
  /function authenticatedFallbackTarget\(pathname: string, search: string, hash: string\): string \{[\s\S]*?alias\.startsWith\("app\/"\)[\s\S]*?alias\.includes\("shop-control"\) \|\| alias\.includes\("spotlight"\)[\s\S]*?APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT[\s\S]*?APP_ROUTES\.FREE_SPOTLIGHT[\s\S]*?APP_ROUTES\.SHOP_ME[\s\S]*?APP_ROUTES\.DASHBOARD/,
  "Unknown authenticated publish/shop routes must stay inside /app instead of falling into Cover/Welcome."
);

assertContains(
  "src/App.tsx",
  /import \{ publishRecoveryTarget \} from "\.\/lib\/publishRecovery";[\s\S]*?const LAST_AUTHENTICATED_APP_PATH_KEY = "gmfn_last_authenticated_app_path";[\s\S]*?function RememberAuthenticatedAppRoute\(\)[\s\S]*?rememberAuthenticatedAppPath\(currentRoutePath\(location\)\)[\s\S]*?function PublicEntryGuard\(props: \{ children: React\.ReactNode \}\)[\s\S]*?const publishTarget = publishRecoveryTarget\(\);[\s\S]*?if \(publishTarget \|\| token\)[\s\S]*?<Navigate[\s\S]*?to=\{publishTarget \|\| lastAuthenticatedAppPath\(\) \|\| APP_ROUTES\.DASHBOARD\}[\s\S]*?<RememberAuthenticatedAppRoute \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<CoverPage \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<WelcomePage \/>/,
  "Authenticated sessions or active publish attempts that reach Cover/Welcome must recover to the publisher/app route instead of staying in the public entry funnel."
);

assertContains(
  "src/App.tsx",
  /function RedirectUnknownRoute\(\)[\s\S]*?rootAppAliasTarget\([\s\S]*?location\.pathname,[\s\S]*?location\.search,[\s\S]*?location\.hash[\s\S]*?authenticatedFallbackTarget\([\s\S]*?location\.pathname,[\s\S]*?location\.search,[\s\S]*?location\.hash[\s\S]*?<Navigate to=\{appAliasTarget \|\| appFallbackTarget \|\| "\/cover"\} replace \/>[\s\S]*?<Route path="\*" element=\{<RedirectUnknownRoute \/>\} \/>/,
  "The wildcard route must check system owner-commerce aliases and authenticated app fallback before falling back to Cover/Welcome."
);

assertContains(
  "src/lib/publicLinks.ts",
  /SUSPENDED_PUBLIC_FRONTEND_HOSTS\s*=\s*new Set\(\["frontend\.onrender\.com"\]\)/,
  "Public links must reject the suspended frontend.onrender.com service as a shareable origin."
);

assertContains(
  "src/App.tsx",
  /function PublicHostRedirect\(\)[\s\S]*?isSuspendedPublicFrontendHost\(hostname\)[\s\S]*?window\.location\.replace\([\s\S]*?targetOrigin[\s\S]*?window\.location\.pathname[\s\S]*?window\.location\.search[\s\S]*?window\.location\.hash/,
  "The app shell must redirect cached/suspended frontend.onrender.com sessions onto the canonical public frontend host."
);

assertContains(
  "index.html",
  /window\.location\.hostname\.toLowerCase\(\) !== "frontend\.onrender\.com"[\s\S]*?window\.location\.replace\([\s\S]*?"https:\/\/gmfn-frontend\.onrender\.com"[\s\S]*?window\.location\.pathname[\s\S]*?window\.location\.search[\s\S]*?window\.location\.hash/,
  "The HTML shell must redirect frontend.onrender.com before React loads."
);

assertContains(
  "src/main.tsx",
  /function migrateSuspendedPublicHost\(\): boolean[\s\S]*?isSuspendedPublicFrontendHost\(hostname\)[\s\S]*?configuredPublicFrontendOrigin\(\)[\s\S]*?window\.location\.replace\(target\);[\s\S]*?if \(!migrateSuspendedPublicHost\(\)\)/,
  "The React entrypoint must redirect frontend.onrender.com synchronously before rendering the app."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopRootPath\(pathOrUrl: string\): string[\s\S]*?url\.search = "";[\s\S]*?url\.hash = "";[\s\S]*?return url\.pathname;[\s\S]*?const \[path\] = withoutHash\.split\("\?"\);[\s\S]*?export function publicShopRootUrl\(pathOrUrl: string\): string/,
  "Public shop root normalization must strip all query strings and fragments for ordinary public shop sharing."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopPath\(gmfnId: string\): string \{[\s\S]*?return\s+`\/shop\/\$\{encodeURIComponent\(ownerId\)\}`;[\s\S]*?\}/,
  "Canonical public shop links must land on the full public shop root, not the block shelf or a private app route."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopBlockPath[\s\S]*?return publicShopPath\(params\.gmfnId\);[\s\S]*?}/,
  "Product/block shares must resolve back to the complete public shop domain."
);

findPattern(
  /publicShopDiaries(?:Path|Url)\(/,
  "Do not expose diary-fragment public shop URL helpers; ordinary public shop sharing must use publicShopPath/publicShopUrl/publicShopRootUrl.",
  sourceFiles
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
  /const publicShopOwnerId = firstTruthy\([\s\S]*?publicShopRecord\?\.owner_gmfn_id,[\s\S]*?publicShopRecord\?\.gmfn_id,[\s\S]*?currentGmfnId[\s\S]*?\);[\s\S]*?const publicShopViewLink = useMemo\(\(\) => \{[\s\S]*?if \(!publicShopOwnerId \|\| !publicShopRecord\) return "";[\s\S]*?return publicShopUrl\(publicShopOwnerId\);[\s\S]*?}, \[publicShopOwnerId, publicShopRecord\]\);/,
  "Marketplace public shop copy/open actions must use the backend-confirmed owner ID and canonical full public shop URL only after an active owner shop exists."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /async function preparePublicShopLink\(\): Promise<string>[\s\S]*?createMarketplaceShop\([\s\S]*?setPublicShopRecord\(normalized\);[\s\S]*?Public shop link is connected to an active shop/,
  "Marketplace must provide an owner-side refresh that connects the public shop link to an active shop before copying."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /async function getFreshPublicShopLink\(\): Promise<string> \{[\s\S]*?if \(publicShopViewLink\) return publicShopViewLink;[\s\S]*?return preparePublicShopLink\(\);[\s\S]*?\}/,
  "Marketplace public shop link actions must auto-refresh the owner shop link when the confirmed link is not ready yet."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /copyFreshPublicShopLink\(\)[\s\S]*?Copy Shop Link[\s\S]*?emailFreshPublicShopLink\(\)[\s\S]*?Email Link[\s\S]*?openFreshPublicShopLink\(\)[\s\S]*?Open Shop Face/,
  "Marketplace Copy, Email, and Open public shop buttons must use the auto-refreshing link actions."
);

assertContains(
  "src/App.tsx",
  /function RedirectPublicShopAlias\(\) \{[\s\S]*?to=\{gmfnId \? publicShopPath\(gmfnId\) : "\/cover"\}[\s\S]*?replace[\s\S]*?\}/,
  "Public shop aliases must strip old product/community query strings and land on the canonical whole-shop root URL."
);

assertFunctionNotContains(
  "src/App.tsx",
  "RedirectPublicShopAlias",
  /mergeTargetWithCurrent|location\.search|location\.hash|useLocation/,
  "Public shop aliases must not preserve legacy query strings, fragments, or route-local location state."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /const target = to\.startsWith\("\/app\/"\)[\s\S]*?\? routeWithCommunity\(to, activeCommunityId\)[\s\S]*?: to;/,
  "Marketplace route handling must not attach community query strings to public shop links."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /<StableCtaLink[\s\S]*?to=\{publicShopViewLink\}[\s\S]*?\{publicShopViewLink\}[\s\S]*?<\/StableCtaLink>/,
  "Marketplace public shop card must visibly show the full public shop domain as a real public link through the shared stable link primitive."
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
  /getMarketplaceShops\([\s\S]*?only_active:\s*true[\s\S]*?getShopForMember\(member,\s*shops\)[\s\S]*?shopLinkForRecord\(shop\)/,
  "Marketplace workspace must load backend-visible shops and only build public shop links from confirmed shop records."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /function shopLinkForRecord\(shop: any\): string \{[\s\S]*?publicShopRootUrl\(direct\)[\s\S]*?return gmfnId \? publicShopUrl\(gmfnId\) : "";/,
  "Marketplace workspace must normalize confirmed shop URLs to the full public shop root, not a block or diary fragment."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /\{shopViewLink \|\|[\s\S]*?"No backend-confirmed public shop link is available for the selected member yet\."\}/,
  "Marketplace workspace must visibly show the full public shop domain only after a backend-confirmed shop exists."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /return gmfnId && shop\?\.id \? publicShopUrl\(gmfnId\) : "";/,
  "Owner shop control must only expose a public shop link after a backend-confirmed active shop record exists."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /async function copyShopLink\(\)[\s\S]*?if \(!publicShopTo\)[\s\S]*?not connected to an active shop[\s\S]*?const copied = await api\.safeCopy\(publicShopLink\)/,
  "Owner shop control must not copy a public shop link until the active shop link is confirmed."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /href=\{publicShopLink\}[\s\S]*?\{publicShopLink\}/,
  "Owner shop control must visibly show the full public shop domain as a real public link."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const gmfnId = useMemo\([\s\S]*?firstTruthy\(shop\?\.owner_gmfn_id, shop\?\.gmfn_id\)[\s\S]*?\[shop\]/,
  "Shop Assets must build public shop links only from the backend-confirmed shop owner identity, not from a member ID fallback."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /async function copyText\(text: string, successMessage: string\)[\s\S]*?const copied = await safeCopy\(text\);[\s\S]*?Clipboard copy was blocked\. Refresh the public shop link before sharing\./,
  "Shop Assets copy actions must wait for clipboard success and not report copied stale shop links."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /buildProductDeepLink\([\s\S]*?publicShopBlockUrl\(\{ gmfnId, productId, block \}\)[\s\S]*?Full public shop link copied\.[\s\S]*?Full public shop link copied\. Mention this block in your message\.[\s\S]*?Full public shop link copied\. Mention this item in your message\./,
  "Ordinary Shop Assets block/item copy actions must copy the full public shop root link and use wording that does not promise a block-only deep link."
);

assertNotContains(
  "src/pages/ShopAssetsPage.tsx",
  /Shop gallery link copied\.|Block link copied\.|Item link copied\./,
  "Ordinary Shop Assets public copy feedback must not imply a gallery-only, block-only, or item-only public link."
);

assertNotContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /publicShopDiariesUrl/,
  "Marketplace workspace ordinary public shop sharing must not force visitors into the shop-diaries fragment."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /async function copyShopLink\(\) \{[\s\S]*?if \(shopLoadFailed\)[\s\S]*?not active yet[\s\S]*?return;[\s\S]*?const copied = await safeCopy\(absoluteShopLink\);[\s\S]*?Clipboard copy was blocked\. Use the visible public shop link instead\./,
  "Public Shop Gallery copy must block failed public-shop links and wait for clipboard success before reporting a valid copy."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /<SecondaryButton[\s\S]*?onClick=\{copyShopLink\}[\s\S]*?debugId="shop-gallery\.copy-shop-link"[\s\S]*?\.\.\.secondaryBtn\(shopLoadFailed\)/,
  "Public Shop Gallery Copy link button must visibly lock when the public shop load failed."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /absoluteShopLink && shopLoadFailed[\s\S]*?<span[\s\S]*?aria-disabled[\s\S]*?not active yet[\s\S]*?<\/span>[\s\S]*?: absoluteShopLink \? \([\s\S]*?<StableCtaLink[\s\S]*?to=\{absoluteShopLink\}[\s\S]*?\{absoluteShopLink\}[\s\S]*?<\/StableCtaLink>/,
  "Public Shop Gallery must show failed public-shop URLs as locked text, not clickable links that recirculate stale shop URLs."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /to=\{absoluteShopLink\}[\s\S]*?\{absoluteShopLink\}/,
  "Public Shop Gallery must visibly show the complete public shop domain as a real link."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const shopLoadFailed = Boolean\(error\);[\s\S]*?const publicBlockText = autoRefreshingShop[\s\S]*?"Reconnecting shop"[\s\S]*?: shopLoadFailed[\s\S]*?"Shop not connected"[\s\S]*?const shopDiaryCounterText = autoRefreshingShop[\s\S]*?"Refreshing"[\s\S]*?: shopLoadFailed[\s\S]*?"Needs refresh"/,
  "Public Shop Gallery must not show normal public-block status while the public shop failed to load."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const GALLERY_SLOTS_TOTAL = 12;[\s\S]*?const visibleProducts = useMemo\([\s\S]*?products\.slice\(0, GALLERY_SLOTS_TOTAL\)[\s\S]*?const overflowProductCount = Math\.max\(0, products\.length - GALLERY_SLOTS_TOTAL\);/,
  "Public Shop Gallery must render the full approved 12 public-block shelf before any overflow control."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /className="public-shop-signboard"[\s\S]*?className="public-shop-status-strip"[\s\S]*?className="public-shop-section public-shop-spotlight"[\s\S]*?className="public-shop-section public-shop-vault-ad"[\s\S]*?id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}/,
  "Public Shop Gallery must land as a whole public shop: signboard, trust/status cues, mini spotlight, Vault promo, then the public 12-block shelf."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /if \(loading\) return;[\s\S]*?const shouldRevealProduct = id !== PUBLIC_SHOP_DIARIES_ANCHOR;[\s\S]*?revealGalleryTarget\(id\);/,
  "Public Shop Gallery must wait for the shelf to load and reserve hash/product reveals for intentional non-root links only."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /if \(loading \|\| error\) return;[\s\S]*?if \(location\.hash\) return;[\s\S]*?revealGalleryTarget\(PUBLIC_SHOP_DIARIES_ANCHOR\);/,
  "Public shop root links must automatically bring visitors to Shop Diaries after the full shop loads."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /if \(attempt < 60\)/,
  "Public Shop Gallery hash landing must retry long enough for mobile/API-loaded shop sections to mount."
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
