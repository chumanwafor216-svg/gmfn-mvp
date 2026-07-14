/* global console, process, URL, localStorage, document, window */

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

async function installApiMocks(page, baseURL) {
  const me = {
    id: 216,
    user_id: 216,
    display_name: "Nwafor Chuma",
    gmfn_id: "GMFN-U-63655DE6",
    role: "member",
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
    member_count: 7,
    public_shop_count: 5,
    marketplace_image_url:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=320&h=320&fit=crop",
  };
  const members = [
    {
      id: 216,
      user_id: 216,
      display_name: "Ardent Ebony Uplift LTD",
      gmfn_id: "GMFN-U-63655DE6",
      role: "Merchant",
    },
    {
      id: 217,
      user_id: 217,
      display_name: "Homeland Support Desk",
      gmfn_id: "GMFN-U-22222222",
      role: "Supporter",
    },
  ];
  const shops = [
    {
      id: 55,
      shop_id: 55,
      clan_id: 8,
      owner_user_id: 216,
      owner_gmfn_id: "GMFN-U-63655DE6",
      name: "Ardent Ebony Uplift LTD",
      visibility: "public",
    },
  ];

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") return route.fulfill(json(me));
    if (path === "/clans/me") return route.fulfill(json([clan]));
    if (/^\/clans\/8\/members/.test(path)) return route.fulfill(json(members));
    if (/^\/clans\/8\/invite-link/.test(path)) {
      return route.fulfill(
        json({ invite_url: `${baseURL}/join/HOMELAND8`, code: "HOMELAND8" })
      );
    }
    if (/^\/marketplace\/shops\/mine/.test(path)) {
      return route.fulfill(json({ shop: shops[0], products: [] }));
    }
    if (/^\/marketplace\/shops/.test(path)) {
      return route.fulfill(json({ items: shops, shops }));
    }
    if (/^\/marketplace\/products/.test(path)) {
      return route.fulfill(json({ items: [], products: [] }));
    }
    if (/^\/pool\/me/.test(path)) {
      return route.fulfill(
        json({ balance: 1250.75, available_balance: 1250.75, items: [] })
      );
    }
    if (/^\/loans/.test(path)) return route.fulfill(json({ items: [], loans: [] }));
    if (/^\/trust-score\/clan/.test(path) || /^\/trust/.test(path)) {
      return route.fulfill(
        json({ score: 76, grade: "B", reading: "Strong", events: 24 })
      );
    }
    if (/^\/protected-trades/.test(path)) {
      return route.fulfill(json({ items: [], records: [] }));
    }
    if (/^\/payment-instructions\/community-package\/status/.test(path)) {
      return route.fulfill(json({ items: [] }));
    }
    if (/^\/marketplace\/repost/.test(path)) {
      return route.fulfill(
        json({ items: [], targets: [], available_paid_credits: 0 })
      );
    }

    return route.fulfill(json({ items: [], results: [], status: "ok" }));
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

    await installApiMocks(page, baseURL);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-marketplace-hero-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.marketplace.sections.8",
        JSON.stringify({
          money: false,
          rosca: false,
          tools: false,
          members: false,
          demand: false,
          support: false,
        })
      );
    });

    await page.goto(`${baseURL}/app/marketplace?community=8`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector('[data-cta-id="marketplace.tile.marketing-tools"]', {
      timeout: 30000,
    });
    await page.waitForFunction(
      () => (document.body.textContent || "").includes("Homeland isa Marketplace"),
      null,
      { timeout: 30000 }
    );
    await page.screenshot({
      path: join(screenshotDir, "marketplace-hero-390x844.png"),
      fullPage: false,
    });

    const result = await page.evaluate(() => {
      const text = document.body.textContent || "";
      const required = [
        "Homeland isa Marketplace",
        "Finance Summary",
        "Finance details",
        "Trust",
        "CCI",
        "Money & Trust",
        "Members & Shops",
        "Marketplace Tools",
        "Support Requests",
        "Marketing Tools",
        "Spotlight",
      ];
      const missing = required.filter((item) => !text.includes(item));
      const overflow = Array.from(document.querySelectorAll("main *"))
        .filter((element) => {
          if (element.closest('[aria-hidden="true"]')) return false;
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            (rect.left < -2 || rect.right > window.innerWidth + 2)
          );
        })
        .slice(0, 6)
        .map((element) => ({
          tag: element.tagName,
          text: (element.textContent || "").trim().slice(0, 80),
          right: Math.round(element.getBoundingClientRect().right),
        }));
      return { missing, overflow };
    });

    if (result.missing.length || result.overflow.length) {
      console.error("Marketplace hero smoke failed:", result);
      process.exit(1);
    }

    console.log(
      "Marketplace hero smoke passed: screenshot saved to screenshots/marketplace-hero-390x844.png"
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
