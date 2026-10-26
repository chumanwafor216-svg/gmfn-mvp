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

async function installApiMocks(page, { withEvents = true } = {}) {
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

    if (path === "/admin/trust-events/recent") {
      return route.fulfill(json(withEvents
        ? {
            items: [
              {
                id: 41,
                event_type: "support_missed",
                title: "Support decision missed",
                created_at: "2026-10-26T15:30:00Z",
              },
              {
                id: 42,
                event_type: "identity_warning",
                title: "Identity evidence needs attention",
                created_at: "2026-10-26T14:20:00Z",
              },
              {
                id: 43,
                event_type: "dispute_opened",
                title: "Delivery dispute needs repair",
                created_at: "2026-10-26T13:10:00Z",
              },
              {
                id: 44,
                event_type: "participation_updated",
                title: "Member participation updated",
                created_at: "2026-10-25T11:00:00Z",
              },
            ],
          }
        : { items: [] }));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });
}

async function createPhonePage(browser, { withEvents, token }) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await installApiMocks(page, { withEvents });
  await page.addInitScript(({ accessToken }) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.removeItem("gmfn.trustAnalytics.sections.v3");
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
    const routeUrl = "http://127.0.0.1:" + port + "/app/command-center/trust-analytics";

    browser = await chromium.launch({ headless: true });
    const page = await createPhonePage(browser, {
      withEvents: true,
      token: "local-trust-analytics-events-token",
    });
    await page.goto(routeUrl, { waitUntil: "networkidle" });

    const summary = page.locator('[data-gsn-trust-analytics-summary="true"]');
    const priority = page.locator('[data-gsn-trust-analytics-priority="true"]');
    const mix = page.locator('[data-gsn-trust-analytics-mix="true"]');
    const timeline = page.locator('[data-gsn-trust-analytics-timeline="true"]');
    const guide = page.locator('[data-gsn-trust-analytics-guide="true"]');
    await summary.waitFor();
    await priority.waitFor();

    await page.getByText("The trust pattern shows weakening pressure.", { exact: true }).waitFor();
    assert(
      await page.getByRole("button", { name: "Review recent timeline", exact: true }).count() === 1,
      "Populated Trust Analytics must show one Review recent timeline action."
    );
    assert(
      !(await summary.getByText("GSN Operator", { exact: true }).count()),
      "Trust Analytics must not expose the operator name in its first summary."
    );
    assert(
      await mix.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Signal mix must start closed."
    );
    assert(
      await timeline.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Recent timeline must start closed."
    );
    assert(
      await guide.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Reading guidance must start closed."
    );
    assert(
      await page.locator('[data-gsn-trust-analytics-next-pages="true"]').count() === 0,
      "Next-page actions must not be exposed before the reading guide opens."
    );

    await page.getByRole("button", { name: "Review recent timeline", exact: true }).click();
    await timeline.getByRole("button", { name: "Hide", exact: true }).waitFor();
    await timeline.getByText("Support decision missed", { exact: true }).waitFor();
    assert(
      await guide.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Reviewing the timeline must not open reading guidance."
    );

    const hasHorizontalOverflow = await summary.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    assert(!hasHorizontalOverflow, "Trust Analytics overflows horizontally at 390x844.");
    await page.close();

    const emptyPage = await createPhonePage(browser, {
      withEvents: false,
      token: "local-trust-analytics-empty-token",
    });
    await emptyPage.goto(routeUrl, { waitUntil: "networkidle" });

    await emptyPage.getByText("No trust event is visible for this community yet.", { exact: true }).waitFor();
    assert(
      await emptyPage.getByRole("button", { name: "Read the guide", exact: true }).count() === 1,
      "Empty Trust Analytics must show one Read the guide action."
    );
    const emptyGuide = emptyPage.locator('[data-gsn-trust-analytics-guide="true"]');
    await emptyPage.getByRole("button", { name: "Read the guide", exact: true }).click();
    await emptyGuide.getByRole("button", { name: "Hide", exact: true }).waitFor();
    await emptyPage.locator('[data-gsn-trust-analytics-next-pages="true"]').waitFor();
    assert(
      await emptyPage.getByRole("link", { name: "System Operations", exact: true }).count() === 1,
      "Opening the empty-state guide must reveal the preserved deeper-page actions."
    );

    console.log(
      "Trust Analytics guided phone smoke passed: populated timeline reveal, empty-state guide fallback, closed secondary sections, hidden deeper pages, and no horizontal overflow."
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
