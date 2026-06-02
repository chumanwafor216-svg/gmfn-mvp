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
  "GSN public links must expose installable PWA metadata so phone users can keep the app on the home screen."
);

assertContains(
  "public/manifest.json",
  /"name": "GSN"[\s\S]*?"short_name": "GSN"[\s\S]*?"description": "Open Global Support Network from this phone\."[\s\S]*?"start_url": "\/cover\?source=pwa"[\s\S]*?"display": "standalone"[\s\S]*?"src": "\/gsn-app-icon-192\.png"[\s\S]*?"src": "\/gsn-app-icon-512\.png"[\s\S]*?"src": "\/gsn-app-icon\.svg"/,
  "The PWA manifest must keep the GSN home-screen identity, app start URL, standalone display mode, and standard phone icons."
);

assertContains(
  "public/sw.js",
  /const CACHE_VERSION = "gsn-pwa-shell-v1"[\s\S]*?if \(url\.pathname\.startsWith\("\/api"\)\) return;[\s\S]*?if \(url\.pathname\.startsWith\("\/uploads"\)\) return;[\s\S]*?request\.mode === "navigate"/,
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
  "src/components/GsnInstallPrompt.tsx",
  /promptGsnInstall[\s\S]*?Add to Home Screen[\s\S]*?Add to Home screen or Install app[\s\S]*?Add GSN to phone screen[\s\S]*?Show 3 phone steps[\s\S]*?\/gsn-app-icon\.svg/,
  "The GSN install prompt must offer one simple setup action plus truthful manual phone instructions."
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
  "src/pages/CommunityHomePage.tsx",
  /freeSpotlight:\s*routeTarget\(\s*"freeSpotlight"[\s\S]*?case "spotlight-free":[\s\S]*?if \(nextStep === "open-free-publisher"\) \{[\s\S]*?openCommunityRoute\(event, routes\.freeSpotlight\);[\s\S]*?break;[\s\S]*?id: "free-spotlight"[\s\S]*?onClick: \(event: React\.SyntheticEvent<HTMLElement>\) =>\s*openCommunityRoute\(event, routes\.freeSpotlight\)/,
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
  /function initialCollapseState\(embedded: boolean\): CollapseState[\s\S]*?readLocalJSON<Partial<CollapseState>>[\s\S]*?if \(!embedded\) return stored;[\s\S]*?posted: false[\s\S]*?useEffect\(\(\) => \{[\s\S]*?if \(!embedded\)[\s\S]*?writeLocalJSON\(SHOP_ASSETS_UI_STORAGE_KEY, collapsed\)[\s\S]*?signboard: collapsed\.signboard/,
  "Embedded Shop Assets must preserve the saved signboard collapse state so shop info stays closed until intentionally reopened."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /resetProductForm\(\);[\s\S]*?setProductEditorOpen\(false\);[\s\S]*?setCollapsed\(\(prev\) => \(\{[\s\S]*?products: true,[\s\S]*?posted: false/,
  "Shop Assets product editor must close after a successful upload and reveal the posted shop list."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /async function saveShopDetails[\s\S]*?setActiveOwnerLayer\("overview"\);[\s\S]*?Shop details saved\. Shop details control closed\./,
  "Owner Shop Control details must close after a successful save instead of remaining as a permanent form."
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
  /import \{[\s\S]*?peekPublishRecoveryTarget,[\s\S]*?publishRecoveryTarget,[\s\S]*?\} from "\.\/lib\/publishRecovery";[\s\S]*?const LAST_AUTHENTICATED_APP_PATH_KEY = "gmfn_last_authenticated_app_path";[\s\S]*?function RememberAuthenticatedAppRoute\(\)[\s\S]*?rememberAuthenticatedAppPath\(currentRoutePath\(location\)\)[\s\S]*?function PublicEntryGuard\(props: \{ children: React\.ReactNode \}\)[\s\S]*?const isPwaFrontDoor[\s\S]*?location\.pathname === "\/cover"[\s\S]*?location\.pathname === "\/welcome"[\s\S]*?get\("source"\)[\s\S]*?"pwa"[\s\S]*?const token = getAccessToken\(\);[\s\S]*?const publishTarget = token[\s\S]*?\? publishRecoveryTarget\(\)[\s\S]*?: peekPublishRecoveryTarget\(\);[\s\S]*?if \(token && !isPwaFrontDoor\)[\s\S]*?<Navigate[\s\S]*?to=\{publishTarget \|\| lastAuthenticatedAppPath\(\) \|\| APP_ROUTES\.DASHBOARD\}[\s\S]*?if \(publishTarget\)[\s\S]*?next\.set\("next", publishTarget\);[\s\S]*?to=\{`\/login\?\$\{next\.toString\(\)\}`\}[\s\S]*?from: routeStateFromTarget\(publishTarget\)[\s\S]*?<RememberAuthenticatedAppRoute \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<CoverPage \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<WelcomePage \/>/,
  "Authenticated sessions that reach normal Cover/Welcome must recover to the app route, while PWA launches to Cover/Welcome must remain on the public front door until the user chooses to continue."
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
  /<title>GSN<\/title>[\s\S]*?Open a trusted GSN public link[\s\S]*?property="og:image"[\s\S]*?https:\/\/gmfn-frontend\.onrender\.com\/gsn-share-poster\.png[\s\S]*?property="og:image:type" content="image\/png"[\s\S]*?name="twitter:image"[\s\S]*?https:\/\/gmfn-frontend\.onrender\.com\/gsn-share-poster\.png/,
  "The static frontend shell must use a generic frontend-hosted PNG fallback poster, not a shop-specific fallback, so non-shop public routes do not preview as shops."
);

assertContains(
  "server.mjs",
  /function joinInviteMeta\(searchParams, pathname, search\)[\s\S]*?GSN Community Invitation[\s\S]*?invites you to request access[\s\S]*?gsn-community-invitation-poster\.png[\s\S]*?serveJoinInviteHtml[\s\S]*?\/\(\?:start\\\/join\|join\|get-invite\|join\\\/community\)/,
  "The frontend server must serve route-specific WhatsApp/Open Graph metadata for community join invite links, so they do not preview as public shops."
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
  "Outward shop sharing must have a dedicated Shop Diaries helper so visitors land on the 12 public blocks."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopBlockPath[\s\S]*?product_id=\$\{encodeURIComponent\(productId\)\}[\s\S]*?shop-block-\$\{Math\.trunc\(blockNumber\)\}[\s\S]*?product-\$\{productId\}[\s\S]*?PUBLIC_SHOP_DIARIES_ANCHOR[\s\S]*?return `\$\{path\}\$\{productQuery\}#\$\{encodeURIComponent\(anchor\)\}`;/,
  "Product/block shares must preserve product_id and block anchors so shared item links open inside Shop Diaries."
);

assertContains(
  "src/lib/publicLinks.ts",
  /export function publicShopSharePath\(params:[\s\S]*?return publicShopBlockPath\(params\);[\s\S]*?export function publicShopShareUrl\(params:[\s\S]*?return path \? shareablePublicFrontendUrl\(path\) : "";/,
  "Outward public shop sharing must use the frontend public shop route so WhatsApp previews resolve from gmfn-frontend.onrender.com while preserving product and block context."
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
  /const publicShopOwnerId = firstTruthy\([\s\S]*?publicShopRecord\?\.owner_gmfn_id,[\s\S]*?publicShopRecord\?\.gmfn_id,[\s\S]*?currentGmfnId[\s\S]*?\);[\s\S]*?const publicShopViewLink = useMemo\(\(\) => \{[\s\S]*?if \(!publicShopOwnerId \|\| !publicShopRecord\) return "";[\s\S]*?return publicShopDiariesUrl\(publicShopOwnerId\);[\s\S]*?}, \[publicShopOwnerId, publicShopRecord\]\);/,
  "Marketplace public shop copy/open actions must use the backend-confirmed owner ID and send outsiders to Shop Diaries only after an active owner shop exists."
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
  /debugId="marketplace\.public-shop\.visible-link"[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?debugId="marketplace\.public-shop\.open"/,
  "Marketplace public shop link controls must have stable debug ids so phone tap/fallthrough issues can be traced to the exact control."
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

assertContains(
  "src/layout/AppLayout.tsx",
  /return items\.filter\(\(item\) => !item\.disabled \|\| item\.label === "Public Shop"\);/,
  "Mobile bottom domain rail must keep Public Shop visible while the member GSN ID is pending."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /getMarketplaceBroadcasts\(\{\s*active_only:\s*true,\s*limit:\s*24,\s*\}\)[\s\S]*?authorGmfnId && authorGmfnId === cleanedGmfnId\.toUpperCase\(\)/,
  "Public Shop must use the signed-in live broadcast feed as a fallback so Dashboard Spotlight and Public Shop Spotlight do not drift."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const effectiveShopName = firstMeaningful\(\s*shop\?\.shopName,\s*effectiveGmfnId \? `\$\{effectiveGmfnId\} Shop` : "",\s*"Shop"\s*\);[\s\S]*?const effectiveDescription = firstMeaningful\(shop\?\.description\);/,
  "Public Shop signboard name and description must stay shop/member scoped and must not fall back to community Spotlight author content."
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
  /async function copyShopLink\(\)[\s\S]*?if \(!publicShopTo\)[\s\S]*?not connected to an active shop[\s\S]*?const copied = await api\.safeCopy\(publicShopLink\)/,
  "Owner shop control must not copy a public shop link until the active shop link is confirmed."
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
  /buildShopLink\(gmfnId: string\)[\s\S]*?publicShopShareUrl\(\{ gmfnId \}\)[\s\S]*?buildProductDeepLink\([\s\S]*?publicShopShareUrl\(\{ gmfnId, productId, block \}\)[\s\S]*?Public shop poster link copied\.[\s\S]*?Public shop block poster link copied\. It opens this block inside the Shop Diaries\.[\s\S]*?Public shop item poster link copied\. It opens this item inside the Shop Diaries\./,
  "Shop Assets copy actions must copy frontend-domain preview-ready Shop Diaries and exact block/item links with honest feedback."
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
  /scrollGalleryTargetIntoView[\s\S]*?window\.scrollTo[\s\S]*?\[120, 320, 700, 1100\]\.forEach/,
  "Public shop hash landing must perform repeated mobile-safe reveal passes so late layout shifts cannot pull visitors back above Shop Diaries or the selected block."
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
  /const absoluteShopShareLink = useMemo[\s\S]*?publicShopShareUrl\(\{ gmfnId: ownerId \}\)[\s\S]*?async function copyShopLink\(\) \{[\s\S]*?if \(shopLoadFailed\)[\s\S]*?not active yet[\s\S]*?return;[\s\S]*?const copied = await safeCopy\(absoluteShopShareLink\);[\s\S]*?Public shop poster link copied\.[\s\S]*?Clipboard copy was blocked\. Use the visible public shop link instead\./,
  "Public Shop Gallery copy must block failed public-shop links and copy the frontend-domain preview-ready route only after clipboard success."
);

assertContains(
  "server.mjs",
  /const publicFrontendOrigin[\s\S]*?gmfn-frontend\.onrender\.com[\s\S]*?function metaTags\(meta\)[\s\S]*?og:image[\s\S]*?og:url[\s\S]*?twitter:card[\s\S]*?async function serveShopHtml[\s\S]*?async function serveShareCardProxy/,
  "The frontend server must inject route-specific Open Graph tags for public shop routes and proxy the shop preview image through the frontend domain for WhatsApp."
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
  "src/pages/ShopGalleryPage.tsx",
  /createMarketplaceRepost,[\s\S]*?listMyClans,[\s\S]*?async function submitLiveRepost\(\)[\s\S]*?createMarketplaceRepost\(\{[\s\S]*?product_id: Number\(product\.id\),[\s\S]*?target_clan_id: Number\(targetCommunity\.id\),[\s\S]*?marketplace\.product\.reposted|createMarketplaceRepost\(\{[\s\S]*?product_id: Number\(product\.id\),[\s\S]*?target_clan_id: Number\(targetCommunity\.id\),/,
  "Public Shop Gallery GSN repost must call the real backend product repost route with a product and target community, not only copy a text draft."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /repostPanelOpen[\s\S]*?Live GSN repost[\s\S]*?Public block[\s\S]*?Target community[\s\S]*?Repost inside GSN/,
  "Public Shop Gallery must show a live repost panel so users choose a public block and target community before reposting."
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
  /import \{ QRCodeSVG \} from "qrcode\.react";[\s\S]*?const shopVerificationQrTarget = firstMeaningful\([\s\S]*?absoluteShopShareLink,[\s\S]*?absoluteShopLink[\s\S]*?\);[\s\S]*?TrustSlip proof is on request[\s\S]*?<QRCodeSVG[\s\S]*?value=\{shopVerificationQrTarget\}/,
  "Public Shop Verify panel must use the public shop link as its QR target and must not claim TrustSlip proof without a live TrustSlip code."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /debugId="shop-gallery\.verify-shop\.toggle"[\s\S]*?Community ID[\s\S]*?Shop owner ID[\s\S]*?Marketplace[\s\S]*?Shop name|Shop owner ID[\s\S]*?Marketplace[\s\S]*?Community ID[\s\S]*?Shop name[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle"/,
  "Public Shop Verify panel must expose shop-owned identity and community context on demand, not as a crowded always-on signboard dump."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /import OwnerOnlySurfaceNav from "\.\.\/components\/OwnerOnlySurfaceNav";[\s\S]*?import \{ APP_ROUTES, routeWithCommunity \} from "\.\.\/lib\/appRoutes";[\s\S]*?const ownerSurfaceLinks = useMemo\([\s\S]*?label: "Dashboard"[\s\S]*?APP_ROUTES\.DASHBOARD[\s\S]*?label: "Community Home"[\s\S]*?routeWithCommunity\(APP_ROUTES\.COMMUNITY, ownerSurfaceCommunityId\)[\s\S]*?label: "Marketplace"[\s\S]*?routeWithCommunity\(APP_ROUTES\.MARKETPLACE, ownerSurfaceCommunityId\)[\s\S]*?<OwnerOnlySurfaceNav[\s\S]*?ownerGmfnId=\{shopOwnerGmfnId\}[\s\S]*?label="Owner navigation"[\s\S]*?links=\{ownerSurfaceLinks\}/,
  "Public Shop owner navigation must route the signed-in shop owner to Dashboard, Community Home, and Marketplace through the owner-only surface gate."
);

assertContains(
  "src/components/OwnerOnlySurfaceNav.tsx",
  /getAccessToken\(\)[\s\S]*?signedInGmfnId[\s\S]*?ownerGmfnId[\s\S]*?ownerSurfaceIdentityMatches\(signedInGmfnId, ownerGmfnId\)[\s\S]*?if \(!shouldShowOwnerNav\) return null;/,
  "Owner-only surface navigation must remain hidden from public visitors and signed-in non-owners."
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
