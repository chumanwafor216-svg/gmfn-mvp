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
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function installApiMocks(page) {
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
      public_shop_count: 5,
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
      clan_id: 13,
    },
    {
      id: 14,
      domain_name: "setup-domain",
      display_name: "Setup Domain",
      status: "draft",
      verification_status: "unverified",
      clan_id: null,
    },
  ];

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") return route.fulfill(json(me));
    if (path === "/clans/me") return route.fulfill(json(clans));
    if (path === "/community-domains/my") {
      return route.fulfill(json({ items: domains }));
    }
    const clanSelectMatch = path.match(/^\/clans\/(\d+)\/select\/?$/);
    if (clanSelectMatch) {
      return route.fulfill(json({ selected_clan_id: Number(clanSelectMatch[1]) }));
    }
    if (path === "/clans/select" || path === "/clans/select/") {
      return route.fulfill(json({ selected_clan_id: 8 }));
    }
    if (/^\/community-notices/.test(path)) {
      return route.fulfill(json({ notices: [], posting_policy: "members" }));
    }
    if (/^\/pool\/me/.test(path)) {
      return route.fulfill(
        json({
          balance: 1250.75,
          available_balance: 1250.75,
          cumulative_pool_balance: 1250.75,
          communities_count: clans.length,
          items: [],
        })
      );
    }
    if (/^\/marketplace\/shops\/mine/.test(path)) {
      return route.fulfill(json({ shop: null, products: [] }));
    }
    if (/^\/marketplace\/shops/.test(path)) {
      return route.fulfill(json({ items: [], shops: [] }));
    }
    if (/^\/marketplace\/broadcasts/.test(path)) {
      return route.fulfill(json({ items: [], broadcasts: [] }));
    }
    if (/^\/trust-score\/clan/.test(path) || /^\/trust/.test(path)) {
      return route.fulfill(json({ score: 76, grade: "B", events: 24 }));
    }

    if (
      url.pathname.startsWith("/api/") ||
      url.origin === "http://127.0.0.1:8012"
    ) {
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
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });

    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-domain-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.communityHome.sections.v6",
        JSON.stringify({
          communities: true,
          marketplaceTools: true,
          subscriptions: true,
          trustFinance: true,
        })
      );
    });

    await page.goto(`${baseURL}/app/community?community=8`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector('[data-cta-id="community-home.summary.visible-communities"]', {
      timeout: 30000,
    });
    await page
      .locator('[data-cta-id="community-home.summary.visible-communities"]')
      .click();
    await page.waitForFunction(
      () => (document.body.textContent || "").includes("Pillar of Hope"),
      null,
      { timeout: 30000 }
    );
    await page
      .locator('[aria-label="Dismiss companion message"]')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(250);
    await page.screenshot({
      path: join(screenshotDir, "community-home-domain-list-390x844.png"),
      fullPage: false,
    });

    const result = await page.evaluate(() => {
      const text = document.body.textContent || "";
      const required = [
        "Marketplace Communities / Community Domains",
        "Homeland isa Marketplace",
        "Marketplace workspace for this community",
        "Pillar of Hope",
        "Community Domain marketplace workspace",
        "Marketplace ready",
        "Create Community Domain",
        "Setup Domain",
        "Setup needed",
      ];
      const forbidden = [
        "Your Community Marketplaces",
        "community-home.summary.community-domain",
        "Strengthen your identity evidence",
      ];
      const missing = required.filter((item) => !text.includes(item));
      const presentForbidden = forbidden.filter((item) => text.includes(item));
      const forbiddenCtas = [
        "community-home.lane.subscriptions.community-domain",
      ];
      const presentForbiddenCtas = forbiddenCtas.filter((id) =>
        document.querySelector(`[data-cta-id="${id}"]`)
      );
      if (document.querySelector('[data-cta-id^="community-home.domain."][data-cta-id$=".billing"]')) {
        presentForbiddenCtas.push("community-home.domain.*.billing");
      }
      if (document.querySelector('[data-cta-id^="community-home.domain."][data-cta-id$=".settings"]')) {
        presentForbiddenCtas.push("community-home.domain.*.settings");
      }
      const overflow = Array.from(document.querySelectorAll("main *"))
        .filter((element) => {
          if (element.closest('[aria-hidden="true"]')) return false;
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            (rect.left < -2 ||
              rect.right > document.documentElement.clientWidth + 2)
          );
        })
        .slice(0, 6)
        .map((element) => ({
          tag: element.tagName,
          text: (element.textContent || "").trim().slice(0, 80),
          right: Math.round(element.getBoundingClientRect().right),
        }));

      return { missing, presentForbidden, presentForbiddenCtas, overflow };
    });

    if (
      result.missing.length ||
      result.presentForbidden.length ||
      result.presentForbiddenCtas.length ||
      result.overflow.length
    ) {
      console.error("Community Home domain list smoke failed:", result);
      process.exit(1);
    }

    await page.locator('[data-cta-id="community-home.domain.13.open"]').click();
    await page.waitForURL(/\/app\/marketplace\?community=13/, {
      timeout: 30000,
    });

    console.log(
      "Community Home domain list smoke passed: screenshot saved to screenshots/community-home-domain-list-390x844.png"
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
