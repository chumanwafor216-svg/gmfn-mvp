/* global console, process, URL, localStorage, document, window, location */

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

function mockData(baseURL) {
  const me = {
    id: 216,
    user_id: 216,
    display_name: "Nwafor Chuma",
    name: "Nwafor Chuma",
    gmfn_id: "GMFN-U-63655DE6",
    gsn_id: "GMFN-U-63655DE6",
    role: "member",
    profile_image_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop",
  };

  const clan = {
    id: 8,
    clan_id: 8,
    name: "Homeland isa Marketplace",
    display_name: "Homeland isa Marketplace",
    community_name: "Homeland isa Marketplace",
    marketplace_name: "Homeland isa Marketplace",
    description: "Community-bound buying, selling, support, and evidence desk.",
    marketplace_description:
      "Community-bound buying, selling, support, and evidence desk.",
    community_code: "GMFN-C-000008",
    clan_code: "GMFN-C-000008",
    gmfn_id: "GMFN-C-000008",
    role: "member",
    member_count: 7,
    public_shop_count: 5,
  };

  const members = [
    {
      id: 216,
      user_id: 216,
      display_name: "Ardent Ebony Uplift LTD",
      name: "Ardent Ebony Uplift LTD",
      gmfn_id: "GMFN-U-63655DE6",
      role: "Merchant",
      has_shop: true,
    },
    {
      id: 217,
      user_id: 217,
      display_name: "Homeland Support Desk",
      name: "Homeland Support Desk",
      gmfn_id: "GMFN-U-22222222",
      role: "Supporter",
      has_shop: false,
    },
  ];

  const shops = [
    {
      id: 55,
      shop_id: 55,
      clan_id: 8,
      owner_user_id: 216,
      owner_gmfn_id: "GMFN-U-63655DE6",
      seller_gmfn_id: "GMFN-U-63655DE6",
      name: "Ardent Ebony Uplift LTD",
      public_name: "Ardent Ebony Uplift LTD",
      category: "General merchandise",
      is_active: true,
      visibility: "public",
    },
  ];

  return { me, clan, members, shops, baseURL };
}

async function installApiMocks(page, baseURL) {
  const data = mockData(baseURL);
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") return route.fulfill(json(data.me));
    if (path === "/clans/me") return route.fulfill(json([data.clan]));
    if (/^\/clans\/8\/members/.test(path)) {
      return route.fulfill(json(data.members));
    }
    if (/^\/clans\/8\/invite-link/.test(path)) {
      return route.fulfill(
        json({ invite_url: `${baseURL}/join/HOMELAND8`, code: "HOMELAND8" })
      );
    }
    if (/^\/marketplace\/shops\/55\/spotlight-status/.test(path)) {
      return route.fulfill(json({ active: false, followers: 0 }));
    }
    if (/^\/marketplace\/shops\/mine/.test(path)) {
      return route.fulfill(json({ shop: data.shops[0], products: [] }));
    }
    if (/^\/marketplace\/shops/.test(path)) {
      return route.fulfill(json({ items: data.shops, shops: data.shops }));
    }
    if (/^\/marketplace\/products/.test(path)) {
      return route.fulfill(json({ items: [], products: [] }));
    }
    if (/^\/pool\/me/.test(path)) {
      return route.fulfill(
        json({ balance: 0, available_balance: 0, items: [], events: [] })
      );
    }
    if (/^\/loans/.test(path)) {
      return route.fulfill(json({ items: [], loans: [] }));
    }
    if (/^\/trust-score\/clan/.test(path) || /^\/trust/.test(path)) {
      return route.fulfill(
        json({ score: 13, grade: "D", reading: "Evidence building", events: [] })
      );
    }
    if (/^\/protected-trades/.test(path)) {
      return route.fulfill(json({ items: [], records: [] }));
    }
    if (/^\/payment-instructions\/community-package\/status/.test(path)) {
      return route.fulfill(
        json({ status: "not_created", package_status: "not_created" })
      );
    }
    if (/^\/marketplace\/repost/.test(path)) {
      return route.fulfill(json({ items: [], targets: [], credits: 0 }));
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

async function preparePage(page, sectionState) {
  await page.addInitScript((state) => {
    localStorage.setItem("access_token", "local-marketplace-visual-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.setItem("gmfn.marketplace.sections.8", JSON.stringify(state));
  }, sectionState);
}

async function run() {
  let server;
  let browser;
  let page;

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
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  await installApiMocks(page, baseURL);
  await preparePage(page, {
    money: false,
    rosca: false,
    tools: false,
    trade: true,
    members: false,
    demand: false,
    support: false,
  });

  await page.goto(`${baseURL}/app/marketplace?community=8#marketplace-trade-evidence`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.locator('[data-cta-id="marketplace.tile.marketing-tools"]').click({
    timeout: 30000,
  });
  await waitForDebugSelector(
    page,
    '[data-gmfn-debug-id="marketplace.network-repost.surface"]',
    "marketing tools"
  );
  await page.screenshot({
    path: join(screenshotDir, "marketplace-marketing-tools-390x844.png"),
    fullPage: false,
  });

  const marketingFacts = await page.evaluate(() => {
    const tools = document.getElementById("marketplace-owned-links");
    const text = tools?.textContent || "";
    const required = [
      "Marketing Tools",
      "Selected Marketing Tool",
      "Back to Marketing Tools",
      "4 marketing jobs",
      "Repost selected",
      "Marketplace-safe",
      "Free Spotlight",
      "Subscription Spotlight",
      "Trade Evidence",
    ];
    const forbidden = [
      "Access & Public Links",
      "Selected Link Center tool",
      "Back to Link Center",
    ];
    return {
      toolsExists: Boolean(tools),
      missing: required.filter((item) => !text.includes(item)),
      presentForbidden: forbidden.filter((item) => text.includes(item)),
    };
  });

  if (
    !marketingFacts.toolsExists ||
    marketingFacts.missing.length ||
    marketingFacts.presentForbidden.length
  ) {
    console.error("Marketplace Marketing Tools smoke failed:", marketingFacts);
    process.exit(1);
  }

  await page.locator('[data-cta-id="marketplace.marketing.trade-evidence"]').click({
    timeout: 30000,
  });
  await waitForDebugSelector(
    page,
    '[data-gmfn-debug-id="marketplace.trade.evidence-module"]',
    "trade"
  );
  await page.screenshot({
    path: join(screenshotDir, "marketplace-trade-boundaries-390x844.png"),
    fullPage: false,
  });

  const tradeFacts = await page.evaluate(() => {
    const trade = document.querySelector(
      '[data-gmfn-debug-id="marketplace.trade.evidence-module"]'
    );
    const overflow = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          (rect.left < -2 || rect.right > window.innerWidth + 2)
        );
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          id: element.id,
          debug: element.getAttribute("data-gmfn-debug-id"),
          cta: element.getAttribute("data-cta-id"),
          text: (element.textContent || "").trim().slice(0, 80),
          rect: {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          },
        };
      });
    return {
      tradeExists: Boolean(trade),
      tradeTitle: trade?.textContent?.includes("Trade Evidence Record") || false,
      overflow,
    };
  });

  await page.evaluate(() => {
    localStorage.setItem(
      "gmfn.marketplace.sections.8",
      JSON.stringify({
        money: false,
        rosca: false,
        tools: false,
        trade: false,
        members: true,
        demand: false,
        support: false,
      })
    );
  });
  await page.goto(`${baseURL}/app/marketplace?community=8#marketplace-members-shops`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.locator('[data-cta-id="marketplace.tile.members"]').click({
    timeout: 30000,
  });
  await waitForDebugSelector(
    page,
    '[data-gmfn-debug-id="marketplace.members.visible-members-module"]',
    "members"
  );
  await page.screenshot({
    path: join(screenshotDir, "marketplace-members-boundaries-390x844.png"),
    fullPage: false,
  });

  const memberFacts = await page.evaluate(() => {
    const members = document.querySelector(
      '[data-gmfn-debug-id="marketplace.members.visible-members-module"]'
    );
    const overflow = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          (rect.left < -2 || rect.right > window.innerWidth + 2)
        );
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          id: element.id,
          debug: element.getAttribute("data-gmfn-debug-id"),
          cta: element.getAttribute("data-cta-id"),
          text: (element.textContent || "").trim().slice(0, 80),
          rect: {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          },
        };
      });
    return {
      membersExists: Boolean(members),
      membersTitle: members?.textContent?.includes("Visible members") || false,
      overflow,
    };
  });

  await page.evaluate(() => {
    localStorage.setItem(
      "gmfn.marketplace.sections.8",
      JSON.stringify({
        money: false,
        rosca: false,
        tools: false,
        trade: false,
        members: false,
        demand: false,
        support: true,
      })
    );
  });
  await page.goto(`${baseURL}/app/marketplace?community=8#marketplace-loans-support`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.locator('[data-cta-id="marketplace.tile.support"]').click({
    timeout: 30000,
  });
  await waitForDebugSelector(
    page,
    '[data-gmfn-debug-id="marketplace.support.financial-support-module"]',
    "support"
  );
  await page.screenshot({
    path: join(screenshotDir, "marketplace-support-boundaries-390x844.png"),
    fullPage: false,
  });

  const supportFacts = await page.evaluate(() => {
    const selected = document.querySelector(
      '[data-gmfn-debug-id="marketplace.support.selected-module"]'
    );
    const support = document.querySelector(
      '[data-gmfn-debug-id="marketplace.support.financial-support-module"]'
    );
    const rosca = document.querySelector(
      '[data-gmfn-debug-id="marketplace.support.rosca-module"]'
    );
    const overflow = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          (rect.left < -2 || rect.right > window.innerWidth + 2)
        );
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          id: element.id,
          debug: element.getAttribute("data-gmfn-debug-id"),
          cta: element.getAttribute("data-cta-id"),
          text: (element.textContent || "").trim().slice(0, 80),
          rect: {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          },
        };
      });
    return {
      selectedExists: Boolean(selected),
      supportExists: Boolean(support),
      roscaExists: Boolean(rosca),
      selectedSupportGap:
        selected && support
          ? Math.round(
              support.getBoundingClientRect().top -
                selected.getBoundingClientRect().bottom
            )
          : null,
      supportRoscaGap:
        support && rosca
          ? Math.round(
              rosca.getBoundingClientRect().top -
                support.getBoundingClientRect().bottom
            )
          : null,
      supportTitle:
        support?.textContent?.includes("Financial support requests") || false,
      roscaTitle: rosca?.textContent?.includes("Separate ROSCA desk") || false,
      overflow,
    };
  });

  console.log(
    JSON.stringify(
      {
        screenshots: [
          "frontend/screenshots/marketplace-marketing-tools-390x844.png",
          "frontend/screenshots/marketplace-trade-boundaries-390x844.png",
          "frontend/screenshots/marketplace-members-boundaries-390x844.png",
          "frontend/screenshots/marketplace-support-boundaries-390x844.png",
        ],
        marketingFacts,
        tradeFacts,
        memberFacts,
        supportFacts,
      },
      null,
      2
    )
  );
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.close().catch(() => {});
  }
}

async function waitForDebugSelector(page, selector, name) {
  try {
    await page.waitForSelector(selector, { timeout: 30000 });
  } catch (error) {
    await page
      .screenshot({
        path: join(screenshotDir, `marketplace-${name}-failure-390x844.png`),
        fullPage: false,
      })
      .catch(() => {});

    const facts = await page
      .evaluate(() => ({
        url: location.href,
        bodyText: (document.body?.innerText || "").slice(0, 1200),
        debugIds: Array.from(document.querySelectorAll("[data-gmfn-debug-id]"))
          .map((element) => element.getAttribute("data-gmfn-debug-id"))
          .filter(Boolean)
          .slice(0, 80),
        ctaIds: Array.from(document.querySelectorAll("[data-cta-id]"))
          .map((element) => element.getAttribute("data-cta-id"))
          .filter(Boolean)
          .slice(0, 80),
      }))
      .catch((inspectionError) => ({
        inspectionError: String(inspectionError),
      }));

    console.error(
      JSON.stringify(
        {
          failedSelector: selector,
          stage: name,
          failureScreenshot: `frontend/screenshots/marketplace-${name}-failure-390x844.png`,
          facts,
        },
        null,
        2
      )
    );
    throw error;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
