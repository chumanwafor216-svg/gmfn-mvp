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
  if (path === "/trust/me/why") {
    return {
      user_id: 216,
      current_score: 72,
      score: 72,
      band: "B",
      latest_reason: "Recent community evidence remains current.",
      recent_events: [],
    };
  }
  if (/^\/trust-explainability/.test(path) || /^\/trust_explainability/.test(path)) {
    return { user_id: 216, score: 72, band: "B", event_count: 4, breakdown: { computed_score: 72, computed_band: "B" } };
  }
  if (/^\/trust/.test(path)) return { score: 72, band: "B", grade: "B", events: [] };
  if (/^\/payment-instructions\/community-package\/status/.test(path)) return { items: [] };
  if (/^\/rosca\/cycles/.test(path)) return { items: [], cycles: [] };
  if (/^\/protected-trades/.test(path)) return { items: [], records: [] };
  if (/^\/community-notices/.test(path)) return { notices: [], posting_policy: "members" };
  if (/^\/marketplace\/broadcasts/.test(path)) return { items: [], broadcasts: [] };
  if (/^\/trust-slips\/me\/decision-pack/.test(path)) {
    return { items: [], results: [], total: 0 };
  }
  if (/^\/trust-slips\/me/.test(path)) {
    return {
      verified: true,
      active: true,
      status: "active",
      code: "TS-SLOW-FIRST-PAINT",
      verification_code: "TS-SLOW-FIRST-PAINT",
      display_name: "Nwafor Chuma",
      community: "Homeland isa Marketplace",
      community_code: "GMFN-C-000008",
      level: "B",
      band: "B",
      open_trust_class: "B",
      open_trust_band: "B",
      trust_score: 72,
      standing_score: 72,
      cross_community_integrity_class: "B",
      cross_community_integrity_score: 72,
      trust_slip_limit: "250000",
      trust_limit: "250000",
      currency: "NGN",
      phone_recorded: true,
      phone_verified: true,
      public_verify_url: "/t/TS-SLOW-FIRST-PAINT",
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

  if (mode === "trust") {
    return (
      path === "/trust/me/why" ||
      path === "/trust-slips/me/summary" ||
      path === "/trust-slips/me-summary" ||
      path === "/trust-slips/summary/me" ||
      /^\/trust-explainability/.test(path) ||
      /^\/trust_explainability/.test(path)
    );
  }

  if (mode === "trust-slip") {
    return /^\/trust-slips\/me\/decision-pack/.test(path);
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
      return route.fulfill(json(slowEmpty(path)));
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

function delayedCallExpectationFailed(test, delayed) {
  const delayedCount = Object.keys(delayed).length;
  if (test.expectDelayed === false) return delayedCount > 0;
  if (test.expectDelayedPaths) {
    return test.expectDelayedPaths.some((path) => !delayed[path]);
  }
  return delayedCount === 0;
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
    {
      name: "Trust Passport",
      mode: "trust",
      path: "/app/trust?community=8",
      selector: '[data-trust-passport-decision-first="one-answer-four-facts"]',
      text: "Aggregate Passport reading",
      loadingText: "Loading Trust Passport",
      expectDelayedPaths: ["/trust/me/why", "/trust-slips/me/summary"],
    },
    {
      name: "TrustSlip Holder",
      mode: "trust-slip",
      path: "/app/trust-slip?community=8",
      selector: '[data-gsn-trust-document-certificate="trustslip-holder"]',
      text: "TrustSlip holder",
      loadingText: "Loading TrustSlip",
      expectDelayed: false,
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
        delayedCallExpectationFailed(
          tests.find((test) => test.name === result.name),
          result.delayed
        )
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
