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

async function installApiMocks(page, { needsEntryHelp = true } = {}) {
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
        items: [{
          id: 8,
          clan_id: 8,
          name: "Pilot Community",
          community_code: "GMFN-C-000008",
          status: "active",
          role: "admin",
        }],
      }));
    }

    if (path === "/admin/pilot-intake") {
      return route.fulfill(json({
        generated_at: "2026-10-26T17:30:00Z",
        summary: {
          create_total: needsEntryHelp ? 2 : 0,
          join_total: 0,
          needs_attention: needsEntryHelp ? 2 : 0,
          create_by_stage: needsEntryHelp ? { expired: 2 } : {},
          join_by_stage: {},
        },
        create_entries: [],
        join_requests: [],
        early_activation_funnel: { stages: [] },
      }));
    }

    if (path === "/system/diagnostics") {
      return route.fulfill(json({ ok: true }));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });
}

async function createPhonePage(browser, { needsEntryHelp, token }) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await installApiMocks(page, { needsEntryHelp });
  await page.addInitScript(({ accessToken }) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.removeItem("gmfn.systemOperations.sections.v3");
  }, { accessToken: token });
  return page;
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
    const routeUrl = "http://127.0.0.1:" + port + "/app/command-center/system-operations";

    browser = await chromium.launch({ headless: true });
    const page = await createPhonePage(browser, {
      needsEntryHelp: true,
      token: "local-system-operations-entry-token",
    });
    await page.goto(routeUrl, { waitUntil: "networkidle" });

    const summary = page.locator('[data-gsn-system-operations-summary="true"]');
    const overview = page.locator('[data-gsn-system-operations-overview="true"]');
    const intake = page.locator('[data-gsn-system-operations-intake="true"]');
    const signals = page.locator('[data-gsn-system-operations-signals="true"]');
    await summary.waitFor();

    await summary.getByText("Entry support needs attention.", { exact: true }).waitFor();
    assert(
      await page.getByRole("button", { name: "Review entry support", exact: true }).count() === 1,
      "Entry-pressure state must show one Review entry support action."
    );
    assert(
      !(await summary.getByText("GSN Operator", { exact: true }).count()),
      "System Operations must not expose the operator name in its first summary."
    );
    assert(
      await overview.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Operational overview must start closed."
    );
    assert(
      await intake.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Entry support must start closed."
    );
    assert(
      await signals.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Live signals must start closed."
    );
    assert(
      await page.getByRole("link", { name: "Bank Console", exact: true }).count() === 0,
      "Next-page actions must not be exposed before their disclosure opens."
    );

    await page.getByRole("button", { name: "Review entry support", exact: true }).click();
    await intake.getByRole("button", { name: "Hide", exact: true }).waitFor();
    await intake.getByText("First support action", { exact: true }).waitFor();
    assert(
      await overview.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Reviewing entry support must not open the overview."
    );

    const hasHorizontalOverflow = await summary.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    assert(!hasHorizontalOverflow, "System Operations overflows horizontally at 390x844.");
    await page.close();

    const calmPage = await createPhonePage(browser, {
      needsEntryHelp: false,
      token: "local-system-operations-calm-token",
    });
    await calmPage.goto(routeUrl, { waitUntil: "networkidle" });

    await calmPage.getByText("No immediate queue is visible.", { exact: true }).waitFor();
    assert(
      await calmPage.getByRole("button", { name: "Review queue totals", exact: true }).count() === 1,
      "Calm System Operations must show one Review queue totals action."
    );
    const calmOverview = calmPage.locator('[data-gsn-system-operations-overview="true"]');
    await calmPage.getByRole("button", { name: "Review queue totals", exact: true }).click();
    await calmOverview.getByRole("button", { name: "Hide", exact: true }).waitFor();
    await calmOverview.getByText("Pending pool", { exact: true }).waitFor();

    console.log(
      "System Operations guided phone smoke passed: entry-pressure reveal, calm-state totals fallback, closed secondary sections, hidden deeper pages, and no horizontal overflow."
    );
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
