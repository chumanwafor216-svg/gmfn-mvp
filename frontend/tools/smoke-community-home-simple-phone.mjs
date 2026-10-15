/* global console, process, URL, localStorage, document */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const frontendRoot = process.cwd();
const screenshotDir = "C:\\tmp\\gmfn-community-home";
mkdirSync(screenshotDir, { recursive: true });

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

async function installApiMocks(page, { includeSecondClan = false } = {}) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") {
      return route.fulfill(json({
        id: 216,
        user_id: 216,
        display_name: "Nwafor Chuma",
        gmfn_id: "GMFN-U-63655DE6",
        role: "member",
      }));
    }
    if (path === "/clans/me") {
      const clans = [
        {
          id: 8,
          clan_id: 8,
          name: "Homeland isa",
          display_name: "Homeland isa",
          marketplace_name: "Homeland isa",
          community_code: "GMFN-C-000008",
          gmfn_id: "GMFN-C-000008",
          role: "user",
          status: "active",
          membership_status: "active",
          member_count: 7,
          active_member_count: 7,
          notice_posting_policy: "members",
        },
      ];
      if (includeSecondClan) {
        clans.push({
          id: 9,
          clan_id: 9,
          name: "Sachimo",
          display_name: "Sachimo",
          marketplace_name: "Sachimo",
          community_code: "GMFN-C-000009",
          gmfn_id: "GMFN-C-000009",
          role: "user",
          status: "active",
          membership_status: "active",
          member_count: 12,
          active_member_count: 12,
          notice_posting_policy: "members",
        });
      }
      return route.fulfill(json(clans));
    }
    if (path === "/community-domains/my") {
      return route.fulfill(json({ items: [] }));
    }
    if (path === "/pool/me") {
      return route.fulfill(json({ clan_id: 8, currency: "NGN", balance: 0 }));
    }
    if (/^\/community-notices(?:\/|$)/.test(path)) {
      return route.fulfill(json({
        notices: [
          {
            notice_id: "notice-8-1",
            body: "Please read this community update before Wednesday and check the next step.",
            full_body: "Please read this community update before Wednesday. The full response tools belong behind one clear action.",
            created_at: "2026-10-15T09:00:00Z",
            acknowledgement_enabled: false,
            availability_enabled: false,
            source: "community_notice",
          },
        ],
        posting_policy: "members",
        can_post_notice: false,
        can_submit_notice_for_review: false,
        pending_notice_review_count: 0,
      }));
    }
    if (/^\/clans\/8\/select\/?$/.test(path) || path === "/clans/select") {
      return route.fulfill(json({ selected_clan_id: 8 }));
    }
    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }
    return route.continue();
  });
}

async function collectOverflow(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("main *"))
      .filter((element) => {
        if (element.closest('[aria-hidden="true"]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -2 || rect.right > document.documentElement.clientWidth + 2);
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        text: (element.textContent || "").trim().slice(0, 80),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }))
  );
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

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-simple-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.communityHome.sections.v6",
        JSON.stringify({ communities: true, marketplaceTools: true, subscriptions: true, trustFinance: true })
      );
    });

    await page.goto(`http://127.0.0.1:${port}/app/community/8`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector('[data-cta-id="community-home.goto.toggle"]', { timeout: 30000 });
    await page.waitForSelector('[data-cta-id^="community-home.bulletin.reactions."]', { timeout: 30000 });

    const defaultState = await page.evaluate(() => {
      const text = document.body.textContent || "";
      const identityText = document.querySelector('[data-debug-id="community-home.identity-card"]')?.textContent || "";
      const bulletinHeaderText = document.querySelector('[aria-label="Community announcements"]')?.textContent?.trim() || "";
      const actionSectionStyle = document.querySelector('[data-debug-id="community-home.go-to"]')?.getAttribute("style") || "";
      return {
        hasName: identityText.includes("Homeland isa"),
        hasMemberCount: identityText.includes("7") && identityText.includes("Members"),
        hasCommunityId: identityText.includes("GMFN-C-000008"),
        hasPosition: identityText.includes("Member"),
        hasMembership: identityText.includes("Active"),
        hasOpenNotice: text.includes("Open notice"),
        hasCommunityActions: text.includes("Community actions"),
        bulletinHeaderText,
        switcherCount: document.querySelectorAll('[data-debug-id="community-home.switch-community"]').length,
        actionSectionHasExtraCard: /background|border|box-shadow/.test(actionSectionStyle),
        duplicatePhoneNavCount: document.querySelectorAll('[data-cta-id^="page-top-nav."]').length,
        pulseCount: document.querySelectorAll('[data-debug-id="community-home.bulletin.pulse"]').length,
        calendarTileCount: document.querySelectorAll('[aria-label="Announcement date"]').length,
      };
    });
    const marketplaceVisibleBeforeOpen = await page.locator('[data-cta-id="community-home.goto.marketplace"]').isVisible();
    const overflow390 = await collectOverflow(page);
    await page.screenshot({ path: join(screenshotDir, "community-home-simple-390x844.png"), fullPage: false });

    if (
      !defaultState.hasName ||
      !defaultState.hasMemberCount ||
      !defaultState.hasCommunityId ||
      !defaultState.hasPosition ||
      !defaultState.hasMembership ||
      !defaultState.hasOpenNotice ||
      !defaultState.hasCommunityActions ||
      defaultState.bulletinHeaderText !== "Bulletin" ||
      defaultState.switcherCount !== 0 ||
      defaultState.actionSectionHasExtraCard ||
      defaultState.duplicatePhoneNavCount !== 0 ||
      defaultState.pulseCount !== 0 ||
      defaultState.calendarTileCount !== 0 ||
      marketplaceVisibleBeforeOpen ||
      overflow390.length > 0
    ) {
      console.error("Community Home simple phone default state failed:", {
        defaultState,
        marketplaceVisibleBeforeOpen,
        overflow390,
      });
      process.exitCode = 1;
      return;
    }

    await page.locator('[data-cta-id^="community-home.bulletin.reactions."]').click();
    await page.waitForSelector('[data-debug-id="community-home.bulletin.reactions-panel"]', { timeout: 30000 });
    if (!(await page.getByText("Full notice", { exact: true }).isVisible())) {
      console.error("Community Home Open notice did not reveal the full notice.");
      process.exitCode = 1;
      return;
    }
    await page.waitForTimeout(420);
    await page.getByRole("button", { name: "Close notice" }).click();
    await page.waitForSelector('[data-debug-id="community-home.bulletin.reactions-panel"]', { state: "hidden", timeout: 30000 });

    await page.locator('[data-cta-id="community-home.goto.toggle"]').click();
    for (const label of ["Marketplace", "Manage shop", "Finance", "Support", "Trust"]) {
      await page.getByRole("button", { name: label, exact: true }).waitFor({ state: "visible", timeout: 30000 });
    }

    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(100);
    const overflow360 = await collectOverflow(page);
    await page.screenshot({ path: join(screenshotDir, "community-home-actions-360x780.png"), fullPage: false });
    if (overflow360.length > 0) {
      console.error("Community Home simple phone expanded state overflowed:", overflow360);
      process.exitCode = 1;
      return;
    }

    const multiCommunityPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await installApiMocks(multiCommunityPage, { includeSecondClan: true });
    await multiCommunityPage.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-simple-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.communityHome.sections.v6",
        JSON.stringify({ communities: true, marketplaceTools: true, subscriptions: true, trustFinance: true })
      );
    });
    await multiCommunityPage.goto(`http://127.0.0.1:${port}/app/community/8`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await multiCommunityPage.waitForSelector('[data-cta-id="community-home.switch.toggle"]', { timeout: 30000 });
    await multiCommunityPage.locator('[data-cta-id="community-home.switch.toggle"]').click();
    await multiCommunityPage.waitForSelector('[data-cta-id="community-home.switch.select.9"]', { state: "visible", timeout: 30000 });
    await multiCommunityPage.close();

    console.log(`Community Home simple phone smoke passed. Screenshots: ${screenshotDir}`);
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
