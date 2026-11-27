/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function readRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function requireMatch(name, source, pattern, message) {
  if (!pattern.test(source)) {
    console.error(`[pwa-boot-recovery] ${name}: ${message}`);
    process.exitCode = 1;
  }
}

function forbidMatch(name, source, pattern, message) {
  if (pattern.test(source)) {
    console.error(`[pwa-boot-recovery] ${name}: ${message}`);
    process.exitCode = 1;
  }
}

const indexHtml = read("index.html");
const serviceWorker = read("public/sw.js");
const installSupport = read("src/lib/pwaInstall.ts");
const server = read("server.mjs");
const renderDeployWorkflow = readRepo(".github/workflows/render-deploy.yml");

requireMatch(
  "index.html",
  indexHtml,
  /gsn_pwa_boot_recovery_attempt_v1[\s\S]*?MutationObserver[\s\S]*?setTimeout\(fail, 15000\)/,
  "the pre-React boot timeout and one-attempt guard must remain present."
);
requireMatch(
  "index.html",
  indexHtml,
  /Refresh GSN[\s\S]*?standalone && !attempted\) recover\(\);/,
  "standalone startup must retry once before offering a direct manual refresh."
);
requireMatch(
  "index.html",
  indexHtml,
  /gsn-pwa-shell-[\s\S]*?caches\.delete[\s\S]*?getRegistrations[\s\S]*?GSN_SKIP_WAITING/,
  "recovery must clear only GSN shell caches and request a service-worker update."
);
requireMatch(
  "index.html",
  indexHtml,
  /could not start[\s\S]*?may be out of date[\s\S]*?saved GSN records will not be deleted[\s\S]*?remove that old icon/,
  "the recovery card must explain the problem, the first action, and the old-icon fallback."
);
forbidMatch(
  "index.html",
  indexHtml,
  /localStorage\.(?:clear|removeItem)|serviceWorker\.getRegistrations\(\)[\s\S]*?\.unregister\(/,
  "startup recovery must not clear user storage or unregister notification infrastructure."
);
requireMatch(
  "public/sw.js",
  serviceWorker,
  /gsn-pwa-shell-v21[\s\S]*?request\.mode === "navigate"[\s\S]*?response\.ok[\s\S]*?cache\.put\("\/cover", copy\)/,
  "v21 must retain the latest successful navigation as the offline shell."
);
requireMatch(
  "src/lib/pwaInstall.ts",
  installSupport,
  /\.register\("\/sw\.js", \{ updateViaCache: "none" \}\)/,
  "service-worker update checks must bypass the browser HTTP cache."
);
requireMatch(
  "src/lib/pwaInstall.ts",
  installSupport,
  /new DOMParser\(\)\.parseFromString\(html, "text\/html"\)[\s\S]*?querySelectorAll<HTMLScriptElement>\("script\[src\]"\)[\s\S]*?querySelectorAll<HTMLLinkElement>\('link\[rel="stylesheet"\]\[href\]'\)/,
  "current and deployed shell signatures must use the same entry-script and stylesheet selectors."
);
forbidMatch(
  "src/lib/pwaInstall.ts",
  installSupport,
  /if \(!isGsnStandaloneDisplay\(\)\) return;/,
  "ordinary browser tabs must not be excluded from deployed-shell freshness checks."
);
requireMatch(
  "server.mjs",
  server,
  /urlPathname === "\/index\.html"[\s\S]*?urlPathname === "\/sw\.js"[\s\S]*?"no-store, max-age=0"[\s\S]*?"CDN-Cache-Control": cacheControl[\s\S]*?createReadStream\(indexPath\)[\s\S]*?"Cache-Control": "no-store, max-age=0"[\s\S]*?"CDN-Cache-Control": "no-store"/,
  "the Node-hosted HTML fallback and service-worker metadata must explicitly bypass browser and Render CDN caches."
);
requireMatch(
  ".github/workflows/render-deploy.yml",
  renderDeployWorkflow,
  /Enforce frontend static shell cache policy[\s\S]*?\/headers\?limit=100[\s\S]*?name\.toLowerCase\(\) !== "cache-control"[\s\S]*?path: "\/\*"[\s\S]*?value: "no-store, max-age=0"[\s\S]*?-X PUT[\s\S]*?Verify frontend shell cache policy[\s\S]*?cache-control:\.\*no-store/,
  "the active Render static site must receive and live-verify a no-store shell policy on every deploy."
);

requireMatch(
  ".github/workflows/render-deploy.yml",
  renderDeployWorkflow,
  /Trigger frontend deploy hook fallback[\s\S]*?if: \$\{\{ env\.RENDER_FRONTEND_DEPLOY_HOOK_URL != '' && \(env\.RENDER_API_KEY == '' \|\| env\.RENDER_FRONTEND_SERVICE_ID == ''\) \}\}[\s\S]*?Reuse or trigger exact frontend deploy through Render API/,
  "the deploy hook must remain a fallback and must not run alongside the exact Render API deployment path."
);
requireMatch(
  ".github/workflows/render-deploy.yml",
  renderDeployWorkflow,
  /reusableStatuses = new Set\(\["created", "queued", "build_in_progress", "pre_deploy_in_progress", "update_in_progress", "live"\]\)[\s\S]*?deploy\.commit\?\.id === process\.env\.GITHUB_SHA[\s\S]*?Reusing existing gmfn-frontend Render deploy/,
  "repeat workflow dispatches must reuse an active or live exact-commit frontend deploy instead of spending another build."
);
requireMatch(
  ".github/workflows/render-deploy.yml",
  renderDeployWorkflow,
  /^on:\r?\n\s+workflow_dispatch:/m,
  "the active pilot deploy workflow must remain manual-only."
);
forbidMatch(
  ".github/workflows/render-deploy.yml",
  renderDeployWorkflow,
  /^\s+push:\s*$/m,
  "the active pilot deploy workflow must not regain automatic push deployment."
);
if (!process.exitCode) {
  console.log("PWA boot recovery audit passed.");
}
