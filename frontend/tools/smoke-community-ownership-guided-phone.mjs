/* global console, process, URL, localStorage */

import { chromium } from "playwright";
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function installApiMocks(page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") {
      return route.fulfill(json({
        id: 1,
        user_id: 1,
        display_name: "GSN Operator",
        gmfn_id: "GMFN-U-ADMIN001",
        role: "admin",
      }));
    }

    if (path === "/clans/me") {
      return route.fulfill(json({
        items: [{ id: 8, clan_id: 8, name: "Pilot Community", status: "active", role: "admin" }],
      }));
    }

    if (path.startsWith("/admin/community-ownership/lookup")) {
      return route.fulfill(json({ communities: [], owners: [], owner_intakes: [] }));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });
}

async function visibleWorkKeys(page) {
  return page.locator('[data-gsn-community-ownership-work]:visible').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-gsn-community-ownership-work"))
  );
}

async function expectWork(page, expected) {
  const visible = await visibleWorkKeys(page);
  assert(
    visible.length === 1 && visible[0] === expected,
    `Expected only ${expected} to be visible; received ${visible.join(", ") || "none"}.`
  );
}

async function run() {
  let server;
  let browser;

  try {
    server = await createServer({
      root: frontendRoot,
      configFile: join(frontendRoot, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 0, strictPort: false },
      logLevel: "silent",
    });
    await server.listen();
    const port = server.httpServer.address().port;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-ownership-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
    });

    await page.goto(`http://127.0.0.1:${port}/app/command-center/community-ownership`, {
      waitUntil: "networkidle",
    });
    await page.locator('[data-gsn-community-ownership-summary="true"]').waitFor();
    await page.locator('[data-gsn-community-ownership-lane-chooser="true"]').waitFor();

    await expectWork(page, "community-owner");

    await page.getByRole("button", { name: "Steward setup", exact: true }).click();
    await expectWork(page, "steward");

    await page.getByRole("button", { name: "Pilot cleanup", exact: true }).click();
    await expectWork(page, "cleanup");

    await page.getByRole("button", { name: "Lifecycle close", exact: true }).click();
    await expectWork(page, "community-lifecycle");
    await page.getByRole("button", { name: "Community Domain", exact: true }).click();
    await expectWork(page, "domain-lifecycle");

    await page.getByRole("button", { name: "Owner repair", exact: true }).click();
    await expectWork(page, "community-owner");
    await page.getByRole("button", { name: "Community Domain", exact: true }).click();
    await expectWork(page, "domain-owner");

    const mainOverflow = await page.locator('[data-gsn-community-ownership-summary="true"]').evaluate((node) => {
      const root = node.closest("div[style*='min-height']") || document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    assert(!mainOverflow, "Community Ownership overflows horizontally at 390x844.");

    console.log("Community Ownership guided phone smoke passed: four case lanes, scoped community/domain work, one visible task, and no horizontal overflow.");
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
