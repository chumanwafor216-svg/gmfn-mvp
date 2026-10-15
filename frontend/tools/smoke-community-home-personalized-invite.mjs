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

async function installApiMocks(page, controls) {
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
        json([
          {
            id: 8,
            clan_id: 8,
            name: "Blessed Satch family",
            marketplace_name: "Blessed Satch family",
            community_code: "GMFN-C-000013",
            gmfn_id: "GMFN-C-000013",
            member_count: 20,
            membership_role: "admin",
            status: "active",
            notice_posting_policy: "members",
          },
        ])
      );
    }
    if (path === "/community-domains/my") {
      return route.fulfill(json({ items: [] }));
    }
    if (path === "/clans/8/invite" && route.request().method() === "POST") {
      controls.inviteCreateCalls += 1;
      return route.fulfill(
        json({
          community_code: "GMFN-C-000013",
          community_name: "Blessed Satch family",
          invited_by_display: "Nwafor Chuma",
          invite_code: "invite-by-current-member",
          invite_link:
            "/join?invite=invite-by-current-member&inviter_name=Nwafor%20Chuma",
        })
      );
    }
    if (/^\/clans\/\d+\/select\/?$/.test(path)) {
      return route.fulfill(json({ selected_clan_id: 8 }));
    }
    if (/^\/community-notices/.test(path)) {
      return route.fulfill(json({ notices: [], posting_policy: "members" }));
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
    const controls = { inviteCreateCalls: 0 };

    await installApiMocks(page, controls);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-invite-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      window.__lastCommunityInviteShare = null;
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (payload) => {
          window.__lastCommunityInviteShare = payload;
        },
      });
    });

    await page.goto(`${baseURL}/app/community/8`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector('[data-cta-id="simple-community-invite.open"]', {
      timeout: 30000,
    });

    const closedState = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        memberCount: text.includes("20 members"),
        inviteAction: Boolean(
          document.querySelector('[data-cta-id="simple-community-invite.open"]')
        ),
        oldCopyAction: text.includes("Copy invite link"),
        oldShareAction: text.includes("Share invite"),
      };
    });
    if (
      !closedState.memberCount ||
      !closedState.inviteAction ||
      closedState.oldCopyAction ||
      closedState.oldShareAction
    ) {
      console.error("Community Home hero invite was not compact.", closedState);
      process.exit(1);
    }

    await page.locator('[data-cta-id="simple-community-invite.open"]').click();
    await page.waitForSelector('[data-debug-id="simple-community-invite.recipient-name"]');
    await page.locator('[data-cta-id="simple-community-invite.send"]').click();
    await page.waitForTimeout(80);
    const emptyRecipientState = await page.evaluate(() => ({
      hasPrompt: (document.body.textContent || "").includes("Enter their name."),
      share: window.__lastCommunityInviteShare,
    }));
    if (!emptyRecipientState.hasPrompt || emptyRecipientState.share || controls.inviteCreateCalls !== 0) {
      console.error("Community Home invite did not require a recipient name.", {
        emptyRecipientState,
        controls,
      });
      process.exit(1);
    }

    await page.locator('[data-debug-id="simple-community-invite.recipient-name"]').fill("Ada");
    await page.waitForTimeout(420);
    await page.locator('[data-cta-id="simple-community-invite.send"]').click();
    await page.waitForFunction(() => Boolean(window.__lastCommunityInviteShare));

    const personalizedState = await page.evaluate(() => {
      const share = window.__lastCommunityInviteShare || {};
      const url = new URL(String(share.url || ""), window.location.origin);
      const sendRect = document
        .querySelector('[data-cta-id="simple-community-invite.send"]')
        ?.getBoundingClientRect();
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        text: String(share.text || ""),
        messageLines: String(share.text || "").split("\n").filter(Boolean).length,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        sendVisible: Boolean(sendRect && sendRect.top >= 0 && sendRect.bottom <= window.innerHeight),
      };
    });
    await page.screenshot({
      path: join(screenshotDir, "community-home-personalized-invite-390x844.png"),
      fullPage: false,
    });

    if (
      controls.inviteCreateCalls !== 1 ||
      personalizedState.pathname !== "/start/join/invite-by-current-member" ||
      personalizedState.search !== "" ||
      personalizedState.hash !== "" ||
      !personalizedState.text.includes("Nwafor Chuma") ||
      !personalizedState.text.includes("Ada") ||
      !personalizedState.text.includes("Open to request access. Approval is required.") ||
      personalizedState.messageLines !== 2 ||
      personalizedState.horizontalOverflow ||
      !personalizedState.sendVisible
    ) {
      console.error("Community Home invite was not personalised before sharing.", {
        personalizedState,
        controls,
      });
      process.exit(1);
    }

    console.log(
      "Community Home invite smoke passed: recipient required, message personalised, canonical path-only URL shared."
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
