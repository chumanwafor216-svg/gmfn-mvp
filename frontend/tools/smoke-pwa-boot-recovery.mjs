/* global console, process */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { preview } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(join(frontendRoot, "dist", "index.html"))) {
  throw new Error("Build frontend/dist before running the PWA boot recovery smoke test.");
}

const server = await preview({
  root: frontendRoot,
  preview: { host: "127.0.0.1", port: 0, strictPort: false },
});
const address = server.httpServer.address();
const port = typeof address === "object" && address ? address.port : 4173;
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

try {
  const normalPage = await browser.newPage();
  await normalPage.goto(`${baseUrl}/cover`, { waitUntil: "networkidle" });
  await normalPage.locator("#root > *").first().waitFor();
  if (await normalPage.locator("#gsn-boot-recovery").count()) {
    throw new Error("Recovery card appeared during a healthy app boot.");
  }  await normalPage.waitForTimeout(300);
  const currentShellReload = await normalPage.evaluate(() =>
    window.sessionStorage.getItem("gsn.pwa.shellReloadSignature")
  );
  if (currentShellReload) {
    throw new Error("Current shell triggered a false freshness reload.");
  }
  await normalPage.route("**/?gsn_shell_check=*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<script type="module" src="/assets/fresh-shell-test.js"></script>',
    })
  );
  const normalTabReload = normalPage.waitForEvent("framenavigated", {
    predicate: (frame) => frame === normalPage.mainFrame(),
    timeout: 10000,
  });
  await normalPage.evaluate(() => window.dispatchEvent(new Event("focus")));
  await normalTabReload;
  const refreshedSignature = await normalPage.evaluate(() =>
    window.sessionStorage.getItem("gsn.pwa.shellReloadSignature")
  );
  if (!refreshedSignature?.includes("fresh-shell-test.js")) {
    throw new Error("Ordinary browser tab did not reload for a newer deployed shell.");
  }
  await normalPage.close();

  const brokenPage = await browser.newPage();
  await brokenPage.addInitScript(() => {
    window.localStorage.setItem("gsn_boot_recovery_keep", "preserved");
    const browserMatchMedia = window.matchMedia.bind(window);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value(query) {
        if (query === "(display-mode: standalone)") {
          return {
            matches: true,
            media: query,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() { return true; },
          };
        }
        return browserMatchMedia(query);
      },
    });
  });
  await brokenPage.route("**/assets/*.js", (route) => route.abort("failed"));
  await brokenPage.goto(`${baseUrl}/cover`, { waitUntil: "domcontentloaded" });
  await brokenPage.waitForURL(/gsn_recovery=/);
  await brokenPage.getByRole("heading", { name: "GSN could not start" }).waitFor();
  const firstRecoveryUrl = brokenPage.url();
  await brokenPage.getByRole("button", { name: "Refresh GSN" }).click();
  await brokenPage.waitForURL((url) =>
    url.href.includes("gsn_recovery=") && url.href !== firstRecoveryUrl
  );
  await brokenPage.getByRole("heading", { name: "GSN could not start" }).waitFor();
  const retained = await brokenPage.evaluate(() =>
    window.localStorage.getItem("gsn_boot_recovery_keep")
  );
  if (retained !== "preserved") {
    throw new Error("Manual startup recovery cleared local user storage.");
  }
  console.log("PWA boot recovery smoke test passed.");
} finally {
  await browser.close();
  await server.close();
}
