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
  const calls = { unsafeUserGraph: 0 };

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

    if (path.startsWith("/admin/trust-graph/")) {
      calls.unsafeUserGraph += 1;
      return route.fulfill(json({
        root_user_id: 8,
        nodes: [{ node_id: "user:8", label: "Wrong user graph" }],
        edges: [],
      }));
    }

    if (path === "/admin/trust-events/recent") {
      return route.fulfill(json(withEvents
        ? {
            items: [
              {
                id: 71,
                event_type: "relationship_risk",
                title: "Relationship risk needs review",
                detail: "A selected-community evidence signal was recorded.",
                created_at: "2026-10-26T16:30:00Z",
              },
              {
                id: 72,
                event_type: "relationship_repair",
                title: "Relationship repair needs watching",
                detail: "Review the recorded event before choosing an intervention page.",
                created_at: "2026-10-26T15:00:00Z",
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

  return calls;
}

async function createPhonePage(browser, { withEvents, token }) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const calls = await installApiMocks(page, { withEvents });
  await page.addInitScript(({ accessToken }) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.removeItem("gmfn.trustGraph.sections.v3");
  }, { accessToken: token });
  return { page, calls };
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
    const routeUrl = "http://127.0.0.1:" + port + "/app/command-center/trust-graph";

    browser = await chromium.launch({ headless: true });
    const populated = await createPhonePage(browser, {
      withEvents: true,
      token: "local-trust-graph-events-token",
    });
    const page = populated.page;
    await page.goto(routeUrl, { waitUntil: "networkidle" });

    const summary = page.locator('[data-gsn-trust-graph-summary="true"]');
    const priority = page.locator('[data-gsn-trust-graph-priority="true"]');
    const structure = page.locator('[data-gsn-trust-graph-structure="true"]');
    const signals = page.locator('[data-gsn-trust-graph-signals="true"]');
    const nextPages = page.locator('[data-gsn-trust-graph-next-pages="true"]');
    await summary.waitFor();
    await priority.waitFor();

    await page.getByText("Community graph data is not connected here yet.", { exact: true }).waitFor();
    await summary.getByText("Not connected", { exact: true }).waitFor();
    assert(
      populated.calls.unsafeUserGraph === 0,
      "Trust Graph must not query the user-specific graph endpoint with the selected community ID."
    );
    assert(
      await page.getByRole("button", { name: "Review evidence signals", exact: true }).count() === 1,
      "Fallback Trust Graph must show one Review evidence signals action."
    );
    assert(
      !(await summary.getByText("GSN Operator", { exact: true }).count()),
      "Trust Graph must not expose the operator name in its first summary."
    );
    assert(
      await structure.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Structure limits must start closed."
    );
    assert(
      await signals.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Evidence signals must start closed."
    );
    assert(
      await nextPages.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Next pages must start closed."
    );

    await page.getByRole("button", { name: "Review evidence signals", exact: true }).click();
    await signals.getByRole("button", { name: "Hide", exact: true }).waitFor();
    await signals.getByText("Relationship risk needs review", { exact: true }).waitFor();
    assert(
      await structure.getByRole("button", { name: "Open", exact: true }).count() === 1,
      "Reviewing evidence signals must not open structure limits."
    );

    const hasHorizontalOverflow = await summary.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    assert(!hasHorizontalOverflow, "Trust Graph overflows horizontally at 390x844.");
    await page.close();

    const empty = await createPhonePage(browser, {
      withEvents: false,
      token: "local-trust-graph-empty-token",
    });
    await empty.page.goto(routeUrl, { waitUntil: "networkidle" });

    await empty.page.getByText("Read the current structure limits.", { exact: true }).waitFor();
    assert(
      empty.calls.unsafeUserGraph === 0,
      "Empty Trust Graph must not query the user-specific graph endpoint with the selected community ID."
    );
    assert(
      await empty.page.getByRole("button", { name: "Read structure limits", exact: true }).count() === 1,
      "Empty Trust Graph must show one Read structure limits action."
    );
    const emptyStructure = empty.page.locator('[data-gsn-trust-graph-structure="true"]');
    await empty.page.getByRole("button", { name: "Read structure limits", exact: true }).click();
    await emptyStructure.getByRole("button", { name: "Hide", exact: true }).waitFor();
    await emptyStructure.getByText(
      "No community graph feed is connected. These details stay empty instead of borrowing a person's graph.",
      { exact: true }
    ).waitFor();

    console.log(
      "Trust Graph guided phone smoke passed: no community-ID user-graph request, fallback signal reveal, empty structure-limit fallback, closed secondary sections, and no horizontal overflow."
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
