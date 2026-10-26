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

async function installApiMocks(page, { withPressure = true } = {}) {
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

    if (path === "/exposure/admin") {
      return route.fulfill(json(withPressure
        ? {
            items: [
              { user_id: 9, email: "member@example.test", role: "member", pool: 1000, exposure: 900, available: 100 },
            ],
            totals: { pool: 1000, exposure: 900, available: 100 },
          }
        : { items: [], totals: { pool: 0, exposure: 0, available: 0 } }));
    }

    if (path === "/admin/loans/incomplete") {
      return route.fulfill(json(withPressure ? {
        items: [{
          id: 42,
          loan_id: 42,
          approved_count: 1,
          required_count: 2,
          required_gap: 1,
          auto_cancel_remaining_seconds: 30,
        }],
      } : { items: [] }));
    }

    if (path === "/admin/pool/pending") {
      return route.fulfill(json(withPressure ? {
        items: [{ id: 5, event_type: "support_pool", amount: "500", currency: "NGN", reference: "POOL-5" }],
      } : { items: [] }));
    }

    if (path === "/bank/unmatched") {
      return route.fulfill(json(withPressure ? {
        items: [{ id: 7, reference: "BANK-7", amount: "750", currency: "NGN", status: "unmatched" }],
      } : { items: [] }));
    }

    if (path === "/marketplace/requests") {
      return route.fulfill(json(withPressure ? [
        {
          id: 11,
          title: "Food supply request",
          status: "open",
          requester_name: "Member",
          created_at: "2026-10-10T08:00:00Z",
        },
      ] : []));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });
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
      localStorage.setItem("access_token", "local-exposure-admin-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.removeItem("gmfn.exposureAdmin.sections.v3");
    });

    await page.goto(`http://127.0.0.1:${port}/app/command-center/exposure`, {
      waitUntil: "networkidle",
    });

    const summary = page.locator('[data-gsn-exposure-summary="true"]');
    const priority = page.locator('[data-gsn-exposure-priority="true"]');
    await summary.waitFor();
    await priority.waitFor();

    await page.getByText("Exposure pressure is high.", { exact: true }).waitFor();
    assert(
      await page.getByRole("button", { name: "Review action queue", exact: true }).count() === 1,
      "Exposure Review must show one Review action queue action."
    );
    assert(
      !(await summary.getByText("GSN Operator", { exact: true }).count()),
      "Exposure Review must not expose the operator name in its first summary."
    );
    const pressureSection = page.locator('[data-gsn-exposure-pressure="true"]');
    const queueSection = page.locator('[data-gsn-exposure-queue="true"]');
    const routesSection = page.locator('[data-gsn-exposure-next-pages="true"]');
    assert(
      await pressureSection.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Pressure details must start closed."
    );
    assert(
      await queueSection.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Visible queues must start closed."
    );
    assert(
      await routesSection.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Next pages must start closed."
    );

    await page.getByRole("button", { name: "Review action queue", exact: true }).click();
    await queueSection.getByRole("button", { name: "Hide", exact: true }).waitFor();
    await queueSection.getByText("Unmatched bank event", { exact: true }).waitFor();
    assert(
      await routesSection.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Reviewing the action queue must not open next pages."
    );

    const mainOverflow = await summary.evaluate((node) => {
      const root = node.closest("div[style*='min-height']") || document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    assert(!mainOverflow, "Exposure Review overflows horizontally at 390x844.");
    await page.close();

    const calmPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await installApiMocks(calmPage, { withPressure: false });
    await calmPage.addInitScript(() => {
      localStorage.setItem("access_token", "local-exposure-admin-calm-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.removeItem("gmfn.exposureAdmin.sections.v3");
    });
    await calmPage.goto(`http://127.0.0.1:${port}/app/command-center/exposure`, {
      waitUntil: "networkidle",
    });
    await calmPage.getByText("Exposure pressure is currently light.", { exact: true }).waitFor();
    const calmPressureSection = calmPage.locator('[data-gsn-exposure-pressure="true"]');
    assert(
      await calmPage.getByRole("button", { name: "Review pressure details", exact: true }).count() === 1,
      "A calm Exposure Review must offer one Review pressure details action."
    );
    await calmPage.getByRole("button", { name: "Review pressure details", exact: true }).click();
    await calmPressureSection.getByRole("button", { name: "Hide", exact: true }).waitFor();

    console.log(
      "Exposure Review guided phone smoke passed: high-pressure queue reveal, calm-state pressure fallback, closed secondary sections, and no horizontal overflow."
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
