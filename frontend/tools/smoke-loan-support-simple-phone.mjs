/* global console, process, URL, localStorage */

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

async function installApiMocks(page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") {
      return route.fulfill(
        json({
          id: 216,
          user_id: 216,
          display_name: "Nwafor Chuma",
          gmfn_id: "GMFN-U-63655DE6",
          role: "member",
        })
      );
    }
    if (path === "/clans/me") {
      return route.fulfill(
        json({
          items: [
            {
              id: 8,
              clan_id: 8,
              name: "Blessed Satch family",
              marketplace_name: "Blessed Satch family",
              community_code: "GMFN-C-000013",
              membership_role: "admin",
              status: "active",
            },
          ],
        })
      );
    }
    if (path === "/loans") {
      return route.fulfill(json({ items: [] }));
    }
    if (path === "/loans/guarantors/inbox") {
      return route.fulfill(json({ items: [], total: 0 }));
    }
    if (path === "/pool/me") {
      return route.fulfill(json({ available_balance: "0", currency: "NGN" }));
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
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });

    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-loan-support-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.loans.sections.v3",
        JSON.stringify({
          overview: true,
          focus: true,
          borrower: true,
          guarantor: true,
          routes: true,
        })
      );
    });

    await page.goto(`${baseURL}/app/loans?community_id=8`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector('[data-gmfn-loans-surface="primary"]', {
      timeout: 30000,
    });
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const text = document.body.textContent || "";
      const rect = (selector) =>
        document.querySelector(selector)?.getBoundingClientRect() || null;
      const primary = rect('[data-gmfn-loans-surface="primary"]');
      const summary = rect("#loans-support-summary");
      const tools = rect("#loans-next-routes");
      const request = rect('[data-cta-id="loans.hero.start-support"]');

      return {
        hasRepeatedPageTopNav: Boolean(
          document.querySelector('[data-gmfn-page-top-nav="compact"]')
        ),
        hasCommunity: text.includes("Blessed Satch family"),
        hasCounts: text.includes("Active 0") && text.includes("Waiting 0"),
        hasPrimaryAction: text.includes("Request support"),
        hasLongIntro: text.includes(
          "Ask for support, respond to requests, and keep repayment visible inside this community."
        ),
        hasCalmCard: Boolean(document.querySelector("#loans-current-focus")),
        primaryHeight: primary?.height || 0,
        summaryHeight: summary?.height || 0,
        toolsHeight: tools?.height || 0,
        requestVisible: Boolean(
          request && request.top >= 0 && request.bottom <= window.innerHeight
        ),
        horizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth + 2,
      };
    });

    await page.screenshot({
      path: join(screenshotDir, "loan-support-simple-390x844.png"),
      fullPage: false,
    });

    if (
      state.hasRepeatedPageTopNav ||
      !state.hasCommunity ||
      !state.hasCounts ||
      !state.hasPrimaryAction ||
      state.hasLongIntro ||
      state.hasCalmCard ||
      state.primaryHeight > 220 ||
      state.summaryHeight > 82 ||
      state.toolsHeight > 82 ||
      !state.requestVisible ||
      state.horizontalOverflow
    ) {
      console.error("Loan Support phone surface is not compact.", state);
      process.exit(1);
    }

    console.log(
      "Loan Support phone smoke passed: one compact hero, one action, two closed rows, no repeated title card."
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
