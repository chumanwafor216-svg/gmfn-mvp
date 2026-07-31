/* global console, process, URL, localStorage, document */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SECONDARY_DELAY_MS = 21000;
const MAX_FIRST_SURFACE_MS = 7000;

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

const me = {
  id: 216,
  user_id: 216,
  display_name: "Nwafor Chuma",
  gmfn_id: "GMFN-U-63655DE6",
  role: "member",
};

const clans = [
  {
    id: 8,
    clan_id: 8,
    name: "Homeland isa Marketplace",
    display_name: "Homeland isa Marketplace",
    community_name: "Homeland isa Marketplace",
    marketplace_name: "Homeland isa Marketplace",
    community_code: "GMFN-C-000008",
    clan_code: "GMFN-C-000008",
    gmfn_id: "GMFN-C-000008",
    member_count: 7,
    public_shop_count: 2,
    trust_band: "B",
    community_trust_band: "B",
    notice_posting_policy: "members",
  },
];

function slowEmpty(path) {
  if (path === "/community-domains/my") return { items: [] };
  if (/^\/clans\/\d+\/members/.test(path)) return [];
  if (/^\/clans\/\d+\/invite-link/.test(path)) return { invite_url: "", code: "" };
  if (/^\/marketplace\/shops\/me/.test(path)) return { shop: null, products: [] };
  if (/^\/marketplace\/shops/.test(path)) return { items: [], shops: [] };
  if (/^\/pool\/me/.test(path)) return { balance: 0, available_balance: 0, items: [] };
  if (/^\/loans/.test(path)) return { items: [], loans: [] };
  if (/^\/trust/.test(path)) return { score: 72, band: "B", grade: "B", events: [] };
  if (/^\/payment-instructions\/community-package\/status/.test(path)) return { items: [] };
  if (/^\/rosca\/cycles/.test(path)) return { items: [], cycles: [] };
  if (/^\/protected-trades/.test(path)) return { items: [], records: [] };
  if (/^\/community-notices/.test(path)) return { notices: [], posting_policy: "members" };
  if (/^\/marketplace\/broadcasts/.test(path)) return { items: [], broadcasts: [] };
  if (/^\/trust-slips\/me/.test(path)) {
    return {
      code: "TS-SLOW-FIRST-PAINT",
      open_trust_class: "B",
      open_trust_band: "B",
      cross_community_integrity_class: "B",
      cross_community_integrity_score: 72,
    };
  }
  return { items: [], results: [], status: "ok" };
}

function shouldDelay(path, mode) {
  if (mode === "community") {
    return path === "/community-domains/my";
  }

  if (mode === "marketplace") {
    return (
      /^\/clans\/\d+\/members/.test(path) ||
      /^\/clans\/\d+\/invite-link/.test(path) ||
      /^\/marketplace\/shops/.test(path) ||
      /^\/pool\/me/.test(path) ||
      /^\/loans/.test(path) ||
      /^\/trust\//.test(path) ||
      /^\/payment-instructions\/community-package\/status/.test(path) ||
      /^\/rosca\/cycles/.test(path) ||
      /^\/protected-trades/.test(path)
    );
  }

  if (mode === "profile") {
    return /^\/trust/.test(path);
  }

  return false;
}

async function installApiMocks(page, mode) {
  const delayed = new Map();

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") return route.fulfill(json(me));
    if (path === "/clans/me") return route.fulfill(json(clans));
    if (path === "/clans/select" || path === "/clans/select/") {
      return route.fulfill(json({ selected_clan_id: 8 }));
    }
    const clanSelectMatch = path.match(/^\/clans\/(\d+)\/select\/?$/);
    if (clanSelectMatch) {
      return route.fulfill(json({ selected_clan_id: Number(clanSelectMatch[1]) }));
    }
    if (path === "/trust-slips/me" && mode !== "profile") {
      return route.fulfill(
        json({
          code: "TS-FIRST-PAINT",
          open_trust_class: "B",
          open_trust_band: "B",
          cross_community_integrity_class: "B",
          cross_community_integrity_score: 72,
        })
      );
    }

    if (shouldDelay(path, mode)) {
      delayed.set(path, (delayed.get(path) || 0) + 1);
      await delay(SECONDARY_DELAY_MS);
      return route.fulfill(json(slowEmpty(path)));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json(slowEmpty(path)));
    }

    return route.continue();
  });

  return delayed;
}

async function measureRoute(browser, baseURL, test) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();
  const delayed = await installApiMocks(page, test.mode);

  await page.addInitScript(() => {
    localStorage.setItem("access_token", "app-tab-first-paint-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  const startedAt = Date.now();
  await page.goto(`${baseURL}${test.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector(test.selector, { timeout: MAX_FIRST_SURFACE_MS });
  await page.waitForFunction(
    (requiredText) => (document.body.textContent || "").includes(requiredText),
    test.text,
    { timeout: MAX_FIRST_SURFACE_MS }
  );
  const firstSurfaceMs = Date.now() - startedAt;
  const loadingTextStillVisible = await page.evaluate(
    (loadingText) => (document.body.textContent || "").includes(loadingText),
    test.loadingText
  );

  await context.close();

  return {
    name: test.name,
    firstSurfaceMs,
    delayed: Object.fromEntries(Array.from(delayed.entries()).sort()),
    loadingTextStillVisible,
  };
}

async function run() {
  let server;
  let browser;

  const tests = [
    {
      name: "Community Home",
      mode: "community",
      path: "/app/community?community=8",
      selector: '[data-cta-id="community-home.summary.visible-communities"]',
      text: "Community Home",
      loadingText: "Loading your marketplace communities",
    },
    {
      name: "Marketplace",
      mode: "marketplace",
      path: "/app/marketplace?community=8",
      selector: '[data-cta-id="marketplace.tile.marketing-tools"]',
      text: "Marketplace Tools",
      loadingText: "Loading your current community",
    },
    {
      name: "Profile / My GSN Identity",
      mode: "profile",
      path: "/app/my-gmfn-and-i?community=8",
      selector: '[data-cta-id="my-gmfn.hero.dashboard"]',
      text: "My GSN Identity",
      loadingText: "Loading workspace settings",
    },
  ];

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
    const results = [];

    for (const test of tests) {
      results.push(await measureRoute(browser, baseURL, test));
    }

    const failures = results.filter(
      (result) =>
        result.firstSurfaceMs > MAX_FIRST_SURFACE_MS ||
        result.loadingTextStillVisible ||
        Object.keys(result.delayed).length === 0
    );

    if (failures.length) {
      console.error("App tab first-paint audit failed:", { results, failures });
      process.exit(1);
    }

    console.log(
      `App tab first-paint audit passed with ${SECONDARY_DELAY_MS}ms delayed secondary calls: ${JSON.stringify(results)}.`
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.close().catch(() => {});
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});