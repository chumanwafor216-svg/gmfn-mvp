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
  /import \{ publishRecoveryTarget \} from "\.\/lib\/publishRecovery";[\s\S]*?const LAST_AUTHENTICATED_APP_PATH_KEY = "gmfn_last_authenticated_app_path";[\s\S]*?function RememberAuthenticatedAppRoute\(\)[\s\S]*?rememberAuthenticatedAppPath\(currentRoutePath\(location\)\)[\s\S]*?function PublicEntryGuard\(props: \{ children: React\.ReactNode \}\)[\s\S]*?const publishTarget = publishRecoveryTarget\(\);[\s\S]*?if \(publishTarget \|\| token\)[\s\S]*?<Navigate[\s\S]*?to=\{publishTarget \|\| lastAuthenticatedAppPath\(\) \|\| APP_ROUTES\.DASHBOARD\}[\s\S]*?<RememberAuthenticatedAppRoute \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<CoverPage \/>[\s\S]*?<PublicEntryGuard>[\s\S]*?<WelcomePage \/>/,
  "Authenticated sessions or active publish attempts that reach Cover/Welcome must recover to the publisher/app route instead of staying in the public entry funnel."
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
