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

    if (path === "/revenue-allocation/loan/42") {
      return route.fulfill(json({
        loan_id: 42,
        clan_id: 8,
        currency: "NGN",
        amount: "1000",
        service_fee: "100",
        platform_revenue: "50",
        guarantor_pool: "50",
        net_disbursed_amount: "900",
        personal_pool_at_request: "200",
        pool_used: "150",
        guarantee_gap: "50",
        paid_total: "400",
        remaining_amount: "600",
        status: "recorded",
        created_at: "2026-10-26T08:00:00Z",
      }));
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
      localStorage.setItem("access_token", "local-revenue-allocation-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
    });

    await page.goto(`http://127.0.0.1:${port}/app/command-center/revenue-allocation`, {
      waitUntil: "networkidle",
    });

    const summary = page.locator('[data-gsn-revenue-allocation-summary="true"]');
    const action = page.locator('[data-gsn-revenue-allocation-action="true"]');
    await summary.waitFor();
    await action.waitFor();

    assert(
      await page.getByRole("button", { name: "Load allocation", exact: true }).count() === 1,
      "Revenue Allocation must show one Load allocation action."
    );
    assert(
      await page.getByRole("button", { name: "Copy summary", exact: true }).count() === 1,
      "Revenue Allocation must show one Copy summary action."
    );
    assert(
      await page.getByRole("button", { name: "Copy summary", exact: true }).isDisabled(),
      "Copy summary must stay disabled before a record loads."
    );
    assert(
      !(await summary.getByText("GSN ID", { exact: true }).count()),
      "The first summary must not expose the operator GSN ID."
    );

    await page.getByPlaceholder("Enter support ID").fill("42");
    await page.getByRole("button", { name: "Load allocation", exact: true }).click();

    await page.getByText("Allocation ready for review", { exact: true }).waitFor();
    await page.getByText("1000.00 NGN", { exact: true }).waitFor();
    assert(
      !(await page.getByRole("button", { name: "Copy summary", exact: true }).isDisabled()),
      "Copy summary must enable after a record loads."
    );

    const allocationSection = page.locator("section").filter({ hasText: "Allocation summary" }).first();
    const detailedSection = page.locator("section").filter({ hasText: "Detailed fields" }).first();
    const routesSection = page.locator("section").filter({ hasText: "Next support steps" }).first();
    assert(
      await allocationSection.getByRole("button", { name: "Hide", exact: true }).count() === 1,
      "Successful lookup must open the allocation summary."
    );
    assert(
      await detailedSection.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Detailed fields must remain closed after lookup."
    );
    assert(
      await routesSection.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Next support steps must remain closed after lookup."
    );

    const mainOverflow = await summary.evaluate((node) => {
      const root = node.closest("div[style*='min-height']") || document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    assert(!mainOverflow, "Revenue Allocation overflows horizontally at 390x844.");

    console.log(
      "Revenue Allocation guided phone smoke passed: one lookup action, guarded copy, auto-opened summary, closed deeper evidence/routes, and no horizontal overflow."
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
