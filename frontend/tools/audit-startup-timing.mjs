/* global console, process, localStorage, document, URL */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_WARM_SHELL_MS = 6500;
const MAX_WARM_DASHBOARD_MS = 7500;
const MAX_RETRY_DASHBOARD_MS = 9000;

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function delay(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function mockMe() {
  return {
    id: 216,
    user_id: 216,
    display_name: "Nwafor Chuma",
    gmfn_id: "GMFN-U-63655DE6",
    role: "member",
  };
}

function mockClan() {
  return {
    id: 8,
    clan_id: 8,
    name: "Homeland isa Marketplace",
    display_name: "Homeland isa Marketplace",
    marketplace_name: "Homeland isa Marketplace",
    community_code: "GMFN-C-000008",
    gmfn_id: "GMFN-C-000008",
    member_count: 7,
    public_shop_count: 2,
    trust_band: "B",
    community_trust_band: "B",
  };
}

async function installApiMocks(page, options = {}) {
  const counts = new Map();
  const exactCounts = new Map();

  function count(name, exactName = name) {
    counts.set(name, (counts.get(name) || 0) + 1);
    exactCounts.set(exactName, (exactCounts.get(exactName) || 0) + 1);
    return counts.get(name);
  }

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const exactPath = `${route.request().method()} ${path}${url.search}`;

    if (path === "/auth/me") {
      const authHits = count("/auth/me", exactPath);
      if (options.slowFirstAuth && authHits === 1) {
        await delay(6500);
      }
      return route.fulfill(json(mockMe()));
    }

    if (path === "/clans/me") {
      count("/clans/me", exactPath);
      return route.fulfill(json([mockClan()]));
    }
    if (path === "/public/daily-insight" || path === "/daily-insight") {
      count("/public/daily-insight", exactPath);
      return route.fulfill(
        json({
          public_id: "mw-local-timing",
          date: "2026-07-22",
          text: "Small trusted actions become larger market confidence.",
          source: "GSN Market Wisdom",
          source_label: "GSN Market Wisdom",
          status: "approved",
        })
      );
    }
    if (path === "/market-wisdom/recommendation") {
      count("/market-wisdom/recommendation", exactPath);
      return route.fulfill(
        json({
          public_id: "mw-local-recommendation",
          text: "Use the next visible action to turn trust into motion.",
          source: "GSN Market Wisdom",
          source_label: "GSN Market Wisdom",
          status: "approved",
        })
      );
    }
    if (path === "/market-wisdom/exposures") {
      count("/market-wisdom/exposures", exactPath);
      return route.fulfill(json({ status: "ok" }));
    }
    if (path === "/trust-slips/me") {
      count("/trust-slips/me", exactPath);
      return route.fulfill(
        json({
          code: "TS-TIMING",
          open_trust_class: "B",
          open_trust_band: "B",
          cross_community_integrity_class: "B",
          cross_community_integrity_score: 72,
        })
      );
    }
    if (/^\/trust\/score\/explained-clan/.test(path) || /^\/trust/.test(path)) {
      count("/trust/score/explained-clan", exactPath);
      return route.fulfill(json({ score: 72, grade: "B", band: "B", events: [] }));
    }
    if (/^\/marketplace\/broadcasts/.test(path)) {
      count("/marketplace/broadcasts", exactPath);
      return route.fulfill(json({ items: [], broadcasts: [] }));
    }
    if (/^\/marketplace\/shops\/mine/.test(path)) {
      count("/marketplace/shops/mine", exactPath);
      return route.fulfill(json({ shop: null, products: [] }));
    }
    if (/^\/marketplace\/shops/.test(path)) {
      count("/marketplace/shops", exactPath);
      return route.fulfill(json({ items: [], shops: [] }));
    }
    if (/^\/marketplace\/requests/.test(path)) {
      count("/marketplace/requests", exactPath);
      return route.fulfill(json({ items: [], results: [] }));
    }
    if (/^\/clans\/8\/join-requests/.test(path)) {
      count("/clans/8/join-requests", exactPath);
      return route.fulfill(json({ items: [], requests: [] }));
    }
    if (/^\/rosca\/obligations\/me/.test(path)) {
      count("/rosca/obligations/me", exactPath);
      return route.fulfill(json({ items: [], obligations: [] }));
    }
    if (/^\/notifications\/me/.test(path)) {
      count("/notifications/me", exactPath);
      return route.fulfill(json({ items: [], notifications: [] }));
    }
    if (/^\/pool\/me/.test(path)) {
      count("/pool/me", exactPath);
      return route.fulfill(json({ balance: 0, available_balance: 0, items: [] }));
    }
    if (/^\/loans/.test(path)) {
      count("/loans", exactPath);
      return route.fulfill(json({ items: [], loans: [] }));
    }
    if (
      url.pathname.startsWith("/api/") ||
      url.origin === "http://127.0.0.1:8012"
    ) {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });

  return {
    counts,
    snapshotCounts() {
      return Object.fromEntries(
        Array.from(counts.entries()).sort(([left], [right]) =>
          left.localeCompare(right)
        )
      );
    },
    snapshotExactCounts() {
      return Object.fromEntries(
        Array.from(exactCounts.entries()).sort(([left], [right]) =>
          left.localeCompare(right)
        )
      );
    },
  };
}

async function measureDashboard(page, baseURL, label, options = {}) {
  const mocks = await installApiMocks(page, options);
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "startup-timing-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  const startedAt = Date.now();
  await page.goto(`${baseURL}/app/dashboard?community=8`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForSelector('[data-gmfn-bottom-nav="true"]', {
    timeout: 12000,
  });
  const shellMs = Date.now() - startedAt;

  await page.waitForFunction(
    () => (document.body.textContent || "").includes("Market Wisdom"),
    null,
    { timeout: 12000 }
  );
  const dashboardMs = Date.now() - startedAt;

  return {
    label,
    shellMs,
    dashboardMs,
    requests: mocks.snapshotCounts(),
    exactRequests: mocks.snapshotExactCounts(),
  };
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
    const baseURL = `http://127.0.0.1:${port}`;

    browser = await chromium.launch({ headless: true });
    const warmPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const retryPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });

    const warm = await measureDashboard(warmPage, baseURL, "warm-auth");
    const retry = await measureDashboard(retryPage, baseURL, "auth-retry", {
      slowFirstAuth: true,
    });

    const failures = [];
    if (warm.shellMs > MAX_WARM_SHELL_MS) {
      failures.push(
        `warm shell ${warm.shellMs}ms exceeded ${MAX_WARM_SHELL_MS}ms`
      );
    }
    if (warm.dashboardMs > MAX_WARM_DASHBOARD_MS) {
      failures.push(
        `warm dashboard ${warm.dashboardMs}ms exceeded ${MAX_WARM_DASHBOARD_MS}ms`
      );
    }
    if (retry.dashboardMs > MAX_RETRY_DASHBOARD_MS) {
      failures.push(
        `auth retry dashboard ${retry.dashboardMs}ms exceeded ${MAX_RETRY_DASHBOARD_MS}ms`
      );
    }
    if ((warm.requests["/auth/me"] || 0) > 1) {
      failures.push(`warm /auth/me was called ${warm.requests["/auth/me"]} times`);
    }
    if ((warm.requests["/clans/me"] || 0) > 1) {
      failures.push(`warm /clans/me was called ${warm.requests["/clans/me"]} times`);
    }
    if ((retry.requests["/auth/me"] || 0) > 2) {
      failures.push(
        `auth-retry /auth/me was called ${retry.requests["/auth/me"]} times`
      );
    }
    if ((warm.requests["/public/daily-insight"] || 0) > 1) {
      failures.push(
        `warm /public/daily-insight was called ${warm.requests["/public/daily-insight"]} times`
      );
    }
    if ((retry.requests["/public/daily-insight"] || 0) > 1) {
      failures.push(
        `auth-retry /public/daily-insight was called ${retry.requests["/public/daily-insight"]} times`
      );
    }
    const warmCeilings = {
      "/clans/8/join-requests": 1,
      "/loans": 2,
      "/marketplace/broadcasts": 2,
      "/marketplace/requests": 2,
      "/notifications/me": 3,
      "/rosca/obligations/me": 1,
      "/trust-slips/me": 1,
      "/trust/score/explained-clan": 2,
    };
    for (const [path, max] of Object.entries(warmCeilings)) {
      const count = warm.requests[path] || 0;
      if (count > max) {
        failures.push(`warm ${path} was called ${count} times`);
      }
    }

    if (failures.length) {
      console.error("Startup timing audit failed:", { warm, retry, failures });
      process.exit(1);
    }

    console.log(
      `Startup timing audit passed: warm shell ${warm.shellMs}ms, warm Dashboard ${warm.dashboardMs}ms, auth-retry Dashboard ${retry.dashboardMs}ms. Warm requests: ${JSON.stringify(warm.requests)}. Warm exact: ${JSON.stringify(warm.exactRequests)}. Retry requests: ${JSON.stringify(retry.requests)}. Retry exact: ${JSON.stringify(retry.exactRequests)}.`
    );
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
