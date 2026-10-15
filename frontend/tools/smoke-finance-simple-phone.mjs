/* global console, process, URL, localStorage, document, window, getComputedStyle */

import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
          display_name: "Ada Example",
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
              membership_role: "member",
              status: "active",
            },
          ],
        })
      );
    }

    if (path === "/pool/me/summary") {
      return route.fulfill(
        json({
          user_id: 216,
          gmfn_id: "GMFN-U-63655DE6",
          currency: "GBP",
          communities_count: 2,
          totals: {
            available_balance: "140.00",
            effective_available: "125.00",
            pending_deposits: "15.00",
            pending_withdrawals: "5.00",
            reserved_pool: "15.00",
            membership_pool_balance: "140.00",
            guarantee_locked_as_guarantor: "0.00",
          },
          items: [],
        })
      );
    }

    if (path === "/pool/me") {
      return route.fulfill(
        json({
          available_balance: "50.00",
          effective_available: "50.00",
          pending_deposits: "0.00",
          pending_withdrawals: "0.00",
          reserved_pool: "0.00",
          currency: "GBP",
          reference: "GSN-MONEY-8-216",
          recent_events: [],
        })
      );
    }

    if (path === "/loans") {
      return route.fulfill(json({ items: [] }));
    }

    if (path === "/trust/me/why") {
      return route.fulfill(
        json({
          computed: {
            standing_score: 0,
            trust_band: "Not ready",
            counts: {},
          },
        })
      );
    }

    if (
      url.pathname.startsWith("/api/") ||
      url.origin === "http://127.0.0.1:8012"
    ) {
      return route.fulfill(
        json({
          items: [],
          results: [],
          configured: false,
          status: "ok",
        })
      );
    }

    return route.continue();
  });
}

async function testViewport(baseURL, viewport) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
  });

  try {
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-finance-phone-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.finance.sections.v3",
        JSON.stringify({
          overview: true,
          borrower: true,
          pipelineCredits: true,
          events: true,
          reconciliation: true,
        })
      );
    });

    await page.goto(baseURL + "/app/finance?community_id=8", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector('[data-gsn-finance-phone-front="simple"]', {
      timeout: 30000,
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: join(screenshotDir, "finance-simple-" + viewport.width + "x" + viewport.height + ".jpg"),
      type: "jpeg",
      quality: 45,
      fullPage: false,
    });

    const initial = await page.evaluate(() => {
      const hero = document.querySelector('[data-gsn-finance-phone-front="simple"]');
      const facts = document.querySelector('[data-gsn-finance-primary-facts="compact-four"]');
      const review = document.querySelector('[data-cta-id="finance.tool.reports"]');
      const choose = document.querySelector('[data-cta-id="finance.more-lanes.toggle"]');
      const quickSnapshot = Array.from(document.querySelectorAll("section")).find((node) =>
        (node.textContent || "").includes("Finance quick snapshot")
      );
      const deepIds = [
        "finance-pipeline-credits",
        "finance-summary",
        "finance-reconciliation",
        "finance-support-effect",
        "finance-events",
      ];
      const isVisible = (node) => {
        if (!node) return false;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== "none" && rect.width > 0 && rect.height > 0;
      };
      const reviewRect = review?.getBoundingClientRect();

      return {
        bodyText: document.body.textContent || "",
        heroHeight: hero?.getBoundingClientRect().height || 0,
        factCount: facts?.children.length || 0,
        reviewVisible: isVisible(review),
        reviewInsideViewport: Boolean(
          reviewRect && reviewRect.top >= 0 && reviewRect.bottom <= window.innerHeight
        ),
        chooseVisible: isVisible(choose),
        guideVisible: isVisible(document.querySelector("[data-gsn-real-life-meaning]")),
        quickSnapshotVisible: isVisible(quickSnapshot),
        visibleDeepPanels: deepIds.filter((id) =>
          isVisible(document.getElementById(id))
        ),
        horizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth + 2,
      };
    });

    const requiredInitialText = [
      "Active follow-up needed.",
      "GSN records finance activity",
      "Available now",
      "Waiting in",
      "Waiting out",
      "Communities",
      "Review money",
      "Choose another task",
    ];

    if (
      requiredInitialText.some((text) => !initial.bodyText.includes(text)) ||
      initial.heroHeight > 300 ||
      initial.factCount !== 4 ||
      !initial.reviewVisible ||
      !initial.reviewInsideViewport ||
      !initial.chooseVisible ||
      initial.guideVisible ||
      initial.quickSnapshotVisible ||
      initial.visibleDeepPanels.length > 0 ||
      initial.horizontalOverflow
    ) {
      throw new Error(
        "Finance default phone front door failed at " +
          viewport.width +
          "x" +
          viewport.height +
          ": " +
          JSON.stringify(initial)
      );
    }

    await page.locator('[data-cta-id="finance.more-lanes.toggle"]').click();
    await page.waitForSelector('[data-cta-id="finance.mini-tool.payment-checks"]', {
      state: "visible",
    });

    const taskLabels = await page
      .locator('#finance-task-chooser [data-cta-id^="finance.mini-tool."]')
      .allTextContents();

    if (
      !["Money In", "Money Out", "Records / Events", "Payment checks", "Support record"].every(
        (label) => taskLabels.some((value) => value.includes(label))
      )
    ) {
      throw new Error("Finance secondary task disclosure is incomplete: " + JSON.stringify(taskLabels));
    }

    await page.locator('[data-cta-id="finance.mini-tool.payment-checks"]').click();
    await page.waitForSelector("#finance-reconciliation", { state: "visible" });

    const activePaymentCheck = await page.evaluate(() => {
      const isVisible = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return false;
        const rect = node.getBoundingClientRect();
        return getComputedStyle(node).display !== "none" && rect.width > 0 && rect.height > 0;
      };

      return {
        frontVisible: isVisible('[data-gsn-finance-phone-front="simple"]'),
        chooserVisible: isVisible("#finance-task-chooser"),
        reconciliationVisible: isVisible("#finance-reconciliation"),
        backVisible: isVisible('[data-cta-id="finance.toggle-reconciliation"]'),
      };
    });

    if (
      activePaymentCheck.frontVisible ||
      activePaymentCheck.chooserVisible ||
      !activePaymentCheck.reconciliationVisible ||
      !activePaymentCheck.backVisible
    ) {
      throw new Error(
        "Finance payment-check lane did not replace the front door: " +
          JSON.stringify(activePaymentCheck)
      );
    }

    await page.locator('[data-cta-id="finance.toggle-reconciliation"]').click();
    await page.waitForSelector("#finance-task-chooser", { state: "visible" });
    await page.locator('[data-cta-id="finance.tool.reports"]').click();
    await page.waitForSelector("#finance-summary", { state: "visible" });

    const summaryState = await page.evaluate(() => {
      const summary = document.querySelector("#finance-summary");
      const front = document.querySelector('[data-gsn-finance-phone-front="simple"]');
      const visible = (node) =>
        Boolean(
          node &&
            getComputedStyle(node).display !== "none" &&
            node.getBoundingClientRect().height > 0
        );

      return {
        summaryVisible: visible(summary),
        frontVisible: visible(front),
        hasBack: visible(document.querySelector('[data-cta-id="finance.toggle-overview"]')),
        horizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth + 2,
      };
    });

    if (
      !summaryState.summaryVisible ||
      summaryState.frontVisible ||
      !summaryState.hasBack ||
      summaryState.horizontalOverflow
    ) {
      throw new Error(
        "Finance Money Summary lane failed at " +
          viewport.width +
          "x" +
          viewport.height +
          ": " +
          JSON.stringify(summaryState)
      );
    }

    console.log(
      "Finance phone smoke passed at " +
        viewport.width +
        "x" +
        viewport.height +
        ": one primary action, one task disclosure, one active lane, no overflow."
    );
  } finally {
    await browser.close();
  }
}

async function run() {
  let server;

  try {
    server = await createServer({
      root: frontendRoot,
      configFile: join(frontendRoot, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 0, strictPort: false },
      logLevel: "silent",
    });
    await server.listen();
    const port = server.httpServer.address().port;
    const baseURL = "http://127.0.0.1:" + port;

    await testViewport(baseURL, { width: 390, height: 844 });
    await testViewport(baseURL, { width: 360, height: 780 });
  } finally {
    if (server) await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
