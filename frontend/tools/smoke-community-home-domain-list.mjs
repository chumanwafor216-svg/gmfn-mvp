/* global console, process, URL, localStorage, document */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDir = join(frontendRoot, "screenshots");
mkdirSync(screenshotDir, { recursive: true });

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

async function installApiMocks(page, controls = {}) {
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
      marketplace_name: "Homeland isa Marketplace",
      community_code: "GMFN-C-000008",
      gmfn_id: "GMFN-C-000008",
      member_count: 7,
      notice_posting_policy: "members",
    },
  ];
  const domains = [
    {
      id: 13,
      domain_name: "pillar-of-hope",
      display_name: "Pillar of Hope",
      status: "active",
      verification_status: "unverified",
      clan_id: 8,
      viewer: { can_admin: true },
      dashboard_path: "/app/community-domain/13",
    },
    {
      id: 14,
      domain_name: "setup-domain",
      display_name: "Setup Domain",
      status: "draft",
      verification_status: "unverified",
      clan_id: null,
      viewer: { can_admin: false },
    },
  ];

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") {
      if (controls.authGate) await controls.authGate;
      controls.authResolved = true;
      return route.fulfill(json(me));
    }
    if (path === "/clans/me") return route.fulfill(json(clans));
    if (path === "/community-domains/my") return route.fulfill(json({ items: domains }));
    const clanSelectMatch = path.match(/^\/clans\/(\d+)\/select\/?$/);
    if (clanSelectMatch) {
      controls.selectClanCalls.push(Number(clanSelectMatch[1]));
      return route.fulfill(json({ selected_clan_id: Number(clanSelectMatch[1]) }));
    }
    if (path === "/clans/select" || path === "/clans/select/") {
      controls.selectClanCalls.push(8);
      return route.fulfill(json({ selected_clan_id: 8 }));
    }
    if (/^\/community-notices/.test(path)) {
      return route.fulfill(json({ notices: [], posting_policy: "members" }));
    }
    if (/^\/marketplace\/broadcasts/.test(path)) {
      if (controls.communityPhase) controls.communitySpotlightFetchCount += 1;
      return route.fulfill(json({ items: [], broadcasts: [] }));
    }
    if (/^\/trust-score\/clan/.test(path) || /^\/trust/.test(path)) {
      return route.fulfill(json({ score: 76, grade: "B", events: 24 }));
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
    const baseURL = `http://127.0.0.1:${port}`;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });

    let releaseAuth = () => {};
    const controls = {
      authGate: new Promise((resolve) => {
        releaseAuth = resolve;
      }),
      authResolved: false,
      communityPhase: true,
      communitySpotlightFetchCount: 0,
      selectClanCalls: [],
    };

    await installApiMocks(page, controls);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-domain-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem("gmfn.communityHome.sections.v6", JSON.stringify({ communities: true, marketplaceTools: true, subscriptions: true, trustFinance: true }));
    });

    await page.goto(`${baseURL}/app/community/8`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('[data-cta-id="community-home.goto.marketplace"]', { timeout: 30000 });

    if (controls.authResolved) {
      console.error("Community Home first usable state waited for /auth/me.");
      process.exit(1);
    }
    if (controls.communitySpotlightFetchCount !== 0) {
      console.error("Community Home fetched Spotlight broadcasts during entry.", controls);
      process.exit(1);
    }

    releaseAuth();
    await page.waitForTimeout(250);
    const collectOverflow = () =>
      Array.from(document.querySelectorAll("main *"))
        .filter((element) => {
          if (element.closest('[aria-hidden="true"]')) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -2 || rect.right > document.documentElement.clientWidth + 2);
        })
        .slice(0, 6)
        .map((element) => ({
          tag: element.tagName,
          text: (element.textContent || "").trim().slice(0, 80),
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
        }));

    const overflow390 = await page.evaluate(collectOverflow);
    await page.screenshot({ path: join(screenshotDir, "community-home-domain-list-390x844.png"), fullPage: false });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(100);
    const overflow360 = await page.evaluate(collectOverflow);
    await page.screenshot({ path: join(screenshotDir, "community-home-phase1-360x780.png"), fullPage: false });
    if (overflow390.length || overflow360.length) {
      console.error("Community Home Phase 1 overflow detected:", { overflow390, overflow360 });
      process.exit(1);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);

    const firstState = await page.evaluate(() => {
      const text = document.body.textContent || "";
      const required = [
        "Homeland isa Marketplace",
        "GMFN-C-000008",
        "Community Bulletin",
        "Go to",
        "Marketplace",
        "Manage shop",
        "Finance",
        "Support",
        "Trust",
        "Switch community",
        "Admin area",
      ];
      const forbidden = [
        "Payments Â",
        "Payments Ã",
        "Open Free Spotlight",
        "Subscription Spotlight",
        "Paid Repost",
        "Vault controls",
        "Shop Gallery Tools",
        "Merchant Release",
        "Your Community Marketplaces",
      ];
      return {
        missing: required.filter((item) => !text.includes(item)),
        presentForbidden: forbidden.filter((item) => text.includes(item)),
        oldCtas: Array.from(document.querySelectorAll('[data-cta-id^="community-home.lane."], [data-cta-id^="community-home.spotlight-guided."], [data-cta-id="community-home.summary.visible-communities"]')).map((element) => element.getAttribute("data-cta-id")),
      };
    });

    if (firstState.missing.length || firstState.presentForbidden.length || firstState.oldCtas.length) {
      console.error("Community Home Phase 1 smoke failed:", firstState);
      process.exit(1);
    }

    const routeCheckPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
    await installApiMocks(routeCheckPage, controls);
    await routeCheckPage.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-domain-token");
      localStorage.setItem("gmfn_selected_clan_id", "999");
      localStorage.setItem("gmfn.communityHome.sections.v6", JSON.stringify({ communities: true, marketplaceTools: true, subscriptions: true, trustFinance: true }));
    });

    controls.selectClanCalls = [];
    await routeCheckPage.goto(`${baseURL}/app/community/8`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await routeCheckPage.waitForSelector('[data-cta-id="community-home.goto.marketplace"]', { timeout: 30000 });
    const accessibleRouteState = await routeCheckPage.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        storage: localStorage.getItem("gmfn_selected_clan_id"),
        selectedCommunity: text.includes("Homeland isa Marketplace"),
        warning: text.includes("This community is not available here."),
      };
    });
    if (accessibleRouteState.storage !== "8" || !accessibleRouteState.selectedCommunity || accessibleRouteState.warning || controls.selectClanCalls.includes(999)) {
      console.error("Community Home route param did not reconcile the accessible route community over stored state.", { accessibleRouteState, controls });
      process.exit(1);
    }

    controls.selectClanCalls = [];
    await routeCheckPage.goto(`${baseURL}/app/community/999`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await routeCheckPage.waitForSelector('[data-cta-id="community-home.route-param.switch-community"]', { timeout: 30000 });
    const inaccessibleRouteState = await routeCheckPage.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        warning: text.includes("This community is not available here."),
        switchAction: Boolean(document.querySelector('[data-cta-id="community-home.route-param.switch-community"]')),
      };
    });
    if (!inaccessibleRouteState.warning || !inaccessibleRouteState.switchAction || controls.selectClanCalls.includes(999)) {
      console.error("Community Home inaccessible route param did not stay truthful and blocked.", { inaccessibleRouteState, controls });
      process.exit(1);
    }
    await routeCheckPage.close();

    controls.selectClanCalls = [];
    await page.goto(`${baseURL}/app/community/8`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('[data-cta-id="community-home.goto.marketplace"]', { timeout: 30000 });

    const selectCallsBeforeOpen = controls.selectClanCalls.length;
    controls.communityPhase = false;
    await page.locator('[data-cta-id="community-home.goto.marketplace"]').click();
    await page.waitForURL(/\/app\/marketplace/, { timeout: 30000 });
    if (controls.selectClanCalls.length !== selectCallsBeforeOpen) {
      console.error("Community Home repeated selectClan before opening already-selected Marketplace.", controls);
      process.exit(1);
    }

    await page.goto(`${baseURL}/app/community/8`, { waitUntil: "domcontentloaded", timeout: 60000 });
    controls.communityPhase = true;
    await page.waitForSelector('[data-cta-id="community-home.switch.toggle"]', { timeout: 30000 });
    await page.locator('[data-cta-id="community-home.switch.toggle"]').click();
    await page.waitForSelector('[data-cta-id="community-home.switch.select.8"]', { timeout: 30000 });

    const switcherState = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasCommunity: text.includes("Homeland isa Marketplace"),
        leaksDomainPortfolio: text.includes("Setup Domain"),
      };
    });
    if (!switcherState.hasCommunity || switcherState.leaksDomainPortfolio) {
      console.error("Community Home switcher did not stay scoped to selectable communities.", switcherState);
      process.exit(1);
    }

    await page.locator('[data-cta-id="community-home.admin.toggle"]').click();
    await page.waitForSelector('[data-cta-id="community-home.admin.community-domain"]', { timeout: 30000 });
    await page.locator('[data-cta-id="community-home.admin.community-domain"]').click();
    await page.waitForURL(/\/app\/community-domain\/13/, { timeout: 30000 });

    console.log("Community Home domain/admin smoke passed: screenshot saved to screenshots/community-home-domain-list-390x844.png");
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
