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
  "index.html",
  /<link rel="manifest" href="\/manifest\.json" \/>[\s\S]*?<meta name="theme-color" content="#061827" \/>[\s\S]*?<meta name="apple-mobile-web-app-capable" content="yes" \/>[\s\S]*?<title>GSN<\/title>/,
  "GSN public links must expose shortcut metadata so phone users can keep the app reachable from the home screen."
);

assertContains(
  "public/manifest.json",
  /"name": "GSN"[\s\S]*?"short_name": "GSN"[\s\S]*?"description": "Open Global Support Network from this phone\."[\s\S]*?"start_url": "\/cover\?source=pwa"[\s\S]*?"display": "browser"[\s\S]*?"display_override": \["browser"\][\s\S]*?"src": "\/gsn-app-icon-192\.png"[\s\S]*?"src": "\/gsn-app-icon-512\.png"[\s\S]*?"src": "\/gsn-app-icon\.svg"/,
  "The shortcut manifest must keep the GSN identity, Cover-first app start URL, browser display fallback, and standard phone icons."
);

assertContains(
  "public/sw.js",
  /const CACHE_VERSION = "gsn-pwa-shell-v\d+"[\s\S]*?if \(url\.pathname\.startsWith\("\/api"\)\) return;[\s\S]*?if \(url\.pathname\.startsWith\("\/uploads"\)\) return;[\s\S]*?request\.mode === "navigate"/,
  "The GSN service worker must support app-shell install without caching private API or uploaded user data."
);

assertContains(
  "server.mjs",
  /\["\.webmanifest", "application\/manifest\+json; charset=utf-8"\]/,
  "The frontend server must serve the PWA manifest with a browser-recognized manifest MIME type."
);

assertContains(
  "src/main.tsx",
  /import \{[\s\S]*?registerGsnServiceWorker,[\s\S]*?registerPwaInstallSupport,[\s\S]*?\} from "\.\/lib\/pwaInstall";[\s\S]*?installMobileTapGuard\(\);[\s\S]*?registerPwaInstallSupport\(\);[\s\S]*?registerGsnServiceWorker\(\);/,
  "App boot must register PWA install support and the service worker after the mobile tap guard."
);

assertContains(
  "src/lib/pwaInstall.ts",
  /navigator\.serviceWorker[\s\S]*?\.register\("\/sw\.js"\)[\s\S]*?registerInstalledShellFreshnessChecks\(registration\)[\s\S]*?registration\.update\(\)/,
  "The GSN service worker registration must ask the browser to check for a fresh installed-shell update."
);

assertContains(
  "src/lib/pwaInstall.ts",
  /function checkForFreshInstalledShell\(\)[\s\S]*?isGsnStandaloneDisplay\(\)[\s\S]*?fetch\(`\/\?gsn_shell_check=\$\{Date\.now\(\)\}`,[\s\S]*?cache: "no-store"[\s\S]*?shellSignatureFromHtml[\s\S]*?reloadForFreshShell/,
  "Installed GSN shortcuts must compare the running app shell against the latest deployed index and refresh when Render serves a new bundle."
);

assertContains(
  "src/components/GsnInstallPrompt.tsx",
  /open this page in Safari first[\s\S]*?Add to Home Screen[\s\S]*?Add page to home screen or Bookmark[\s\S]*?Play Protect blocks it[\s\S]*?Show iPhone screen steps[\s\S]*?Show 3 phone steps[\s\S]*?\/gsn-app-icon\.svg/,
  "The GSN shortcut prompt must offer one simple setup action plus truthful Android and iPhone manual phone instructions without triggering native Android install."
);

assertWholeFileNotContains(
  "src/components/GsnInstallPrompt.tsx",
  /promptGsnInstall/,
  "The GSN shortcut prompt must not call the native Android install prompt during the pilot Play Protect safety period."
);

assertWholeFileNotContains(
  "src/components/GsnInstallPrompt.tsx",
  /debugId=\{`gsn-install\.\$\{surface\}\.instructions`\}/,
  "The GSN install prompt must not drift back into a busy two-button instruction block."
);

assertContains(
  "src/pages/WelcomePage.tsx",
  /import GsnInstallPrompt[\s\S]*?import \{ getAccessToken \}[\s\S]*?import \{ APP_ROUTES \}[\s\S]*?isSignedIn[\s\S]*?<GsnInstallPrompt[\s\S]*?surface="welcome"[\s\S]*?Continue to my GSN/,
  "Welcome must expose the GSN phone-screen install prompt and a signed-in continue action for users arriving from public links."
);

assertContains(
  "src/App.tsx",
  /function PublicEntryGuard\(props: \{ children: React\.ReactNode \}\)[\s\S]*?const token = getAccessToken\(\);[\s\S]*?if \(token\)[\s\S]*?to=\{publishTarget \|\| lastAuthenticatedAppPath\(\) \|\| APP_ROUTES\.DASHBOARD\}/,
  "Signed-in PWA users must not be trapped on the public front door; they should enter the real app shell."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /import GsnInstallPrompt[\s\S]*?import \{ isIosManualInstallTarget \}[\s\S]*?useIosSingleColumn[\s\S]*?gridTemplateColumns: useIosSingleColumn[\s\S]*?<PublicCapabilitiesGuidePage[\s\S]*?ios=\{isIosTarget\}/,
  "Public My GSN and I must use a one-column iPhone guide layout without changing Android."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /const \[isIosTarget[\s\S]*?isIosManualInstallTarget\(\)[\s\S]*?setIsIosTarget\(isIosManualInstallTarget\(\)\)/,
  "Public My GSN and I must refresh iPhone detection from the live browser target."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /\{ios \? \([\s\S]*?<GsnInstallPrompt[\s\S]*?surface="my-gsn-and-i-ios"/,
  "Public My GSN and I must expose iPhone-specific home-screen setup without changing Android."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /import GsnInstallPrompt[\s\S]*?<GsnInstallPrompt[\s\S]*?surface="login"/,
  "Sign in must expose the GSN phone-screen install prompt so returning members can keep the app reachable."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /import GsnInstallPrompt[\s\S]*?<GsnInstallPrompt[\s\S]*?surface="public-shop"/,
  "Public Shop must expose the GSN phone-screen install prompt for WhatsApp/shared-link visitors."
);

assertContains(
  "src/lib/appRoutes.ts",
  /FREE_SPOTLIGHT:\s*"\/app\/shop-control#shop-control-spotlight"/,
  "Current Free Spotlight CTAs must open the real Shop Control spotlight section directly, not the legacy redirect alias."
);

assertContains(
  "src/lib/actionTargetRoutes.ts",
  /"free-spotlight":\s*ACTION_TARGETS\.FREE_SPOTLIGHT[\s\S]*?"paid-spotlight":\s*ACTION_TARGETS\.SUBSCRIPTION_SPOTLIGHT/,
  "Central guidance/notification aliases for spotlight must resolve to the real Shop Control spotlight targets, not legacy redirect aliases."
);

assertContains(
  "src/lib/actionTargetRoutes.ts",
  /"shop-control\/spotlight":\s*ACTION_TARGETS\.FREE_SPOTLIGHT[\s\S]*?"shop-control\/free-spotlight":\s*ACTION_TARGETS\.FREE_SPOTLIGHT[\s\S]*?"shop-control\/paid-spotlight":\s*ACTION_TARGETS\.SUBSCRIPTION_SPOTLIGHT/,
  "Central action target routing must normalize stale deep shop-control spotlight aliases to real publisher targets before they can fall back."
);

assertContains(
  "src/lib/guidance.ts",
  /normalizeActionTargetPath,[\s\S]*?splitActionTargetSuffix as splitPathSuffix,[\s\S]*?from "\.\/actionTargetRoutes"/,
  "Guidance must use the shared action target normalizer instead of drifting into page-local redirect aliases."
);

assertContains(
  "src/lib/guidance.ts",
  /function isResolvedJoinReviewNotification\(raw: any\): boolean \{[\s\S]*?kind !== "approval_request"[\s\S]*?join_request_resolved === true[\s\S]*?join_request_status[\s\S]*?status !== "pending"[\s\S]*?toArrayRows\(params\.rawNotifications\)[\s\S]*?\.filter\(\(item\) => !isResolvedJoinReviewNotification\(item\)\)[\s\S]*?\.map\(normalizeNotificationNotice\)/,
  "Guidance and Companion must not keep completed join-review notifications in Act Now after backend reports the request is no longer pending."
);

assertContains(
  "src/pages/NotificationsPage.tsx",
  /normalizeActionTargetPath,[\s\S]*?splitActionTargetSuffix as splitPathSuffix,[\s\S]*?from "\.\.\/lib\/actionTargetRoutes"/,
  "Notifications must use the shared action target normalizer instead of drifting into page-local redirect aliases."
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
  "src/pages/CommunityHomePage.tsx",
  /freeSpotlight:\s*routeTarget\(\s*"freeSpotlight"[\s\S]*?case "spotlight-free":[\s\S]*?if \(nextStep === "open-free-publisher"\) \{[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.freeSpotlight[\s\S]*?break;[\s\S]*?id: ownerShopHandle\("free-spotlight"\)\.id[\s\S]*?onClick: \(event: React\.SyntheticEvent<HTMLElement>\) =>[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.freeSpotlight/,
  "Community Home Free Spotlight actions must route directly to the canonical Shop Control spotlight publisher instead of falling through to the local overview or public fallback."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /function spotlightBelongsToCurrentUser[\s\S]*?author_user_id[\s\S]*?author_gmfn_id[\s\S]*?currentGmfnKey/,
  "Community Home Owner Spotlight Status must compare broadcast authorship with the signed-in member before rendering spotlight media."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /const ownerRows = rows\.filter[\s\S]*?spotlightBelongsToCurrentUser\(row, owner\.userId, owner\.gmfnKey\)[\s\S]*?setActiveCommunitySpotlightTotal\(normalizedRows\.length\)/,
  "Community Home Owner Spotlight Status must count only current-member-authored live spotlights, not the selected community's public total."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /Your spotlight in this community[\s\S]*?Other members' live spotlights still belong on public[\s\S]*?Dashboard and Public Shop/,
  "Community Home Owner Spotlight Status copy must make the owner scope clear and avoid presenting another member's spotlight as personal page content."
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
  "src/pages/ShopAssetsPage.tsx",
  /function fallbackShopName\(\): string[\s\S]*?async function saveShopSignboard[\s\S]*?body\.image_url = nextImageUrl;[\s\S]*?shop\?\.id \? `\/api\/marketplace\/shops\/\$\{shop\.id\}` : "\/api\/marketplace\/shops"[\s\S]*?method: shop\?\.id \? "PATCH" : "POST"/,
  "Shop Assets public shop info saves must patch the current shop record when present and create/repair the owner shop when the record did not hydrate."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /async function ensureShopRecordForProduct\(\): Promise<ShopRecord \| null>[\s\S]*?"\/api\/marketplace\/shops"[\s\S]*?const activeShop = await ensureShopRecordForProduct\(\);[\s\S]*?shop_id: Number\(activeShop\.id\)/,
  "Shop Assets product posting must prepare the owner shop record before uploading public shop items."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /function fallbackShopName\(\): string[\s\S]*?async function saveShopDetails[\s\S]*?shop\?\.id \? `\/api\/marketplace\/shops\/\$\{shop\.id\}` : "\/api\/marketplace\/shops"[\s\S]*?method: shop\?\.id \? "PATCH" : "POST"/,
  "Shop Control details save must create or repair the owner shop record instead of blocking when the shop record did not hydrate."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /This picture belongs to this shop only\.[\s\S]*?It does not change the[\s\S]*?community picture or any other member's shop\./,
  "Shop Assets must explain that the public shop picture is shop-scoped, not community-scoped."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /Save the shop name, contact handles, note, and optional picture[\s\S]*?You can save this information without adding a[\s\S]*?picture[\s\S]*?debugId="shop-assets\.signboard\.save"[\s\S]*?Save shop info/,
  "Shop Assets signboard save must be framed as a general shop-info save action, not only a picture save."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /async function saveShopSignboard[\s\S]*?setCollapsed\(\(prev\) => \(\{[\s\S]*?signboard: true,[\s\S]*?products: false,[\s\S]*?Shop information saved\. Shop info control closed\./,
  "Shop Assets public shop info control must collapse after a successful save so the temporary form gives way."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function setSectionCollapsed\(key: keyof CollapseState, value: boolean\)[\s\S]*?<SubtleButton[\s\S]*?onClick=\{\(\) => setSectionCollapsed\("signboard", !collapsed\.signboard\)\}[\s\S]*?debugId="shop-assets\.toggle-signboard"/,
  "Embedded Shop Assets public shop picture control must use an explicit signboard collapse action so the collapse button stays deterministic on phone."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function initialCollapseState\(embedded: boolean\): CollapseState[\s\S]*?readLocalJSON<Partial<CollapseState>>[\s\S]*?if \(!embedded\) return stored;[\s\S]*?posted: false[\s\S]*?useEffect\(\(\) => \{[\s\S]*?if \(!embedded\)[\s\S]*?writeLocalJSON\(SHOP_ASSETS_UI_STORAGE_KEY, collapsed\)[\s\S]*?signboard: collapsed\.signboard/,
  "Embedded Shop Assets must preserve the saved signboard collapse state so shop info stays closed until intentionally reopened."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /function extractPublicBlockNumber\(description: string\): number[\s\S]*?safeStr\(description\)\.match\([\s\S]*?BLOCK:[\s\S]*?function arrangePublicProductsIntoSlots\(items: ProductRecord\[\]\)[\s\S]*?publicBlockNumberForProduct\(item\)[\s\S]*?const publicGallerySlots = useMemo\([\s\S]*?arrangePublicProductsIntoSlots\(publicProducts\)[\s\S]*?description: composeProductDescription\([\s\S]*?targetVisibility === "community_visible" \? selectedPublicSlot : 0/,
  "Shop Assets public gallery block control must preserve selected block occupancy and render occupied blocks from stored block metadata, not array order."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /PUBLIC_GALLERY_VISIBILITY_MODES[\s\S]*?"community_visible"[\s\S]*?"public"[\s\S]*?"community"[\s\S]*?function mergeProductsById[\s\S]*?let shopRes = await getMyMarketplaceShop\([\s\S]*?let nextProducts: ProductRecord\[\] = mergeProductsById\([\s\S]*?normalizeProductRecords\(shopRes\.products\)[\s\S]*?getPublicMarketplaceShopByGmfnId\(effectiveGmfnId,[\s\S]*?product_limit: 200[\s\S]*?nextProducts = mergeProductsById\(nextProducts, publicShopProducts\)[\s\S]*?products\.filter\(\(item\) => isPublicGalleryProduct\(item\)\)/,
  "Embedded Shop Control must hydrate its 12 public blocks from the signed-in owner route plus the same public-shop truth and visibility aliases that visitors see."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /function extractPublicBlockNumber\(description: any\): number[\s\S]*?function stripProductLabel\(description: any\): string[\s\S]*?function arrangeProductsByPublicBlock\(items: ShopProduct\[\]\)[\s\S]*?const arrangedProducts = arrangeProductsByPublicBlock\(normalizedProducts\)[\s\S]*?setProducts\(arrangedProducts\)/,
  "Public Shop Gallery must honor hidden public block metadata while stripping it from visitor-facing descriptions."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /resetProductForm\(\);[\s\S]*?setProductEditorOpen\(false\);[\s\S]*?setCollapsed\(\(prev\) => \(\{[\s\S]*?products: true,[\s\S]*?posted: false/,
  "Shop Assets product editor must close after a successful upload and reveal the posted shop list."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /async function saveShopDetails[\s\S]*?setActiveOwnerLayer\("shop-details"\);[\s\S]*?Shop billboard details saved on the system\./,
  "Owner Shop Control details must stay open after a successful save so the system-backed billboard edit does not jump the owner away."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /function scheduleSpotlightSuccessCollapse\(\)[\s\S]*?setSpotlightOpen\(false\);[\s\S]*?Spotlight published\. The spotlight portal closed so you can continue with other shop work\.[\s\S]*?async function handleCreateSpotlight[\s\S]*?scheduleSpotlightSuccessCollapse\(\);/,
  "Free Spotlight publish must auto-collapse the temporary spotlight portal after success."
);

assertContains(
  "src/App.tsx",
  /path="\/vault-control"[\s\S]*?<PreserveRedirect to=\{APP_ROUTES\.VAULT_CONTROL\}/,
  "The top-level /vault-control alias must not fall through to Cover/Welcome; it must canonicalize to the authenticated Vault Control route."
);

assertContains(
  "src/lib/appRoutes.ts",
  /LOANS:\s*"\/app\/loans"[\s\S]*?LOAN_READINESS:\s*"\/app\/loan-readiness"[\s\S]*?LOAN_SUGGESTIONS:\s*"\/app\/loan-suggestions"[\s\S]*?LOAN_WORKBENCH:\s*"\/app\/loan-workbench"[\s\S]*?GUARANTOR_INBOX:\s*"\/app\/guarantor-inbox"[\s\S]*?GUARANTOR_EARNINGS:\s*"\/app\/guarantor-earnings"/,
  "Loans/support route constants must keep their canonical authenticated targets and not drift into public fallback or notification pages."
);

assertContains(
  "src/App.tsx",
  /path="loans"[\s\S]*?<LoansPage \/>[\s\S]*?path="loan-readiness"[\s\S]*?<LoanReadinessPage \/>[\s\S]*?path="loan-suggestions"[\s\S]*?<LoanSuggestionsPage \/>[\s\S]*?path="loan-workbench"[\s\S]*?<LoanWorkbenchPage \/>[\s\S]*?path="guarantor-earnings"[\s\S]*?<GuarantorEarningsPage \/>[\s\S]*?path="guarantor-inbox"[\s\S]*?<GuarantorInboxPage \/>/,
  "Authenticated Loans buttons must have real nested route destinations before any app fallback can catch them."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /startSupport:\s*routeTarget\([\s\S]*?"marketplace"[\s\S]*?"loans\.route\.start-support"[\s\S]*?"marketplace-loans-support"[\s\S]*?readiness:\s*routeTarget\([\s\S]*?"loanReadiness"[\s\S]*?suggestions:\s*routeTarget\([\s\S]*?"loanSuggestions"[\s\S]*?guarantorInbox:\s*routeTarget\([\s\S]*?"guarantorInbox"[\s\S]*?notifications:\s*routeTarget\([\s\S]*?"notifications"[\s\S]*?guarantorEarnings:\s*routeTarget\([\s\S]*?"guarantorEarnings"/,
  "Loans page support buttons must resolve to their intended feature routes, not accidentally to Cover, Dashboard, or Action Inbox."
);

assertContains(
  "src/App.tsx",
  /function authenticatedFallbackTarget\(pathname: string, search: string, hash: string\): string \{[\s\S]*?alias\.startsWith\("app\/"\)[\s\S]*?alias\.includes\("shop-control"\) \|\| alias\.includes\("spotlight"\)[\s\S]*?APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT[\s\S]*?APP_ROUTES\.FREE_SPOTLIGHT[\s\S]*?APP_ROUTES\.SHOP_ME[\s\S]*?APP_ROUTES\.DASHBOARD/,
  "Unknown authenticated publish/shop routes must stay inside /app instead of falling into Cover/Welcome."
);

assertContains(
  "src/App.tsx",
  /import \{[\s\S]*?peekPublishRecoveryTarget,[\s\S]*?publishRecoveryTarget,[\s\S]*?\} from "\.\/lib\/publishRecovery";[\s\S]*?const LAST_AUTHENTICATED_APP_PATH_KEY = "gmfn_last_authenticated_app_path";[\s\S]*?function currentRoutePath[\s\S]*?#marketplace-owned-links[\s\S]*?#marketplace-rosca[\s\S]*?#marketplace-loans-support[\s\S]*?#marketplace-paid-network-placement[\s\S]*?safeHash[\s\S]*?function RememberAuthenticatedAppRoute\(\)[\s\S]*?rememberAuthenticatedAppPath\(currentRoutePath\(location\)\)[\s\S]*?function PublicEntryGuard\(props: \{ children: React\.ReactNode \}\)[\s\S]*?const token = getAccessToken\(\);[\s\S]*?const publishTarget = token[\s\S]*?\? publishRecoveryTarget\(\)[\s\S]*?: peekPublishRecoveryTarget\(\);[\s\S]*?if \(token\)[\s\S]*?<Navigate[\s\S]*?to=\{publishTarget \|\| lastAuthenticatedAppPath\(\) \|\| APP_ROUTES\.DASHBOARD\}[\s\S]*?if \(publishTarget\)[\s\S]*?next\.set\("next", publishTarget\);[\s\S]*?to=\{`\/login\?\$\{next\.toString\(\)\}`\}[\s\S]*?from: routeStateFromTarget\(publishTarget\)[\s\S]*?<RememberAuthenticatedAppRoute \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<CoverPage \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<WelcomePage \/>/,
  "Authenticated sessions that reach Cover/Welcome must recover to the app route, while temporary Marketplace section hashes are stripped from remembered app destinations."
);

assertContains(
  "src/lib/publishRecovery.ts",
  /const PUBLISH_RECOVERY_TTL_MS = 30 \* 60 \* 1000;[\s\S]*?const PUBLISH_RECOVERY_WINDOW_NAME_PREFIX = "gmfn_publish_recovery:";[\s\S]*?function storageAreas\(\): Storage\[\][\s\S]*?window\.sessionStorage[\s\S]*?window\.localStorage[\s\S]*?export function rememberPublishRecovery[\s\S]*?window\.name = `\$\{PUBLISH_RECOVERY_WINDOW_NAME_PREFIX\}\$\{payload\}`;[\s\S]*?export function peekPublishRecoveryTarget\(\)[\s\S]*?readPublishRecoveryTarget\(false\)[\s\S]*?readWindowNameMarker\(\)/,
  "Publish recovery must survive phone reloads by using a 30-minute marker, session/local storage, a window.name fallback, and a non-consuming peek."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /import \{[\s\S]*?peekPublishRecoveryTarget,[\s\S]*?publishRecoveryTarget,[\s\S]*?\} from "\.\.\/lib\/publishRecovery";[\s\S]*?function safeAppReturnTarget\(value: unknown\): string \{[\s\S]*?target === "\/app" \|\| target\.startsWith\("\/app\/"\)[\s\S]*?const publishTarget = peekPublishRecoveryTarget\(\);[\s\S]*?if \(publishTarget\) return publishTarget;[\s\S]*?const nextTarget = safeAppReturnTarget\(searchParams\.get\("next"\)\);[\s\S]*?nav\(publishRecoveryTarget\(\) \|\| redirectTarget, \{ replace: true \}\)/,
  "Login must accept only safe /app publish return targets and consume publish recovery after successful sign-in."
);

assertContains(
  "src/lib/nav.ts",
  /import \{ rememberPublishRecovery \} from "\.\/publishRecovery";[\s\S]*?function isAppRouteTarget\(target: string\): boolean[\s\S]*?export function rememberAppRouteRecovery[\s\S]*?rememberPublishRecovery\(target, ctaId\);[\s\S]*?navigateWithOrigin[\s\S]*?rememberAppRouteRecovery\(to, "navigate\.app\.route"\);/,
  "Shared programmatic navigation must remember /app targets before moving so failed auth/reload cannot fall into Cover/Welcome."
);

assertContains(
  "src/components/OriginLink.tsx",
  /import \{ rememberAppRouteRecovery \} from "\.\.\/lib\/nav";[\s\S]*?onClick=\{\(event\) => \{[\s\S]*?guardLinkTap\(event, rest\.onClick\);[\s\S]*?if \(!event\.defaultPrevented\) \{[\s\S]*?rememberAppRouteRecovery\(nextTo, linkDebugId\);/,
  "Shared CTA links must remember /app targets before moving, not only the final publish function."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /import \{ peekPublishRecoveryTarget \} from "\.\.\/lib\/publishRecovery";[\s\S]*?function loginRecoveryTarget[\s\S]*?const publishTarget = peekPublishRecoveryTarget\(\);[\s\S]*?next\.set\("next", publishTarget\);[\s\S]*?<Navigate to=\{target\.to\} replace state=\{target\.state\} \/>/,
  "RequireAuth must carry pending Spotlight recovery into login with a concrete next target."
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
  "index.html",
  /<title>GSN<\/title>[\s\S]*?GSN Link[\s\S]*?Open this GSN page\.[\s\S]*?property="og:image"[\s\S]*?https:\/\/gmfn-frontend\.onrender\.com\/gsn-share-poster\.png[\s\S]*?property="og:image:type" content="image\/png"[\s\S]*?name="twitter:image"[\s\S]*?https:\/\/gmfn-frontend\.onrender\.com\/gsn-share-poster\.png/,
  "The static frontend shell must use a short generic frontend-hosted PNG fallback poster, not a shop-specific or repeated trusted-link fallback."
);

assertContains(
  "public/gsn-share-poster.svg",
  /<text x="600" y="382"[\s\S]*>GSN<\/text>[\s\S]*Trusted public link[\s\S]*Open the verified shop, community route, or trust check\.[\s\S]*gmfn-frontend\.onrender\.com/,
  "The static fallback share poster must keep important text centered and crop-safe for social preview cards."
);

assertNotContains(
  "public/gsn-share-poster.svg",
  /GSN Trusted Link|x="950"[\s\S]*>OPEN<\/text>/,
  "The static fallback share poster must not restore the old wide headline or side OPEN badge that crop badly in social cards."
);

assertContains(
  "server.mjs",
  /function joinInviteMeta\(searchParams, pathname, search\)[\s\S]*?GSN Invite[\s\S]*?invites you to request access[\s\S]*?gsn-community-invitation-poster\.png[\s\S]*?serveJoinInviteHtml[\s\S]*?\/\(\?:start\\\/join\|start\\\/invite\|join\|get-invite\|join\\\/community\)/,
  "The frontend server must serve short route-specific WhatsApp/Open Graph metadata for community join invite links, so they do not preview as public shops or formal documents."
);

assertContains(
  "src/lib/joinLinks.ts",
  /export function personalizedJoinInviteUrl\([\s\S]*?communityCode\?: unknown;[\s\S]*?const communityCode = safeText\(opts\.communityCode\);[\s\S]*?if \(inviterName\) url\.searchParams\.set\("inviter_name", inviterName\);[\s\S]*?if \(recipientName\) url\.searchParams\.set\("receiver_name", recipientName\);[\s\S]*?if \(communityCode\) url\.searchParams\.set\("community_code", communityCode\);[\s\S]*?if \(communityName\) url\.searchParams\.set\("community_name", communityName\);[\s\S]*?if \(marketplaceName\) url\.searchParams\.set\("marketplace_name", marketplaceName\);[\s\S]*?if \(message\) url\.searchParams\.set\("message", message\);[\s\S]*?return shareablePublicFrontendUrl\(`\$\{url\.pathname\}\$\{url\.search\}\$\{url\.hash\}`\);/,
  "Join invite sharing must keep form-safe personalized URL context, including community_code, and use the dev-aware shareable origin so phone testing opens the same frontend build."
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
  /function developmentFrontendOrigin\(\): string \{[\s\S]*?isDevelopmentFrontend\(\)[\s\S]*?window\.location\.origin[\s\S]*?export function shareablePublicFrontendUrl\(pathOrUrl: string\): string \{[\s\S]*?const developmentOrigin = developmentFrontendOrigin\(\);[\s\S]*?if \(developmentOrigin\)[\s\S]*?return `\$\{developmentOrigin\}\$\{path\}`;[\s\S]*?return canonicalPublicFrontendUrl\(raw\);/,
  "Public shop sharing must stay on the current private-network dev origin during phone testing, while production keeps the canonical public frontend."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopPath\(gmfnId: string\): string \{[\s\S]*?return\s+`\/shop\/\$\{encodeURIComponent\(ownerId\)\}`;[\s\S]*?\}/,
  "Canonical public shop root paths must stay on the public shop route, not a private app route."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopRootUrl\(pathOrUrl: string\): string \{[\s\S]*?return shareablePublicFrontendUrl\(publicShopRootPath\(pathOrUrl\)\);[\s\S]*?export function publicShopUrl\(gmfnId: string\): string \{[\s\S]*?shareablePublicFrontendUrl\(path\)[\s\S]*?export function publicShopDiariesUrl\(gmfnId: string\): string \{[\s\S]*?shareablePublicFrontendUrl\(path\)[\s\S]*?export function publicShopBlockUrl[\s\S]*?shareablePublicFrontendUrl\(path\)/,
  "Public shop root, diary, and block URLs must all use the dev-aware shareable public frontend helper."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopDiariesPath\(gmfnId: string\): string \{[\s\S]*?return path \? `\$\{path\}#\$\{PUBLIC_SHOP_DIARIES_ANCHOR\}` : "";[\s\S]*?\}[\s\S]*?export function publicShopDiariesUrl\(gmfnId: string\): string \{/,
  "Exact Shop Diaries links must stay available as a dedicated deep-link helper without becoming the ordinary public shop share URL."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopBlockPath[\s\S]*?const query = new URLSearchParams\(\);[\s\S]*?query\.set\("clan_id", clanId\);[\s\S]*?query\.set\("product_id", productId\);[\s\S]*?query\.set\("block", String\(Math\.trunc\(blockNumber\)\)\);[\s\S]*?shop-block-\$\{Math\.trunc\(blockNumber\)\}[\s\S]*?product-\$\{productId\}[\s\S]*?PUBLIC_SHOP_DIARIES_ANCHOR[\s\S]*?return `\$\{path\}\$\{productQuery\}#\$\{encodeURIComponent\(anchor\)\}`;/,
  "Product/block shares must preserve explicit clan_id, product_id, block query context, and block anchors so shared item links open inside the right Shop Diaries community context."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopSharePath\(params:[\s\S]*?const productId = cleanText\(params\.productId\);[\s\S]*?const clanId = cleanText\(params\.clanId\);[\s\S]*?const hasBlock = Number\.isFinite\(blockNumber\) && blockNumber > 0;[\s\S]*?if \(productId \|\| hasBlock \|\| clanId\) \{[\s\S]*?return publicShopBlockPath\(params\);[\s\S]*?return publicShopPath\(params\.gmfnId\);[\s\S]*?export function publicShopShareUrl\(params:[\s\S]*?return path \? shareablePublicFrontendUrl\(path\) : "";/,
  "Ordinary public shop sharing must use the canonical shop root, while explicit community/product/block shares preserve Spotlight context."
);

assertContains(
  "src/lib/joinLinks.ts",
  /return shareablePublicFrontendUrl\(`\/start\/join\/\$\{encodeURIComponent\(cleanCode\)\}`\);/,
  "Invite links must normalize to the public join route while staying on the current dev origin during phone testing."
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
  "Marketplace ordinary public shop copy/open actions must use the backend-confirmed owner ID and send outsiders to the canonical public shop root after an active owner shop exists."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /async function preparePublicShopLink\(\): Promise<string>[\s\S]*?createMarketplaceShop\([\s\S]*?setPublicShopRecord\(normalized\);[\s\S]*?Public shop link is connected to an active shop/,
  "Marketplace must provide an owner-side refresh that connects the public shop link to an active shop before copying."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function isPublicIdentityFallback[\s\S]*?lowered\.includes\("@"\)[\s\S]*?lowered\.endsWith\("\.local"\)[\s\S]*?\^\(\?:gmf\[MN\]\|gsn\)-[\s\S]*?digits\.length >= 7[\s\S]*?function firstPublicIdentity[\s\S]*?const visibleShopName = firstPublicIdentity\(shop\?\.name\);[\s\S]*?const memberDisplayName = visibleShopName \|\| getMemberName\(member\);/,
  "Marketplace member/shop labels must not expose phone, email, internal .local, or generated GSN/GMFN identity fallbacks."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /async function getFreshPublicShopLink\(\): Promise<string> \{[\s\S]*?if \(publicShopViewLink\) return publicShopViewLink;[\s\S]*?return preparePublicShopLink\(\);[\s\S]*?\}/,
  "Marketplace public shop link actions must auto-refresh the owner shop link when the confirmed link is not ready yet."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function openReadyPublicShopLink\(\)[\s\S]*?const link = publicShopPosterLink \|\| publicShopViewLink;[\s\S]*?Refresh the public shop link first[\s\S]*?window\.location\.assign\(link\);/,
  "Marketplace Copy and Email may auto-refresh, but Open Shop Face must use same-tab navigation to an already-ready link inside the original tap."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /void copyFreshPublicShopLink\(\);[\s\S]*?Copy Shop Link[\s\S]*?void emailFreshPublicShopLink\(\);[\s\S]*?Email Link/,
  "Marketplace Copy and Email public shop buttons must keep the auto-refreshing link actions."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /openReadyPublicShopLink\(\);[\s\S]*?Open Shop Face/,
  "Marketplace Open Shop Face must call the same-tab ready-link opener."
);

assertWholeFileNotContains(
  "src/pages/MarketplacePage.tsx",
  /async function openFreshPublicShopLink|void openFreshPublicShopLink\(\)/,
  "Marketplace Open Shop Face must not await link refresh before window.open because mobile browsers can flash a blank blocked tab."
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
  /<StableCtaLink[\s\S]*?to=\{publicShopViewLink\}[\s\S]*?debugId="marketplace\.public-shop\.visible-link"[\s\S]*?\{publicShopViewLink\}[\s\S]*?<\/StableCtaLink>/,
  "Marketplace public shop card must visibly show the full public shop domain as a real public link through the shared stable link primitive."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.public-shop\.visible-link"[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?debugId="marketplace\.public-shop\.open"/,
  "Marketplace public shop link controls must have stable debug ids so phone tap/fallthrough issues can be traced to the exact control."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function linkReserveTextStyle\(\): React\.CSSProperties[\s\S]*?height: 66,[\s\S]*?maxHeight: 66,[\s\S]*?overflow: "hidden",/,
  "Marketplace public link reserves must stay fixed-height and must not become nested mobile scroll panes."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function joinShareMessageCardStyle\(isCompact: boolean\): React\.CSSProperties[\s\S]*?height: isCompact \? 146 : 132,[\s\S]*?minHeight: isCompact \? 146 : 132,[\s\S]*?maxHeight: isCompact \? 146 : 132,[\s\S]*?\};/,
  "The Join this community message preview must stay fixed-height so the lane does not reflow after invite creation."
);

assertFunctionNotContains(
  "src/pages/MarketplacePage.tsx",
  "joinShareMessageCardStyle",
  /overscrollBehavior/,
  "The Join this community message preview must not add an inner overscroll trap on phone."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /sectionLabel\(\)}>Join this community[\s\S]*?linkReserveTextStyle\(\)[\s\S]*?!isCompact \? \([\s\S]*?Copy Join Link[\s\S]*?debugId="marketplace\.links\.join\.refresh"[\s\S]*?Link Ready[\s\S]*?Prepare Link[\s\S]*?debugId="marketplace\.links\.join\.copy-message"[\s\S]*?isCompact \? "Copy Invite" : "Copy Invite Message"[\s\S]*?!isCompact \? \([\s\S]*?Email Join Link[\s\S]*?debugId="marketplace\.links\.join\.whatsapp"[\s\S]*?WhatsApp[\s\S]*?joinShareMessageCardStyle\(isCompact\)[\s\S]*?height: isCompact \? 224 : 238[\s\S]*?!isCompact \? \([\s\S]*?joinShareMessageCardStyle\(isCompact\)/,
  "The Join this community lane must keep its compact masked fixed-height summary, mobile three-action set, desktop full action set, and fixed-height invite previews."
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

assertContains(
  "src/layout/AppLayout.tsx",
  /return items\.filter\(\(item\) => !item\.disabled \|\| item\.label === "Shop"\);/,
  "Mobile bottom rail must keep the Shop anchor visible while the member GSN ID is pending."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /setPublicShopVerification\(publicShopRes\?\.verification \|\| null\);[\s\S]*?async function loadPublicShop\([\s\S]*?cleanedGmfnId: string,[\s\S]*?options: \{ useCommunityScope\?: boolean \} = \{\}[\s\S]*?getPublicMarketplaceShopByGmfnId\(cleanedGmfnId, \{[\s\S]*?clan_id: useCommunityScope && routeClanId > 0 \? routeClanId : undefined/,
  "Public Shop must use the backend public-shop payload for spotlight and verification truth, scoped by route community when present."
);

assertContains(
  "../gmfn_backend/app/api/routes/marketplace.py",
  /def _owner_public_shop_payload\([\s\S]*?active_owner_shops = \([\s\S]*?active_owner_shop_ids[\s\S]*?MarketplaceProduct\.shop_id\.in_\(active_owner_shop_ids\)[\s\S]*?MarketplaceProduct\.seller_user_id == int\(owner\.id\)[\s\S]*?MarketplaceProduct\.visibility_mode\.in_\([\s\S]*?VISIBILITY_COMMUNITY[\s\S]*?"public"[\s\S]*?"community"[\s\S]*?"products": \[_product_out\(db, p\) for p in product_rows\][\s\S]*?@router\.get\("\/shops\/me"\)[\s\S]*?def get_my_marketplace_shop\([\s\S]*?_owner_public_shop_payload\(/,
  "Authenticated shop lookup must use the shared owner public-block product scope and visibility aliases that the public shop can display."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /getMarketplaceBroadcasts\(\{\s*active_only:\s*true,\s*limit:\s*24,\s*\}\)|primary_broadcast:\s*ownerFeed|shopSpotlightFallbackProduct/,
  "Public Shop must not patch over backend spotlight truth with owner-feed or product-card page-local fallbacks."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const effectiveShopName = publicShopName\(\s*shop\?\.shopName,\s*broadcast\?\.sourceShopName\s*\);[\s\S]*?const effectiveDescription = firstMeaningful\(shop\?\.description\);/,
  "Public Shop signboard name and description must stay shop/member scoped and must not expose raw GSN IDs, phone identities, or community Spotlight author content."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /window\.setInterval\(\(\) => \{\s*void refreshPublicShopState\(false\);[\s\S]*?SPOTLIGHT_PILOT_REFRESH_MS/,
  "Public Shop must quietly refresh live spotlight data on the same pilot refresh cadence instead of locking to first page load."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /if \(location\.hash\) return;\s*if \(communitySpotlights\.length > 0\) return;[\s\S]*?revealGalleryTarget\(PUBLIC_SHOP_DIARIES_ANCHOR\);/,
  "Public Shop must not auto-scroll past the live Spotlight into Shop Diaries when community spotlight rows are present."
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
  "Marketplace workspace member rows must normalize confirmed shop URLs to the public shop root because this is internal browsing, not outward sharing."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /\{shopViewLink \|\|[\s\S]*?"No backend-confirmed public shop link is available for the selected member yet\."\}/,
  "Marketplace workspace must visibly show the full public shop domain only after a backend-confirmed shop exists."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /return gmfnId && shop\?\.id \? publicShopDiariesUrl\(gmfnId\) : "";/,
  "Owner shop control must only expose a Shop Diaries public link after a backend-confirmed active shop record exists."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /async function copyShopLink\(\)[\s\S]*?if \(!publicShopTo\)[\s\S]*?not connected to an active shop[\s\S]*?const copied = await api\.safeCopy\([\s\S]*?buildGsnPublicShopLinkPackage\([\s\S]*?shopLink: publicShopLink/,
  "Owner shop control must not copy a public shop package until the active shop link is confirmed."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /<StableCtaLink[\s\S]*?to=\{publicShopLink\}[\s\S]*?debugId="community-shop-control\.public-url"[\s\S]*?\{publicShopLink\}/,
  "Owner shop control must visibly show the full public shop domain as a real public link through the shared stable link primitive."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /const gmfnId = useMemo\([\s\S]*?firstTruthy\(shop\?\.owner_gmfn_id, shop\?\.gmfn_id\)[\s\S]*?\[shop\]/,
  "Shop Assets must build public shop links only from the backend-confirmed shop owner identity, not from a member ID fallback."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /async function copyText\([\s\S]*?text: string,[\s\S]*?successMessage: string,[\s\S]*?missingMessage = "Nothing to copy yet\."[\s\S]*?const copied = await safeCopy\(text\);[\s\S]*?Clipboard copy was blocked\. Refresh the public shop link before sharing\./,
  "Shop Assets copy actions must wait for clipboard success and not report copied stale shop links."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /buildShopLink\(gmfnId: string\)[\s\S]*?publicShopShareUrl\(\{ gmfnId \}\)[\s\S]*?buildProductDeepLink\([\s\S]*?publicShopShareUrl\(\{ gmfnId, productId, block \}\)[\s\S]*?buildPublicShopPackage\([\s\S]*?buildGsnPublicShopLinkPackage\([\s\S]*?shopLink: link[\s\S]*?Public shop package copied\.[\s\S]*?Public shop block package copied\. It opens this block inside the Shop Diaries\.[\s\S]*?Public shop item package copied\. It opens this item inside the Shop Diaries\./,
  "Shop Assets copy actions must copy frontend-domain preview-ready GSN packages for Shop Diaries and exact block/item links with honest feedback."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /function replacePublicShopAddress\(gmfnId: string\): void \{[\s\S]*?const currentSearch = window\.location\.search \|\| "";[\s\S]*?const currentHash = window\.location\.hash \|\| "";[\s\S]*?`\$\{path\}\$\{currentSearch\}\$\{currentHash\}`/,
  "Public shop auto-reconnect must preserve product_id and Shop Diaries/block anchors instead of stripping visitors back to the upper shop face."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /async function refreshOwnerShop\(cleanedGmfnId: string, clanRes: any\)[\s\S]*?const ownerGmfnId = firstMeaningful[\s\S]*?const candidateClanIds = \[preferredClanId, 0\];[\s\S]*?listMyClans\(\)[\s\S]*?createMarketplaceShop\(\{[\s\S]*?clan_id: clanId \|\| null,[\s\S]*?\.\.\.basePayload/,
  "Disconnected public shop links must heal to the signed-in owner's current active shop, even when a stale link ID or selected community would otherwise block Shop Diaries."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /import \{ revealElementWithoutJump \} from "\.\.\/lib\/mobileRevealStability";[\s\S]*?scrollGalleryTargetIntoView[\s\S]*?revealElementWithoutJump\(target, \{[\s\S]*?surface: "public-shop"[\s\S]*?reason: "hash-landing"[\s\S]*?\[120, 320, 700, 1100\]\.forEach/,
  "Public shop hash landing must perform repeated no-jump reveal passes so late layout shifts cannot pull visitors back above Shop Diaries or the selected block."
);

assertNotContains(
  "src/pages/ShopAssetsPage.tsx",
  /Full public shop link copied\./,
  "Shop Assets public copy feedback must not claim a root shop link when the copied URL intentionally targets Shop Diaries or a block."
);

assertNotContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /publicShopDiariesUrl/,
  "Marketplace workspace ordinary public shop sharing must not force visitors into the shop-diaries fragment."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const absoluteShopLink = useMemo\(\(\) => \{[\s\S]*?publicShopUrl\(ownerId\)[\s\S]*?const absoluteShopShareLink = useMemo\(\(\) => \{[\s\S]*?publicShopShareUrl\(\{ gmfnId: ownerId \}\)[\s\S]*?async function copyShopLink\(\) \{[\s\S]*?if \(shopLoadFailed\)[\s\S]*?not active yet[\s\S]*?return;[\s\S]*?const copied = await safeCopy\(absoluteShopShareLink\)[\s\S]*?Public shop link copied\.[\s\S]*?Clipboard copy was blocked\. Use Share, or copy the page address from your browser\./,
  "Public Shop Gallery copy must block failed public-shop links and copy only the canonical root-shop URL after clipboard success."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const absoluteVaultRequestPreviewLink = useMemo\(\(\) => \{[\s\S]*?publicVaultRequestPreviewUrl\(\{ gmfnId: ownerId \}\)[\s\S]*?async function copyVaultRequestLink\(\)[\s\S]*?safeCopy\(absoluteVaultRequestPreviewLink\)[\s\S]*?Vault request link copied\.[\s\S]*?async function askForVaultAccess\(\)[\s\S]*?if \(!absoluteVaultRequestPreviewLink\)[\s\S]*?const requestText = \[[\s\S]*?request a private Vault access link[\s\S]*?absoluteVaultRequestPreviewLink,[\s\S]*?selected offers you do not show on the public page[\s\S]*?openOwnerWhatsAppChat\([\s\S]*?requestText[\s\S]*?const copied = await safeCopy\(requestText\);[\s\S]*?id=\{PUBLIC_SHOP_VAULT_ANCHOR\}[\s\S]*?debugId="shop-gallery\.copy-vault-request-link"/,
  "Public Shop Vault access requests must use the Vault-request preview URL and Vault copy handler, not the general public shop link."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /async function askForVaultAccess\(\)[\s\S]*?publicShopSocialPreviewUrl\(\{ gmfnId: ownerId \}\)[\s\S]*?absoluteShopShareLink[\s\S]*?absoluteShopLink/,
  "Vault access requests must not fall back to public shop preview/root links."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export const PUBLIC_SHOP_VAULT_ANCHOR = "private-vault";[\s\S]*?export function publicVaultRequestPreviewPath\(params: \{ gmfnId: string \}\): string \{[\s\S]*?`\/share\/vault-request\/\$\{encodeURIComponent\(ownerId\)\}`[\s\S]*?export function publicVaultRequestPreviewUrl\(params: \{ gmfnId: string \}\): string \{[\s\S]*?publicApiUrl\(path\)/,
  "Public link helpers must expose a dedicated Vault request preview route separate from public shop sharing."
);

assertContains(
  "server.mjs",
  /const publicFrontendOrigin[\s\S]*?gmfn-frontend\.onrender\.com[\s\S]*?function metaTags\(meta\)[\s\S]*?og:image[\s\S]*?og:url[\s\S]*?twitter:card[\s\S]*?async function serveShopHtml[\s\S]*?async function serveShareCardProxy/,
  "The frontend server must inject route-specific Open Graph tags for public shop routes and proxy the shop preview image through the frontend domain for WhatsApp."
);

assertContains(
  "server.mjs",
  /function fallbackShopMeta\(gmfnId, productId, block\)[\s\S]*?title: hasProduct \? "GSN Shop Item" : "GSN Public Shop"[\s\S]*?imageUrl: frontendUrl\("\/gsn-share-poster\.png"\)[\s\S]*?shopMetaHash\(productId, block\)[\s\S]*?let meta = fallbackShopMeta\([\s\S]*?meta = await fetchShopMeta\(/,
  "Public Shop server metadata must keep a shop-shaped fallback when API lookup fails or times out."
);

assertNotContains(
  "server.mjs",
  /communityAccessMeta|serveCommunityHtml|\/community\/\(\[\^\/\]\+\)/,
  "The retired public /community/:clanId route must not keep server-side preview metadata or route handling."
);

assertNotContains(
  "src/App.tsx",
  /path="\/community\/:clanId"/,
  "The retired public /community/:clanId route must not remain registered in the React router."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /publicFrontendUrl\(`\/community\/\$\{/,
  "Marketplace must not generate the retired public /community/:clanId link; public community checks should use /verify/community/:communityKey."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /`\/community\/\$\{/,
  "Shop Gallery spotlight community links must not generate the retired public /community/:clanId route."
);

assertContains(
  "src/App.tsx",
  /const CommunityMemberVerifyPage = React\.lazy\([\s\S]*?\.\/pages\/CommunityMemberVerifyPage[\s\S]*?path="\/verify\/community\/:communityKey\/member\/:memberKey"[\s\S]*?element=\{<CommunityMemberVerifyPage \/>\}[\s\S]*?<Route path="\/verify\/community\/:communityKey" element=\{<CommunityVerifyPage \/>\}/,
  "Public community member credentials must keep their scoped /verify/community/:communityKey/member/:memberKey route before the generic public community route."
);

assertWholeFileNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /createMarketplaceRepost|repostPanelOpen|shop-gallery\.repost|Live GSN repost|Place in spotlight/,
  "Public Shop Gallery must not expose in-network repost as an outside/public shop action."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const signedInOwnsShop = Boolean\([\s\S]*?ownerSurfaceIdentityMatches\(signedInGmfnId, shopOwnerGmfnId\)[\s\S]*?const showBlockPlacementAction = signedInOwnsShop && !shopLoadFailed;[\s\S]*?function blockPlacementPath\(product: ShopProduct\): string[\s\S]*?params\.set\("repost_product_id", String\(productId\)\)[\s\S]*?params\.set\("block", String\(blockNumber\)\)[\s\S]*?params\.set\("source", "shop-diaries"\)[\s\S]*?APP_ROUTES\.MARKETPLACE[\s\S]*?#marketplace-paid-network-placement[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.paid-placement`\}/,
  "Shop Diaries owner-only paid placement action must pass exact product/block identity into the internal Marketplace composer."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /createMarketplaceRepost,[\s\S]*?getMarketplaceProducts,[\s\S]*?Paid Repost[\s\S]*?Target community ID[\s\S]*?debugId="marketplace\.network-repost\.place"[\s\S]*?submitMarketplaceRepost/,
  "Marketplace must own the in-network Paid Repost composer with one public block and one target community ID."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /const routeRepostProductId = useMemo[\s\S]*?query\.get\("repost_product_id"\)[\s\S]*?const routeRepostBlockNumber = useMemo[\s\S]*?query\.get\("block"\)[\s\S]*?const routeRepostSource = useMemo[\s\S]*?query\.get\("source"\)[\s\S]*?readPaidRepostHandoff[\s\S]*?visibleRepostProducts[\s\S]*?hash === "marketplace-paid-network-placement"[\s\S]*?routeRepostSource === "shop-diaries"[\s\S]*?visibleRepostProducts\.find\(\(product\) => product\.id === routeRepostProductId\)[\s\S]*?product\.blockNumber === routeRepostBlockNumber[\s\S]*?setSelectedRepostProductId\(matchedProduct\.id\)[\s\S]*?scrollToMarketplaceSection\("marketplace-paid-network-placement"\)/,
  "Marketplace must consume Shop Diaries product/block handoff, preserve an exact fallback preview, and open the paid Network Spotlight composer with the exact block selected."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /debugId="shop-gallery\.absolute-shop-link"|absoluteShopLink && shopLoadFailed[\s\S]*?<span[\s\S]*?\{absoluteShopLink\}[\s\S]*?<\/span>|<StableCtaLink[\s\S]*?to=\{absoluteShopLink\}[\s\S]*?\{absoluteShopLink\}[\s\S]*?<\/StableCtaLink>/,
  "Public Shop Gallery must not show the standalone raw public shop URL block; Share, Copy, QR, and owner actions carry the link."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /Visitors can share the shop, copy the public link|publicShopBuyerCue/,
  "Public Shop Gallery must not keep the wordy billboard buyer cue that repeats the Share, Copy, and owner-contact buttons."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const shopLoadFailed = Boolean\(error\);[\s\S]*?const publicBlockText = autoRefreshingShop[\s\S]*?"Reconnecting shop"[\s\S]*?: shopLoadFailed[\s\S]*?"Shop not connected"[\s\S]*?const shopDiaryCounterText = autoRefreshingShop[\s\S]*?"Refreshing"[\s\S]*?: shopLoadFailed[\s\S]*?"Needs refresh"/,
  "Public Shop Gallery must not show normal public-block status while the public shop failed to load."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const \[publicShopVerification, setPublicShopVerification\] = useState<[\s\S]*?Record<string, any> \| null[\s\S]*?>\(null\);[\s\S]*?const \[shopVerificationQrOpen, setShopVerificationQrOpen\] = useState\(false\);[\s\S]*?const verificationCommunityId = firstMeaningful\([\s\S]*?publicShopVerification\?\.community_id,[\s\S]*?effectiveShop\?\.clanId[\s\S]*?const shopCommunityVerifyPath = firstMeaningful\([\s\S]*?publicShopVerification\?\.community_verify_path,[\s\S]*?\/verify\/community\/\$\{encodeURIComponent\(shopCommunityIdText\)\}[\s\S]*?const verificationPublicShopPath = firstMeaningful\([\s\S]*?publicShopVerification\?\.public_shop_path,[\s\S]*?shopRootPath[\s\S]*?const verificationScanKind = safeStr\(publicShopVerification\?\.scan_kind\)\.toLowerCase\(\);[\s\S]*?const verificationPrimaryScanPath = firstMeaningful\([\s\S]*?publicShopVerification\?\.primary_scan_path/,
  "Public Shop Verify panel must compute scan targets from backend verification truth with community/public-shop fallback."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /shopVerificationQrOpen \? \([\s\S]*?<QRCodeSVG[\s\S]*?value=\{shopVerificationQrTarget\}[\s\S]*?onClick=\{\(\) => setShopVerificationQrOpen\(\(open\) => !open\)\}[\s\S]*?\{shopVerificationScanButtonText\}/,
  "Public Shop Verify panel must expose the QR only after the visitor taps the scan action."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const shopVerificationRows = \[[\s\S]*?Shop name[\s\S]*?Shop owner ID[\s\S]*?Marketplace[\s\S]*?Community[\s\S]*?Community ID[\s\S]*?const shopTrustCheckOptions = \[[\s\S]*?Request TrustSlip for current evidence[\s\S]*?Ask community for extra confirmation[\s\S]*?Use IDs to avoid name confusion[\s\S]*?async function requestCommunityConfirmationFromOwner\(\)[\s\S]*?Please connect me with the right community confirmation route[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle"[\s\S]*?debugId="shop-gallery\.verify-shop\.request-trustslip"[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle-scan"[\s\S]*?onClick=\{\(\) => void requestCommunityConfirmationFromOwner\(\)\}[\s\S]*?debugId="shop-gallery\.verify-shop\.open-community-record"[\s\S]*?Ask owner[\s\S]*?Trust check options/,
  "Public Shop Verify panel must expose identity/community context while routing community confirmation requests through the owner instead of direct random community contact."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /import OwnerOnlySurfaceNav from "\.\.\/components\/OwnerOnlySurfaceNav";[\s\S]*?import \{ APP_ROUTES, routeWithCommunity \} from "\.\.\/lib\/appRoutes";[\s\S]*?const memberSurfaceLinks = useMemo\([\s\S]*?label: "Dashboard"[\s\S]*?APP_ROUTES\.DASHBOARD[\s\S]*?label: "Community Home"[\s\S]*?routeWithCommunity\(APP_ROUTES\.COMMUNITY, ownerSurfaceCommunityId\)[\s\S]*?label: "Marketplace"[\s\S]*?routeWithCommunity\(APP_ROUTES\.MARKETPLACE, ownerSurfaceCommunityId\)[\s\S]*?label: "Public Shop"[\s\S]*?shopRootPath \|\| publicShopReturnPath[\s\S]*?label: "Finance"[\s\S]*?routeWithCommunity\(APP_ROUTES\.FINANCE, ownerSurfaceCommunityId\)[\s\S]*?label: "Loans"[\s\S]*?routeWithCommunity\(APP_ROUTES\.LOANS, ownerSurfaceCommunityId\)[\s\S]*?label: "Trust"[\s\S]*?routeWithCommunity\(APP_ROUTES\.TRUST, ownerSurfaceCommunityId\)[\s\S]*?<OwnerOnlySurfaceNav[\s\S]*?label="Owner shop shortcuts"[\s\S]*?ariaLabel="Public Shop owner shortcuts"[\s\S]*?links=\{memberSurfaceLinks\}[\s\S]*?requireOwnerMatch=\{true\}/,
  "Public Shop owner shortcuts must route the shop owner to Dashboard, Community Home, Marketplace, Public Shop, Finance, Loans, and Trust while staying hidden from public visitors and non-owner signed-in members."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-paid-network-placement"[\s\S]*?Paid Repost[\s\S]*?debugId="marketplace\.network-repost\.place"/,
  "Public Shop signed-in paid repost navigation must land on the internal Marketplace placement card, not a public visitor action."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /import \{[\s\S]*?publicShopPath,[\s\S]*?publicShopSharePath,[\s\S]*?\} from "\.\.\/lib\/publicLinks";[\s\S]*?const memberRows = useMemo\(\(\) => \{[\s\S]*?shopTo:[\s\S]*?shop && gmfn[\s\S]*?publicShopSharePath\(\{[\s\S]*?gmfnId: gmfn,[\s\S]*?clanId: activeCommunityId \|\| undefined,[\s\S]*?\}\)[\s\S]*?\}, \[activeCommunityId, members, shops\]\);/,
  "Marketplace member Open shop handoffs must carry the active marketplace/community context so Public Shop reflects that community's live Spotlight."
);

assertContains(
  "src/components/CommunityMarketplaceSpotlight.tsx",
  /import \{ publicShopPath, publicShopSharePath \} from "\.\.\/lib\/publicLinks";[\s\S]*?source_product_id\?: number \| string \| null;[\s\S]*?source_product_block\?: number \| string \| null;[\s\S]*?source_product_slot_number\?: number \| string \| null;[\s\S]*?function spotlightShopPath\(item: MarketplaceFeedItem \| null\): string \{[\s\S]*?const clanId = positiveNumber\(item\?\.source_clan_id \|\| item\?\.clan_id\);[\s\S]*?positiveNumber\(item\?\.source_product_id\)[\s\S]*?positiveNumber\(item\?\.source_product_block\)[\s\S]*?positiveNumber\(item\?\.source_product_slot_number\)[\s\S]*?publicShopSharePath\(\{[\s\S]*?gmfnId,[\s\S]*?clanId: clanId \|\| undefined,[\s\S]*?productId: productId \|\| undefined,[\s\S]*?block: block \|\| undefined,[\s\S]*?\}\)[\s\S]*?publicShopPath\(gmfnId\)/,
  "Community Marketplace Spotlight must preserve backend source community/product/block truth and deep-link network placements to the exact public shop community/block."
);

assertContains(
  "src/pages/DashboardPage.tsx",
  /import \{ publicShopPath, publicShopSharePath \} from "\.\.\/lib\/publicLinks";[\s\S]*?source_product_id\?: number \| string \| null;[\s\S]*?source_product_block\?: number \| string \| null;[\s\S]*?source_product_slot_number\?: number \| string \| null;[\s\S]*?source_product_id:[\s\S]*?source\.source_product_id \?\? source\.sourceProductId \?\? null,[\s\S]*?source_product_block:[\s\S]*?source\.source_product_block \?\? source\.sourceProductBlock \?\? null,[\s\S]*?source_product_slot_number:[\s\S]*?source\.source_product_slot_number \?\? source\.sourceProductSlotNumber \?\? null,[\s\S]*?function spotlightShopTo\(item: SpotlightItem \| null\): string \{[\s\S]*?const clanId = positiveNumber\(item\?\.source_clan_id \|\| item\?\.clan_id\);[\s\S]*?publicShopSharePath\(\{[\s\S]*?gmfnId,[\s\S]*?clanId: clanId \|\| undefined,[\s\S]*?productId: productId \|\| undefined,[\s\S]*?block: block \|\| undefined,[\s\S]*?\}\)[\s\S]*?navigateWithOrigin\(navigate, spotlightShopTo\(activeSpotlight\), location\)/,
  "Dashboard Spotlight must keep source community/product/block fields and open paid outside spotlight placements at the exact public shop community/block."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /sourceProductId\?: number;[\s\S]*?sourceProductBlock\?: number;[\s\S]*?sourceProductSlotNumber\?: number;[\s\S]*?sourceProductId:[\s\S]*?row\?\.source_product_id \|\| row\?\.sourceProductId[\s\S]*?sourceProductBlock:[\s\S]*?row\?\.source_product_block \|\| row\?\.sourceProductBlock[\s\S]*?sourceProductSlotNumber:[\s\S]*?row\?\.source_product_slot_number \|\| row\?\.sourceProductSlotNumber/,
  "Community Home spotlight normalization must preserve source product/block fields for any future exact-block spotlight actions."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /import \{[\s\S]*?publicShopSharePath,[\s\S]*?\} from "\.\.\/lib\/publicLinks";[\s\S]*?sourceProductId\?: number;[\s\S]*?sourceProductBlock\?: number;[\s\S]*?sourceProductSlotNumber\?: number;[\s\S]*?sourceProductId:[\s\S]*?src\?\.source_product_id \|\| src\?\.sourceProductId[\s\S]*?sourceProductBlock:[\s\S]*?src\?\.source_product_block \|\| src\?\.sourceProductBlock[\s\S]*?sourceProductSlotNumber:[\s\S]*?src\?\.source_product_slot_number \|\| src\?\.sourceProductSlotNumber[\s\S]*?const spotlightProductId = positiveNumber\(miniSpotlight\?\.sourceProductId\);[\s\S]*?const spotlightProductBlock =[\s\S]*?positiveNumber\(miniSpotlight\?\.sourceProductBlock\) \|\|[\s\S]*?positiveNumber\(miniSpotlight\?\.sourceProductSlotNumber\);[\s\S]*?publicShopSharePath\(\{[\s\S]*?gmfnId: spotlightShopGmfnId,[\s\S]*?clanId: spotlightClanId \|\| undefined,[\s\S]*?productId: spotlightProductId \|\| undefined,[\s\S]*?block: spotlightProductBlock \|\| undefined,[\s\S]*?\}\)[\s\S]*?sourceShopWhatsApp: firstMeaningful\(miniSpotlight\?\.sourceShopWhatsApp\)[\s\S]*?shopTo,[\s\S]*?debugId="shop-gallery\.spotlight\.whatsapp-chat"[\s\S]*?debugId="shop-gallery\.spotlight\.phone-call"[\s\S]*?debugId="shop-gallery\.spotlight\.contact\.choose"/,
  "Public Shop Spotlight must preserve broadcast source community/product/block truth in the computed shopTo path while exposing the current Contact-owner chooser instead of the retired Open/Explore redirect."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /shop-gallery\.open-spotlight-preview|function openSpotlightPreview\(\)|isCompact \? "Open" : "Explore"/,
  "Public Shop Spotlight must not restore the retired public Open/Explore redirect action."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopSharePath\(params: \{[\s\S]*?clanId\?: string \| number \| null;[\s\S]*?const clanId = cleanText\(params\.clanId\);[\s\S]*?if \(productId \|\| hasBlock \|\| clanId\) \{[\s\S]*?return publicShopBlockPath\(params\);/,
  "Public Shop share paths must support explicit community context for Spotlight handoffs while leaving ordinary root links clean when no clanId is passed."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopSocialPreviewPath\(params: \{[\s\S]*?\/share\/shop\/\$\{encodeURIComponent\(ownerId\)\}\$\{suffix\}[\s\S]*?export function publicShopSocialPreviewUrl\(params: \{[\s\S]*?return path \? publicApiUrl\(path\) : "";/,
  "Public Shop social-preview URLs must point social scrapers at the backend /share/shop route while normal app navigation stays on the frontend shop route."
);

assertContains(
  "src/components/OwnerOnlySurfaceNav.tsx",
  /ariaLabel = "Owner surface navigation"[\s\S]*?hasSignedInSession[\s\S]*?getAccessToken\(\)[\s\S]*?setHasSignedInSession\(Boolean\(token\)\)[\s\S]*?meRes\?\.gmfn_id[\s\S]*?meRes\?\.member_global_id[\s\S]*?hasSignedInSession[\s\S]*?requireOwnerMatch[\s\S]*?ownerSurfaceIdentityMatches\(signedInGmfnId, ownerGmfnId\)[\s\S]*?if \(!shouldShowOwnerNav\) return null;/,
  "Owner surface navigation must remain hidden from public visitors, while allowing public-shop member navigation to opt out of owner matching for signed-in users."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /function isPublicShopBlockHash\(value: string\): boolean \{[\s\S]*?\^shop-block-\\d\{1,2\}\$[\s\S]*?\^product-\\d\+\$[\s\S]*?const focusedBlockProduct = useMemo\([\s\S]*?publicShopBlockAnchorId\(product\)[\s\S]*?legacyProductAnchorId\(product\)[\s\S]*?if \(focusedBlockLinkActive\) return focusedBlockProduct \? \[focusedBlockProduct\] : \[\];[\s\S]*?products\.slice\(0, GALLERY_SLOTS_TOTAL\)[\s\S]*?const overflowProductCount = focusedBlockLinkActive[\s\S]*?: Math\.max\(0, products\.length - GALLERY_SLOTS_TOTAL\);/,
  "Public Shop Gallery must focus exact product/block links to one block while whole-shop links keep the approved 12-block shelf."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /className="public-shop-signboard"[\s\S]*?className="public-shop-status-strip"[\s\S]*?className="public-shop-section public-shop-spotlight"[\s\S]*?className="public-shop-section public-shop-vault-ad"[\s\S]*?id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}/,
  "Public Shop Gallery must land as a whole public shop: signboard, trust/status cues, mini spotlight, Vault promo, then the public 12-block shelf."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /product_id: routeProductId > 0 \? routeProductId : undefined,[\s\S]*?display: focusedBlockLinkActive \? "none" : "grid"[\s\S]*?This shared link opens only this public shop block\./,
  "Public Shop Gallery exact block links must request the exact product and hide secondary public-shop sections while focused."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const miniSpotlightView = useMemo\(\(\) => \{[\s\S]*?if \(!miniSpotlight\) \{[\s\S]*?No live community spotlight is attached to this shop context yet\.[\s\S]*?const publicShopSpotlightActive = Boolean\(miniSpotlight\);/,
  "Public Shop Spotlight must render only backend community spotlight truth and show an honest quiet state when no live community spotlight exists."
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
