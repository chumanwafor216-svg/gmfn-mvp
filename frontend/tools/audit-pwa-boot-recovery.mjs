/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
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
  /gsn-pwa-shell-v20[\s\S]*?request\.mode === "navigate"[\s\S]*?response\.ok[\s\S]*?cache\.put\("\/cover", copy\)/,
  "v20 must retain the latest successful navigation as the offline shell."
);
requireMatch(
  "src/lib/pwaInstall.ts",
  installSupport,
  /\.register\("\/sw\.js", \{ updateViaCache: "none" \}\)/,
  "service-worker update checks must bypass the browser HTTP cache."
);

if (!process.exitCode) {
  console.log("PWA boot recovery audit passed.");
}
