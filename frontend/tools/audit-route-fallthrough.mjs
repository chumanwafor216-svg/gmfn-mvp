/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function lineFind(file, pattern, message) {
  const text = read(file);
  const lines = text.split(/\r?\n/);
  const found = lines.some((line) => pattern.test(line));

  if (!found) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected line pattern was not found.",
    });
  }
}

function lineForbid(file, pattern, message) {
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

function wholeFileFind(file, pattern, message) {
  const text = read(file);

  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected file pattern was not found.",
    });
  }
}

lineFind(
  "src/App.tsx",
  /const ROOT_APP_ROUTE_ALIASES: Record<string, string> = \{/,
  "App must keep a root-level owner-commerce alias map before the catch-all route."
);

[
  ["app/free-spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["free-spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["app/spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["app/shop-control/spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["shop-control/spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["app/shop-control/free-spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["shop-control/free-spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["app/paid-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["paid-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["app/subscription-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["subscription-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["app/shop-control/paid-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["shop-control/paid-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["app/shop-control/subscription-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["shop-control/subscription-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["app/shop-control", "APP_ROUTES.SHOP_ME"],
  ["shop-control", "APP_ROUTES.SHOP_ME"],
  ["app/shop-manager", "APP_ROUTES.SHOP_ME"],
  ["shop-manager", "APP_ROUTES.SHOP_ME"],
  ["app/shop-assets", "APP_ROUTES.SHOP_ASSETS"],
  ["shop-assets", "APP_ROUTES.SHOP_ASSETS"],
  ["app/shop-gallery-control", "\"/app/shop-control#shop-control-gallery-tools\""],
  ["shop-gallery-control", "\"/app/shop-control#shop-control-gallery-tools\""],
  ["app/vault-control", "APP_ROUTES.VAULT_CONTROL"],
  ["vault-control", "APP_ROUTES.VAULT_CONTROL"],
].forEach(([alias, target]) => {
  lineFind(
    "src/App.tsx",
    new RegExp(`^\\s*"?${alias}"?:\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},?\\s*$`),
    `Root app alias ${alias} must canonicalize before the public entry fallback.`
  );
});

wholeFileFind(
  "src/App.tsx",
  /function rootAppAliasTarget\(pathname: string, search: string, hash: string\): string \{[\s\S]*?ROOT_APP_ROUTE_ALIASES\[alias\][\s\S]*?mergeTargetWithCurrent\(target, search, hash\)/,
  "Root app alias canonicalization must preserve search/hash while sending known owner-commerce slugs into /app."
);

wholeFileFind(
  "src/App.tsx",
  /function authenticatedFallbackTarget\(pathname: string, search: string, hash: string\): string \{[\s\S]*?alias\.startsWith\("app\/"\)[\s\S]*?alias\.includes\("shop-control"\) \|\| alias\.includes\("spotlight"\)[\s\S]*?APP_ROUTES\.SUBSCRIPTION_SPOTLIGHT[\s\S]*?APP_ROUTES\.FREE_SPOTLIGHT[\s\S]*?APP_ROUTES\.SHOP_ME[\s\S]*?APP_ROUTES\.DASHBOARD/,
  "Unknown authenticated /app owner-commerce or publish routes must stay inside /app instead of falling into Cover/Welcome."
);

wholeFileFind(
  "src/App.tsx",
  /import \{[\s\S]*?peekPublishRecoveryTarget,[\s\S]*?publishRecoveryTarget,[\s\S]*?\} from "\.\/lib\/publishRecovery";[\s\S]*?const LAST_AUTHENTICATED_APP_PATH_KEY = "gmfn_last_authenticated_app_path";[\s\S]*?function RememberAuthenticatedAppRoute\(\)[\s\S]*?rememberAuthenticatedAppPath\(currentRoutePath\(location\)\)[\s\S]*?function PublicEntryGuard\(props: \{ children: React\.ReactNode \}\)[\s\S]*?const token = getAccessToken\(\);[\s\S]*?const publishTarget = token[\s\S]*?\? publishRecoveryTarget\(\)[\s\S]*?: peekPublishRecoveryTarget\(\);[\s\S]*?if \(token(?: && !isPwaFrontDoor)?\)[\s\S]*?<Navigate[\s\S]*?to=\{publishTarget \|\| lastAuthenticatedAppPath\(\) \|\| APP_ROUTES\.DASHBOARD\}[\s\S]*?if \(publishTarget\)[\s\S]*?next\.set\("next", publishTarget\);[\s\S]*?to=\{`\/login\?\$\{next\.toString\(\)\}`\}[\s\S]*?from: routeStateFromTarget\(publishTarget\)[\s\S]*?<RememberAuthenticatedAppRoute \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<CoverPage \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<WelcomePage \/>/,
  "Authenticated sessions or active publish attempts that reach Cover/Welcome must recover to the publisher/app route, and unauthenticated publish attempts must keep that target through login."
);

wholeFileFind(
  "src/lib/publishRecovery.ts",
  /const PUBLISH_RECOVERY_TTL_MS = 30 \* 60 \* 1000;[\s\S]*?const PUBLISH_RECOVERY_WINDOW_NAME_PREFIX = "gmfn_publish_recovery:";[\s\S]*?function storageAreas\(\): Storage\[\][\s\S]*?window\.sessionStorage[\s\S]*?window\.localStorage[\s\S]*?export function rememberPublishRecovery[\s\S]*?for \(const storage of storageAreas\(\)\)[\s\S]*?window\.name = `\$\{PUBLISH_RECOVERY_WINDOW_NAME_PREFIX\}\$\{payload\}`;[\s\S]*?export function peekPublishRecoveryTarget\(\)[\s\S]*?readPublishRecoveryTarget\(false\)[\s\S]*?readWindowNameMarker\(\)/,
  "Publish recovery must survive phone reloads by using a 30-minute marker, session/local storage, a window.name fallback, and a non-consuming peek."
);

wholeFileFind(
  "src/pages/LoginPage.tsx",
  /import \{[\s\S]*?peekPublishRecoveryTarget,[\s\S]*?publishRecoveryTarget,[\s\S]*?\} from "\.\.\/lib\/publishRecovery";[\s\S]*?function safeAppReturnTarget\(value: unknown\): string \{[\s\S]*?target === "\/app" \|\| target\.startsWith\("\/app\/"\)[\s\S]*?const publishTarget = peekPublishRecoveryTarget\(\);[\s\S]*?if \(publishTarget\) return publishTarget;[\s\S]*?const nextTarget = safeAppReturnTarget\(searchParams\.get\("next"\)\);[\s\S]*?nav\(publishRecoveryTarget\(\) \|\| redirectTarget, \{ replace: true \}\)/,
  "Login must accept only safe /app publish return targets and consume publish recovery after successful sign-in."
);

wholeFileFind(
  "src/lib/nav.ts",
  /import \{ rememberPublishRecovery \} from "\.\/publishRecovery";[\s\S]*?function isAppRouteTarget\(target: string\): boolean[\s\S]*?lower === "\/app" \|\| lower\.startsWith\("\/app\/"\)[\s\S]*?export function rememberAppRouteRecovery[\s\S]*?rememberPublishRecovery\(target, ctaId\);[\s\S]*?export function navigateWithOrigin[\s\S]*?rememberAppRouteRecovery\(to, "navigate\.app\.route"\);/,
  "Shared navigation must mark all /app routes before navigating so phone reloads cannot strand the user in Cover/Welcome."
);

wholeFileFind(
  "src/layout/AppLayout.tsx",
  /import \{ routeWithCommunity \} from "\.\.\/lib\/appRoutes";[\s\S]*?import \{ communityIdFromSearch \} from "\.\.\/lib\/communityRouteContext";[\s\S]*?function contextualizeAppNavTarget\(to: string, communityId: number\): string \{[\s\S]*?routeWithCommunity\(to, communityId\)[\s\S]*?const activeCommunityId = useMemo\([\s\S]*?communityIdFromSearch\(location\.search\)[\s\S]*?to=\{contextualizeAppNavTarget\(/,
  "App shell navigation must carry the active community query into community-scoped routes instead of rendering raw app links."
);

lineForbid(
  "src/layout/AppLayout.tsx",
  /to=\{item\.to\}/,
  "App shell links must use contextualizeAppNavTarget(item.to, activeCommunityId), not raw item.to."
);

wholeFileFind(
  "src/components/OriginLink.tsx",
  /import \{ rememberAppRouteRecovery \} from "\.\.\/lib\/nav";[\s\S]*?const linkDebugId[\s\S]*?origin-link\.app\.route[\s\S]*?onClick=\{\(event\) => \{[\s\S]*?guardLinkTap\(event, rest\.onClick\);[\s\S]*?if \(!event\.defaultPrevented\) \{[\s\S]*?rememberAppRouteRecovery\(nextTo, linkDebugId\);/,
  "Shared internal links must mark /app routes after blocked/default-prevented taps have been ruled out."
);

wholeFileFind(
  "src/components/RequireAuth.tsx",
  /import \{ peekPublishRecoveryTarget \} from "\.\.\/lib\/publishRecovery";[\s\S]*?function loginRecoveryTarget[\s\S]*?const publishTarget = peekPublishRecoveryTarget\(\);[\s\S]*?next\.set\("next", publishTarget\);[\s\S]*?from: routeStateFromTarget\(publishTarget\)[\s\S]*?<Navigate to=\{target\.to\} replace state=\{target\.state\} \/>/,
  "RequireAuth must preserve pending Spotlight publish recovery through session expiry instead of sending the user to a bare login/cover path."
);

wholeFileFind(
  "src/App.tsx",
  /function RedirectUnknownRoute\(\)[\s\S]*?rootAppAliasTarget\([\s\S]*?location\.pathname,[\s\S]*?location\.search,[\s\S]*?location\.hash[\s\S]*?authenticatedFallbackTarget\([\s\S]*?location\.pathname,[\s\S]*?location\.search,[\s\S]*?location\.hash[\s\S]*?<Navigate to=\{appAliasTarget \|\| appFallbackTarget \|\| "\/cover"\} replace \/>/,
  "The catch-all route must check root app aliases and authenticated app fallback before falling back to Cover."
);

lineFind(
  "src/App.tsx",
  /<Route path="\*" element=\{<RedirectUnknownRoute \/>\} \/>/,
  "The wildcard route must use RedirectUnknownRoute, not a direct Cover redirect."
);

[
  "community-home",
  "money",
  "market",
  "marketplace/demand-box",
  "shop",
  "my-shop",
  "shop/me",
  "open-shop/me",
  "shop-gallery/me",
  "trust-passport",
  "trustslip",
  "guide",
].forEach((path) => {
  lineForbid(
    "src/App.tsx",
    new RegExp(`path="${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+element=\\{<Navigate`),
    `Authenticated alias /app/${path} must use PreserveRedirect so query/hash context is not lost.`
  );
});

[
  ["/trust-slip/verify", "APP_ROUTES.MERCHANT_VERIFY"],
  ["/trustslip/verify", "APP_ROUTES.MERCHANT_VERIFY"],
].forEach(([path, target]) => {
  wholeFileFind(
    "src/App.tsx",
    new RegExp(
      `path="${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?<PreserveRedirect to=\\{${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}`
    ),
    `Root TrustSlip verify alias ${path} must canonicalize before the public Cover fallback.`
  );
});

[
  "/trust-slips/verify/:code",
  "/trust-slips/verify/:code/page",
  "/trust-slips/verify/:code/lite",
  "/trust-slips/verify/:code/print",
].forEach((path) => {
  lineFind(
    "src/App.tsx",
    new RegExp(
      `<Route path="${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" element=\\{<TrustSlipVerifyPage \\/>\\} \\/>`
    ),
    `Frontend must catch backend-shaped TrustSlip verify path ${path} before the public Cover fallback.`
  );
});

[
  ["spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["shop-spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["shop-control/spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["shop-control/free-spotlight", "APP_ROUTES.FREE_SPOTLIGHT"],
  ["subscription-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
  ["shop-control/paid-spotlight", "APP_ROUTES.SUBSCRIPTION_SPOTLIGHT"],
].forEach(([path, target]) => {
  wholeFileFind(
    "src/App.tsx",
    new RegExp(
      `path="${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?<PreserveRedirect to=\\{${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}`
    ),
    `/app/${path} must be an explicit nested route alias before any public fallback can see it.`
  );
});

lineForbid(
  "src/App.tsx",
  /<Route path="\*" element=\{<Navigate to="\/cover" replace \/>\} \/>/,
  "The wildcard route must not directly dump unknown paths into the Cover/Welcome funnel."
);

if (findings.length > 0) {
  console.error("Route fallthrough audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Route fallthrough audit passed.");
